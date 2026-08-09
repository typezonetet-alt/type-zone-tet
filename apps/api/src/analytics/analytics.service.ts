import { Injectable } from '@nestjs/common';
import type { ProductAnalytics, WeeklyActiveRow } from '@tt-digita/shared';
import { PrismaService } from '../prisma/prisma.service';

const WEEKS_IN_TREND = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfWeekUtc(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // segunda-feira como inicio da semana
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // Metricas de produto (briefing secao 49). Le o platform inteiro (nao e
  // escopado por turma) -- e a visao de negocio do admin, nao um relatorio
  // operacional do professor (esses ficam no ReportsModule).
  async getProductAnalytics(): Promise<ProductAnalytics> {
    const now = new Date();

    const [
      totalStudents,
      attempts,
      dailyActivities,
      gameScoreStudents,
      gamesPlayedTotal,
      roomParticipantStudents,
      roomParticipationsTotal,
      roomCompletionsTotal,
      startedRooms,
    ] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.attempt.findMany({
        select: {
          studentId: true,
          exerciseId: true,
          accuracy: true,
          wpmNet: true,
          exercise: { select: { minAccuracy: true } },
        },
      }),
      this.prisma.dailyActivity.findMany({
        select: {
          studentId: true,
          date: true,
          secondsTrained: true,
          exercisesCompleted: true,
        },
      }),
      this.prisma.gameScore.groupBy({ by: ['studentId'] }),
      this.prisma.gameScore.count(),
      this.prisma.liveRoomParticipant.groupBy({ by: ['studentId'] }),
      this.prisma.liveRoomParticipant.count(),
      this.prisma.liveRoomParticipant.count({
        where: { position: { not: null } },
      }),
      this.prisma.liveRoom.findMany({
        where: { startedAt: { not: null } },
        select: { createdAt: true, startedAt: true },
      }),
    ]);

    // Ativacao + qualidade media: uma so passada pelos attempts.
    const passedPairs = new Set<string>();
    let accuracySum = 0;
    let wpmSum = 0;
    const activatedStudentIds = new Set<string>();
    for (const attempt of attempts) {
      accuracySum += attempt.accuracy;
      wpmSum += attempt.wpmNet;
      if (attempt.accuracy >= attempt.exercise.minAccuracy) {
        passedPairs.add(`${attempt.studentId}|${attempt.exerciseId}`);
        activatedStudentIds.add(attempt.studentId);
      }
    }

    // Frequencia: minutos totais, alunos ativos nos ultimos 7 dias, e
    // "pratica qualificada" (dias em que o aluno de fato concluiu algo).
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const activeLast7 = new Set<string>();
    let totalSeconds = 0;
    let qualifiedSeconds = 0;
    const qualifiedStudentIds = new Set<string>();
    const weekBuckets = new Map<string, Set<string>>();
    const trendStart = new Date(now.getTime() - WEEKS_IN_TREND * 7 * DAY_MS);

    for (const activity of dailyActivities) {
      totalSeconds += activity.secondsTrained;
      if (activity.date >= sevenDaysAgo) {
        activeLast7.add(activity.studentId);
      }
      if (activity.exercisesCompleted > 0) {
        qualifiedSeconds += activity.secondsTrained;
        qualifiedStudentIds.add(activity.studentId);
      }
      if (activity.date >= trendStart) {
        const weekKey = startOfWeekUtc(activity.date)
          .toISOString()
          .slice(0, 10);
        const bucket = weekBuckets.get(weekKey) ?? new Set<string>();
        bucket.add(activity.studentId);
        weekBuckets.set(weekKey, bucket);
      }
    }

    const weeklyActiveTrend: WeeklyActiveRow[] = Array.from(
      weekBuckets.entries(),
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, students]) => ({
        weekStart,
        activeStudents: students.size,
      }));

    const roomStartDelays = startedRooms
      .filter((room) => room.startedAt !== null)
      .map(
        (room) => (room.startedAt!.getTime() - room.createdAt.getTime()) / 1000,
      );

    return {
      totalStudents,
      activatedStudents: activatedStudentIds.size,
      activationRate:
        totalStudents > 0 ? activatedStudentIds.size / totalStudents : 0,
      activeStudentsLast7Days: activeLast7.size,
      weeklyActiveTrend,
      totalPracticeMinutes: Math.round((totalSeconds / 60) * 10) / 10,
      qualifiedPracticeMinutesPerActiveStudent:
        qualifiedStudentIds.size > 0
          ? Math.round(
              (qualifiedSeconds / 60 / qualifiedStudentIds.size) * 10,
            ) / 10
          : 0,
      exercisesCompletedTotal: passedPairs.size,
      averageAccuracy:
        attempts.length > 0 ? accuracySum / attempts.length : null,
      averageWpmNet: attempts.length > 0 ? wpmSum / attempts.length : null,
      gamesPlayedTotal,
      studentsWhoPlayedGames: gameScoreStudents.length,
      roomParticipationsTotal,
      studentsWhoJoinedRooms: roomParticipantStudents.length,
      roomCompletionsTotal,
      averageSecondsToStartRoom:
        roomStartDelays.length > 0
          ? Math.round(
              roomStartDelays.reduce((sum, s) => sum + s, 0) /
                roomStartDelays.length,
            )
          : null,
    };
  }
}
