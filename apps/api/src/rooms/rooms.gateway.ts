import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import type {
  AuthenticatedUser,
  RoomFinishPayload,
  RoomState,
} from '@tt-digita/shared';
import { LiveRoomStatus, ROOM_EVENTS, Role } from '@tt-digita/shared';
import { AuthService, type JwtPayload } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { SESSION_COOKIE } from '../auth/auth.constants';
import { assertPlausibleCounts, computeMetrics } from '../attempts/metrics';
import { GamificationService } from '../gamification/gamification.service';

const COUNTDOWN_SECONDS = 5;

// Socket.data e tipado como `any` por padrao no socket.io -- Omit + intersecao
// evita que o `any` original "vaze" e desative o eslint no resto do arquivo.
type AuthSocket = Omit<Socket, 'data'> & { data: { user?: AuthenticatedUser } };

interface ParticipantRuntime {
  studentId: string;
  name: string;
  connected: boolean;
  finished: boolean;
  wpmNet: number | null;
  accuracy: number | null;
  consistency: number | null;
  incorrectChars: number | null;
  position: number | null;
}

interface RoomRuntime {
  dbId: string;
  code: string;
  hostUserId: string;
  exerciseId: string;
  exerciseTitle: string;
  content: string;
  expectedChars: number;
  status: LiveRoomStatus;
  participants: Map<string, ParticipantRuntime>;
}

