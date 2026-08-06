import { Test, type TestingModule } from '@nestjs/testing';
import { StatsService } from './stats.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StatsService', () => {
  let service: StatsService;

  const prismaMock = {
    keystrokeStat: {
      upsert: jest.fn().mockResolvedValue(undefined),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(StatsService);
  });

  describe('recordCharStats', () => {
    it('upserts one row per character, incrementing attempts and errors', async () => {
      await service.recordCharStats('student-1', [
        { char: 'f', attempts: 10, errors: 2 },
        { char: 'j', attempts: 5, errors: 0 },
      ]);

      expect(prismaMock.keystrokeStat.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.keystrokeStat.upsert).toHaveBeenCalledWith({
        where: { studentId_char: { studentId: 'student-1', char: 'f' } },
        update: { attempts: { increment: 10 }, errors: { increment: 2 } },
        create: { studentId: 'student-1', char: 'f', attempts: 10, errors: 2 },
      });
    });

    it('does nothing when there are no char stats to record', async () => {
      await service.recordCharStats('student-1', []);
      expect(prismaMock.keystrokeStat.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getWeakKeys', () => {
    it('ranks keys by error rate, worst first', async () => {
      prismaMock.keystrokeStat.findMany.mockResolvedValue([
        { char: 'a', attempts: 10, errors: 1 },
        { char: 'ç', attempts: 10, errors: 6 },
        { char: 'z', attempts: 20, errors: 4 },
      ]);

      const result = await service.getWeakKeys('student-1');

      expect(result.map((k) => k.char)).toEqual(['ç', 'z', 'a']);
      expect(result[0].errorRate).toBeCloseTo(0.6, 4);
    });

    it('only counts characters with at least the minimum number of attempts', async () => {
      prismaMock.keystrokeStat.findMany.mockResolvedValue([]);
      await service.getWeakKeys('student-1');

      expect(prismaMock.keystrokeStat.findMany).toHaveBeenCalledWith({
        where: { studentId: 'student-1', attempts: { gte: 5 } },
      });
    });

    it('returns at most 5 keys', async () => {
      prismaMock.keystrokeStat.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          char: String(i),
          attempts: 10,
          errors: i,
        })),
      );

      const result = await service.getWeakKeys('student-1');

      expect(result).toHaveLength(5);
    });
  });

  describe('getWeakKeysForStudents', () => {
    it('sums attempts/errors per character across students before ranking', async () => {
      prismaMock.keystrokeStat.findMany.mockResolvedValue([
        { char: 'f', attempts: 3, errors: 3, studentId: 'a' },
        { char: 'f', attempts: 3, errors: 0, studentId: 'b' },
        { char: 'j', attempts: 10, errors: 1, studentId: 'a' },
      ]);

      const result = await service.getWeakKeysForStudents(['a', 'b']);

      expect(prismaMock.keystrokeStat.findMany).toHaveBeenCalledWith({
        where: { studentId: { in: ['a', 'b'] } },
      });
      // 'f' soma 6 tentativas/3 erros (50%) -> passa do piso e fica na frente de 'j' (10%).
      expect(result.map((k) => k.char)).toEqual(['f', 'j']);
      expect(result[0].attempts).toBe(6);
      expect(result[0].errors).toBe(3);
    });

    it('excludes characters below the minimum combined attempts', async () => {
      prismaMock.keystrokeStat.findMany.mockResolvedValue([
        { char: 'f', attempts: 2, errors: 2, studentId: 'a' },
        { char: 'f', attempts: 2, errors: 0, studentId: 'b' },
      ]);

      const result = await service.getWeakKeysForStudents(['a', 'b']);

      expect(result).toEqual([]);
    });

    it('returns an empty list without querying when there are no students', async () => {
      const result = await service.getWeakKeysForStudents([]);

      expect(result).toEqual([]);
      expect(prismaMock.keystrokeStat.findMany).not.toHaveBeenCalled();
    });
  });
});
