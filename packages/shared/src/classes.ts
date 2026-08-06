import type { WeakKey } from "./exercises";

export interface TeacherSummary {
  id: string;
  name: string;
  email: string;
  classCount: number;
}

export interface ClassSummary {
  id: string;
  name: string;
  course: string | null;
  shift: string | null;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  teacherId: string | null;
  teacherName: string | null;
  studentCount: number;
}

export interface StudentProgress {
  id: string;
  name: string;
  code: string;
  exercisesCompleted: number;
  exercisesTotal: number;
  bestAccuracyAvg: number | null;
  bestWpmAvg: number | null;
  lastPracticeAt: string | null;
}

export interface ClassDetail extends ClassSummary {
  students: StudentProgress[];
  weakKeys: WeakKey[];
}

export interface AdminOverview {
  teacherCount: number;
  classCount: number;
  studentCount: number;
}

export interface CreateClassPayload {
  name: string;
  course?: string;
  shift?: string;
  teacherId?: string;
}

export interface CreateTeacherPayload {
  name: string;
  email: string;
}

export interface CreateStudentPayload {
  name: string;
  code?: string;
}

export interface CreatedCredentials {
  code: string | null;
  email: string | null;
  temporaryPassword: string;
}
