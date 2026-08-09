import { Injectable } from '@nestjs/common';
import { GameType as PrismaGameType } from '@prisma/client';
import type {
  GameBest,
  GameScoreResult,
  SubmitGameScorePayload,
} from '@tt-digita/shared';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  private async submitScore(
    studentId: string,
    game: PrismaGameType,
    dto: SubmitGameScorePayload,
  ): Promise<GameScoreResult> {
    const previousBest = await this.prisma.gameScore.findFirst({
      where: { studentId, game },
      orderBy: { score: 'desc' },
      select: { score: true },
    });

    const created = await this.prisma.gameScore.create({
      data: {
        studentId,
        game,
        score: dto.score,
        wordsCompleted: dto.wordsCompleted,
        accuracy: dto.accuracy,
        durationMs: dto.durationMs,
      },
    });

    await this.gamification.recordGameScore(studentId, {
      wordsCompleted: dto.wordsCompleted,
      accuracy: dto.accuracy,
      durationMs: dto.durationMs,
      isFirstGameEver: !previousBest,
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

  private async getBest(
    studentId: string,
    game: PrismaGameType,
  ): Promise<GameBest> {
    const best = await this.prisma.gameScore.findFirst({
      where: { studentId, game },
      orderBy: { score: 'desc' },
    });

    return {
      score: best?.score ?? null,
      wordsCompleted: best?.wordsCompleted ?? null,
      accuracy: best?.accuracy ?? null,
    };
  }

  submitOrbitalScore(studentId: string, dto: SubmitGameScorePayload) {
    return this.submitScore(studentId, PrismaGameType.ORBITAL, dto);
  }

  getOrbitalBest(studentId: string) {
    return this.getBest(studentId, PrismaGameType.ORBITAL);
  }

  submitRoboScore(studentId: string, dto: SubmitGameScorePayload) {
    return this.submitScore(studentId, PrismaGameType.ROBO, dto);
  }

  getRoboBest(studentId: string) {
    return this.getBest(studentId, PrismaGameType.ROBO);
  }

  submitChuvaScore(studentId: string, dto: SubmitGameScorePayload) {
    return this.submitScore(studentId, PrismaGameType.CHUVA_PALAVRAS, dto);
  }

  getChuvaBest(studentId: string) {
    return this.getBest(studentId, PrismaGameType.CHUVA_PALAVRAS);
  }

  submitDefesaScore(studentId: string, dto: SubmitGameScorePayload) {
    return this.submitScore(studentId, PrismaGameType.DEFESA, dto);
  }

  getDefesaBest(studentId: string) {
    return this.getBest(studentId, PrismaGameType.DEFESA);
  }

  submitFrutaScore(studentId: string, dto: SubmitGameScorePayload) {
    return this.submitScore(studentId, PrismaGameType.FRUTA, dto);
  }

  getFrutaBest(studentId: string) {
    return this.getBest(studentId, PrismaGameType.FRUTA);
  }

  submitRitmoScore(studentId: string, dto: SubmitGameScorePayload) {
    return this.submitScore(studentId, PrismaGameType.RITMO, dto);
  }

  getRitmoBest(studentId: string) {
    return this.getBest(studentId, PrismaGameType.RITMO);
  }
}
