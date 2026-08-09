// Analytics de produto (briefing secao 49). North Star = minutos de pratica
// qualificada por aluno ativo (conteudo elegivel + precisao minima atingida).
export interface WeeklyActiveRow {
  weekStart: string;
  activeStudents: number;
}

export interface ProductAnalytics {
  totalStudents: number;
  activatedStudents: number;
  activationRate: number;
  activeStudentsLast7Days: number;
  weeklyActiveTrend: WeeklyActiveRow[];
  totalPracticeMinutes: number;
  qualifiedPracticeMinutesPerActiveStudent: number;
  exercisesCompletedTotal: number;
  averageAccuracy: number | null;
  averageWpmNet: number | null;
  gamesPlayedTotal: number;
  studentsWhoPlayedGames: number;
  roomParticipationsTotal: number;
  studentsWhoJoinedRooms: number;
  roomCompletionsTotal: number;
  averageSecondsToStartRoom: number | null;
}
