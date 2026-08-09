import "server-only";
import { cookies } from "next/headers";
import type {
  AchievementView,
  AdaptiveSessionItem,
  AdminOverview,
  AuditLogQuery,
  AuditLogRow,
  ProductAnalytics,
  ClassDetail,
  ClassSummary,
  CosmeticView,
  DateRangeQuery,
  ExerciseDetail,
  ExerciseSummary,
  GameBest,
  LeaderboardEntry,
  LeaderboardScope,
  MissionView,
  PracticeFrequencyRow,
  ProfileView,
  RoomResultRow,
  SeasonView,
  StudentEvolutionRow,
  TeacherSummary,
  TrailCompletionRow,
  WeakKey,
  WorldSummary,
} from "@tt-digita/shared";
import { API_URL } from "./api";

async function serverFetch<T>(path: string): Promise<{ status: number; data: T | null }> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(`${API_URL}${path}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) {
    return { status: res.status, data: null };
  }
  return { status: res.status, data: (await res.json()) as T };
}

export async function getServerExercises(): Promise<ExerciseSummary[]> {
  const { data } = await serverFetch<ExerciseSummary[]>("/exercises");
  return data ?? [];
}

export async function getServerExercise(
  id: string,
): Promise<{ status: number; exercise: ExerciseDetail | null }> {
  const { status, data } = await serverFetch<ExerciseDetail>(`/exercises/${id}`);
  return { status, exercise: data };
}

export async function getServerWorlds(): Promise<WorldSummary[]> {
  const { data } = await serverFetch<WorldSummary[]>("/worlds");
  return data ?? [];
}

export async function getServerAdaptiveSession(): Promise<AdaptiveSessionItem[]> {
  const { data } = await serverFetch<AdaptiveSessionItem[]>("/exercises/session");
  return data ?? [];
}

// Recordes de todos os jogos de uma vez -- o arcade (/jogar) mostra o recorde
// em cada gabinete, então precisa dos 5 juntos. Em paralelo: são 5 chamadas
// independentes e a página não deve esperar uma fila.
export async function getServerGameBests(
  slugs: readonly string[],
): Promise<Record<string, GameBest | null>> {
  const entries = await Promise.all(
    slugs.map(async (slug) => {
      const { data } = await serverFetch<GameBest>(`/games/${slug}/best`);
      return [slug, data] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function getServerWeakKeys(): Promise<WeakKey[]> {
  const { data } = await serverFetch<WeakKey[]>("/stats/weak-keys");
  return data ?? [];
}

export async function getServerClasses(): Promise<ClassSummary[]> {
  const { data } = await serverFetch<ClassSummary[]>("/classes");
  return data ?? [];
}

export async function getServerClass(
  id: string,
): Promise<{ status: number; classDetail: ClassDetail | null }> {
  const { status, data } = await serverFetch<ClassDetail>(`/classes/${id}`);
  return { status, classDetail: data };
}

export async function getServerAdminOverview(): Promise<AdminOverview | null> {
  const { data } = await serverFetch<AdminOverview>("/admin/overview");
  return data;
}

export async function getServerTeachers(): Promise<TeacherSummary[]> {
  const { data } = await serverFetch<TeacherSummary[]>("/admin/teachers");
  return data ?? [];
}

export async function getServerProfile(): Promise<ProfileView | null> {
  const { data } = await serverFetch<ProfileView>("/gamification/profile");
  return data;
}

export async function getServerMissions(): Promise<MissionView[]> {
  const { data } = await serverFetch<MissionView[]>("/gamification/missions");
  return data ?? [];
}

export async function getServerAchievements(): Promise<AchievementView[]> {
  const { data } = await serverFetch<AchievementView[]>("/gamification/achievements");
  return data ?? [];
}

export async function getServerCosmetics(): Promise<CosmeticView[]> {
  const { data } = await serverFetch<CosmeticView[]>("/gamification/cosmetics");
  return data ?? [];
}

export async function getServerSeason(): Promise<SeasonView | null> {
  const { data } = await serverFetch<SeasonView>("/gamification/season");
  return data;
}

export async function getServerLeaderboard(
  scope: LeaderboardScope,
): Promise<LeaderboardEntry[]> {
  const { data } = await serverFetch<LeaderboardEntry[]>(
    `/gamification/leaderboard?scope=${scope}`,
  );
  return data ?? [];
}

function rangeQuery(range?: DateRangeQuery): string {
  const params = new URLSearchParams();
  if (range?.from) params.set("from", range.from);
  if (range?.to) params.set("to", range.to);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function getServerPracticeFrequency(
  classId: string,
  range?: DateRangeQuery,
): Promise<PracticeFrequencyRow[]> {
  const { data } = await serverFetch<PracticeFrequencyRow[]>(
    `/classes/${classId}/reports/practice-frequency${rangeQuery(range)}`,
  );
  return data ?? [];
}

export async function getServerTrailCompletion(
  classId: string,
): Promise<TrailCompletionRow[]> {
  const { data } = await serverFetch<TrailCompletionRow[]>(
    `/classes/${classId}/reports/trail-completion`,
  );
  return data ?? [];
}

export async function getServerStudentEvolution(
  classId: string,
  studentId: string,
  range?: DateRangeQuery,
): Promise<StudentEvolutionRow[]> {
  const { data } = await serverFetch<StudentEvolutionRow[]>(
    `/classes/${classId}/reports/students/${studentId}/evolution${rangeQuery(range)}`,
  );
  return data ?? [];
}

export async function getServerSeasonRankingForClass(
  classId: string,
): Promise<LeaderboardEntry[]> {
  const { data } = await serverFetch<LeaderboardEntry[]>(
    `/classes/${classId}/reports/season-ranking`,
  );
  return data ?? [];
}

export async function getServerRoomResults(roomId: string): Promise<RoomResultRow[]> {
  const { data } = await serverFetch<RoomResultRow[]>(`/rooms/${roomId}/results`);
  return data ?? [];
}

export async function getServerProductAnalytics(): Promise<ProductAnalytics | null> {
  const { data } = await serverFetch<ProductAnalytics>('/admin/analytics');
  return data;
}

export async function getServerAuditLog(query: AuditLogQuery): Promise<AuditLogRow[]> {
  const params = new URLSearchParams();
  if (query.userId) params.set("userId", query.userId);
  if (query.action) params.set("action", query.action);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  const qs = params.toString();
  const { data } = await serverFetch<AuditLogRow[]>(`/admin/audit-log${qs ? `?${qs}` : ""}`);
  return data ?? [];
}
