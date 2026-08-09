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

// Niveis de dominio (briefing sec. 8): Bronze = concluiu ao menos uma vez;
// Prata = bateu a precisao alvo de forma consistente (não so na sorte);
// Ouro = Prata + velocidade alvo; Diamante = superou a meta com folga e
// consistencia. "none" = nunca tentado.
export type MasteryTier = "none" | "bronze" | "prata" | "ouro" | "diamante";

// Prata ou acima conta como "dominado" -- tanto pra destravar o proximo
// exercicio quanto pra decidir o que mostrar como concluido na trilha.
export function meetsMasteryBar(tier: MasteryTier): boolean {
  return tier === "prata" || tier === "ouro" || tier === "diamante";
}

export interface ExerciseSummary {
  id: string;
  worldId: string;
  title: string;
  type: ExerciseType;
  order: number;
  minAccuracy: number;
  targetWpm: number | null;
  minAttempts: number;
  unlocked: boolean;
  bestAccuracy: number | null;
  mastery: MasteryTier;
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

// Motor adaptativo (briefing secao 12): cada item da sessao recomendada carrega
// o bloco de origem para o frontend explicar "por que" aquele exercicio esta
// ali (revisao espacada, ataque a fraqueza, progresso normal ou um desafio).
export enum AdaptiveBlock {
  REVISAO = "revisao",
  FRAQUEZA = "fraqueza",
  ATUAL = "atual",
  DESAFIO = "desafio",
}

export interface AdaptiveSessionItem extends ExerciseSummary {
  block: AdaptiveBlock;
}
