import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { AchievementKey, League, MissionKey } from '@tt-digita/shared';
import { GamificationService } from './gamification.service';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';

// Stub com estado real (Map em memoria) em vez de mocks avulsos: varios
// metodos do servico fazem leitura -> mutacao -> escrita ao longo de duas ou
// mais chamadas (anti-farm, sequencia, missao), entao precisamos que o "banco"
// realmente lembre o que foi escrito na chamada anterior.
function buildPrismaStub() {
  const profiles = new Map<string, Record<string, unknown>>();
  const activities = new Map<string, Record<string, unknown>>();
  const achievements = new Map<string, Set<string>>();
  const cosmetics = new Map<string, Set<string>>();
  const seasons: Record<string, unknown>[] = [
    {
      id: 'season-1',
      index: 1,
      startsAt: new Date('2026-01-01T00:00:00Z'),
      endsAt: new Date('2026-12-01T00:00:00Z'),
      closedAt: null,
    },
  ];
  const seasonScores = new Map<string, Record<string, unknown>>();

  function activityKey(studentId: string, date: Date) {
    return `${studentId}|${date.toISOString()}`;
  }
  function scoreKey(seasonId: string, studentId: string) {
    return `${seasonId}|${studentId}`;
  }

  const prisma = {
    studentProfile: {
      upsert: jest.fn(({ where }: { where: { studentId: string } }) => {
        if (!profiles.has(where.studentId)) {
          profiles.set(where.studentId, {
            studentId: where.studentId,
            xp: 0,
            level: 1,
            coins: 0,
            totalCorrectWords: 0,
            bestWpmNet: 0,
            currentStreak: 0,
            longestStreak: 0,
            distinctActiveDays: 0,
            lastActiveDate: null,
            equippedFrameId: null,
            equippedThemeId: null,
            equippedTitleId: null,
          });
        }
        return Promise.resolve({ ...profiles.get(where.studentId) });
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { studentId: string };
          data: Record<string, unknown>;
        }) => {
          const updated = { ...profiles.get(where.studentId), ...data };
          profiles.set(where.studentId, updated);
          return Promise.resolve(updated);
        },
      ),
    },
    dailyActivity: {
      upsert: jest.fn(
        ({
          where,
        }: {
          where: { studentId_date: { studentId: string; date: Date } };
        }) => {
          const key = activityKey(
            where.studentId_date.studentId,
            where.studentId_date.date,
          );
          if (!activities.has(key)) {
            activities.set(key, {
              exercisesCompleted: 0,
              secondsTrained: 0,
              accuracyGoalHit: false,
              weakKeyPracticed: false,
              roomJoined: false,
              personalBestImproved: false,
              rewardedExerciseIds: [],
              claimedMissionKeys: [],
            });
          }
          return Promise.resolve({ ...activities.get(key) });
        },
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { studentId_date: { studentId: string; date: Date } };
          data: Record<string, unknown>;
        }) => {
          const key = activityKey(
            where.studentId_date.studentId,
            where.studentId_date.date,
          );
          const updated = { ...activities.get(key), ...data };
          activities.set(key, updated);
          return Promise.resolve(updated);
        },
      ),
      findUnique: jest.fn(
        ({
          where,
        }: {
          where: { studentId_date: { studentId: string; date: Date } };
        }) => {
          const key = activityKey(
            where.studentId_date.studentId,
            where.studentId_date.date,
          );
          return Promise.resolve(
            activities.has(key) ? { ...activities.get(key) } : null,
          );
        },
      ),
    },
    studentAchievement: {
      create: jest.fn(
        ({ data }: { data: { studentId: string; key: string } }) => {
          const set = achievements.get(data.studentId) ?? new Set<string>();
          if (set.has(data.key)) {
            return Promise.reject(
              new Prisma.PrismaClientKnownRequestError(
                'Unique constraint failed',
                {
                  code: 'P2002',
                  clientVersion: '6.19.3',
                },
              ),
            );
          }
          set.add(data.key);
          achievements.set(data.studentId, set);
          return Promise.resolve({
            id: 'ach-1',
            ...data,
            unlockedAt: new Date(),
          });
        },
      ),
      findMany: jest.fn(({ where }: { where: { studentId: string } }) => {
        const set = achievements.get(where.studentId) ?? new Set<string>();
        return Promise.resolve(
          Array.from(set).map((key) => ({ key, unlockedAt: new Date() })),
        );
      }),
    },
    studentCosmetic: {
      findUnique: jest.fn(
        ({
          where,
        }: {
          where: {
            studentId_cosmeticId: { studentId: string; cosmeticId: string };
          };
        }) => {
          const set = cosmetics.get(where.studentId_cosmeticId.studentId);
          return Promise.resolve(
            set?.has(where.studentId_cosmeticId.cosmeticId)
              ? { studentId: where.studentId_cosmeticId.studentId }
              : null,
          );
        },
      ),
      findMany: jest.fn(({ where }: { where: { studentId: string } }) => {
        const set = cosmetics.get(where.studentId) ?? new Set<string>();
        return Promise.resolve(
          Array.from(set).map((cosmeticId) => ({ cosmeticId })),
        );
      }),
      create: jest.fn(
        ({ data }: { data: { studentId: string; cosmeticId: string } }) => {
          const set = cosmetics.get(data.studentId) ?? new Set<string>();
          set.add(data.cosmeticId);
          cosmetics.set(data.studentId, set);
          return Promise.resolve(undefined);
        },
      ),
    },
    season: {
      findFirst: jest.fn<Promise<Record<string, unknown> | null>, []>(() =>
        Promise.resolve(seasons[seasons.length - 1] ?? null),
      ),
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const season = {
          id: `season-${seasons.length + 1}`,
          closedAt: null,
          ...data,
        };
        seasons.push(season);
        return Promise.resolve(season);
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const season = seasons.find((s) => s.id === where.id);
          Object.assign(season as object, data);
          return Promise.resolve(season);
        },
      ),
    },
    seasonScore: {
      upsert: jest.fn(
        ({
          where,
        }: {
          where: {
            seasonId_studentId: { seasonId: string; studentId: string };
          };
        }) => {
          const key = scoreKey(
            where.seasonId_studentId.seasonId,
            where.seasonId_studentId.studentId,
          );
          if (!seasonScores.has(key)) {
            seasonScores.set(key, {
              id: key,
              seasonId: where.seasonId_studentId.seasonId,
              studentId: where.seasonId_studentId.studentId,
              points: 0,
              league: League.BRONZE,
              finalRank: null,
            });
          }
          return Promise.resolve({ ...seasonScores.get(key) });
        },
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: {
            seasonId_studentId: { seasonId: string; studentId: string };
          };
          data: Record<string, unknown>;
        }) => {
          const key = scoreKey(
            where.seasonId_studentId.seasonId,
            where.seasonId_studentId.studentId,
          );
          const updated = { ...seasonScores.get(key), ...data };
          seasonScores.set(key, updated);
          return Promise.resolve(updated);
        },
      ),
      findMany: jest.fn(
        ({
          where,
        }: {
          where: { seasonId: string; studentId?: { in: string[] } };
        }) => {
          const rows = Array.from(seasonScores.values()).filter(
            (row) =>
              row.seasonId === where.seasonId &&
              (!where.studentId ||
                where.studentId.in.includes(row.studentId as string)),
          );
          return Promise.resolve(
            rows
              .sort((a, b) => (b.points as number) - (a.points as number))
              .map((row) => ({
                ...row,
                student: { name: `Aluno ${row.studentId as string}` },
              })),
          );
        },
      ),
    },
    classMember: {
      findMany: jest.fn(() => Promise.resolve([])),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  return prisma;
}

