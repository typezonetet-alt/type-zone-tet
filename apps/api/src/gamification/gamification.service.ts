import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  DailyActivity,
  Season,
  SeasonScore,
  StudentProfile,
} from '@prisma/client';
import {
  AchievementKey,
  CosmeticType,
  League,
  MissionKey,
  type AchievementView,
  type CosmeticView,
  type LeaderboardEntry,
  type LeaderboardScope,
  type MissionView,
  type ProfileView,
  type SeasonView,
} from '@tt-digita/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import {
  ACHIEVEMENT_CATALOG,
  COINS_PER_MISSION,
  COSMETIC_CATALOG,
  DAILY_GAME_XP_CAP,
  MISSION_CATALOG,
  XP_PER_MISSION,
  coinsForXp,
  dateOnlyUtc,
  isDiamondMastery,
  leagueForPoints,
  nextLeague,
  seasonLengthDays,
  xpForExerciseCompletion,
  xpForRoomFinish,
  xpProgress,
} from './gamification.constants';

interface Ctx {
  studentId: string;
  today: Date;
  profile: StudentProfile;
  activity: DailyActivity;
  season: Season;
  seasonScore: SeasonScore;
}

interface DailyActivityCounters {
  exercisesCompleted: number;
  secondsTrained: number;
  accuracyGoalHit: boolean;
  weakKeyPracticed: boolean;
  roomJoined: boolean;
  personalBestImproved: boolean;
  claimedMissionKeys: string[];
}

export interface ExerciseAttemptGamificationInput {
  exerciseId: string;
  accuracy: number;
  wpmNet: number;
  correctChars: number;
  incorrectChars: number;
  durationMs: number;
  minAccuracy: number;
  targetWpm: number | null;
  allowedKeys: string[];
  // Peso anti-farm do XP -- ver xpForExerciseCompletion.
  worldOrder: number;
}

// Agregado da sala inteira (pode ter varias rodadas, de exercicio ou de
// jogo) -- nao carrega wpmNet/accuracy porque essas metricas moram por
// rodada (LiveRoomRoundResult) e nao sao comparaveis entre rodada de jogo e
// rodada de digitacao. bestWpmNet/PERFECT_ACCURACY/NEW_PERSONAL_RECORD
// continuam sendo alimentados pela pratica solo (recordExerciseAttempt);
// aqui so o XP de sala e a conquista de primeira competicao.
export interface RoomFinishGamificationInput {
  finalPosition: number;
  participantCount: number;
  roundCount: number;
}

export interface GameScoreGamificationInput {
  wordsCompleted: number;
  accuracy: number;
  durationMs: number;
  isFirstGameEver: boolean;
}

