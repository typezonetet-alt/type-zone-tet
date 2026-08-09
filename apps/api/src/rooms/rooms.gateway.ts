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
import { GameType } from '@prisma/client';
import type {
  AuthenticatedUser,
  GameRoundFinishPayload,
  PodiumEntry,
  RoomFinishPayload,
  RoomProgressPayload,
  RoundResultEntry,
  RoomState,
} from '@tt-digita/shared';
import {
  LiveRoomActivityType,
  LiveRoomStatus,
  ROOM_EVENTS,
  Role,
  pointsForRoundPlacement,
} from '@tt-digita/shared';
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
  // "Terminou a rodada ATUAL" -- reseta a cada beginRound().
  finished: boolean;

  // Preenchido em rodada WORLD.
  roundWpmNet: number | null;
  roundAccuracy: number | null;
  roundConsistency: number | null;
  roundIncorrectChars: number | null;
  // Preenchido em rodada GAME.
  roundGameScore: number | null;
  roundWordsCompleted: number | null;

  roundPoints: number | null;
  totalPoints: number;
  // Posicao FINAL da sala -- so preenchida quando a sala fecha de vez.
  position: number | null;
  progress: number;
}

// Progresso ao vivo do T&T Turbo (secao 16): nao e so caracteres corretos /
// total -- precisao baixa reduz o avanco (ate 30% mais lento), sem travar o
// aluno. Nunca cravar 100% aqui -- so o finish_round valida e fecha a prova.
const LIVE_PROGRESS_CAP = 0.98;

function computeLiveProgress(
  correctChars: number,
  typedChars: number,
  expectedChars: number,
): number {
  if (expectedChars <= 0) return 0;
  const clampedCorrect = Math.max(0, Math.min(correctChars, expectedChars));
  const base = clampedCorrect / expectedChars;
  const accuracyFactor =
    typedChars > 0 ? Math.min(1, clampedCorrect / typedChars) : 1;
  const penalized = base * (0.7 + 0.3 * accuracyFactor);
  return Math.min(LIVE_PROGRESS_CAP, Math.max(0, penalized));
}

interface RoundExerciseRuntime {
  id: string;
  title: string;
  content: string;
}

interface RoomRuntime {
  dbId: string;
  code: string;
  hostUserId: string;
  activityType: LiveRoomActivityType;
  roundExercises: RoundExerciseRuntime[]; // vazio quando activityType = GAME
  gameType: GameType | null;
  roundCount: number;
  // 0 = sala ainda nao comecou.
  roundIndex: number;
  // Evita fechar a mesma rodada duas vezes (uma vez quando todos terminam,
  // outra se o host clicar "Proxima rodada" logo em seguida).
  roundClosed: boolean;
  status: LiveRoomStatus;
  participants: Map<string, ParticipantRuntime>;
}

