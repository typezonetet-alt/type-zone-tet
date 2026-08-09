import type { AuthenticatedUser } from '@tt-digita/shared';
import { ROOM_EVENTS, Role } from '@tt-digita/shared';
import { RoomsGateway } from './rooms.gateway';
import { SESSION_COOKIE } from '../auth/auth.constants';

function fakeSocket(id: string) {
  return {
    id,
    data: {} as { user?: AuthenticatedUser },
    handshake: { headers: {} as { cookie?: string } },
    emit: jest.fn(),
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
  };
}

describe('RoomsGateway', () => {
  let gateway: RoomsGateway;
  let toEmit: jest.Mock;

  const jwtMock = { verifyAsync: jest.fn() };
  const authServiceMock = { getAuthenticatedUser: jest.fn() };
  const gamificationMock = {
    recordRoomFinish: jest.fn().mockResolvedValue(undefined),
  };

  const prismaMock = {
    student: { findUnique: jest.fn() },
    liveRoom: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
    liveRoomParticipant: {
      upsert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    },
    liveRoomRoundResult: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue(undefined),
    },
    exercise: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: 'ex-1', title: 'Fundação: F e J', content: 'fff jjj' },
        ]),
    },
    $transaction: jest.fn((ops: unknown[]) =>
      Promise.all(ops as Promise<unknown>[]),
    ),
  };

  const teacher: AuthenticatedUser = {
    id: 'teacher-user-1',
    role: Role.TEACHER,
    name: 'Prof',
    email: 'prof@tt.com',
    code: null,
  };
  const studentUser: AuthenticatedUser = {
    id: 'student-user-1',
    role: Role.STUDENT,
    name: 'Aluno 1',
    email: null,
    code: 'aluno01',
  };
  const studentUser2: AuthenticatedUser = {
    id: 'student-user-2',
    role: Role.STUDENT,
    name: 'Aluno 2',
    email: null,
    code: 'aluno02',
  };

  // Sala WORLD de 1 rodada so (equivalente ao antigo "sala de 1 exercicio")
  // -- mantem os testes que ja existiam simples, o multi-rodada de verdade
  // fica no describe proprio abaixo.
  const roomRow = {
    id: 'room-1',
    code: 'ABCDE',
    hostUserId: teacher.id,
    activityType: 'WORLD',
    worldId: 'world-1',
    gameType: null,
    roundExerciseIds: ['ex-1'],
    roundCount: 1,
    currentRound: 0,
    status: 'LOBBY',
    participants: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    prismaMock.liveRoom.findUnique.mockResolvedValue({
      ...roomRow,
      participants: [],
    });
    prismaMock.liveRoomRoundResult.findMany.mockResolvedValue([]);
    prismaMock.exercise.findMany.mockResolvedValue([
      { id: 'ex-1', title: 'Fundação: F e J', content: 'fff jjj' },
    ]);
    prismaMock.student.findUnique.mockImplementation(({ where }) => {
      if (where.userId === studentUser.id)
        return Promise.resolve({ id: 'student-1', name: 'Aluno 1' });
      if (where.userId === studentUser2.id)
        return Promise.resolve({ id: 'student-2', name: 'Aluno 2' });
      return Promise.resolve(null);
    });

    gateway = new RoomsGateway(
      jwtMock as never,
      authServiceMock as never,
      prismaMock as never,
      gamificationMock as never,
    );
    toEmit = jest.fn();
    (gateway as unknown as { server: unknown }).server = {
      to: jest.fn().mockReturnValue({ emit: toEmit }),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('authentication middleware', () => {
    // A autenticacao roda como middleware do socket.io (afterInit + server.use),
    // nao em handleConnection -- assim "connect" so dispara do lado do cliente
    // depois que a autenticacao termina, sem corrida com join_room chegando cedo.
    function callMiddleware(client: ReturnType<typeof fakeSocket>) {
      const next = jest.fn();
      const gatewayInternal = gateway as unknown as {
        authenticateMiddleware: (
          socket: unknown,
          next: (err?: Error) => void,
        ) => Promise<void>;
      };
      return gatewayInternal
        .authenticateMiddleware(client, next)
        .then(() => next);
    }

    it('rejects a client without a valid session cookie', async () => {
      const client = fakeSocket('s1');
      const next = await callMiddleware(client);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(client.data.user).toBeUndefined();
    });

    it('authenticates a client with a valid session cookie', async () => {
      const client = fakeSocket('s1');
      client.handshake.headers.cookie = `${SESSION_COOKIE}=valid-token`;
      jwtMock.verifyAsync.mockResolvedValue({
        sub: teacher.id,
        role: teacher.role,
      });
      authServiceMock.getAuthenticatedUser.mockResolvedValue(teacher);

      const next = await callMiddleware(client);

      expect(client.data.user).toEqual(teacher);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('onJoin', () => {
    it('lets the host join and see the room state', async () => {
      const client = fakeSocket('s1');
      client.data.user = teacher;

      await gateway.onJoin(client as never, { code: 'abcde' });

      expect(client.join).toHaveBeenCalledWith('ABCDE');
      expect(client.emit).toHaveBeenCalledWith(
        ROOM_EVENTS.ROOM_STATE,
        expect.objectContaining({ isHost: true, code: 'ABCDE' }),
      );
    });

    it('registers a student as a participant on first join', async () => {
      const client = fakeSocket('s1');
      client.data.user = studentUser;

      await gateway.onJoin(client as never, { code: 'ABCDE' });

      expect(prismaMock.liveRoomParticipant.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            roomId_studentId: { roomId: 'room-1', studentId: 'student-1' },
          },
        }),
      );
      const state = client.emit.mock.calls.find(
        (c) => c[0] === ROOM_EVENTS.ROOM_STATE,
      )?.[1];
      expect(state.participants).toHaveLength(1);
      expect(state.participants[0].name).toBe('Aluno 1');
    });

    it('rejects a new student trying to join after the room already started', async () => {
      prismaMock.liveRoom.findUnique.mockResolvedValue({
        ...roomRow,
        status: 'RUNNING',
      });
      const client = fakeSocket('s1');
      client.data.user = studentUser;

      await gateway.onJoin(client as never, { code: 'ABCDE' });

      expect(client.emit).toHaveBeenCalledWith(
        ROOM_EVENTS.ERROR,
        expect.objectContaining({
          message: expect.stringContaining('já começou'),
        }),
      );
      expect(client.join).not.toHaveBeenCalled();
    });

    it('rejects a room that does not exist', async () => {
      prismaMock.liveRoom.findUnique.mockResolvedValue(null);
      const client = fakeSocket('s1');
      client.data.user = teacher;

      await gateway.onJoin(client as never, { code: 'ZZZZZ' });

      expect(client.emit).toHaveBeenCalledWith(
        ROOM_EVENTS.ERROR,
        expect.objectContaining({
          message: expect.stringContaining('não encontrada'),
        }),
      );
    });

    // Bug real encontrado com um smoke test contra o servidor de verdade
    // (dois sockets reais entrando quase juntos): sem uma cache de promessa em
    // voo, cada join concorrente via this.rooms.get(code) ainda vazio disparava
    // sua PROPRIA consulta ao banco e montava seu PROPRIO RoomRuntime -- so um
    // dos dois alunos sobrevivia na instancia que o servidor de fato usava
    // dali em diante (o outro ficava "preso" numa copia orfa).
    it('resolves concurrent joins from different students to a single shared room instance', async () => {
      prismaMock.liveRoom.findUnique.mockResolvedValue({
        ...roomRow,
        participants: [],
      });

      const c1 = fakeSocket('s1');
      c1.data.user = studentUser;
      const c2 = fakeSocket('s2');
      c2.data.user = studentUser2;

      await Promise.all([
        gateway.onJoin(c1 as never, { code: 'ABCDE' }),
        gateway.onJoin(c2 as never, { code: 'ABCDE' }),
      ]);

      expect(prismaMock.liveRoom.findUnique).toHaveBeenCalledTimes(1);

      const lastState = [...toEmit.mock.calls]
        .reverse()
        .find((c) => c[0] === ROOM_EVENTS.ROOM_STATE)?.[1] as {
        participants: { studentId: string }[];
      };
      expect(lastState.participants.map((p) => p.studentId).sort()).toEqual([
        'student-1',
        'student-2',
      ]);
    });
  });

  describe('onStart', () => {
    it('rejects a non-host trying to start the room', async () => {
      const host = fakeSocket('host');
      host.data.user = teacher;
      await gateway.onJoin(host as never, { code: 'ABCDE' });

      const student = fakeSocket('s1');
      student.data.user = studentUser;
      await gateway.onJoin(student as never, { code: 'ABCDE' });

      await gateway.onStart(student as never);

      expect(student.emit).toHaveBeenCalledWith(
        ROOM_EVENTS.ERROR,
        expect.objectContaining({
          message: expect.stringContaining('anfitrião'),
        }),
      );
    });

    it('moves the room through countdown into running the first round after the timer fires', async () => {
      const host = fakeSocket('host');
      host.data.user = teacher;
      await gateway.onJoin(host as never, { code: 'ABCDE' });

      await gateway.onStart(host as never);

      expect(prismaMock.liveRoom.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'COUNTDOWN' } }),
      );
      expect(toEmit).toHaveBeenCalledWith(
        ROOM_EVENTS.COUNTDOWN,
        expect.objectContaining({ seconds: 5 }),
      );

      await jest.advanceTimersByTimeAsync(5000);

      expect(prismaMock.liveRoom.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'RUNNING', currentRound: 1 }),
        }),
      );
      expect(toEmit).toHaveBeenCalledWith(
        ROOM_EVENTS.GAME_START,
        expect.objectContaining({ roundIndex: 1, roundCount: 1 }),
      );
    });
  });

  describe('onFinishRound + rounds', () => {
    const baseSubmission = {
      expectedChars: 7,
      typedChars: 7,
      correctChars: 7,
      incorrectChars: 0,
      backspaces: 0,
      durationMs: 6000,
      charsPerSecondBuckets: [1, 1, 1, 1, 1, 1],
      charStats: [],
    };

    async function setupRunningRoomWithTwoStudents() {
      prismaMock.liveRoom.findUnique.mockResolvedValue({
        ...roomRow,
        status: 'LOBBY',
      });

      const host = fakeSocket('host');
      host.data.user = teacher;
      await gateway.onJoin(host as never, { code: 'ABCDE' });

      const c1 = fakeSocket('s1');
      c1.data.user = studentUser;
      await gateway.onJoin(c1 as never, { code: 'ABCDE' });

      const c2 = fakeSocket('s2');
      c2.data.user = studentUser2;
      await gateway.onJoin(c2 as never, { code: 'ABCDE' });

      await gateway.onStart(host as never);
      await jest.advanceTimersByTimeAsync(5000);

      return { host, c1, c2 };
    }

    it('ignores a finish submission with implausible counts', async () => {
      const { c1 } = await setupRunningRoomWithTwoStudents();

      await gateway.onFinishRound(c1 as never, {
        ...baseSubmission,
        correctChars: 99,
      });

      expect(c1.emit).toHaveBeenCalledWith(
        ROOM_EVENTS.ERROR,
        expect.objectContaining({
          message: expect.stringContaining('inválido'),
        }),
      );
      expect(prismaMock.liveRoomParticipant.update).not.toHaveBeenCalled();
    });

    it('closes the round by accuracy then wpm once everyone finishes, and the final podium keeps that order (1 rodada so)', async () => {
      const { host, c1, c2 } = await setupRunningRoomWithTwoStudents();

      // Aluno 1: mais lento mas mais preciso -- deve ficar em primeiro.
      await gateway.onFinishRound(c1 as never, {
        ...baseSubmission,
        durationMs: 12_000,
        charsPerSecondBuckets: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      });

      // Aluno 2: mais rapido mas com um erro -- precisao menor.
      await gateway.onFinishRound(c2 as never, {
        ...baseSubmission,
        correctChars: 6,
        incorrectChars: 1,
        typedChars: 7,
        durationMs: 4000,
        charsPerSecondBuckets: [2, 2, 2, 1],
      });

      const roundResultCall = toEmit.mock.calls.find(
        (c) => c[0] === ROOM_EVENTS.ROUND_RESULT,
      );
      expect(roundResultCall).toBeDefined();
      const roundResult = roundResultCall?.[1] as {
        studentId: string;
        position: number;
        totalPoints: number;
      }[];
      expect(roundResult[0]).toEqual(
        expect.objectContaining({ studentId: 'student-1', position: 1 }),
      );
      expect(roundResult[1]).toEqual(
        expect.objectContaining({ studentId: 'student-2', position: 2 }),
      );

      // Era a unica rodada -- "Proxima rodada" ja fecha a sala com o podio final.
      await gateway.onNextRound(host as never);

      const podiumCall = toEmit.mock.calls.find(
        (c) => c[0] === ROOM_EVENTS.PODIUM,
      );
      expect(podiumCall).toBeDefined();
      const podium = podiumCall?.[1] as {
        studentId: string;
        position: number;
      }[];
      expect(podium[0]).toEqual(
        expect.objectContaining({ studentId: 'student-1', position: 1 }),
      );
      expect(podium[1]).toEqual(
        expect.objectContaining({ studentId: 'student-2', position: 2 }),
      );
      expect(gamificationMock.recordRoomFinish).toHaveBeenCalledWith(
        'student-1',
        expect.objectContaining({ finalPosition: 1, participantCount: 2 }),
      );
    });
  });

  describe('multi-round WORLD room', () => {
    const multiRoomRow = {
      ...roomRow,
      roundExerciseIds: ['ex-1', 'ex-2'],
      roundCount: 2,
    };
    const baseSubmission = {
      expectedChars: 7,
      typedChars: 7,
      correctChars: 7,
      incorrectChars: 0,
      backspaces: 0,
      durationMs: 6000,
      charsPerSecondBuckets: [1, 1, 1, 1, 1, 1],
      charStats: [],
    };

    beforeEach(() => {
      prismaMock.exercise.findMany.mockResolvedValue([
        { id: 'ex-1', title: 'Fundação: F e J', content: 'fff jjj' },
        { id: 'ex-2', title: 'D e K', content: 'ddd kkk' },
      ]);
    });

    it('advances to round 2 with a fresh exercise after next_round, and only finalizes on the last round', async () => {
      prismaMock.liveRoom.findUnique.mockResolvedValue({
        ...multiRoomRow,
        status: 'LOBBY',
      });

      const host = fakeSocket('host');
      host.data.user = teacher;
      await gateway.onJoin(host as never, { code: 'ABCDE' });

      const c1 = fakeSocket('s1');
      c1.data.user = studentUser;
      await gateway.onJoin(c1 as never, { code: 'ABCDE' });

      await gateway.onStart(host as never);
      await jest.advanceTimersByTimeAsync(5000);

      await gateway.onFinishRound(c1 as never, baseSubmission);
      expect(toEmit.mock.calls.some((c) => c[0] === ROOM_EVENTS.PODIUM)).toBe(
        false,
      );

      toEmit.mockClear();
      await gateway.onNextRound(host as never);

      // Ainda tem rodada 2 -- não finaliza a sala.
      expect(toEmit.mock.calls.some((c) => c[0] === ROOM_EVENTS.PODIUM)).toBe(
        false,
      );
      const gameStart = toEmit.mock.calls.find(
        (c) => c[0] === ROOM_EVENTS.GAME_START,
      );
      expect(gameStart?.[1]).toEqual(
        expect.objectContaining({ roundIndex: 2, roundCount: 2 }),
      );

      const stateCall = [...toEmit.mock.calls]
        .reverse()
        .find((c) => c[0] === ROOM_EVENTS.ROOM_STATE);
      expect(stateCall?.[1]).toEqual(
        expect.objectContaining({ roundExerciseId: 'ex-2' }),
      );

      await gateway.onFinishRound(c1 as never, baseSubmission);
      toEmit.mockClear();
      await gateway.onNextRound(host as never);

      // Agora sim -- era a ultima rodada.
      expect(toEmit.mock.calls.some((c) => c[0] === ROOM_EVENTS.PODIUM)).toBe(
        true,
      );
    });
  });

  describe('sala GAME (jogo em vez de exercicio)', () => {
    const gameRoomRow = {
      ...roomRow,
      activityType: 'GAME',
      worldId: null,
      gameType: 'ORBITAL',
      roundExerciseIds: [],
      roundCount: 1,
    };

    async function setupRunningGameRoomWithTwoStudents() {
      prismaMock.liveRoom.findUnique.mockResolvedValue({
        ...gameRoomRow,
        status: 'LOBBY',
      });

      const host = fakeSocket('host');
      host.data.user = teacher;
      await gateway.onJoin(host as never, { code: 'ABCDE' });

      const c1 = fakeSocket('s1');
      c1.data.user = studentUser;
      await gateway.onJoin(c1 as never, { code: 'ABCDE' });

      const c2 = fakeSocket('s2');
      c2.data.user = studentUser2;
      await gateway.onJoin(c2 as never, { code: 'ABCDE' });

      await gateway.onStart(host as never);
      await jest.advanceTimersByTimeAsync(5000);

      return { host, c1, c2 };
    }

    it('ranks a game round by score (not by who finishes first), and next_round already closes the sala (1 rodada so)', async () => {
      const { host, c1, c2 } = await setupRunningGameRoomWithTwoStudents();

      // Aluno 2 termina primeiro mas com placar menor.
      await gateway.onSubmitGameRound(c2 as never, {
        score: 50,
        wordsCompleted: 5,
        accuracy: 0.8,
        durationMs: 4000,
      });
      // Aluno 1 termina depois, com placar maior -- deve ficar em 1o.
      await gateway.onSubmitGameRound(c1 as never, {
        score: 120,
        wordsCompleted: 8,
        accuracy: 0.95,
        durationMs: 9000,
      });

      const roundResult = toEmit.mock.calls.find(
        (c) => c[0] === ROOM_EVENTS.ROUND_RESULT,
      )?.[1] as { studentId: string; position: number }[];
      expect(roundResult[0]).toEqual(
        expect.objectContaining({ studentId: 'student-1', position: 1 }),
      );
      expect(roundResult[1]).toEqual(
        expect.objectContaining({ studentId: 'student-2', position: 2 }),
      );

      await gateway.onNextRound(host as never);

      const podium = toEmit.mock.calls.find(
        (c) => c[0] === ROOM_EVENTS.PODIUM,
      )?.[1] as { studentId: string; position: number; totalPoints: number }[];
      expect(podium).toBeDefined();
      expect(podium[0]).toEqual(
        expect.objectContaining({
          studentId: 'student-1',
          position: 1,
          totalPoints: 100,
        }),
      );
    });
  });

  describe('onProgress (T&T Turbo)', () => {
    // roomRow.roundExerciseIds -> ex-1 com content 'fff jjj' -> 7 caracteres esperados.
    async function setupRunningRoomWithOneStudent() {
      prismaMock.liveRoom.findUnique.mockResolvedValue({
        ...roomRow,
        status: 'LOBBY',
      });

      const host = fakeSocket('host');
      host.data.user = teacher;
      await gateway.onJoin(host as never, { code: 'ABCDE' });

      const c1 = fakeSocket('s1');
      c1.data.user = studentUser;
      await gateway.onJoin(c1 as never, { code: 'ABCDE' });

      await gateway.onStart(host as never);
      await jest.advanceTimersByTimeAsync(5000);

      return { c1, host };
    }

    function lastBroadcastProgress(): number | undefined {
      const stateCall = [...toEmit.mock.calls]
        .reverse()
        .find((c) => c[0] === ROOM_EVENTS.ROOM_STATE);
      const participants = stateCall?.[1]?.participants as
        { studentId: string; progress: number }[] | undefined;
      return participants?.find((p) => p.studentId === 'student-1')?.progress;
    }

    it('caps live progress below 100% even with every character correct', async () => {
      const { c1 } = await setupRunningRoomWithOneStudent();

      gateway.onProgress(c1 as never, {
        typedChars: 7,
        correctChars: 7,
        incorrectChars: 0,
      });

      expect(lastBroadcastProgress()).toBeCloseTo(0.98, 5);
    });

    it('reduces progress when accuracy is low, relative to a perfect run', async () => {
      const { c1 } = await setupRunningRoomWithOneStudent();

      gateway.onProgress(c1 as never, {
        typedChars: 6,
        correctChars: 3,
        incorrectChars: 3,
      });
      const withErrors = lastBroadcastProgress();

      gateway.onProgress(c1 as never, {
        typedChars: 3,
        correctChars: 3,
        incorrectChars: 0,
      });
      const perfect = lastBroadcastProgress();

      expect(withErrors).toBeLessThan(perfect!);
      // base 3/7 * (0.7 + 0.3*0.5) = 0.42857 * 0.85
      expect(withErrors).toBeCloseTo((3 / 7) * 0.85, 4);
      // base 3/7 * (0.7 + 0.3*1) = 0.42857 * 1.0
      expect(perfect).toBeCloseTo(3 / 7, 4);
    });

    it('ignores progress updates once the room is no longer running', async () => {
      const { c1, host } = await setupRunningRoomWithOneStudent();
      await gateway.onEnd(host as never);

      toEmit.mockClear();
      gateway.onProgress(c1 as never, {
        typedChars: 7,
        correctChars: 7,
        incorrectChars: 0,
      });

      expect(toEmit).not.toHaveBeenCalled();
    });
  });
});
