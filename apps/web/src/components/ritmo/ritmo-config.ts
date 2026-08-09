import { WORD_BANK, pointsForTier, type WordTier } from "../orbital/word-bank";

// Modo Ritmo (briefing secao 20): "o jogo premia consistencia, nao apenas
// pico de velocidade". Uma palavra aparece a cada batida; a cadência se
// ajusta ao desempenho recente em vez de só acelerar sem parar.
//
// Bug real de playtest que motivou reescrever a mecânica: TODA palavra
// recebia a MESMA janela de tempo, então uma palavra de 4 letras e uma de
// 16 letras tinham exatamente o mesmo prazo -- fisicamente impossível pra
// segunda. O tempo por palavra agora é PROPORCIONAL ao tamanho dela, usando
// a mesma fórmula de WPM que o resto do produto já usa (ver
// apps/api/src/attempts/metrics.ts: `wpm = caracteres / 5 / minutos`, o
// padrão internacional de "1 palavra = 5 caracteres" pra medir velocidade de
// digitação). O que a cadência adaptativa ajusta agora é a META DE WPM, não
// mais um intervalo fixo em ms -- então a mesma meta de velocidade produz
// janelas de tempo diferentes, do tamanho certo, pra cada palavra.
export const BASE_TARGET_WPM = 18; // mesma faixa dos primeiros mundos da trilha (ver seed.ts)
export const MIN_TARGET_WPM = 12;
export const MAX_TARGET_WPM = 45;
export const WPM_STEP = 2;

/** Tempo fixo de leitura/decisão antes de começar a digitar -- igual pra qualquer palavra. */
export const REACTION_BUFFER_MS = 550;

export const ADAPT_WINDOW = 4;
export const START_LIVES = 3;
export const COMBO_BONUS_PER_STEP = 4;

/** ms por caractere pra uma meta de WPM -- inverso direto de wpm = chars/5/min. */
export function msPerChar(targetWpm: number): number {
  return 60_000 / (targetWpm * 5);
}

/** Janela de tempo pra uma palavra específica, numa meta de WPM. */
export function beatWindowForWord(word: string, targetWpm: number): number {
  return Math.round(REACTION_BUFFER_MS + word.length * msPerChar(targetWpm));
}

// Julgamento por batida -- referência de jogo de ritmo (osu!, Guitar Hero):
// dar um rótulo IMEDIATO pra cada acerto, não só um número escondido que só
// aparece no fim de jogo. É isso que ensina, na hora, o que "não corra,
// mantenha o ritmo" quer dizer -- terminar a palavra logo que ela aparece
// ("adiantado") é tão fora do compasso quanto terminar em cima da hora
// ("apertado"); o alvo é pousar no terço do meio da janela da batida.
export type Judgement = "adiantado" | "noRitmo" | "apertado";

const RUSHED_THRESHOLD = 0.28;
const LATE_THRESHOLD = 0.72;

export function judgementForOffset(offset: number): Judgement {
  if (offset < RUSHED_THRESHOLD) return "adiantado";
  if (offset > LATE_THRESHOLD) return "apertado";
  return "noRitmo";
}

/** Bônus por pousar no ponto certo da batida -- reforça em pontuação o que o rótulo já ensina. */
export const NO_RITMO_BONUS = 8;

// Nível, escolhido no menu (mesmo padrão do Fácil/Médio/Difícil da Salada T&T)
// -- controla a DIFICULDADE DAS PALAVRAS, e só isso. A meta de WPM é outra
// dimensão inteiramente separada, ajustada durante o jogo pelo desempenho
// (ver nextTargetWpm). Dificuldade e cadência não podem depender uma da
// outra -- foi exatamente essa dependência que causava "responsabilidade"
// aparecer bem na hora em que o jogo já estava tentando dar mais tempo.
export type RitmoLevel = "facil" | "medio" | "dificil";

export const RITMO_LEVELS: { key: RitmoLevel; label: string; description: string }[] = [
  { key: "facil", label: "Fácil", description: "Só palavras curtas." },
  { key: "medio", label: "Médio", description: "Começa curto, traz palavras médias." },
  { key: "dificil", label: "Difícil", description: "Começa curto, chega a palavras longas." },
];

// Metodologia (pedido explícito: "comecando com palavras curtas... e ir
// trazendo palavras maiores com o tempo determinado"): dentro de uma mesma
// partida, Médio/Difícil também começam só com palavras curtas -- a
// dificuldade da palavra sobe conforme BATIDAS ACERTADAS na própria sessão
// vão se acumulando, não desde a primeira palavra. Fácil nunca destrava
// nada (mantém a promessa de "só palavras curtas" o jogo inteiro).
const TIER_UNLOCK_BEATS: Record<RitmoLevel, { medium: number; long: number }> = {
  facil: { medium: Infinity, long: Infinity },
  medio: { medium: 5, long: Infinity },
  dificil: { medium: 4, long: 10 },
};

const LEVEL_TIER_WEIGHTS: Record<RitmoLevel, { short: number; medium: number; long: number }> = {
  facil: { short: 1, medium: 0, long: 0 },
  medio: { short: 0.6, medium: 0.4, long: 0 },
  dificil: { short: 0.3, medium: 0.45, long: 0.25 },
};

function pickTierForLevel(level: RitmoLevel, beatsCompleted: number): WordTier {
  const unlock = TIER_UNLOCK_BEATS[level];
  const mediumUnlocked = beatsCompleted >= unlock.medium;
  const longUnlocked = beatsCompleted >= unlock.long;

  if (!mediumUnlocked) return "short";

  const weights = LEVEL_TIER_WEIGHTS[level];
  const roll = Math.random();
  if (!longUnlocked) {
    // Só curta/média disponíveis: reparte a fatia que seria da longa pra curta,
    // preservando a proporção relativa entre curta e média.
    return roll < weights.short / (weights.short + weights.medium) ? "short" : "medium";
  }
  if (roll < weights.short) return "short";
  if (roll < weights.short + weights.medium) return "medium";
  return "long";
}

export function pickRitmoWord(
  level: RitmoLevel,
  beatsCompleted: number,
): { text: string; tier: WordTier } {
  const tier = pickTierForLevel(level, beatsCompleted);
  const options = WORD_BANK[tier];
  const text = options[Math.floor(Math.random() * options.length)];
  return { text, tier };
}

export function nextTargetWpm(currentWpm: number, missesInWindow: number): number {
  if (missesInWindow === 0) {
    return Math.min(MAX_TARGET_WPM, currentWpm + WPM_STEP);
  }
  if (missesInWindow >= 2) {
    return Math.max(MIN_TARGET_WPM, currentWpm - WPM_STEP * 2);
  }
  return currentWpm;
}

export { pointsForTier };
