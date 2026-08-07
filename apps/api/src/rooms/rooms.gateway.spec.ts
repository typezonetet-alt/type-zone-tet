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

  const roomRow = {
    id: 'room-1',
    code: 'ABCDE',
    hostUserId: teacher.id,
    exerciseId: 'ex-1',
    status: 'LOBBY',
    exercise: { title: 'Fundação: F e J', content: 'fff jjj' },
    participants: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    prismaMock.liveRoom.findUnique.mockResolvedValue({
      ...roomRow,
      participants: [],
    });
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

    it('moves the room through countdown into running after the timer fires', async () => {
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
          data: expect.objectContaining({ status: 'RUNNING' }),
        }),
      );
      expect(toEmit).toHaveBeenCalledWith(
        ROOM_EVENTS.GAME_START,
        expect.any(Object),
      );
    });
  });

  describe('onFinish + podium', () => {
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

      return { c1, c2 };
    }

    it('ignores a finish submission with implausible counts', async () => {
      const { c1 } = await setupRunningRoomWithTwoStudents();

      await gateway.onFinish(c1 as never, {
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

    it('ranks the podium by accuracy then wpm once everyone finishes', async () => {
      const { c1, c2 } = await setupRunningRoomWithTwoStudents();

      // Aluno 1: mais lento mas mais preciso -- deve ficar em primeiro.
      await gateway.onFinish(c1 as never, {
        ...baseSubmission,
        durationMs: 12_000,
        charsPerSecondBuckets: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      });

      // Aluno 2: mais rapido mas com um erro -- precisao menor.
      await gateway.onFinish(c2 as never, {
        ...baseSubmission,
        correctChars: 6,
        incorrectChars: 1,
        typedChars: 7,
        durationMs: 4000,
        charsPerSecondBuckets: [2, 2, 2, 1],
      });

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
    });
  });
});
