import { Test, type TestingModule } from '@nestjs/testing';
import { AdaptiveBlock } from '@tt-digita/shared';
import { AdaptiveSessionService } from './adaptive-session.service';
import { ExercisesService } from './exercises.service';
import { StatsService } from '../stats/stats.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdaptiveSessionService', () => {
  let service: AdaptiveSessionService;

  // minAttempts: 1 -- essas provas sao sobre como o motor adaptativo monta a
  // sessao (blocos, dedup, ordenacao), nao sobre a quantidade de tentativas
  // exigida pro dominio (isso e coberto em mastery.spec.ts e
  // exercises.service.spec.ts).
  const exerciseRows = [
    {
      id: 'ex-1',
      worldId: 'w1',
      title: 'Um',
      type: 'KEY_SEQUENCE',
      content: 'fjfj fjfj',
      order: 1,
      minAccuracy: 0.8,
      targetWpm: null,
      minAttempts: 1,
      status: 'PUBLISHED',
    },
    {
      id: 'ex-2',
      worldId: 'w1',
      title: 'Dois',
      type: 'KEY_SEQUENCE',
      content: 'jjkk jjkk',
      order: 2,
      minAccuracy: 0.8,
      targetWpm: null,
      minAttempts: 1,
      status: 'PUBLISHED',
    },
    {
      id: 'ex-3',
      worldId: 'w1',
      title: 'Três',
      type: 'WORD_LIST',
      content: 'casa mesa',
      order: 3,
      minAccuracy: 0.8,
      targetWpm: null,
      minAttempts: 1,
      status: 'PUBLISHED',
    },
    {
      id: 'ex-4',
      worldId: 'w2',
      title: 'Quatro',
      type: 'WORD_LIST',
      content: 'kkkk jjjj kkkk',
      order: 1,
      minAccuracy: 0.8,
      targetWpm: null,
      minAttempts: 1,
      status: 'PUBLISHED',
    },
    {
      id: 'ex-5',
      worldId: 'w2',
      title: 'Cinco',
      type: 'WORD_LIST',
      content: 'zzzz qqqq',
      order: 2,
      minAccuracy: 0.8,
      targetWpm: null,
      minAttempts: 1,
      status: 'PUBLISHED',
    },
  ];

  const prismaMock = {
    exercise: {
      findMany: jest.fn(),
    },
    attempt: {
      findMany: jest.fn(),
    },
  };

  const statsMock = {
    getWeakKeys: jest.fn(),
  };

  let attemptFixture: {
    exerciseId: string;
    accuracy: number;
    finishedAt: Date;
  }[];

  beforeEach(async () => {
    jest.clearAllMocks();
    attemptFixture = [];

    prismaMock.exercise.findMany.mockImplementation(
      (args: { where?: { status?: string; id?: { in: string[] } } }) => {
        if (args?.where?.status === 'PUBLISHED') {
          return Promise.resolve(exerciseRows);
        }
        const ids = args?.where?.id?.in ?? [];
        return Promise.resolve(
          exerciseRows
            .filter((e) => ids.includes(e.id))
            .map((e) => ({ id: e.id, content: e.content })),
        );
      },
    );

    prismaMock.attempt.findMany.mockImplementation(() =>
      Promise.resolve(attemptFixture),
    );
    statsMock.getWeakKeys.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdaptiveSessionService,
        ExercisesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StatsService, useValue: statsMock },
      ],
    }).compile();

    service = module.get(AdaptiveSessionService);
  });

  it('returns an empty session when there are no exercises at all', async () => {
    prismaMock.exercise.findMany.mockImplementation(
      (args: { where?: { status?: string } }) =>
        args?.where?.status === 'PUBLISHED'
          ? Promise.resolve([])
          : Promise.resolve([]),
    );

    const session = await service.buildSession('student-1');

    expect(session).toEqual([]);
  });

  it('with only the first exercise unlocked, offers it as "atual" plus a locked preview of the next one as "desafio"', async () => {
    const session = await service.buildSession('student-1');

    expect(session).toHaveLength(2);
    expect(session).toContainEqual(
      expect.objectContaining({ id: 'ex-1', block: AdaptiveBlock.ATUAL }),
    );
    expect(session).toContainEqual(
      expect.objectContaining({
        id: 'ex-2',
        block: AdaptiveBlock.DESAFIO,
        unlocked: false,
      }),
    );
  });

  it('never returns duplicate exercise ids across blocks', async () => {
    attemptFixture = [
      {
        exerciseId: 'ex-1',
        accuracy: 0.95,
        finishedAt: new Date('2026-01-01'),
      },
      { exerciseId: 'ex-2', accuracy: 0.9, finishedAt: new Date('2026-01-05') },
      {
        exerciseId: 'ex-3',
        accuracy: 0.85,
        finishedAt: new Date('2026-01-10'),
      },
      {
        exerciseId: 'ex-4',
        accuracy: 0.92,
        finishedAt: new Date('2026-01-15'),
      },
    ];

    const session = await service.buildSession('student-1');

    const ids = session.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never exceeds the session size cap even when everything is unlocked and mastered', async () => {
    attemptFixture = exerciseRows.map((e) => ({
      exerciseId: e.id,
      accuracy: 0.95,
      finishedAt: new Date('2026-01-01'),
    }));

    const session = await service.buildSession('student-1');

    expect(session.length).toBeLessThanOrEqual(10);
    expect(session.length).toBeGreaterThan(0);
  });

  it('puts the next locked exercise in the "desafio" block as a preview, still marked unlocked: false', async () => {
    attemptFixture = [
      {
        exerciseId: 'ex-1',
        accuracy: 0.95,
        finishedAt: new Date('2026-01-01'),
      },
    ];

    const session = await service.buildSession('student-1');
    const desafio = session.find(
      (item) => item.block === AdaptiveBlock.DESAFIO,
    );

    expect(desafio).toBeDefined();
    expect(desafio?.id).toBe('ex-3');
    expect(desafio?.unlocked).toBe(false);
  });

  it('ranks the "fraqueza" block by weak-character density among unlocked exercises', async () => {
    // Só ex-1 é dominado (o que desbloqueia ex-2); ex-2 fica sem tentativa
    // ainda, senão ele seria consumido pelo bloco "revisão" antes do
    // "fraqueza" ter a chance de escolhê-lo.
    attemptFixture = [
      {
        exerciseId: 'ex-1',
        accuracy: 0.95,
        finishedAt: new Date('2026-01-01'),
      },
    ];
    statsMock.getWeakKeys.mockResolvedValue([
      { char: 'k', attempts: 20, errors: 12, errorRate: 0.6 },
    ]);

    const session = await service.buildSession('student-1');
    const fraqueza = session.filter(
      (item) => item.block === AdaptiveBlock.FRAQUEZA,
    );

    // ex-2 ("jjkk jjkk") tem mais densidade de "k" que ex-1 ("fjfj fjfj", sem "k").
    expect(fraqueza.map((item) => item.id)).toContain('ex-2');
    expect(fraqueza.map((item) => item.id)).not.toContain('ex-1');
  });

  it('orders "revisao" by the oldest last attempt first (spaced repetition)', async () => {
    attemptFixture = [
      {
        exerciseId: 'ex-1',
        accuracy: 0.95,
        finishedAt: new Date('2026-01-20'),
      },
      { exerciseId: 'ex-2', accuracy: 0.9, finishedAt: new Date('2026-01-01') },
      {
        exerciseId: 'ex-3',
        accuracy: 0.85,
        finishedAt: new Date('2026-01-10'),
      },
    ];

    const session = await service.buildSession('student-1');
    const revisao = session.filter(
      (item) => item.block === AdaptiveBlock.REVISAO,
    );

    expect(revisao.map((item) => item.id)).toEqual(['ex-2', 'ex-3']);
  });
});
