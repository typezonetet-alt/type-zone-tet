import type {
  AchievementView,
  AdminOverview,
  AttemptResult,
  AttemptSubmission,
  AuthenticatedUser,
  ClassDetail,
  ClassSummary,
  CosmeticView,
  CreateClassPayload,
  CreatedCredentials,
  CreateRoomPayload,
  CreateStudentPayload,
  CreateTeacherPayload,
  ExerciseDetail,
  ExerciseSummary,
  GameBest,
  GameScoreResult,
  LeaderboardEntry,
  LeaderboardScope,
  MissionView,
  ProfileView,
  RoomExerciseOption,
  RoomSummary,
  SeasonView,
  StaffLoginPayload,
  StudentLoginPayload,
  SubmitGameScorePayload,
  TeacherSummary,
  WeakKey,
  WorldSummary,
} from "@tt-digita/shared";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(" ");
    return body.message ?? "Não foi possível completar a operação.";
  } catch {
    return "Não foi possível completar a operação.";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    throw new ApiError(await parseErrorMessage(res), res.status);
  }

  return res.json() as Promise<T>;
}

export function loginStudent(payload: StudentLoginPayload) {
  return request<AuthenticatedUser>("/auth/login/student", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginStaff(payload: StaffLoginPayload) {
  return request<AuthenticatedUser>("/auth/login/staff", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return request<{ ok: true }>("/auth/logout", { method: "POST" });
}

export function getExercises() {
  return request<ExerciseSummary[]>("/exercises");
}

export function getExercise(id: string) {
  return request<ExerciseDetail>(`/exercises/${id}`);
}

export function submitAttempt(payload: AttemptSubmission) {
  return request<AttemptResult>("/attempts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getWorlds() {
  return request<WorldSummary[]>("/worlds");
}

export function getWeakKeys() {
  return request<WeakKey[]>("/stats/weak-keys");
}

export function getClasses() {
  return request<ClassSummary[]>("/classes");
}

export function getClass(id: string) {
  return request<ClassDetail>(`/classes/${id}`);
}

export function createClass(payload: CreateClassPayload) {
  return request<ClassSummary>("/classes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function archiveClass(id: string) {
  return request<ClassSummary>(`/classes/${id}/archive`, { method: "PATCH" });
}

export function createStudentInClass(classId: string, payload: CreateStudentPayload) {
  return request<CreatedCredentials>(`/classes/${classId}/students`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addExistingStudentToClass(classId: string, code: string) {
  return request<{ ok: true }>(`/classes/${classId}/members`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function removeStudentFromClass(classId: string, studentId: string) {
  return request<{ ok: true }>(`/classes/${classId}/members/${studentId}`, {
    method: "DELETE",
  });
}

export function getAdminOverview() {
  return request<AdminOverview>("/admin/overview");
}

export function getTeachers() {
  return request<TeacherSummary[]>("/admin/teachers");
}

export function createTeacher(payload: CreateTeacherPayload) {
  return request<CreatedCredentials>("/admin/teachers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resetStudentProgress(studentId: string) {
  return request<{ ok: true }>(`/admin/students/${studentId}/reset-progress`, {
    method: "POST",
  });
}

export function listRoomExercises() {
  return request<RoomExerciseOption[]>("/rooms/exercises");
}

export function createRoom(payload: CreateRoomPayload) {
  return request<RoomSummary>("/rooms", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getRoom(id: string) {
  return request<RoomSummary>(`/rooms/${id}`);
}

export function submitOrbitalScore(payload: SubmitGameScorePayload) {
  return request<GameScoreResult>("/games/orbital/scores", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getOrbitalBest() {
  return request<GameBest>("/games/orbital/best");
}

export function getGamificationProfile() {
  return request<ProfileView>("/gamification/profile");
}

export function getMissions() {
  return request<MissionView[]>("/gamification/missions");
}

export function getAchievements() {
  return request<AchievementView[]>("/gamification/achievements");
}

export function getCosmetics() {
  return request<CosmeticView[]>("/gamification/cosmetics");
}

export function purchaseCosmetic(cosmeticId: string) {
  return request<CosmeticView[]>(`/gamification/cosmetics/${cosmeticId}/purchase`, {
    method: "POST",
  });
}

export function equipCosmetic(cosmeticId: string) {
  return request<CosmeticView[]>(`/gamification/cosmetics/${cosmeticId}/equip`, {
    method: "POST",
  });
}

export function getSeason() {
  return request<SeasonView>("/gamification/season");
}

export function getLeaderboard(scope: LeaderboardScope = "geral") {
  return request<LeaderboardEntry[]>(`/gamification/leaderboard?scope=${scope}`);
}
