import { Test, type TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExercisesService', () => {
  let service: ExercisesService;

  const exercises = [
    {
      id: 'ex-1',
      worldId: 'world-1',
      title: 'Um',
      type: 'KEY_SEQUENCE',
      content: 'fj',
      order: 1,
      minAccuracy: 0.8,
      targetWpm: null,
      status: 'PUBLISHED',
    },
    {
      id: 'ex-2',
      worldId: 'world-1',
      title: 'Dois',
      type: 'KEY_SEQUENCE',
      content: 'asdf',
      order: 2,
      minAccuracy: 0.85,
      targetWpm: null,
      status: 'PUBLISHED',
    },
    {
      id: 'ex-3',
      worldId: 'world-2',
      title: 'Três',
      type: 'WORD_LIST',
      content: 'casa fase',
      order: 1,
      minAccuracy: 0.9,
      targetWpm: 20,
      status: 'PUBLISHED',
    },
  ];

  const prismaMock = {
    exercise: {
      findMany: jest.fn().mockResolvedValue(exercises),
      findUniqueOrThrow: jest.fn(),
    },
    attempt: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.exercise.findMany.mockResolvedValue(exercises);
    prismaMock.attempt.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(ExercisesService);
  });

  it('the first exercise is always unlocked, regardless of attempts', async () => {
    const list = await service.listForStudent('student-1');
    expect(list[0].unlocked).toBe(true);
  });

  it('locks everything after the first when there are no attempts yet', async () => {
    const list = await service.listForStudent('student-1');
    expect(list[1].unlocked).toBe(false);
    expect(list[2].unlocked).toBe(false);
  });

  it('unlocks the next exercise once the previous one is passed with enough accuracy', async () => {
    prismaMock.attempt.findMany.mockResolvedValue([
      { exerciseId: 'ex-1', accuracy: 0.82 },
    ]);

    const list = await service.listForStudent('student-1');

    expect(list[1].unlocked).toBe(true);
    expect(list[2].unlocked).toBe(false);
  });

  it('does not unlock the next exercise if accuracy is below the minimum', async () => {
    prismaMock.attempt.findMany.mockResolvedValue([
      { exerciseId: 'ex-1', accuracy: 0.5 },
    ]);

    const list = await service.listForStudent('student-1');

    expect(list[1].unlocked).toBe(false);
  });

  it('uses the best accuracy across multiple attempts on the same exercise', async () => {
    prismaMock.attempt.findMany.mockResolvedValue([
      { exerciseId: 'ex-1', accuracy: 0.3 },
      { exerciseId: 'ex-1', accuracy: 0.95 },
    ]);

    const list = await service.listForStudent('student-1');

    expect(list[1].unlocked).toBe(true);
    expect(list[0].bestAccuracy).toBe(0.95);
  });

  it('exposes worldId and keeps the unlock cascade across a world boundary', async () => {
    prismaMock.attempt.findMany.mockResolvedValue([
      { exerciseId: 'ex-1', accuracy: 0.9 },
      { exerciseId: 'ex-2', accuracy: 0.9 },
    ]);

    const list = await service.listForStudent('student-1');

    expect(list[0].worldId).toBe('world-1');
    expect(list[2].worldId).toBe('world-2');
    // ex-3 e o primeiro exercicio do mundo 2, mas so desbloqueia depois que
    // ex-1 e ex-2 (mundo 1) forem passados -- a cascata nao reseta por mundo.
    expect(list[2].unlocked).toBe(true);
  });

  describe('getForStudent', () => {
    it('throws NotFound for an exercise id that does not exist', async () => {
      await expect(
        service.getForStudent('student-1', 'ex-999'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws Forbidden for a locked exercise', async () => {
      await expect(
        service.getForStudent('student-1', 'ex-2'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns the content for an unlocked exercise', async () => {
      prismaMock.exercise.findUniqueOrThrow.mockResolvedValue(exercises[0]);

      const result = await service.getForStudent('student-1', 'ex-1');

      expect(result.content).toBe('fj');
      expect(result.unlocked).toBe(true);
    });
  });
});
