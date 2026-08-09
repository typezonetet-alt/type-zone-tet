import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ExerciseType as PrismaExerciseType } from '@prisma/client';
import type {
  ExerciseDetail,
  ExerciseSummary,
  ExerciseType,
} from '@tt-digita/shared';
import { PrismaService } from '../prisma/prisma.service';
import { computeMastery, meetsUnlockBar, type MasteryAttempt } from './mastery';

// ExerciseType do Prisma e do pacote compartilhado tem os mesmos valores de
// string por design; o Prisma so gera seu proprio tipo (mesma situacao de Role
// em auth.service.ts).
function toSharedExerciseType(type: PrismaExerciseType): ExerciseType {
  return type as unknown as ExerciseType;
}

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForStudent(studentId: string): Promise<ExerciseSummary[]> {
    const exercises = await this.prisma.exercise.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ world: { order: 'asc' } }, { order: 'asc' }],
    });

    const attemptsByExercise = await this.attemptsByExercise(studentId);

    let previousUnlocked = true;
    return exercises.map((exercise) => {
      const attempts = attemptsByExercise.get(exercise.id) ?? [];
      const mastery = computeMastery(exercise, attempts);
      const bestAccuracy =
        attempts.length > 0
          ? Math.max(...attempts.map((a) => a.accuracy))
          : null;

      const unlocked = previousUnlocked;
      // Desbloquear o PRÓXIMO exercício não exige a sequência de minAttempts
      // do domínio (mastery) -- só ter alcançado a precisão mínima uma vez.
      // Ver o comentário de meetsUnlockBar em mastery.ts pra entender por quê
      // (essa distinção corrige um bug real: terminar a última atividade de
      // um mundo não desbloqueava o mundo seguinte até repetir a mesma
      // proficiência várias vezes seguidas).
      previousUnlocked = meetsUnlockBar(exercise.minAccuracy, bestAccuracy);

      return {
        id: exercise.id,
        worldId: exercise.worldId,
        title: exercise.title,
        type: toSharedExerciseType(exercise.type),
        order: exercise.order,
        minAccuracy: exercise.minAccuracy,
        targetWpm: exercise.targetWpm,
        minAttempts: exercise.minAttempts,
        unlocked,
        bestAccuracy,
        mastery,
      };
    });
  }

  async getForStudent(
    studentId: string,
    exerciseId: string,
  ): Promise<ExerciseDetail> {
    const exercises = await this.listForStudent(studentId);
    const summary = exercises.find((e) => e.id === exerciseId);

    if (!summary) {
      throw new NotFoundException('Exercício não encontrado.');
    }
    if (!summary.unlocked) {
      throw new ForbiddenException(
        'Este exercício ainda não foi desbloqueado.',
      );
    }

    const exercise = await this.prisma.exercise.findUniqueOrThrow({
      where: { id: exerciseId },
    });

    return { ...summary, content: exercise.content };
  }

  // Retorna as tentativas de cada exercicio ordenadas da mais antiga pra mais
  // recente -- o calculo de dominio olha a "janela" das ultimas tentativas,
  // nao so a melhor de sempre (ver mastery.ts).
  private async attemptsByExercise(
    studentId: string,
  ): Promise<Map<string, MasteryAttempt[]>> {
    const attempts = await this.prisma.attempt.findMany({
      where: { studentId },
      orderBy: { finishedAt: 'asc' },
      select: {
        exerciseId: true,
        accuracy: true,
        wpmNet: true,
        consistency: true,
      },
    });

    const byExercise = new Map<string, MasteryAttempt[]>();
    for (const attempt of attempts) {
      const list = byExercise.get(attempt.exerciseId) ?? [];
      list.push({
        accuracy: attempt.accuracy,
        wpmNet: attempt.wpmNet,
        consistency: attempt.consistency,
      });
      byExercise.set(attempt.exerciseId, list);
    }
    return byExercise;
  }
}