@Injectable()
export class GamificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
  ) {}

  async recordExerciseAttempt(
    studentId: string,
    input: ExerciseAttemptGamificationInput,
  ): Promise<void> {
    const ctx = await this.loadContext(studentId);
    const passed = input.accuracy >= input.minAccuracy;

    this.registerStreak(ctx);
    ctx.activity.secondsTrained += Math.round(input.durationMs / 1000);
    if (passed) ctx.activity.exercisesCompleted += 1;
    if (input.accuracy >= 0.95) ctx.activity.accuracyGoalHit = true;

    if (input.allowedKeys.length > 0) {
      const weakKeys = await this.stats.getWeakKeys(studentId);
      if (weakKeys.some((wk) => input.allowedKeys.includes(wk.char))) {
        ctx.activity.weakKeyPracticed = true;
      }
    }

    const previousBestWpm = ctx.profile.bestWpmNet;
    let newRecord = false;
    if (input.wpmNet > previousBestWpm) {
      ctx.profile.bestWpmNet = input.wpmNet;
      if (previousBestWpm > 0) {
        ctx.activity.personalBestImproved = true;
        newRecord = true;
      }
    }

    if (
      passed &&
      !ctx.activity.rewardedExerciseIds.includes(input.exerciseId)
    ) {
      const xp = xpForExerciseCompletion(input.accuracy, input.worldOrder);
      this.addXp(ctx, xp);
      ctx.activity.rewardedExerciseIds = [
        ...ctx.activity.rewardedExerciseIds,
        input.exerciseId,
      ];
    }

    ctx.profile.totalCorrectWords += Math.round(input.correctChars / 5);

    this.evaluateMissions(ctx);
    await this.persist(ctx);

    if (passed) await this.unlock(studentId, AchievementKey.FIRST_LESSON);
    if (ctx.profile.totalCorrectWords >= 1000)
      await this.unlock(studentId, AchievementKey.THOUSAND_WORDS);
    if (ctx.profile.totalCorrectWords >= 10000)
      await this.unlock(studentId, AchievementKey.TEN_THOUSAND_WORDS);
    if (ctx.profile.distinctActiveDays >= 7)
      await this.unlock(studentId, AchievementKey.SEVEN_DAY_STREAK);
    if (
      isDiamondMastery(
        input.accuracy,
        input.incorrectChars,
        input.wpmNet,
        input.targetWpm,
      )
    )
      await this.unlock(studentId, AchievementKey.FIRST_DIAMOND_MASTERY);
    if (input.accuracy >= 1)
      await this.unlock(studentId, AchievementKey.PERFECT_ACCURACY);
    if (newRecord)
      await this.unlock(studentId, AchievementKey.NEW_PERSONAL_RECORD);
  }

  async recordRoomFinish(
    studentId: string,
    input: RoomFinishGamificationInput,
  ): Promise<void> {
    const ctx = await this.loadContext(studentId);
    this.registerStreak(ctx);
    ctx.activity.roomJoined = true;

    this.addXp(ctx, xpForRoomFinish(input));
    this.evaluateMissions(ctx);
    await this.persist(ctx);

    await this.unlock(studentId, AchievementKey.FIRST_COMPETITION);
  }

  async recordGameScore(
    studentId: string,
    input: GameScoreGamificationInput,
  ): Promise<void> {
    const ctx = await this.loadContext(studentId);
    this.registerStreak(ctx);
    ctx.activity.secondsTrained += Math.round(input.durationMs / 1000);

    // Teto diario de XP de jogo (anti-farm): sem isso, jogar o mesmo jogo
    // facil o dia inteiro rendia XP ilimitado, ao contrario de exercicios
    // (que ja tem o teto natural de rewardedExerciseIds por exercicio).
    const rawXp =
      Math.min(80, 10 + input.wordsCompleted) +
      (input.isFirstGameEver ? 20 : 0);
    const remainingCap = Math.max(
      0,
      DAILY_GAME_XP_CAP - ctx.activity.gameXpEarnedToday,
    );
    const xp = Math.min(rawXp, remainingCap);
    ctx.activity.gameXpEarnedToday += xp;
    this.addXp(ctx, xp);
    this.evaluateMissions(ctx);
    await this.persist(ctx);

    if (input.accuracy >= 1 && input.wordsCompleted > 0)
      await this.unlock(studentId, AchievementKey.PERFECT_ACCURACY);
  }

  async getProfileView(studentId: string): Promise<ProfileView> {
    const profile = await this.ensureProfile(studentId);
    const progress = xpProgress(profile.xp);
    return {
      xp: profile.xp,
      level: progress.level,
      xpIntoLevel: progress.xpIntoLevel,
      xpForNextLevel: progress.xpForNextLevel,
      coins: profile.coins,
      totalCorrectWords: profile.totalCorrectWords,
      bestWpmNet: profile.bestWpmNet,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      distinctActiveDays: profile.distinctActiveDays,
      equippedFrameId: profile.equippedFrameId,
      equippedThemeId: profile.equippedThemeId,
      equippedTitleId: profile.equippedTitleId,
    };
  }

  async getMissionsView(studentId: string): Promise<MissionView[]> {
    const activity = await this.readDailyActivity(
      studentId,
      dateOnlyUtc(new Date()),
    );
    return MISSION_CATALOG.map((def) => {
      const progress = Math.min(
        def.target,
        this.missionProgress(activity, def.key),
      );
      return {
        key: def.key,
        title: def.title,
        description: def.description,
        target: def.target,
        progress,
        completed: activity.claimedMissionKeys.includes(def.key),
        xpReward: XP_PER_MISSION,
        coinReward: COINS_PER_MISSION,
      };
    });
  }

  async getAchievementsView(studentId: string): Promise<AchievementView[]> {
    const unlocked = await this.prisma.studentAchievement.findMany({
      where: { studentId },
    });
    const unlockedMap = new Map(unlocked.map((u) => [u.key, u.unlockedAt]));
    return ACHIEVEMENT_CATALOG.map((def) => ({
      key: def.key,
      title: def.title,
      description: def.description,
      unlocked: unlockedMap.has(def.key),
      unlockedAt: unlockedMap.get(def.key)?.toISOString() ?? null,
    }));
  }

  async getCosmeticsView(studentId: string): Promise<CosmeticView[]> {
    const profile = await this.ensureProfile(studentId);
    const owned = await this.prisma.studentCosmetic.findMany({
      where: { studentId },
    });
    const ownedIds = new Set(owned.map((o) => o.cosmeticId));
    const equippedIds = new Set(
      [
        profile.equippedFrameId,
        profile.equippedThemeId,
        profile.equippedTitleId,
      ].filter((id): id is string => id !== null),
    );
    return COSMETIC_CATALOG.map((def) => ({
      id: def.id,
      type: def.type,
      name: def.name,
      cost: def.cost,
      requiredLevel: def.requiredLevel,
      owned: ownedIds.has(def.id),
      equipped: equippedIds.has(def.id),
    }));
  }

  async purchaseCosmetic(
    studentId: string,
    cosmeticId: string,
  ): Promise<CosmeticView[]> {
    const def = COSMETIC_CATALOG.find((c) => c.id === cosmeticId);
    if (!def) throw new NotFoundException('Item não encontrado.');

    const profile = await this.ensureProfile(studentId);
    if (xpProgress(profile.xp).level < def.requiredLevel) {
      throw new BadRequestException(
        `Requer nível ${def.requiredLevel} para desbloquear este item.`,
      );
    }
    const alreadyOwned = await this.prisma.studentCosmetic.findUnique({
      where: { studentId_cosmeticId: { studentId, cosmeticId } },
    });
    if (alreadyOwned)
      throw new BadRequestException('Você já possui este item.');
    if (profile.coins < def.cost) {
      throw new BadRequestException('Moedas insuficientes.');
    }

    await this.prisma.$transaction([
      this.prisma.studentProfile.update({
        where: { studentId },
        data: { coins: { decrement: def.cost } },
      }),
      this.prisma.studentCosmetic.create({
        data: { studentId, cosmeticId: def.id, type: def.type },
      }),
    ]);

    return this.getCosmeticsView(studentId);
  }

  async equipCosmetic(
    studentId: string,
    cosmeticId: string,
  ): Promise<CosmeticView[]> {
    const def = COSMETIC_CATALOG.find((c) => c.id === cosmeticId);
    if (!def) throw new NotFoundException('Item não encontrado.');

    const owned = await this.prisma.studentCosmetic.findUnique({
      where: { studentId_cosmeticId: { studentId, cosmeticId } },
    });
    if (!owned)
      throw new BadRequestException('Você ainda não possui este item.');

    const field =
      def.type === CosmeticType.AVATAR_FRAME
        ? 'equippedFrameId'
        : def.type === CosmeticType.THEME
          ? 'equippedThemeId'
          : 'equippedTitleId';

    await this.ensureProfile(studentId);
    await this.prisma.studentProfile.update({
      where: { studentId },
      data: { [field]: def.id },
    });

    return this.getCosmeticsView(studentId);
  }

  // Leitura simples pro ReportsModule montar o ranking de uma turma especifica
  // -- nao cria temporada (isso so acontece no fluxo do aluno, via
  // getOrCreateActiveSeason) e retorna null se nenhuma existir ainda.
  async getActiveSeasonId(): Promise<string | null> {
    const season = await this.prisma.season.findFirst({
      where: { closedAt: null },
      orderBy: { index: 'desc' },
    });
    return season?.id ?? null;
  }

  async getSeasonView(studentId: string): Promise<SeasonView> {
    const season = await this.getOrCreateActiveSeason();
    const seasonScore = await this.ensureSeasonScore(season.id, studentId);
    const next = nextLeague(seasonScore.league as League);
    return {
      index: season.index,
      startsAt: season.startsAt.toISOString(),
      endsAt: season.endsAt.toISOString(),
      league: seasonScore.league as League,
      points: seasonScore.points,
      nextLeague: next?.league ?? null,
      pointsToNextLeague: next ? next.minPoints - seasonScore.points : null,
    };
  }

  async getLeaderboard(
    studentId: string,
    scope: LeaderboardScope,
  ): Promise<LeaderboardEntry[]> {
    const season = await this.getOrCreateActiveSeason();

    let studentIds: string[] | null = null;
    if (scope === 'turma') {
      const memberships = await this.prisma.classMember.findMany({
        where: { studentId },
        select: { classId: true },
      });
      const classIds = memberships.map((m) => m.classId);
      if (classIds.length === 0) {
        studentIds = [studentId];
      } else {
        const classmates = await this.prisma.classMember.findMany({
          where: { classId: { in: classIds } },
          select: { studentId: true },
        });
        studentIds = Array.from(new Set(classmates.map((c) => c.studentId)));
      }
    }

    const scores = await this.prisma.seasonScore.findMany({
      where: {
        seasonId: season.id,
        ...(studentIds ? { studentId: { in: studentIds } } : {}),
      },
      orderBy: { points: 'desc' },
      take: 50,
      include: { student: { select: { name: true } } },
    });

    return scores.map((score, index) => ({
      studentId: score.studentId,
      name: score.student.name,
      points: score.points,
      league: score.league as League,
      rank: index + 1,
      isCurrentStudent: score.studentId === studentId,
    }));
  }

  // --- internos ---

  private async loadContext(studentId: string): Promise<Ctx> {
    const profile = await this.ensureProfile(studentId);
    const today = dateOnlyUtc(new Date());
    const activity = await this.ensureDailyActivity(studentId, today);
    const season = await this.getOrCreateActiveSeason();
    const seasonScore = await this.ensureSeasonScore(season.id, studentId);
    return { studentId, today, profile, activity, season, seasonScore };
  }

  private registerStreak(ctx: Ctx): void {
    const { profile, today } = ctx;
    if (!profile.lastActiveDate) {
      profile.currentStreak = 1;
      profile.distinctActiveDays = 1;
    } else {
      const diffDays = Math.round(
        (today.getTime() - dateOnlyUtc(profile.lastActiveDate).getTime()) /
          86_400_000,
      );
      if (diffDays === 0) {
        // mesma atividade do dia, nao mexe na sequencia
      } else if (diffDays === 1) {
        profile.currentStreak += 1;
        profile.distinctActiveDays += 1;
      } else {
        profile.currentStreak = 1;
        profile.distinctActiveDays += 1;
      }
    }
    profile.longestStreak = Math.max(
      profile.longestStreak,
      profile.currentStreak,
    );
    profile.lastActiveDate = today;
  }

  private addXp(ctx: Ctx, xp: number): void {
    ctx.profile.xp += xp;
    ctx.profile.coins += coinsForXp(xp);
    ctx.seasonScore.points += xp;
  }

  private evaluateMissions(ctx: Ctx): void {
    for (const def of MISSION_CATALOG) {
      if (ctx.activity.claimedMissionKeys.includes(def.key)) continue;
      const progress = this.missionProgress(ctx.activity, def.key);
      if (progress >= def.target) {
        ctx.profile.xp += XP_PER_MISSION;
        ctx.profile.coins += COINS_PER_MISSION;
        ctx.seasonScore.points += XP_PER_MISSION;
        ctx.activity.claimedMissionKeys = [
          ...ctx.activity.claimedMissionKeys,
          def.key,
        ];
      }
    }
  }

  private missionProgress(
    activity: DailyActivityCounters,
    key: MissionKey,
  ): number {
    switch (key) {
      case MissionKey.COMPLETE_TWO_LESSONS:
        return activity.exercisesCompleted;
      case MissionKey.TRAIN_TEN_MINUTES:
        return activity.secondsTrained;
      case MissionKey.HIT_ACCURACY_GOAL:
        return activity.accuracyGoalHit ? 1 : 0;
      case MissionKey.PRACTICE_WEAK_KEY:
        return activity.weakKeyPracticed ? 1 : 0;
      case MissionKey.JOIN_ROOM:
        return activity.roomJoined ? 1 : 0;
      case MissionKey.IMPROVE_PERSONAL_AVERAGE:
        return activity.personalBestImproved ? 1 : 0;
      default:
        return 0;
    }
  }

  private async persist(ctx: Ctx): Promise<void> {
    ctx.profile.level = xpProgress(ctx.profile.xp).level;
    ctx.seasonScore.league = leagueForPoints(ctx.seasonScore.points);

    await this.prisma.$transaction([
      this.prisma.studentProfile.update({
        where: { studentId: ctx.studentId },
        data: {
          xp: ctx.profile.xp,
          level: ctx.profile.level,
          coins: ctx.profile.coins,
          totalCorrectWords: ctx.profile.totalCorrectWords,
          bestWpmNet: ctx.profile.bestWpmNet,
          currentStreak: ctx.profile.currentStreak,
          longestStreak: ctx.profile.longestStreak,
          distinctActiveDays: ctx.profile.distinctActiveDays,
          lastActiveDate: ctx.profile.lastActiveDate,
        },
      }),
      this.prisma.dailyActivity.update({
        where: {
          studentId_date: { studentId: ctx.studentId, date: ctx.today },
        },
        data: {
          exercisesCompleted: ctx.activity.exercisesCompleted,
          secondsTrained: ctx.activity.secondsTrained,
          accuracyGoalHit: ctx.activity.accuracyGoalHit,
          weakKeyPracticed: ctx.activity.weakKeyPracticed,
          roomJoined: ctx.activity.roomJoined,
          personalBestImproved: ctx.activity.personalBestImproved,
          rewardedExerciseIds: ctx.activity.rewardedExerciseIds,
          claimedMissionKeys: ctx.activity.claimedMissionKeys,
          gameXpEarnedToday: ctx.activity.gameXpEarnedToday,
        },
      }),
      this.prisma.seasonScore.update({
        where: {
          seasonId_studentId: {
            seasonId: ctx.season.id,
            studentId: ctx.studentId,
          },
        },
        data: {
          points: ctx.seasonScore.points,
          league: ctx.seasonScore.league,
        },
      }),
    ]);
  }

  private async unlock(studentId: string, key: AchievementKey): Promise<void> {
    try {
      await this.prisma.studentAchievement.create({ data: { studentId, key } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      throw error;
    }
  }

  private async ensureProfile(studentId: string): Promise<StudentProfile> {
    return this.prisma.studentProfile.upsert({
      where: { studentId },
      update: {},
      create: { studentId },
    });
  }

  private async ensureDailyActivity(
    studentId: string,
    date: Date,
  ): Promise<DailyActivity> {
    return this.prisma.dailyActivity.upsert({
      where: { studentId_date: { studentId, date } },
      update: {},
      create: { studentId, date },
    });
  }

  private async readDailyActivity(
    studentId: string,
    date: Date,
  ): Promise<DailyActivityCounters> {
    const row = await this.prisma.dailyActivity.findUnique({
      where: { studentId_date: { studentId, date } },
    });
    return (
      row ?? {
        exercisesCompleted: 0,
        secondsTrained: 0,
        accuracyGoalHit: false,
        weakKeyPracticed: false,
        roomJoined: false,
        personalBestImproved: false,
        claimedMissionKeys: [],
      }
    );
  }

  private async ensureSeasonScore(
    seasonId: string,
    studentId: string,
  ): Promise<SeasonScore> {
    return this.prisma.seasonScore.upsert({
      where: { seasonId_studentId: { seasonId, studentId } },
      update: {},
      create: { seasonId, studentId },
    });
  }

  private async getOrCreateActiveSeason(): Promise<Season> {
    const now = new Date();
    const latest = await this.prisma.season.findFirst({
      orderBy: { index: 'desc' },
    });
    if (latest && latest.endsAt > now && !latest.closedAt) return latest;
    if (latest && !latest.closedAt) await this.closeSeason(latest);

    try {
      return await this.prisma.season.create({
        data: {
          index: (latest?.index ?? 0) + 1,
          startsAt: now,
          endsAt: new Date(now.getTime() + seasonLengthDays() * 86_400_000),
        },
      });
    } catch (error) {
      // Duas requisicoes concorrentes podem cair aqui ao mesmo tempo (ex.: a
      // pagina /progresso busca season e leaderboard em paralelo) quando nao
      // ha temporada ativa -- a segunda perde a corrida do @@unique(index) e
      // so precisa reaproveitar a que a primeira acabou de criar.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const created = await this.prisma.season.findFirst({
          orderBy: { index: 'desc' },
        });
        if (created) return created;
      }
      throw error;
    }
  }

  // Fechamento de temporada (secao 27): grava a colocacao final de cada aluno
  // antes de abrir a proxima. O historico (SeasonScore antigo) fica intacto;
  // a nova temporada comeca do zero para todo mundo (redefine liga a partir
  // de zero ponto, versao simples de "reducao parcial preservando historico").
  private async closeSeason(season: Season): Promise<void> {
    const scores = await this.prisma.seasonScore.findMany({
      where: { seasonId: season.id },
      orderBy: { points: 'desc' },
    });
    await this.prisma.$transaction([
      this.prisma.season.update({
        where: { id: season.id },
        data: { closedAt: new Date() },
      }),
      ...scores.map((score, index) =>
        this.prisma.seasonScore.update({
          where: { id: score.id },
          data: { finalRank: index + 1 },
        }),
      ),
    ]);
  }
}
