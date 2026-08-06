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

    const bestByExercise = await this.bestAccuracyByExercise(studentId);

    let previousPassed = true;
    return exercises.map((exercise) => {
      const bestAccuracy = bestByExercise.get(exercise.id) ?? null;
      const unlocked = previousPassed;
      previousPassed =
        bestAccuracy !== null && bestAccuracy >= exercise.minAccuracy;

      return {
        id: exercise.id,
        worldId: exercise.worldId,
        title: exercise.title,
        type: toSharedExerciseType(exercise.type),
        order: exercise.order,
        minAccuracy: exercise.minAccuracy,
        targetWpm: exercise.targetWpm,
        unlocked,
        bestAccuracy,
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

  private async bestAccuracyByExercise(
    studentId: string,
  ): Promise<Map<string, number>> {
    const attempts = await this.prisma.attempt.findMany({
      where: { studentId },
      select: { exerciseId: true, accuracy: true },
    });

    const best = new Map<string, number>();
    for (const attempt of attempts) {
      const current = best.get(attempt.exerciseId);
      if (current === undefined || attempt.accuracy > current) {
        best.set(attempt.exerciseId, attempt.accuracy);
      }
    }
    return best;
  }
}
