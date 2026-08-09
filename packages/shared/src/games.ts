export enum GameType {
  ORBITAL = "ORBITAL",
  ROBO = "ROBO",
  CHUVA_PALAVRAS = "CHUVA_PALAVRAS",
  // DEFESA foi aposentado do arcade (repetia a mecânica do ORBITAL) e
  // substituído por FRUTA. Mantido só para não invalidar pontuações antigas.
  DEFESA = "DEFESA",
  FRUTA = "FRUTA",
  RITMO = "RITMO",
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
