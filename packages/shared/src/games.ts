export enum GameType {
  ORBITAL = "ORBITAL",
}

export interface SubmitGameScorePayload {
  score: number;
  wordsCompleted: number;
  accuracy: number;
  durationMs: number;
}

export interface GameScoreResult {
  id: string;
  score: number;
  wordsCompleted: number;
  accuracy: number;
  isNewBest: boolean;
  previousBest: number | null;
}

export interface GameBest {
  score: number | null;
  wordsCompleted: number | null;
  accuracy: number | null;
}
