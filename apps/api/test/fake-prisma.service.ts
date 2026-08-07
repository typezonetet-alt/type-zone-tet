// Stub minimo do PrismaService para testes e2e que nao precisam de um Postgres real.
// Cada spec configura os retornos dos metodos que usa via mockResolvedValueOnce/mockResolvedValue.
export function fakePrismaService() {
  const prisma = {
    student: {
      findUnique: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'student-new' }),
      count: jest.fn().mockResolvedValue(0),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue({ id: 'user-new' }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue(undefined),
    },
    exercise: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn(),
    },
    attempt: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue(undefined),
    },
    world: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    keystrokeStat: {
      upsert: jest.fn().mockResolvedValue(undefined),
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue(undefined),
    },
    teacher: {
      findUnique: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    class: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    classMember: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    },
    gameScore: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
    studentProfile: {
      // Valores default "zerados" -- suficiente pra AttemptsService/GamesService/
      // RoomsGateway rodarem o pipeline real de gamificacao nos e2e sem crashar;
      // specs que querem cenarios especificos (ja tem XP, ja tem recorde, etc.)
      // sobrescrevem com mockResolvedValueOnce.
      upsert: jest.fn().mockResolvedValue({
        studentId: 'student-1',
        xp: 0,
        level: 1,
        coins: 0,
        totalCorrectWords: 0,
        bestWpmNet: 0,
        currentStreak: 0,
        longestStreak: 0,
        distinctActiveDays: 0,
        lastActiveDate: null,
        equippedFrameId: null,
        equippedThemeId: null,
        equippedTitleId: null,
      }),
      update: jest.fn(),
    },
    dailyActivity: {
      upsert: jest.fn().mockResolvedValue({
        exercisesCompleted: 0,
        secondsTrained: 0,
        accuracyGoalHit: false,
        weakKeyPracticed: false,
        roomJoined: false,
        personalBestImproved: false,
        rewardedExerciseIds: [],
        claimedMissionKeys: [],
      }),
      update: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    studentAchievement: {
      create: jest.fn().mockResolvedValue(undefined),
      findMany: jest.fn().mockResolvedValue([]),
    },
    studentCosmetic: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue(undefined),
    },
    season: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'season-1',
        index: 1,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        closedAt: null,
      }),
      update: jest.fn(),
    },
    seasonScore: {
      upsert: jest.fn().mockResolvedValue({
        id: 'season-score-1',
        seasonId: 'season-1',
        studentId: 'student-1',
        points: 0,
        league: 'BRONZE',
        finalRank: null,
      }),
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const $transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof prisma) => Promise<unknown>)(prisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });

  return { ...prisma, $transaction };
}

export type FakePrismaService = ReturnType<typeof fakePrismaService>;
