import type {
  AchievementView,
  AdminOverview,
  AttemptResult,
  AttemptSubmission,
  AuthenticatedUser,
  BulkImportResult,
  ClassDetail,
  ClassSummary,
  CosmeticView,
  CreateClassPayload,
  CreatedCredentials,
  CreateRoomPayload,
  CreateStudentPayload,
  CreateStudentsBulkPayload,
  CreateTeacherPayload,
  ExerciseDetail,
  ExerciseSummary,
  GameBest,
  GameScoreResult,
  LeaderboardEntry,
  LeaderboardScope,
  MissionView,
  ProfileView,
  RoomGameOption,
  RoomSummary,
  RoomWorldOption,
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

export function createStudentsBulk(classId: string, names: string[]) {
  const payload: CreateStudentsBulkPayload = { names };
  return request<BulkImportResult>(`/classes/${classId}/students/bulk`, {
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

export function listRoomWorlds() {
  return request<RoomWorldOption[]>("/rooms/worlds");
}

export function listRoomGames() {
  return request<RoomGameOption[]>("/rooms/games");
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

type GameSlug = "orbital" | "robo" | "chuva" | "defesa" | "fruta" | "ritmo";

function submitGameScore(game: GameSlug, payload: SubmitGameScorePayload) {
  return request<GameScoreResult>(`/games/${game}/scores`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function getGameBest(game: GameSlug) {
  return request<GameBest>(`/games/${game}/best`);
}

export function submitOrbitalScore(payload: SubmitGameScorePayload) {
  return submitGameScore("orbital", payload);
}

export function getOrbitalBest() {
  return getGameBest("orbital");
}

export function submitRoboScore(payload: SubmitGameScorePayload) {
  return submitGameScore("robo", payload);
}

export function getRoboBest() {
  return getGameBest("robo");
}

export function submitChuvaScore(payload: SubmitGameScorePayload) {
  return submitGameScore("chuva", payload);
}

export function getChuvaBest() {
  return getGameBest("chuva");
}

export function submitDefesaScore(payload: SubmitGameScorePayload) {
  return submitGameScore("defesa", payload);
}

export function getDefesaBest() {
  return getGameBest("defesa");
}

export function submitFrutaScore(payload: SubmitGameScorePayload) {
  return submitGameScore("fruta", payload);
}

export function getFrutaBest() {
  return getGameBest("fruta");
}

export function submitRitmoScore(payload: SubmitGameScorePayload) {
  return submitGameScore("ritmo", payload);
}

export function getRitmoBest() {
  return getGameBest("ritmo");
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