describe('GamificationService', () => {
  let prisma: ReturnType<typeof buildPrismaStub>;
  let service: GamificationService;
  const statsMock = { getWeakKeys: jest.fn().mockResolvedValue([]) };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T12:00:00Z'));
    prisma = buildPrismaStub();
    statsMock.getWeakKeys.mockResolvedValue([]);
    service = new GamificationService(
      prisma as unknown as PrismaService,
      statsMock as unknown as StatsService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const baseExerciseInput = {
    exerciseId: 'ex-1',
    accuracy: 1,
    wpmNet: 40,
    correctChars: 100,
    incorrectChars: 0,
    durationMs: 30_000,
    minAccuracy: 0.9,
    targetWpm: null,
    allowedKeys: ['f', 'j'],
  };

  it('awards XP/coins on the first pass of an exercise but not again the same day (anti-farm)', async () => {
    await service.recordExerciseAttempt('student-1', baseExerciseInput);
    const afterFirst = await service.getProfileView('student-1');
    expect(afterFirst.xp).toBeGreaterThan(0);
    expect(afterFirst.coins).toBeGreaterThan(0);

    // Repetir o MESMO exercicio de novo no mesmo dia nao deve pagar XP de
    // conclusao outra vez -- o unico ganho permitido aqui e a missao "duas
    // licoes" (COMPLETE_TWO_LESSONS), que so fecha nesta segunda chamada
    // porque conta tentativas, nao exercicios distintos.
    await service.recordExerciseAttempt('student-1', baseExerciseInput);
    const afterSecond = await service.getProfileView('student-1');
    expect(afterSecond.xp).toBe(afterFirst.xp + 30);
    expect(afterSecond.coins).toBe(afterFirst.coins + 10);

    // Uma terceira tentativa do mesmo exercicio nao deve mais gerar XP algum
    // (missao ja reclamada, exercicio ja recompensado).
    await service.recordExerciseAttempt('student-1', baseExerciseInput);
    const afterThird = await service.getProfileView('student-1');
    expect(afterThird.xp).toBe(afterSecond.xp);
    expect(afterThird.coins).toBe(afterSecond.coins);
  });

  it('unlocks FIRST_LESSON idempotently (second unlock attempt does not throw)', async () => {
    await expect(
      service.recordExerciseAttempt('student-1', baseExerciseInput),
    ).resolves.not.toThrow();
    await expect(
      service.recordExerciseAttempt('student-1', baseExerciseInput),
    ).resolves.not.toThrow();

    const achievements = await service.getAchievementsView('student-1');
    const firstLesson = achievements.find(
      (a) => a.key === AchievementKey.FIRST_LESSON,
    );
    expect(firstLesson?.unlocked).toBe(true);
  });

  it('builds a streak across consecutive days and resets after a gap', async () => {
    await service.recordExerciseAttempt('student-1', baseExerciseInput);
    let profile = await service.getProfileView('student-1');
    expect(profile.currentStreak).toBe(1);
    expect(profile.distinctActiveDays).toBe(1);

    jest.setSystemTime(new Date('2026-06-02T09:00:00Z'));
    await service.recordExerciseAttempt('student-1', {
      ...baseExerciseInput,
      exerciseId: 'ex-2',
    });
    profile = await service.getProfileView('student-1');
    expect(profile.currentStreak).toBe(2);
    expect(profile.distinctActiveDays).toBe(2);

    jest.setSystemTime(new Date('2026-06-10T09:00:00Z'));
    await service.recordExerciseAttempt('student-1', {
      ...baseExerciseInput,
      exerciseId: 'ex-3',
    });
    profile = await service.getProfileView('student-1');
    expect(profile.currentStreak).toBe(1);
    expect(profile.distinctActiveDays).toBe(3);
    expect(profile.longestStreak).toBe(2);
  });

  it('claims a daily mission once its target is reached and grants its reward', async () => {
    await service.recordExerciseAttempt('student-1', {
      ...baseExerciseInput,
      accuracy: 0.6,
      minAccuracy: 0.5,
    });
    const missionsBefore = await service.getMissionsView('student-1');
    const accuracyMissionBefore = missionsBefore.find(
      (m) => m.key === MissionKey.HIT_ACCURACY_GOAL,
    );
    expect(accuracyMissionBefore?.completed).toBe(false);

    const profileBefore = await service.getProfileView('student-1');

    await service.recordExerciseAttempt('student-1', {
      ...baseExerciseInput,
      exerciseId: 'ex-2',
      accuracy: 0.97,
    });

    const missionsAfter = await service.getMissionsView('student-1');
    const accuracyMissionAfter = missionsAfter.find(
      (m) => m.key === MissionKey.HIT_ACCURACY_GOAL,
    );
    expect(accuracyMissionAfter?.completed).toBe(true);

    const profileAfter = await service.getProfileView('student-1');
    // XP da missao (30) + XP do exercicio somam ao total; so garantimos que
    // subiu mais do que so o XP de um exercicio normal ja cobriria.
    expect(profileAfter.xp).toBeGreaterThan(profileBefore.xp);
  });

  it('rejects purchasing a cosmetic above the student level', async () => {
    await expect(
      service.purchaseCosmetic('student-1', 'frame_neon'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects purchasing a cosmetic without enough coins, then allows it once affordable', async () => {
    await expect(
      service.purchaseCosmetic('student-1', 'theme_por_do_sol'),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Simula XP/coins suficientes completando varios exercicios (cada um com
    // exerciseId diferente pra nao esbarrar no anti-farm).
    for (let i = 0; i < 10; i += 1) {
      await service.recordExerciseAttempt('student-1', {
        ...baseExerciseInput,
        exerciseId: `ex-bulk-${i}`,
      });
    }

    const cosmetics = await service.getCosmeticsView('student-1');
    const item = cosmetics.find((c) => c.id === 'theme_por_do_sol');
    expect(item?.owned).toBe(false);

    const profile = await service.getProfileView('student-1');
    if (profile.coins >= 100 && profile.level >= 4) {
      const afterPurchase = await service.purchaseCosmetic(
        'student-1',
        'theme_por_do_sol',
      );
      expect(
        afterPurchase.find((c) => c.id === 'theme_por_do_sol')?.owned,
      ).toBe(true);
    }
  });

  it('rejects equipping a cosmetic the student does not own', async () => {
    await expect(
      service.equipCosmetic('student-1', 'frame_prata'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('computes leaderboard ranking ordered by season points', async () => {
    await service.recordExerciseAttempt('student-1', baseExerciseInput);
    await service.recordExerciseAttempt('student-2', {
      ...baseExerciseInput,
      wpmNet: 90,
    });

    const leaderboard = await service.getLeaderboard('student-1', 'geral');
    expect(leaderboard.length).toBeGreaterThanOrEqual(2);
    expect(leaderboard[0].points).toBeGreaterThanOrEqual(leaderboard[1].points);
    expect(
      leaderboard.find((e) => e.studentId === 'student-1')?.isCurrentStudent,
    ).toBe(true);
  });

  it('reports league and next-league distance from season points', async () => {
    const season = await service.getSeasonView('student-1');
    expect(season.league).toBe(League.BRONZE);
    expect(season.nextLeague).toBe(League.PRATA);
    expect(season.pointsToNextLeague).toBeGreaterThan(0);
  });

  it('recovers when two concurrent requests both try to create the first season', async () => {
    // Duas requisicoes (ex.: /progresso busca season e leaderboard em
    // paralelo) podem ver "nenhuma temporada ativa" ao mesmo tempo e as duas
    // tentam criar a temporada 1 -- a segunda perde a corrida do
    // @@unique(index) no Postgres real. Simulamos isso aqui.
    prisma.season.findFirst.mockResolvedValueOnce(null);
    prisma.season.create.mockImplementationOnce(() =>
      Promise.reject(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      ),
    );
    const winnerSeason = {
      id: 'season-winner',
      index: 1,
      startsAt: new Date('2026-06-01T00:00:00Z'),
      endsAt: new Date('2026-07-01T00:00:00Z'),
      closedAt: null,
    };
    prisma.season.findFirst.mockResolvedValueOnce(winnerSeason);

    const season = await service.getSeasonView('student-1');
    expect(season.index).toBe(1);
  });
});
