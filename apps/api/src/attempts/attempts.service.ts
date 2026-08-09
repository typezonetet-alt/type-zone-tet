import { Injectable, NotFoundException } from '@nestjs/common';
import type { AttemptResult } from '@tt-digita/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import { GamificationService } from '../gamification/gamification.service';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import {
  assertPlausibleCounts,
  computeMetrics,
  METRICS_FORMULA_VERSION,
} from './metrics';

@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly gamification: GamificationService,
  ) {}

  async submit(
    studentId: string,
    dto: SubmitAttemptDto,
  ): Promise<AttemptResult> {
    assertPlausibleCounts(dto);

    const exercise = await this.prisma.exercise.findUnique({
      where: { id: dto.exerciseId },
      include: { world: true },
    });
    if (!exercise) {
      throw new NotFoundException('Exercício não encontrado.');
    }

    const previousBestAttempt = await this.prisma.attempt.findFirst({
      where: { studentId, exerciseId: dto.exerciseId },
      orderBy: { wpmNet: 'desc' },
    });

    const metrics = computeMetrics(dto);
    const finishedAt = new Date();
    const startedAt = new Date(finishedAt.getTime() - dto.durationMs);

    const attempt = await this.prisma.attempt.create({
      data: {
        studentId,
        exerciseId: dto.exerciseId,
        startedAt,
        finishedAt,
        durationMs: dto.durationMs,
        expectedChars: dto.expectedChars,
        typedChars: dto.typedChars,
        correctChars: dto.correctChars,
        incorrectChars: dto.incorrectChars,
        backspaces: dto.backspaces,
        wpmRaw: metrics.wpmRaw,
        wpmNet: metrics.wpmNet,
        accuracy: metrics.accuracy,
        consistency: metrics.consistency,
        formulaVersion: METRICS_FORMULA_VERSION,
      },
    });

    await this.stats.recordCharStats(studentId, dto.charStats);
    await this.gamification.recordExerciseAttempt(studentId, {
      exerciseId: dto.exerciseId,
      accuracy: metrics.accuracy,
      wpmNet: metrics.wpmNet,
      correctChars: dto.correctChars,
      incorrectChars: dto.incorrectChars,
      durationMs: dto.durationMs,
      minAccuracy: exercise.minAccuracy,
      targetWpm: exercise.targetWpm,
      allowedKeys: exercise.allowedKeys,
      worldOrder: exercise.world.order,
    });

    return {
      id: attempt.id,
      wpmRaw: attempt.wpmRaw,
      wpmNet: attempt.wpmNet,
      accuracy: attempt.accuracy,
      consistency: attempt.consistency,
      backspaces: attempt.backspaces,
      passed: attempt.accuracy >= exercise.minAccuracy,
      formulaVersion: attempt.formulaVersion,
      previousBest: previousBestAttempt
        ? {
            wpmNet: previousBestAttempt.wpmNet,
            accuracy: previousBestAttempt.accuracy,
          }
        : null,
    };
  }
}
