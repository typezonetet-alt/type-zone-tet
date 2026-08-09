import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AuthenticatedUser,
  DateRangeQuery,
  LeaderboardEntry,
  PracticeFrequencyRow,
  StudentEvolutionRow,
  TrailCompletionRow,
} from '@tt-digita/shared';
import { League } from '@tt-digita/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ClassesService } from '../classes/classes.service';
import { GamificationService } from '../gamification/gamification.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classes: ClassesService,
    private readonly gamification: GamificationService,
  ) {}

  async practiceFrequency(
    user: AuthenticatedUser,
    classId: string,
    range: DateRangeQuery,
  ): Promise<PracticeFrequencyRow[]> {
    await this.classes.assertAccessToClass(user, classId);

    const members = await this.membersOf(classId);
    const studentIds = members.map((m) => m.studentId);

    const activities = await this.prisma.dailyActivity.findMany({
      where: {
        studentId: { in: studentIds },
        date: this.dateFilter(range),
      },
    });

    return members.map(({ studentId, studentName }) => {
      const own = activities.filter((a) => a.studentId === studentId);
      const totalMinutes =
        own.reduce((sum, a) => sum + a.secondsTrained, 0) / 60;
      const daysActive = own.length;
      return {
        studentId,
        studentName,
        daysActive,
        totalMinutes: Math.round(totalMinutes * 10) / 10,
        avgMinutesPerActiveDay:
          daysActive > 0
            ? Math.round((totalMinutes / daysActive) * 10) / 10
            : 0,
      };
    });
  }

  async trailCompletion(
    user: AuthenticatedUser,
    classId: string,
  ): Promise<TrailCompletionRow[]> {
    await this.classes.assertAccessToClass(user, classId);

    const members = await this.membersOf(classId);
    const studentIds = members.map((m) => m.studentId);

    const exercises = await this.prisma.exercise.findMany({
      where: { status: 'PUBLISHED' },
      include: { world: true },
      orderBy: [{ world: { order: 'asc' } }, { order: 'asc' }],
    });

    const attempts = await this.prisma.attempt.findMany({
      where: {
        studentId: { in: studentIds },
        exerciseId: { in: exercises.map((e) => e.id) },
      },
      select: {
        studentId: true,
        exerciseId: true,
        accuracy: true,
        wpmNet: true,
      },
    });

    const rows: TrailCompletionRow[] = [];
    for (const member of members) {
      for (const exercise of exercises) {
        const own = attempts.filter(
          (a) =>
            a.studentId === member.studentId && a.exerciseId === exercise.id,
        );
        const bestAccuracy = own.length
          ? Math.max(...own.map((a) => a.accuracy))
          : null;
        const bestAttemptAtBestAccuracy = own.find(
          (a) => a.accuracy === bestAccuracy,
        );
        rows.push({
          studentId: member.studentId,
          studentName: member.studentName,
          worldTitle: exercise.world.title,
          exerciseTitle: exercise.title,
          attempted: own.length > 0,
          passed: bestAccuracy !== null && bestAccuracy >= exercise.minAccuracy,
          bestAccuracy,
          bestWpmNet: bestAttemptAtBestAccuracy?.wpmNet ?? null,
        });
      }
    }
    return rows;
  }

  async studentEvolution(
    user: AuthenticatedUser,
    classId: string,
    studentId: string,
    range: DateRangeQuery,
  ): Promise<StudentEvolutionRow[]> {
    await this.classes.assertAccessToClass(user, classId);
    await this.assertStudentInClass(classId, studentId);

    const attempts = await this.prisma.attempt.findMany({
      where: { studentId, createdAt: this.dateFilter(range) },
      include: { exercise: { include: { world: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return attempts.map((attempt) => ({
      attemptId: attempt.id,
      date: attempt.createdAt.toISOString(),
      worldTitle: attempt.exercise.world.title,
      exerciseTitle: attempt.exercise.title,
      accuracy: attempt.accuracy,
      wpmNet: attempt.wpmNet,
      passed: attempt.accuracy >= attempt.exercise.minAccuracy,
    }));
  }

  async seasonRanking(
    user: AuthenticatedUser,
    classId: string,
  ): Promise<LeaderboardEntry[]> {
    await this.classes.assertAccessToClass(user, classId);

    const seasonId = await this.gamification.getActiveSeasonId();
    if (!seasonId) return [];

    const members = await this.membersOf(classId);
    const studentIds = members.map((m) => m.studentId);

    const scores = await this.prisma.seasonScore.findMany({
      where: { seasonId, studentId: { in: studentIds } },
      orderBy: { points: 'desc' },
      include: { student: { select: { name: true } } },
    });

    return scores.map((score, index) => ({
      studentId: score.studentId,
      name: score.student.name,
      points: score.points,
      league: score.league as League,
      rank: index + 1,
      isCurrentStudent: false,
    }));
  }

  private async membersOf(
    classId: string,
  ): Promise<{ studentId: string; studentName: string }[]> {
    const members = await this.prisma.classMember.findMany({
      where: { classId },
      include: { student: { select: { id: true, name: true } } },
    });
    return members.map((m) => ({
      studentId: m.student.id,
      studentName: m.student.name,
    }));
  }

  private async assertStudentInClass(
    classId: string,
    studentId: string,
  ): Promise<void> {
    const membership = await this.prisma.classMember.findUnique({
      where: { studentId_classId: { studentId, classId } },
    });
    if (!membership) {
      throw new NotFoundException('Aluno não está nesta turma.');
    }
  }

  private dateFilter(
    range: DateRangeQuery,
  ): { gte?: Date; lte?: Date } | undefined {
    if (!range.from && !range.to) return undefined;
    return {
      gte: range.from ? new Date(range.from) : undefined,
      lte: range.to ? new Date(range.to) : undefined,
    };
  }
}
