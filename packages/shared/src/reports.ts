export type ReportFormat = "json" | "csv";

export interface DateRangeQuery {
  from?: string;
  to?: string;
}

export interface PracticeFrequencyRow {
  studentId: string;
  studentName: string;
  daysActive: number;
  totalMinutes: number;
  avgMinutesPerActiveDay: number;
}

export interface TrailCompletionRow {
  studentId: string;
  studentName: string;
  worldTitle: string;
  exerciseTitle: string;
  attempted: boolean;
  passed: boolean;
  bestAccuracy: number | null;
  bestWpmNet: number | null;
}

export interface StudentEvolutionRow {
  attemptId: string;
  date: string;
  worldTitle: string;
  exerciseTitle: string;
  accuracy: number;
  wpmNet: number;
  passed: boolean;
}

// Resultado agregado da sala inteira (pode ter várias rodadas -- ver
// LiveRoomParticipant/LiveRoomRoundResult). Métricas de digitação
// (wpmNet/accuracy) moram por rodada, não aqui -- não fazem sentido como
// número único quando a sala é de Jogo ou mistura rodadas com textos de
// tamanhos diferentes.
export interface RoomResultRow {
  studentId: string;
  studentName: string;
  position: number | null;
  totalPoints: number;
  roundsCompleted: number;
}

export interface AuditLogRow {
  id: string;
  userId: string | null;
  action: string;
  metadata: unknown;
  createdAt: string;
}

export interface AuditLogQuery {
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
}
