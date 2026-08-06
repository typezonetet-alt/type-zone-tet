export enum ExerciseType {
  KEY_SEQUENCE = "KEY_SEQUENCE",
  WORD_LIST = "WORD_LIST",
  BIGRAM = "BIGRAM",
  PHRASE = "PHRASE",
  NUMBERS = "NUMBERS",
  PROFESSIONAL_DATA = "PROFESSIONAL_DATA",
}

export interface WorldSummary {
  id: string;
  title: string;
  focus: string;
  order: number;
  hasContent: boolean;
}

export interface ExerciseSummary {
  id: string;
  worldId: string;
  title: string;
  type: ExerciseType;
  order: number;
  minAccuracy: number;
  targetWpm: number | null;
  unlocked: boolean;
  bestAccuracy: number | null;
}

export interface ExerciseDetail extends ExerciseSummary {
  content: string;
}

export interface CharStat {
  char: string;
  attempts: number;
  errors: number;
}

export interface AttemptSubmission {
  exerciseId: string;
  durationMs: number;
  expectedChars: number;
  typedChars: number;
  correctChars: number;
  incorrectChars: number;
  backspaces: number;
  charsPerSecondBuckets: number[];
  charStats: CharStat[];
}

export interface AttemptResult {
  id: string;
  wpmRaw: number;
  wpmNet: number;
  accuracy: number;
  consistency: number;
  backspaces: number;
  passed: boolean;
  formulaVersion: string;
  previousBest: {
    wpmNet: number;
    accuracy: number;
  } | null;
}

export interface WeakKey {
  char: string;
  attempts: number;
  errors: number;
  errorRate: number;
}
