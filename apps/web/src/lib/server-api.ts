import "server-only";
import { cookies } from "next/headers";
import type {
  AchievementView,
  AdminOverview,
  ClassDetail,
  ClassSummary,
  CosmeticView,
  ExerciseDetail,
  ExerciseSummary,
  LeaderboardEntry,
  LeaderboardScope,
  MissionView,
  ProfileView,
  SeasonView,
  TeacherSummary,
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
