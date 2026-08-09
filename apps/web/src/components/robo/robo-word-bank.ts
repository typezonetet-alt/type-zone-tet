// Desafios do T&T Robo: SÓ LETRAS AVULSAS (uma por obstáculo), nunca
// palavras. O jogo é de técnica de teclado -- reagir a uma tecla específica
// no tempo certo -- e não de soletrar. Palavra inteira obrigaria a parar e
// digitar uma sequência, o que quebra o ritmo de corrida.
//
// As fases sobem por REGIÃO do teclado, e dentro de cada fase o sorteio
// ALTERNA A MÃO (ver pickChallenge): nunca sai duas seguidas da mesma mão,
// então as duas mãos trabalham o tempo todo em vez de o aluno resolver tudo
// com a mão dominante.
export const STAGE_LABELS = [
  "Linha guia",
  "Linha superior",
  "Linha inferior",
  "Guia + superior",
  "Todas as letras",
  "Letras e números",
] as const;

export type Hand = "left" | "right";

// Divisão canônica do toque-datilografia (ABNT2): cada mão cobre metade do
// teclado. É isso que permite garantir alternância real de mãos.
const LEFT_KEYS = "qwertasdfgzxcvb12345".split("");
const RIGHT_KEYS = "yuiophjklçnm67890".split("");

export function handOf(key: string): Hand {
  return LEFT_KEYS.includes(key) ? "left" : "right";
}

// Pools por fase, já separados por mão pra o sorteio alternado ser direto.
const STAGE_POOLS: Record<number, { left: string[]; right: string[] }> = {
  1: { left: ["a", "s", "d", "f", "g"], right: ["h", "j", "k", "l", "ç"] },
  2: { left: ["q", "w", "e", "r", "t"], right: ["y", "u", "i", "o", "p"] },
  3: { left: ["z", "x", "c", "v", "b"], right: ["n", "m"] },
  4: {
    left: ["a", "s", "d", "f", "g", "q", "w", "e", "r", "t"],
    right: ["h", "j", "k", "l", "ç", "y", "u", "i", "o", "p"],
  },
  5: {
    left: ["a", "s", "d", "f", "g", "q", "w", "e", "r", "t", "z", "x", "c", "v", "b"],
    right: ["h", "j", "k", "l", "ç", "y", "u", "i", "o", "p", "n", "m"],
  },
  6: {
    left: ["a", "s", "d", "f", "g", "q", "w", "e", "r", "t", "z", "x", "c", "v", "b", "1", "2", "3", "4", "5"],
    right: ["h", "j", "k", "l", "ç", "y", "u", "i", "o", "p", "n", "m", "6", "7", "8", "9", "0"],
  },
};

/**
 * Sorteia a próxima letra. Recebe a mão da letra ANTERIOR e devolve sempre da
 * mão oposta -- é o que faz o exercício treinar as duas mãos de verdade, em
 * vez de deixar o aluno se acomodar numa só.
 */
export function pickChallenge(stage: number, previousHand: Hand | null): string {
  const pool = STAGE_POOLS[stage] ?? STAGE_POOLS[6];
  const hand: Hand = previousHand === "left" ? "right" : previousHand === "right" ? "left" : Math.random() < 0.5 ? "left" : "right";
  const keys = pool[hand];
  return keys[Math.floor(Math.random() * keys.length)];
}

export const STAGE_SUCCESSES_REQUIRED = 6;
export const MAX_STAGE = STAGE_LABELS.length;

// Tipos de obstáculo -- só mudam a silhueta e a animação de escape; a ação do
// jogador é sempre a mesma (acertar a tecla na hora certa), conforme o
// briefing sec. 17.
export type ObstacleKind = "jump" | "door" | "zap";
const OBSTACLE_CYCLE: ObstacleKind[] = ["jump", "door", "zap"];

export function obstacleKindFor(wordsCompleted: number): ObstacleKind {
  return OBSTACLE_CYCLE[wordsCompleted % OBSTACLE_CYCLE.length];
}

export const OBSTACLE_LABEL: Record<ObstacleKind, string> = {
  jump: "Pule a cancela",
  door: "Passe por baixo da viga",
  zap: "Desvie da faísca",
};