// Sala ao vivo (briefing secao 24-25, eventos da secao 45). Em vez de eventos
// granulares por mudanca, o servidor rebroadcast o ROOM_STATE inteiro pra
// todo mundo na sala a cada entrada/saida/resultado -- estado pequeno (dezenas
// de participantes), evita bugs de evento incremental perdido.
//
// Estado de sala vive em memoria (nao e cluster-safe ainda -- ok pra uma
// unica instancia de API, que e o caso hoje). O banco guarda o resultado
// oficial (LiveRoomParticipant) para sobreviver a um restart do processo.
@WebSocketGateway({
  namespace: '/rooms',
  cors: { origin: true, credentials: true },
})
export class RoomsGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly rooms = new Map<string, RoomRuntime>();
  private readonly socketRoomCode = new Map<string, string>();
  private readonly socketStudentId = new Map<string, string>();

  constructor(
    private readonly jwt: JwtService,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  // Autenticacao roda como middleware do Socket.IO, nao em handleConnection:
  // handleConnection e assincrono mas o cliente ja recebe "connect" (e pode
  // emitir mensagens) antes dele terminar, criando uma corrida onde join_room
  // chega com client.data.user ainda vazio. Middleware roda e resolve ANTES
  // do handshake terminar, entao "connect" so dispara depois de autenticado.
  afterInit(server: Server): void {
    server.use((socket, next) => {
      void this.authenticateMiddleware(socket as AuthSocket, next);
    });
  }

  private async authenticateMiddleware(
    socket: AuthSocket,
    next: (err?: Error) => void,
  ): Promise<void> {
    const user = await this.authenticate(socket);
    if (!user) {
      next(new Error('Sessão inválida.'));
      return;
    }
    socket.data.user = user;
    next();
  }

  handleDisconnect(client: Socket): void {
    const code = this.socketRoomCode.get(client.id);
    this.socketRoomCode.delete(client.id);
    const studentId = this.socketStudentId.get(client.id);
    this.socketStudentId.delete(client.id);
    if (!code) return;

    const room = this.rooms.get(code);
    if (room && studentId) {
      const participant = room.participants.get(studentId);
      if (participant) {
        participant.connected = false;
        this.broadcastState(room);
      }
    }
  }

  @SubscribeMessage(ROOM_EVENTS.JOIN_ROOM)
  async onJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: { code?: string },
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;

    const code = (body?.code ?? '').trim().toUpperCase();
    const room = await this.loadRuntime(code);
    if (!room) {
      client.emit(ROOM_EVENTS.ERROR, { message: 'Sala não encontrada.' });
      return;
    }

    const isHost =
      user.id === room.hostUserId ||
      user.role === Role.ADMIN ||
      user.role === Role.SUPERADMIN;

    if (user.role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { userId: user.id },
      });
      if (!student) {
        client.emit(ROOM_EVENTS.ERROR, { message: 'Aluno não encontrado.' });
        return;
      }

      let participant = room.participants.get(student.id);
      if (!participant && room.status !== LiveRoomStatus.LOBBY) {
        client.emit(ROOM_EVENTS.ERROR, { message: 'Esta sala já começou.' });
        return;
      }

      await this.prisma.liveRoomParticipant.upsert({
        where: {
          roomId_studentId: { roomId: room.dbId, studentId: student.id },
        },
        update: {},
        create: { roomId: room.dbId, studentId: student.id },
      });

      if (!participant) {
        participant = {
          studentId: student.id,
          name: student.name,
          connected: true,
          finished: false,
          wpmNet: null,
          accuracy: null,
          consistency: null,
          incorrectChars: null,
          position: null,
        };
        room.participants.set(student.id, participant);
      } else {
        participant.connected = true;
      }

      this.socketStudentId.set(client.id, student.id);
    } else if (!isHost) {
      client.emit(ROOM_EVENTS.ERROR, {
        message: 'Você não tem acesso a esta sala.',
      });
      return;
    }

    this.socketRoomCode.set(client.id, code);
    await client.join(code);
    client.emit(ROOM_EVENTS.ROOM_STATE, this.toRoomState(room, isHost));
    this.broadcastState(room);
  }

  @SubscribeMessage(ROOM_EVENTS.START_ROOM)
  async onStart(@ConnectedSocket() client: AuthSocket): Promise<void> {
    const room = this.roomForHostAction(client);
    if (!room || room.status !== LiveRoomStatus.LOBBY) return;

    room.status = LiveRoomStatus.COUNTDOWN;
    await this.prisma.liveRoom.update({
      where: { id: room.dbId },
      data: { status: 'COUNTDOWN' },
    });

    const startsAt = new Date(Date.now() + COUNTDOWN_SECONDS * 1000);
    this.server.to(room.code).emit(ROOM_EVENTS.COUNTDOWN, {
      startsAt: startsAt.toISOString(),
      seconds: COUNTDOWN_SECONDS,
    });

    setTimeout(() => {
      void this.beginRace(room.code);
    }, COUNTDOWN_SECONDS * 1000);
  }

  @SubscribeMessage(ROOM_EVENTS.END_ROOM)
  async onEnd(@ConnectedSocket() client: AuthSocket): Promise<void> {
    const room = this.roomForHostAction(client);
    if (!room) return;
    if (
      room.status !== LiveRoomStatus.RUNNING &&
      room.status !== LiveRoomStatus.COUNTDOWN
    )
      return;

    await this.finishRoom(room);
  }

  @SubscribeMessage(ROOM_EVENTS.FINISH_ROOM)
  async onFinish(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: RoomFinishPayload,
  ): Promise<void> {
    const code = this.socketRoomCode.get(client.id);
    const studentId = this.socketStudentId.get(client.id);
    if (!code || !studentId) return;

    const room = this.rooms.get(code);
    if (!room || room.status !== LiveRoomStatus.RUNNING) return;

    const participant = room.participants.get(studentId);
    if (!participant || participant.finished) return;

    try {
      assertPlausibleCounts({
        expectedChars: room.expectedChars,
        typedChars: body.typedChars,
        correctChars: body.correctChars,
        incorrectChars: body.incorrectChars,
      });
    } catch {
      client.emit(ROOM_EVENTS.ERROR, { message: 'Resultado inválido.' });
      return;
    }

    const metrics = computeMetrics(body);

    participant.finished = true;
    participant.wpmNet = metrics.wpmNet;
    participant.accuracy = metrics.accuracy;
    participant.consistency = metrics.consistency;
    participant.incorrectChars = body.incorrectChars;

    await this.prisma.liveRoomParticipant.update({
      where: { roomId_studentId: { roomId: room.dbId, studentId } },
      data: {
        finishedAt: new Date(),
        wpmNet: metrics.wpmNet,
        accuracy: metrics.accuracy,
        consistency: metrics.consistency,
        incorrectChars: body.incorrectChars,
      },
    });

    this.broadcastState(room);

    const allFinished =
      room.participants.size > 0 &&
      Array.from(room.participants.values()).every((p) => p.finished);
    if (allFinished) {
      await this.finishRoom(room);
    }
  }

  @SubscribeMessage(ROOM_EVENTS.LEAVE_ROOM)
  onLeave(@ConnectedSocket() client: Socket): void {
    const code = this.socketRoomCode.get(client.id);
    if (!code) return;
    void client.leave(code);
    this.socketRoomCode.delete(client.id);

    const studentId = this.socketStudentId.get(client.id);
    this.socketStudentId.delete(client.id);
    const room = this.rooms.get(code);
    if (room && studentId) {
      const participant = room.participants.get(studentId);
      if (participant) {
        participant.connected = false;
        this.broadcastState(room);
      }
    }
  }

  private roomForHostAction(client: AuthSocket): RoomRuntime | null {
    const user = client.data.user;
    const code = this.socketRoomCode.get(client.id);
    if (!user || !code) return null;
    const room = this.rooms.get(code);
    if (!room) return null;
    if (
      user.id !== room.hostUserId &&
      user.role !== Role.ADMIN &&
      user.role !== Role.SUPERADMIN
    ) {
      client.emit(ROOM_EVENTS.ERROR, {
        message: 'Só o anfitrião pode fazer isso.',
      });
      return null;
    }
    return room;
  }

  private async beginRace(code: string): Promise<void> {
    const room = this.rooms.get(code);
    if (!room || room.status !== LiveRoomStatus.COUNTDOWN) return;

    room.status = LiveRoomStatus.RUNNING;
    const startedAt = new Date();
    await this.prisma.liveRoom.update({
      where: { id: room.dbId },
      data: { status: 'RUNNING', startedAt },
    });

    this.server
      .to(code)
      .emit(ROOM_EVENTS.GAME_START, { startedAt: startedAt.toISOString() });
    this.broadcastState(room);
  }

  private async finishRoom(room: RoomRuntime): Promise<void> {
    room.status = LiveRoomStatus.FINISHED;

    const ranked = this.rankParticipants(room);
    ranked.forEach((participant, index) => {
      participant.position = index + 1;
    });

    await this.prisma.$transaction([
      this.prisma.liveRoom.update({
        where: { id: room.dbId },
        data: { status: 'FINISHED', finishedAt: new Date() },
      }),
      ...ranked.map((participant, index) =>
        this.prisma.liveRoomParticipant.update({
          where: {
            roomId_studentId: {
              roomId: room.dbId,
              studentId: participant.studentId,
            },
          },
          data: { position: index + 1 },
        }),
      ),
    ]);

    this.server.to(room.code).emit(
      ROOM_EVENTS.PODIUM,
      ranked.map((participant, index) => ({
        studentId: participant.studentId,
        name: participant.name,
        position: index + 1,
        wpmNet: participant.wpmNet ?? 0,
        accuracy: participant.accuracy ?? 0,
      })),
    );

    await Promise.all(
      ranked.map((participant, index) =>
        this.gamification.recordRoomFinish(participant.studentId, {
          position: index + 1,
          participantCount: ranked.length,
          wpmNet: participant.wpmNet ?? 0,
          accuracy: participant.accuracy ?? 0,
          incorrectChars: participant.incorrectChars ?? 0,
        }),
      ),
    );
  }

  // Desempate da secao 26: precisao, wpm liquido, consistencia, menos erros.
  // So quem terminou entra no podio -- ninguem "vence" sem completar a prova.
  private rankParticipants(room: RoomRuntime): ParticipantRuntime[] {
    return Array.from(room.participants.values())
      .filter((p) => p.finished)
      .sort((a, b) => {
        if (b.accuracy !== a.accuracy)
          return (b.accuracy ?? 0) - (a.accuracy ?? 0);
        if (b.wpmNet !== a.wpmNet) return (b.wpmNet ?? 0) - (a.wpmNet ?? 0);
        if (b.consistency !== a.consistency)
          return (b.consistency ?? 0) - (a.consistency ?? 0);
        return (a.incorrectChars ?? 0) - (b.incorrectChars ?? 0);
      });
  }

  private broadcastState(room: RoomRuntime): void {
    this.server
      .to(room.code)
      .emit(ROOM_EVENTS.ROOM_STATE, this.toRoomState(room, false));
  }

  private toRoomState(room: RoomRuntime, isHost: boolean): RoomState {
    return {
      id: room.dbId,
      code: room.code,
      status: room.status,
      isHost,
      exerciseId: room.exerciseId,
      exerciseTitle: room.exerciseTitle,
      content: room.content,
      participants: Array.from(room.participants.values()).map((p) => ({
        studentId: p.studentId,
        name: p.name,
        connected: p.connected,
        finished: p.finished,
        wpmNet: p.wpmNet,
        accuracy: p.accuracy,
        position: p.position,
      })),
      countdownStartsAt: null,
      countdownSeconds: COUNTDOWN_SECONDS,
    };
  }

  private async loadRuntime(code: string): Promise<RoomRuntime | null> {
    const existing = this.rooms.get(code);
    if (existing) return existing;

    const room = await this.prisma.liveRoom.findUnique({
      where: { code },
      include: { exercise: true, participants: { include: { student: true } } },
    });
    if (!room) return null;

    const runtime: RoomRuntime = {
      dbId: room.id,
      code: room.code,
      hostUserId: room.hostUserId,
      exerciseId: room.exerciseId,
      exerciseTitle: room.exercise.title,
      content: room.exercise.content,
      expectedChars: room.exercise.content.length,
      status: room.status as unknown as LiveRoomStatus,
      participants: new Map(
        room.participants.map((p) => [
          p.studentId,
          {
            studentId: p.studentId,
            name: p.student.name,
            connected: false,
            finished: Boolean(p.finishedAt),
            wpmNet: p.wpmNet,
            accuracy: p.accuracy,
            consistency: p.consistency,
            incorrectChars: p.incorrectChars,
            position: p.position,
          },
        ]),
      ),
    };
    this.rooms.set(code, runtime);
    return runtime;
  }

  private async authenticate(
    client: AuthSocket,
  ): Promise<AuthenticatedUser | null> {
    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) return null;

    const token = this.extractCookie(cookieHeader, SESSION_COOKIE);
    if (!token) return null;

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      return await this.authService.getAuthenticatedUser(payload.sub);
    } catch {
      return null;
    }
  }

  private extractCookie(header: string, name: string): string | null {
    for (const part of header.split(';')) {
      const [key, ...rest] = part.trim().split('=');
      if (key === name) return decodeURIComponent(rest.join('='));
    }
    return null;
  }
}
