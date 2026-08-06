import { Injectable } from '@nestjs/common';
import type { CharStat, WeakKey } from '@tt-digita/shared';
import { PrismaService } from '../prisma/prisma.service';

const MIN_ATTEMPTS_FOR_RANKING = 5;
const WEAK_KEYS_LIMIT = 5;

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordCharStats(
    studentId: string,
    charStats: CharStat[],
  ): Promise<void> {
    for (const stat of charStats) {
      await this.prisma.keystrokeStat.upsert({
        where: { studentId_char: { studentId, char: stat.char } },
        update: {
          attempts: { increment: stat.attempts },
          errors: { increment: stat.errors },
        },
        create: {
          studentId,
          char: stat.char,
          attempts: stat.attempts,
          errors: stat.errors,
        },
      });
    }
  }

  async getWeakKeys(studentId: string): Promise<WeakKey[]> {
    const stats = await this.prisma.keystrokeStat.findMany({
      where: { studentId, attempts: { gte: MIN_ATTEMPTS_FOR_RANKING } },
    });

    return this.rank(
      stats.map((stat) => ({
        char: stat.char,
        attempts: stat.attempts,
        errors: stat.errors,
      })),
    );
  }

  // Mesmo ranking de getWeakKeys, mas somando as estatisticas de varios alunos
  // (turma) por caractere antes de aplicar o piso minimo de tentativas.
  async getWeakKeysForStudents(studentIds: string[]): Promise<WeakKey[]> {
    if (studentIds.length === 0) return [];

    const stats = await this.prisma.keystrokeStat.findMany({
      where: { studentId: { in: studentIds } },
    });

    const totals = new Map<string, { attempts: number; errors: number }>();
    for (const stat of stats) {
      const current = totals.get(stat.char) ?? { attempts: 0, errors: 0 };
      totals.set(stat.char, {
        attempts: current.attempts + stat.attempts,
        errors: current.errors + stat.errors,
      });
    }

    return this.rank(
      Array.from(totals.entries())
        .map(([char, total]) => ({ char, ...total }))
        .filter((entry) => entry.attempts >= MIN_ATTEMPTS_FOR_RANKING),
    );
  }

  private rank(
    entries: { char: string; attempts: number; errors: number }[],
  ): WeakKey[] {
    return entries
      .map((entry) => ({ ...entry, errorRate: entry.errors / entry.attempts }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, WEAK_KEYS_LIMIT);
  }
}
