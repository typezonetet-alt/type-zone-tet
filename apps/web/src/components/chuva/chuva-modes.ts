import { WORD_BANK, pointsForTier, type WordTier } from "../orbital/word-bank";

// Modos da Chuva de Palavras (briefing secao 18). Diferente do T&T Orbital,
// aqui a dificuldade e FIXA por modo (nao cresce com o tempo/nivel) -- o
// aluno escolhe o desafio que quer antes de comecar.
export type ChuvaMode = "relaxado" | "normal" | "sobrevivencia" | "precisao" | "elite";

export interface ChuvaModeConfig {
  key: ChuvaMode;
  label: string;
  description: string;
  fallDurationMs: number;
  spawnIntervalMs: number;
  maxWordsOnScreen: number;
  lives: number;
  longWordBias: number;
  // Pontos perdidos por erro de tecla (so o modo Precisao usa isso de verdade).
  errorScorePenalty: number;
  // Chance de puxar um token com símbolos em vez de uma palavra do dicionário
  // (briefing sec. 18: Elite precisa de "palavras longas, símbolos e maior
  // densidade" -- sem isso, Elite era só "Normal com timer mais apertado").
  symbolBias: number;
}

export const CHUVA_MODES: ChuvaModeConfig[] = [
  {
    key: "relaxado",
    label: "Relaxado",
    description: "Poucas palavras, velocidade baixa.",
    fallDurationMs: 16000,
    spawnIntervalMs: 3200,
    maxWordsOnScreen: 2,
    lives: 5,
    longWordBias: 0.1,
    errorScorePenalty: 0,
    symbolBias: 0,
  },
  {
    key: "normal",
    label: "Normal",
    description: "Densidade crescente de palavras.",
    fallDurationMs: 11000,
    spawnIntervalMs: 2200,
    maxWordsOnScreen: 4,
    lives: 4,
    longWordBias: 0.3,
    errorScorePenalty: 0,
    symbolBias: 0,
  },
  {
    key: "sobrevivencia",
    label: "Sobrevivência",
    description: "Só três vidas -- cada palavra perdida conta.",
    fallDurationMs: 9000,
    spawnIntervalMs: 1800,
    maxWordsOnScreen: 4,
    lives: 3,
    longWordBias: 0.3,
    errorScorePenalty: 0,
    symbolBias: 0,
  },
  {
    key: "precisao",
    label: "Precisão",
    description: "Qualquer erro de tecla reduz sua pontuação.",
    fallDurationMs: 12000,
    spawnIntervalMs: 2400,
    maxWordsOnScreen: 3,
    lives: 5,
    longWordBias: 0.25,
    errorScorePenalty: 15,
    symbolBias: 0,
  },
  {
    key: "elite",
    label: "Elite",
    description: "Palavras longas, símbolos e densidade máxima.",
    fallDurationMs: 7000,
    spawnIntervalMs: 1400,
    maxWordsOnScreen: 5,
    lives: 3,
    longWordBias: 0.7,
    errorScorePenalty: 5,
    symbolBias: 0.3,
  },
];

export function modeConfig(mode: ChuvaMode): ChuvaModeConfig {
  return CHUVA_MODES.find((m) => m.key === mode) ?? CHUVA_MODES[1];
}

// Tokens curtos com símbolos comuns do teclado completo (briefing sec. 18 e
// sec. 22 "Modo Profissional") -- só o modo Elite os usa (symbolBias > 0).
const SYMBOL_TOKENS = [
  "50%", "R$99", "(ok)", "a&b", "1,99", "c++", "user@x", "24/7", "#tag", "de->para",
];

// Prioriza palavras com teclas fracas do aluno (secao 18: "o sistema pode
// selecionar palavras contendo teclas fracas") sem tornar o jogo 100%
// previsivel -- 70% de chance de puxar do subconjunto "com tecla fraca"
// quando existir alguma palavra assim na camada sorteada.
export function pickChuvaWord(
  mode: ChuvaModeConfig,
  weakChars: string[],
): { text: string; tier: WordTier } {
  if (mode.symbolBias > 0 && Math.random() < mode.symbolBias) {
    const text = SYMBOL_TOKENS[Math.floor(Math.random() * SYMBOL_TOKENS.length)];
    return { text, tier: "medium" };
  }

  const roll = Math.random();
  let tier: WordTier;
  if (roll < 0.55 - mode.longWordBias * 0.3) {
    tier = "short";
  } else if (roll < 0.85 - mode.longWordBias * 0.1) {
    tier = "medium";
  } else {
    tier = "long";
  }

  const pool = WORD_BANK[tier];
  const weakPool = weakChars.length
    ? pool.filter((word) => weakChars.some((char) => word.includes(char)))
    : [];

  const useWeak = weakPool.length > 0 && Math.random() < 0.7;
  const options = useWeak ? weakPool : pool;
  const text = options[Math.floor(Math.random() * options.length)];
  return { text, tier };
}

export { pointsForTier };
