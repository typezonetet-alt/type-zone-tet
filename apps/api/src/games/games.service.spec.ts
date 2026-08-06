import { Test, type TestingModule } from '@nestjs/testing';
import { GamesService } from './games.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GamesService', () => {
  let service: GamesService;

  const prismaMock = {
    gameScore: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.gameScore.findFirst.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: PrismaService, useValue: prismaMock },
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
});
