import { Test, type TestingModule } from '@nestjs/testing';
import { GameType as PrismaGameType } from '@prisma/client';
import { GamesService } from './games.service';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';

describe('GamesService', () => {
  let service: GamesService;

  const prismaMock = {
    gameScore: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
  };

  const gamificationMock = {
    recordGameScore: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.gameScore.findFirst.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: GamificationService, useValue: gamificationMock },
      ],
    }).compile();

    service = module.get(GamesService);
  });

  describe('submitOrbitalScore', () => {
    it('marks the first score ever as a new best', async () => {
      prismaMock.gameScore.findFirst.mockResolvedValue(null);
      prismaMock.gameScore.create.mockResolvedValue({
        id: 'score-1',
        score: 500,
        wordsCompleted: 20,
        accuracy: 0.95,
      });

      const result = await service.submitOrbitalScore('student-1', {
        score: 500,
        wordsCompleted: 20,
        accuracy: 0.95,
        durationMs: 60_000,
      });

      expect(result.isNewBest).toBe(true);
      expect(result.previousBest).toBeNull();
    });

    it('flags a new best when the score beats the previous one', async () => {
      prismaMock.gameScore.findFirst.mockResolvedValue({ score: 300 });
      prismaMock.gameScore.create.mockResolvedValue({
        id: 'score-2',
        score: 500,
        wordsCompleted: 20,
        accuracy: 0.95,
      });

      const result = await service.submitOrbitalScore('student-1', {
        score: 500,
        wordsCompleted: 20,
        accuracy: 0.95,
        durationMs: 60_000,
      });

      expect(result.isNewBest).toBe(true);
      expect(result.previousBest).toBe(300);
    });

    it('does not flag a new best when the score is lower', async () => {
      prismaMock.gameScore.findFirst.mockResolvedValue({ score: 800 });
      prismaMock.gameScore.create.mockResolvedValue({
        id: 'score-3',
        score: 500,
        wordsCompleted: 20,
        accuracy: 0.95,
      });

      const result = await service.submitOrbitalScore('student-1', {
        score: 500,
        wordsCompleted: 20,
        accuracy: 0.95,
        durationMs: 60_000,
      });

      expect(result.isNewBest).toBe(false);
      expect(result.previousBest).toBe(800);
    });
  });

  describe('getOrbitalBest', () => {
    it('returns null fields when the student has never played', async () => {
      prismaMock.gameScore.findFirst.mockResolvedValue(null);

      const result = await service.getOrbitalBest('student-1');

      expect(result).toEqual({
        score: null,
        wordsCompleted: null,
        accuracy: null,
      });
    });

    it('returns the highest score row', async () => {
      prismaMock.gameScore.findFirst.mockResolvedValue({
        score: 900,
        wordsCompleted: 40,
        accuracy: 0.92,
      });

      const result = await service.getOrbitalBest('student-1');

      expect(result).toEqual({
        score: 900,
        wordsCompleted: 40,
        accuracy: 0.92,
      });
    });
  });

  describe('per-game type isolation', () => {
    const payload = {
      score: 100,
      wordsCompleted: 5,
      accuracy: 1,
      durationMs: 30_000,
    };

    const cases: Array<{
      label: string;
      game: PrismaGameType;
      submit: (studentId: string) => Promise<unknown>;
      getBest: (studentId: string) => Promise<unknown>;
    }> = [
      {
        label: 'ROBO',
        game: PrismaGameType.ROBO,
        submit: (studentId) => service.submitRoboScore(studentId, payload),
        getBest: (studentId) => service.getRoboBest(studentId),
      },
      {
        label: 'CHUVA_PALAVRAS',
        game: PrismaGameType.CHUVA_PALAVRAS,
        submit: (studentId) => service.submitChuvaScore(studentId, payload),
        getBest: (studentId) => service.getChuvaBest(studentId),
      },
      {
        label: 'DEFESA',
        game: PrismaGameType.DEFESA,
        submit: (studentId) => service.submitDefesaScore(studentId, payload),
        getBest: (studentId) => service.getDefesaBest(studentId),
      },
      {
        label: 'FRUTA',
        game: PrismaGameType.FRUTA,
        submit: (studentId) => service.submitFrutaScore(studentId, payload),
        getBest: (studentId) => service.getFrutaBest(studentId),
      },
      {
        label: 'RITMO',
        game: PrismaGameType.RITMO,
        submit: (studentId) => service.submitRitmoScore(studentId, payload),
        getBest: (studentId) => service.getRitmoBest(studentId),
      },
    ];

    for (const { label, game, submit, getBest } of cases) {
      it(`${label}: submit filters the previous-best lookup by its own game type`, async () => {
        prismaMock.gameScore.create.mockResolvedValue({
          id: `score-${label}`,
          score: 100,
          wordsCompleted: 5,
          accuracy: 1,
        });

        await submit('student-1');

        expect(prismaMock.gameScore.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({ where: { studentId: 'student-1', game } }),
        );
        expect(prismaMock.gameScore.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ game }) }),
        );
      });

      it(`${label}: getBest filters by its own game type`, async () => {
        await getBest('student-1');

        expect(prismaMock.gameScore.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({ where: { studentId: 'student-1', game } }),
        );
      });
    }
  });
});
