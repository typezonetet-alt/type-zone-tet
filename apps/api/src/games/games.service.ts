import { Injectable } from '@nestjs/common';
import { GameType as PrismaGameType } from '@prisma/client';
import type {
  GameBest,
  GameScoreResult,
  SubmitGameScorePayload,
} from '@tt-digita/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async submitOrbitalScore(
    studentId: string,
    dto: SubmitGameScorePayload,
  ): Promise<GameScoreResult> {
    const previousBest = await this.prisma.gameScore.findFirst({
      where: { studentId, game: PrismaGameType.ORBITAL },
      orderBy: { score: 'desc' },
      select: { score: true },
    });

    const created = await this.prisma.gameScore.create({
      data: {
        studentId,
        game: PrismaGameType.ORBITAL,
        score: dto.score,
        wordsCompleted: dto.wordsCompleted,
        accuracy: dto.accuracy,
        durationMs: dto.durationMs,
      },
    });

    return {
      id: created.id,
      score: created.score,
      wordsCompleted: created.wordsCompleted,
      accuracy: created.accuracy,
      isNewBest: !previousBest || created.score > previousBest.score,
      previousBest: previousBest?.score ?? null,
    };
  }

  async getOrbitalBest(studentId: string): Promise<GameBest> {
    const best = await this.prisma.gameScore.findFirst({
      where: { studentId, game: PrismaGameType.ORBITAL },
      orderBy: { score: 'desc' },
    });

    return {
      score: best?.score ?? null,
      wordsCompleted: best?.wordsCompleted ?? null,
      accuracy: best?.accuracy ?? null,
    };
  }
}
