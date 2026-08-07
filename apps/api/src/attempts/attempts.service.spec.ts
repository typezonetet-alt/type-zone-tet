import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AttemptsService } from './attempts.service';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import { GamificationService } from '../gamification/gamification.service';

describe('AttemptsService', () => {
  let service: AttemptsService;

  const exercise = { id: 'ex-1', minAccuracy: 0.85 };

  const prismaMock = {
    exercise: { findUnique: jest.fn() },
    attempt: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const statsMock = {
    recordCharStats: jest.fn().mockResolvedValue(undefined),
  };

  const gamificationMock = {
    recordExerciseAttempt: jest.fn().mockResolvedValue(undefined),
  };

  const baseDto = {
    exerciseId: 'ex-1',
    durationMs: 60_000,
    expectedChars: 100,
    typedChars: 100,
    correctChars: 95,
    incorrectChars: 5,
    backspaces: 2,
    charsPerSecondBuckets: [8, 8, 9, 7],
    charStats: [{ char: 'f', attempts: 20, errors: 5 }],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.exercise.findUnique.mockResolvedValue(exercise);
    prismaMock.attempt.findFirst.mockResolvedValue(null);
    prismaMock.attempt.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'attempt-1', ...data }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttemptsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StatsService, useValue: statsMock },
        { provide: GamificationService, useValue: gamificationMock },
      ],
    }).compile();

    service = module.get(AttemptsService);
  });

  it('persists the attempt and marks it as passed when accuracy meets the minimum', async () => {
    const result = await service.submit('student-1', baseDto);

    expect(result.passed).toBe(true);
    expect(result.accuracy).toBeCloseTo(0.95, 4);
    expect(prismaMock.attempt.create).toHaveBeenCalledTimes(1);
  });

  it('forwards charStats to StatsService after persisting the attempt', async () => {
    await service.submit('student-1', baseDto);

    expect(statsMock.recordCharStats).toHaveBeenCalledWith(
      'student-1',
      baseDto.charStats,
    );
  });

  it('marks the attempt as not passed when accuracy is below the exercise minimum', async () => {
    const result = await service.submit('student-1', {
      ...baseDto,
      correctChars: 50,
      incorrectChars: 50,
    });

    expect(result.passed).toBe(false);
  });

  it('returns the previous best attempt for comparison when one exists', async () => {
    prismaMock.attempt.findFirst.mockResolvedValue({
      wpmNet: 30,
      accuracy: 0.88,
    });

    const result = await service.submit('student-1', baseDto);

    expect(result.previousBest).toEqual({ wpmNet: 30, accuracy: 0.88 });
  });

  it('returns null previousBest for a first attempt', async () => {
    const result = await service.submit('student-1', baseDto);
    expect(result.previousBest).toBeNull();
  });

  it('throws NotFound when the exercise does not exist', async () => {
    prismaMock.exercise.findUnique.mockResolvedValue(null);

    await expect(service.submit('student-1', baseDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a payload where correct+incorrect exceeds typed characters', async () => {
    await expect(
      service.submit('student-1', {
        ...baseDto,
        correctChars: 90,
        incorrectChars: 90,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects correctChars greater than the exercise length', async () => {
    await expect(
      service.submit('student-1', {
        ...baseDto,
        typedChars: 1000,
        correctChars: 900,
        incorrectChars: 100,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows a large number of retries on the same exercise (o motor bloqueia avanco em erro)', async () => {
    // correctChars nunca passa de expectedChars, mas incorrectChars pode ser
    // bem maior -- a pessoa pode errar a mesma tecla varias vezes antes de acertar.
    const result = await service.submit('student-1', {
      ...baseDto,
      expectedChars: 100,
      typedChars: 600,
      correctChars: 100,
      incorrectChars: 500,
    });

    expect(result.accuracy).toBeCloseTo(100 / 600, 4);
  });

  it('rejects an absurdly large number of incorrect characters', async () => {
    await expect(
      service.submit('student-1', {
        ...baseDto,
        expectedChars: 10,
        typedChars: 1011,
        correctChars: 10,
        incorrectChars: 1001,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
