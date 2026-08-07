export enum League {
  BRONZE = "BRONZE",
  PRATA = "PRATA",
  OURO = "OURO",
  PLATINA = "PLATINA",
  DIAMANTE = "DIAMANTE",
  MESTRE = "MESTRE",
  LENDA = "LENDA",
}

export enum CosmeticType {
  AVATAR_FRAME = "AVATAR_FRAME",
  THEME = "THEME",
  TITLE = "TITLE",
}

export enum AchievementKey {
  FIRST_LESSON = "FIRST_LESSON",
  THOUSAND_WORDS = "THOUSAND_WORDS",
  TEN_THOUSAND_WORDS = "TEN_THOUSAND_WORDS",
  SEVEN_DAY_STREAK = "SEVEN_DAY_STREAK",
  FIRST_DIAMOND_MASTERY = "FIRST_DIAMOND_MASTERY",
  FIRST_COMPETITION = "FIRST_COMPETITION",
  PERFECT_ACCURACY = "PERFECT_ACCURACY",
  NEW_PERSONAL_RECORD = "NEW_PERSONAL_RECORD",
}

export enum MissionKey {
  COMPLETE_TWO_LESSONS = "COMPLETE_TWO_LESSONS",
  TRAIN_TEN_MINUTES = "TRAIN_TEN_MINUTES",
  HIT_ACCURACY_GOAL = "HIT_ACCURACY_GOAL",
  PRACTICE_WEAK_KEY = "PRACTICE_WEAK_KEY",
  JOIN_ROOM = "JOIN_ROOM",
  IMPROVE_PERSONAL_AVERAGE = "IMPROVE_PERSONAL_AVERAGE",
}

export interface ProfileView {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  coins: number;
  totalCorrectWords: number;
  bestWpmNet: number;
  currentStreak: number;
  longestStreak: number;
  distinctActiveDays: number;
  equippedFrameId: string | null;
  equippedThemeId: string | null;
  equippedTitleId: string | null;
}

export interface MissionView {
  key: MissionKey;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  xpReward: number;
  coinReward: number;
}

export interface AchievementView {
  key: AchievementKey;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface CosmeticView {
  id: string;
  type: CosmeticType;
  name: string;
  cost: number;
  requiredLevel: number;
  owned: boolean;
  equipped: boolean;
}

export interface LeaderboardEntry {
  studentId: string;
  name: string;
  points: number;
  league: League;
  rank: number;
  isCurrentStudent: boolean;
}

export type LeaderboardScope = "geral" | "turma";

export interface SeasonView {
  index: number;
  startsAt: string;
  endsAt: string;
  league: League;
  points: number;
  nextLeague: League | null;
  pointsToNextLeague: number | null;
}