// Sala ao vivo (briefing secao 24-25, eventos da secao 45). Em vez de eventos
// granulares por mudanca, o servidor rebroadcast o ROOM_STATE inteiro pra
// todo mundo na sala a cada entrada/saida/resultado -- estado pequeno (dezenas
// de participantes), evita bugs de evento incremental perdido.
//
// Sala roda um Mundo inteiro (1 rodada por exercicio, na ordem da trilha) ou
// um Jogo (1 rodada so, todos jogam o mesmo GameType ao mesmo tempo). O host
// avanca de rodada manualmente (NEXT_ROUND) -- nunca um timer automatico,
// porque o tempo de conclusao varia demais aluno a aluno.
//
// Estado de sala vive em memoria (nao e cluster-safe ainda -- ok pra uma
// unica instancia de API, que e o caso hoje). O banco guarda o resultado
// oficial (LiveRoomParticipant/LiveRoomRoundResult) para sobreviver a um
// restart do processo.
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
          roundWpmNet: null,
          roundAccuracy: null,
          roundConsistency: null,
          roundIncorrectChars: null,
          roundGameScore: null,
          roundWordsCompleted: null,
          roundPoints: null,
          totalPoints: 0,
          position: null,
          progress: 0,
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
      void this.beginRound(room.code, 1);
    }, COUNTDOWN_SECONDS * 1000);
  }

  // Host-only, a qualquer momento: aborta a sala inteira e ja fecha com o
  // pódio final, usando os pontos acumulados ate aqui (a rodada em
  // andamento fecha primeiro, contando so quem ja terminou).
  @SubscribeMessage(ROOM_EVENTS.END_ROOM)
  async onEnd(@ConnectedSocket() client: AuthSocket): Promise<void> {
    const room = this.roomForHostAction(client);
    if (!room) return;
    if (
      room.status !== LiveRoomStatus.RUNNING &&
      room.status !== LiveRoomStatus.COUNTDOWN
    )
      return;

    if (room.roundIndex >= 1 && !room.roundClosed) {
      await this.closeRound(room);
    }
    await this.finishRoom(room);
  }

  // Host-only: fecha a rodada atual (se ainda nao fechou) e avanca pra
  // proxima, ou finaliza a sala se essa era a ultima rodada.
  @SubscribeMessage(ROOM_EVENTS.NEXT_ROUND)
  async onNextRound(@ConnectedSocket() client: AuthSocket): Promise<void> {
    const room = this.roomForHostAction(client);
    if (!room || room.status !== LiveRoomStatus.RUNNING) return;
    if (room.roundIndex < 1) return;

    if (!room.roundClosed) {
      await this.closeRound(room);
    }

    if (room.roundIndex >= room.roundCount) {
      await this.finishRoom(room);
      return;
    }

    await this.beginRound(room.code, room.roundIndex + 1);
  }

  // Fecha uma rodada WORLD (digitacao) -- so registra o resultado bruto da
  // rodada. A pontuacao (posicao dentro da rodada) so e calculada quando a
  // rodada FECHA (closeRound), porque quem termina primeiro nao e
  // necessariamente quem fica em 1o (desempate e por precisao/velocidade).
  @SubscribeMessage(ROOM_EVENTS.FINISH_ROUND)
  async onFinishRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: RoomFinishPayload,
  ): Promise<void> {
    const { room, participant } = this.activeRoundContext(client);
    if (!room || !participant) return;
    if (room.activityType !== LiveRoomActivityType.WORLD) return;

    const exercise = room.roundExercises[room.roundIndex - 1];
    if (!exercise) return;

    try {
      assertPlausibleCounts({
        expectedChars: exercise.content.length,
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
    participant.roundWpmNet = metrics.wpmNet;
    participant.roundAccuracy = metrics.accuracy;
    participant.roundConsistency = metrics.consistency;
    participant.roundIncorrectChars = body.incorrectChars;
    participant.progress = 1;

    this.broadcastState(room);
    await this.closeRoundIfAllFinished(room);
  }

  // Fecha uma rodada GAME (minigame) -- placar bruto, nao metricas de
  // digitacao (ver pointsForRoundPlacement: o desempate por score so faz
  // sentido dentro da MESMA rodada, onde todos jogaram o mesmo jogo).
  @SubscribeMessage(ROOM_EVENTS.SUBMIT_GAME_ROUND)
  async onSubmitGameRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: GameRoundFinishPayload,
  ): Promise<void> {
    const { room, participant } = this.activeRoundContext(client);
    if (!room || !participant) return;
    if (room.activityType !== LiveRoomActivityType.GAME) return;

    participant.finished = true;
    participant.roundGameScore = Math.max(0, Math.round(body.score || 0));
    participant.roundWordsCompleted = Math.max(
      0,
      Math.round(body.wordsCompleted || 0),
    );
    participant.roundAccuracy = Math.min(1, Math.max(0, body.accuracy || 0));
    participant.progress = 1;

    this.broadcastState(room);
    await this.closeRoundIfAllFinished(room);
  }

  // T&T Turbo (secao 16): atualizacao leve e frequente so pra mover a pista
  // visual -- nao persiste no banco, nao valida com o mesmo rigor do
  // finish_round (o pior caso e uma barra otimista, o resultado oficial exige
  // finish_round de qualquer forma).
  @SubscribeMessage(ROOM_EVENTS.PROGRESS_UPDATE)
  onProgress(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: RoomProgressPayload,
  ): void {
    const { room, participant } = this.activeRoundContext(client);
    if (!room || !participant) return;
    if (room.activityType !== LiveRoomActivityType.WORLD) return;

    const exercise = room.roundExercises[room.roundIndex - 1];
    if (!exercise) return;

    const typedChars = Math.max(0, Math.floor(body.typedChars || 0));
    const correctChars = Math.max(0, Math.floor(body.correctChars || 0));
    participant.progress = computeLiveProgress(
      correctChars,
      typedChars,
      exercise.content.length,
    );

    this.broadcastState(room);
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

  // Contexto comum de "aluno reportando o fim da rodada em que esta" --
  // usado por finish_round, submit_game_round e progress_update.
  private activeRoundContext(client: Socket): {
    room: RoomRuntime | null;
    participant: ParticipantRuntime | null;
  } {
    const code = this.socketRoomCode.get(client.id);
    const studentId = this.socketStudentId.get(client.id);
    if (!code || !studentId) return { room: null, participant: null };

    const room = this.rooms.get(code);
    if (!room || room.status !== LiveRoomStatus.RUNNING) {
      return { room: null, participant: null };
    }

    const participant = room.participants.get(studentId);
    if (!participant || participant.finished) {
      return { room: null, participant: null };
    }

    return { room, participant };
  }

  private async beginRound(code: string, index: number): Promise<void> {
    const room = this.rooms.get(code);
    if (!room) return;

    room.roundIndex = index;
    room.roundClosed = false;
    room.status = LiveRoomStatus.RUNNING;

    for (const participant of room.participants.values()) {
      participant.finished = false;
      participant.roundWpmNet = null;
      participant.roundAccuracy = null;
      participant.roundConsistency = null;
      participant.roundIncorrectChars = null;
      participant.roundGameScore = null;
      participant.roundWordsCompleted = null;
      participant.roundPoints = null;
      participant.progress = 0;
    }

    const startedAt = new Date();
    await this.prisma.liveRoom.update({
      where: { id: room.dbId },
      data: {
        status: 'RUNNING',
        currentRound: index,
        ...(index === 1 ? { startedAt } : {}),
      },
    });

    this.server.to(code).emit(ROOM_EVENTS.GAME_START, {
      startedAt: startedAt.toISOString(),
      roundIndex: room.roundIndex,
      roundCount: room.roundCount,
    });
    this.broadcastState(room);
  }

  private async closeRoundIfAllFinished(room: RoomRuntime): Promise<void> {
    const allFinished =
      room.participants.size > 0 &&
      Array.from(room.participants.values()).every((p) => p.finished);
    if (allFinished) {
      await this.closeRound(room);
    }
  }

  // Calcula a pontuacao da rodada (posicao dentro da rodada, ver
  // pointsForRoundPlacement) e persiste. So conta quem terminou a rodada --
  // quem nao terminou nao pontua nela, mas continua na sala pras proximas.
  private async closeRound(room: RoomRuntime): Promise<void> {
    if (room.roundClosed) return;
    room.roundClosed = true;

    const ranked = this.rankRoundParticipants(room);
    ranked.forEach((participant, index) => {
      const position = index + 1;
      participant.roundPoints = pointsForRoundPlacement(position);
      participant.totalPoints += participant.roundPoints;
    });

    if (ranked.length > 0) {
      await this.prisma.$transaction([
        ...ranked.map((participant, index) =>
          this.prisma.liveRoomRoundResult.create({
            data: {
              roomId: room.dbId,
              roundIndex: room.roundIndex,
              studentId: participant.studentId,
              wpmNet: participant.roundWpmNet,
              accuracy: participant.roundAccuracy,
              consistency: participant.roundConsistency,
              incorrectChars: participant.roundIncorrectChars,
              gameScore: participant.roundGameScore,
              gameWordsCompleted: participant.roundWordsCompleted,
              pointsAwarded: participant.roundPoints ?? 0,
              position: index + 1,
              finishedAt: new Date(),
            },
          }),
        ),
        ...ranked.map((participant) =>
          this.prisma.liveRoomParticipant.update({
            where: {
              roomId_studentId: {
                roomId: room.dbId,
                studentId: participant.studentId,
              },
            },
            data: { totalPoints: participant.totalPoints },
          }),
        ),
      ]);
    }

    const resultEntries: RoundResultEntry[] = Array.from(
      room.participants.values(),
    )
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((participant, index) => ({
        studentId: participant.studentId,
        name: participant.name,
        roundPoints: participant.roundPoints ?? 0,
        totalPoints: participant.totalPoints,
        position: index + 1,
      }));

    this.server.to(room.code).emit(ROOM_EVENTS.ROUND_RESULT, resultEntries);
    this.broadcastState(room);
  }

  private async finishRoom(room: RoomRuntime): Promise<void> {
    room.status = LiveRoomStatus.FINISHED;

    const ranked = Array.from(room.participants.values()).sort(
      (a, b) => b.totalPoints - a.totalPoints,
    );
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
          data: { finishedAt: new Date(), position: index + 1 },
        }),
      ),
    ]);

    const podium: PodiumEntry[] = ranked.map((participant, index) => ({
      studentId: participant.studentId,
      name: participant.name,
      position: index + 1,
      totalPoints: participant.totalPoints,
    }));
    this.server.to(room.code).emit(ROOM_EVENTS.PODIUM, podium);
    this.broadcastState(room);

    await Promise.all(
      ranked.map((participant, index) =>
        this.gamification.recordRoomFinish(participant.studentId, {
          finalPosition: index + 1,
          participantCount: ranked.length,
          roundCount: room.roundCount,
        }),
      ),
    );
  }

  // Desempate DENTRO da rodada atual: WORLD usa a mesma regra de sempre
  // (precisao, wpm liquido, consistencia, menos erros); GAME usa o placar
  // bruto do proprio jogo, comparavel porque todos jogaram o mesmo jogo na
  // mesma rodada. So quem terminou entra no ranking -- quem nao terminou
  // nao pontua nela.
  private rankRoundParticipants(room: RoomRuntime): ParticipantRuntime[] {
    const finished = Array.from(room.participants.values()).filter(
      (p) => p.finished,
    );

    if (room.activityType === LiveRoomActivityType.GAME) {
      return finished.sort((a, b) => {
        if ((b.roundGameScore ?? 0) !== (a.roundGameScore ?? 0))
          return (b.roundGameScore ?? 0) - (a.roundGameScore ?? 0);
        return (b.roundWordsCompleted ?? 0) - (a.roundWordsCompleted ?? 0);
      });
    }

    return finished.sort((a, b) => {
      if (b.roundAccuracy !== a.roundAccuracy)
        return (b.roundAccuracy ?? 0) - (a.roundAccuracy ?? 0);
      if (b.roundWpmNet !== a.roundWpmNet)
        return (b.roundWpmNet ?? 0) - (a.roundWpmNet ?? 0);
      if (b.roundConsistency !== a.roundConsistency)
        return (b.roundConsistency ?? 0) - (a.roundConsistency ?? 0);
      return (a.roundIncorrectChars ?? 0) - (b.roundIncorrectChars ?? 0);
    });
  }

  private broadcastState(room: RoomRuntime): void {
    this.server
      .to(room.code)
      .emit(ROOM_EVENTS.ROOM_STATE, this.toRoomState(room, false));
  }

  private toRoomState(room: RoomRuntime, isHost: boolean): RoomState {
    const currentExercise =
      room.activityType === LiveRoomActivityType.WORLD
        ? room.roundExercises[room.roundIndex - 1]
        : undefined;

    return {
      id: room.dbId,
      code: room.code,
      status: room.status,
      isHost,
      activityType: room.activityType,
      roundIndex: room.roundIndex,
      roundCount: room.roundCount,
      roundExerciseId: currentExercise?.id ?? null,
      roundExerciseTitle: currentExercise?.title ?? null,
      roundGameType:
        room.activityType === LiveRoomActivityType.GAME
          ? (room.gameType as unknown as RoomState['roundGameType'])
          : null,
      content: currentExercise?.content ?? null,
      participants: Array.from(room.participants.values()).map((p) => ({
        studentId: p.studentId,
        name: p.name,
        connected: p.connected,
        finished: p.finished,
        wpmNet: p.roundWpmNet,
        accuracy: p.roundAccuracy,
        roundPoints: p.roundPoints,
        totalPoints: p.totalPoints,
        position: p.position,
        progress: p.progress,
      })),
      countdownStartsAt: null,
      countdownSeconds: COUNTDOWN_SECONDS,
    };
  }

  // Varios alunos entram quase ao mesmo tempo (o caso comum de sala de aula:
  // professor clica "iniciar" e todo mundo ja estava com join_room emitido).
  // Sem essa cache de promessa em voo, cada onJoin concorrente via
  // this.rooms.get(code) === undefined ainda, dispara sua PROPRIA consulta ao
  // banco e monta seu PROPRIO objeto RoomRuntime -- o ultimo a terminar
  // sobrescreve this.rooms.set(code, ...), e quem entrou "no meio" fica preso
  // mutando uma instancia que ninguem mais le. Consolidando concorrentes na
  // mesma promessa garante um unico RoomRuntime por sala.
  private readonly loadingRooms = new Map<
    string,
    Promise<RoomRuntime | null>
  >();

  private async loadRuntime(code: string): Promise<RoomRuntime | null> {
    const existing = this.rooms.get(code);
    if (existing) return existing;

    let inFlight = this.loadingRooms.get(code);
    if (!inFlight) {
      inFlight = this.buildRuntime(code).finally(() => {
        this.loadingRooms.delete(code);
      });
      this.loadingRooms.set(code, inFlight);
    }
    return inFlight;
  }

  private async buildRuntime(code: string): Promise<RoomRuntime | null> {
    const room = await this.prisma.liveRoom.findUnique({
      where: { code },
      include: { participants: { include: { student: true } } },
    });
    if (!room) return null;

    let roundExercises: RoundExerciseRuntime[] = [];
    if (room.activityType === 'WORLD' && room.roundExerciseIds.length > 0) {
      const exercises = await this.prisma.exercise.findMany({
        where: { id: { in: room.roundExerciseIds } },
        select: { id: true, title: true, content: true },
      });
      const byId = new Map(exercises.map((e) => [e.id, e]));
      roundExercises = room.roundExerciseIds
        .map((id) => byId.get(id))
        .filter((e): e is RoundExerciseRuntime => Boolean(e));
    }

    // Se o processo reiniciou no meio de uma rodada, recupera quem ja tinha
    // resultado gravado pra essa rodada (evita perder o "terminou" de quem
    // ja submeteu antes do restart).
    const currentRoundResults =
      room.currentRound > 0
        ? await this.prisma.liveRoomRoundResult.findMany({
            where: { roomId: room.id, roundIndex: room.currentRound },
          })
        : [];
    const finishedThisRound = new Map(
      currentRoundResults.map((r) => [r.studentId, r]),
    );

    const runtime: RoomRuntime = {
      dbId: room.id,
      code: room.code,
      hostUserId: room.hostUserId,
      activityType: room.activityType as unknown as LiveRoomActivityType,
      roundExercises,
      gameType: room.gameType,
      roundCount: room.roundCount,
      roundIndex: room.currentRound,
      // closeRound() e a UNICA rotina que cria LiveRoomRoundResult, e sempre
      // cria pra todos os participantes que terminaram de uma vez (mesma
      // transacao) -- entao "existe pelo menos 1 resultado desta rodada" ja
      // prova que a rodada foi fechada, mesmo apos um restart do processo.
      roundClosed: currentRoundResults.length > 0,
      status: room.status as unknown as LiveRoomStatus,
      participants: new Map(
        room.participants.map((p) => {
          const roundResult = finishedThisRound.get(p.studentId);
          return [
            p.studentId,
            {
              studentId: p.studentId,
              name: p.student.name,
              connected: false,
              finished: Boolean(roundResult) || Boolean(p.finishedAt),
              roundWpmNet: roundResult?.wpmNet ?? null,
              roundAccuracy: roundResult?.accuracy ?? null,
              roundConsistency: roundResult?.consistency ?? null,
              roundIncorrectChars: roundResult?.incorrectChars ?? null,
              roundGameScore: roundResult?.gameScore ?? null,
              roundWordsCompleted: roundResult?.gameWordsCompleted ?? null,
              roundPoints: roundResult?.pointsAwarded ?? null,
              totalPoints: p.totalPoints,
              position: p.position,
              progress: roundResult || p.finishedAt ? 1 : 0,
            },
          ];
        }),
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
