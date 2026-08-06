import "server-only";
import { cookies } from "next/headers";
import type {
  AdminOverview,
  ClassDetail,
  ClassSummary,
  ExerciseDetail,
  ExerciseSummary,
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
