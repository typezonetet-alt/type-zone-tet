// Salada T&T -- inspirado em Fruit Ninja, mas com uma inversão importante em
// relação ao T&T Orbital: aqui as coisas são ARREMESSADAS de baixo pra cima e
// caem por gravidade, e a habilidade treinada é o oposto.
//
// Orbital premia "digite tudo, rápido". Aqui existe a bomba: deixar a bomba
// cair sem tocar é a jogada CERTA. O jogo treina ler antes de digitar --
// combate o piloto automático, que é justamente de onde vem boa parte dos
// erros de quem já pegou velocidade.

export interface FruitKind {
  word: string;
  emoji: string;
  /** Cor do respingo de suco ao cortar -- ver salada-board.tsx. */
  juice: string;
}

// Frutas comuns no Brasil. A palavra é o nome da fruta, então o aluno associa
// o que lê com o que vê -- e as palavras crescem junto com o nível. Todas
// aqui têm nome curto (3-5 letras) de propósito: são as únicas usadas nos
// dois primeiros níveis (ver pickFruit).
export const EASY_FRUITS: FruitKind[] = [
  { word: "uva", emoji: "🍇", juice: "#7c3aed" },
  { word: "pera", emoji: "🍐", juice: "#a3e635" },
  { word: "maca", emoji: "🍎", juice: "#ef4444" },
  { word: "kiwi", emoji: "🥝", juice: "#84cc16" },
  { word: "coco", emoji: "🥥", juice: "#f5f5f4" },
  { word: "limao", emoji: "🍋", juice: "#facc15" },
  { word: "manga", emoji: "🥭", juice: "#fb923c" },
];

export const MEDIUM_FRUITS: FruitKind[] = [
  { word: "banana", emoji: "🍌", juice: "#fde047" },
  { word: "laranja", emoji: "🍊", juice: "#fb923c" },
  { word: "melao", emoji: "🍈", juice: "#bef264" },
  { word: "cereja", emoji: "🍒", juice: "#dc2626" },
  { word: "pessego", emoji: "🍑", juice: "#fda4af" },
  { word: "goiaba", emoji: "🍏", juice: "#f9a8d4" },
  { word: "tomate", emoji: "🍅", juice: "#f87171" },
];

export const HARD_FRUITS: FruitKind[] = [
  { word: "abacaxi", emoji: "🍍", juice: "#fbbf24" },
  { word: "morango", emoji: "🍓", juice: "#e11d48" },
  { word: "melancia", emoji: "🍉", juice: "#f43f5e" },
  { word: "mirtilo", emoji: "🫐", juice: "#a21caf" },
  { word: "abacate", emoji: "🥑", juice: "#65a30d" },
];

/** Todas as frutas juntas -- usado pra sortear bomba (disfarçada de fruta) e no modo Letras. */
const ALL_FRUITS: FruitKind[] = [...EASY_FRUITS, ...MEDIUM_FRUITS, ...HARD_FRUITS];

/** Cor de respingo genérica pra qualquer emoji que não esteja nas listas acima. */
export const DEFAULT_JUICE_COLOR = "#f472b6";

// A bomba usa NOME DE FRUTA de verdade -- é o "enganar" do Fruit Ninja: quem
// só lê o texto (piloto automático) não tem como diferenciar bomba de fruta
// pela palavra, só pelo ícone (💣, escuro, redondo). Sortear de uma lista de
// palavras genéricas seria mais fácil de discriminar sem nem prestar atenção
// no desenho -- e essa distração é o próprio propósito pedagógico do jogo.
export function pickBombWord(): string {
  return pickFrom(ALL_FRUITS).word;
}

// No modo "letras" a bomba sorteia do MESMO alfabeto completo usado pelas
// frutas (ver pickLetter) -- então também não dá pra discriminar bomba de
// fruta só pela letra, tem que olhar o ícone.
export function pickBombLetter(): string {
  return pickLetter();
}

// O alfabeto inteiro, não só a inicial das frutas: o modo Letras existe pra
// treinar TODO o teclado (as duas mãos), não ficar preso às poucas letras
// que começam nome de fruta (m, u, p, k, c, l, g -- quase todas mão
// esquerda/centro, a mão direita ficaria de fora).
const KEYBOARD_LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

export function pickLetter(): string {
  return KEYBOARD_LETTERS[Math.floor(Math.random() * KEYBOARD_LETTERS.length)];
}

/** Fruta pra ilustrar o modo Letras: qualquer uma, sem tiers de dificuldade (o texto já é só 1 letra). */
export function pickAnyFruit(): FruitKind {
  return pickFrom(ALL_FRUITS);
}

// O modo Letras é mais rápido que Palavras -- faz sentido pedagógico: ler e
// reagir a 1 letra é mais rápido que ler uma palavra inteira, então o ritmo
// pode cobrar mais velocidade de reação sem virar loteria.
export const LETRAS_SPEED_MULTIPLIER = 1.2;
export const LETRAS_INTERVAL_MULTIPLIER = 0.7;

export type SaladaMode = "palavras" | "letras";
export type SaladaDifficulty = "facil" | "medio" | "dificil";

export const SALADA_MODES: { key: SaladaMode; label: string; description: string }[] = [
  { key: "palavras", label: "Palavras", description: "Digite o nome da fruta inteiro." },
  { key: "letras", label: "Letras", description: "Uma letra por vez, teclado inteiro. Mais rápido." },
];

export const SALADA_DIFFICULTIES: {
  key: SaladaDifficulty;
  label: string;
  description: string;
}[] = [
  { key: "facil", label: "Fácil", description: "Ritmo manso; bomba só depois de pegar o jeito." },
  { key: "medio", label: "Médio", description: "Bomba desde o início, ritmo moderado." },
  { key: "dificil", label: "Difícil", description: "Bomba frequente, ritmo apertado desde já." },
];

// A dificuldade escolhida no menu empurra a curva pra frente -- em vez de
// duplicar as fórmulas de ritmo, ela só finge que o jogador já está alguns
// níveis à frente. "Fácil" usa deslocamento 0 (a curva original, sem bomba
// nos 2 primeiros níveis); "Médio"/"Difícil" já nascem com bomba na roda.
const DIFFICULTY_LEVEL_OFFSET: Record<SaladaDifficulty, number> = {
  facil: 0,
  medio: 2,
  dificil: 5,
};

function effectiveLevel(level: number, difficulty: SaladaDifficulty): number {
  return Math.min(MAX_LEVEL, level + DIFFICULTY_LEVEL_OFFSET[difficulty]);
}

export const START_LIVES = 5;
export const FRUITS_PER_LEVEL = 8;
export const MAX_LEVEL = 12;
/** Janela pra encadear cortes e subir o multiplicador (o "combo" do Fruit Ninja). */
export const COMBO_WINDOW_MS = 2200;
export const MAX_MULTIPLIER = 5;

// Física real de arremesso. A gravidade é constante; o que muda por nível é a
// força do lançamento (mais forte = sobe mais e some mais rápido) e quantas
// coisas sobem por vez.
export const GRAVITY = 0.00004; // unidades de tela por ms²
export const LAUNCH_Y = 104; // começa logo abaixo da borda de baixo
export const DESPAWN_Y = 112;

/**
 * Velocidade inicial pra cima. O nível 1 é deliberadamente manso -- o
 * primeiro contato do aluno precisa dar tempo de ler a palavra inteira antes
 * de decidir se é fruta ou bomba, não só reagir por reflexo.
 */
export function launchSpeedFor(level: number, difficulty: SaladaDifficulty = "facil"): number {
  const eff = effectiveLevel(level, difficulty);
  const eased = Math.min(1, (eff - 1) / (MAX_LEVEL - 1));
  return 0.065 + eased * 0.05;
}

/**
 * Quantas frutas sobem juntas numa leva. Começa em 1 -- Fruit Ninja de
 * verdade também arremessa uma fruta de cada vez no início -- e só cresce
 * bem devagar. Como o intervalo entre levas (abaixo) é menor que o tempo de
 * voo de uma fruta, duas frutas ainda se cruzam no ar de vez em quando mesmo
 * com leva de tamanho 1, o que já basta pra permitir combo sem lotar a tela
 * logo de cara.
 */
export function waveSizeFor(level: number, difficulty: SaladaDifficulty = "facil"): number {
  const eff = effectiveLevel(level, difficulty);
  if (eff <= 4) return 1;
  return Math.min(5, 1 + Math.floor((eff - 3) / 2));
}

/** Intervalo entre levas: começa folgado (~3,4s) e aperta bem gradualmente. */
export function waveIntervalFor(level: number, difficulty: SaladaDifficulty = "facil"): number {
  const eff = effectiveLevel(level, difficulty);
  const eased = Math.min(1, (eff - 1) / (MAX_LEVEL - 1));
  return Math.round(3400 - eased * 1900);
}

/** Chance de um item da leva ser bomba. No modo Fácil não existe bomba nos 2 primeiros níveis. */
export function bombChanceFor(level: number, difficulty: SaladaDifficulty = "facil"): number {
  const eff = effectiveLevel(level, difficulty);
  if (eff < 3) return 0;
  const eased = Math.min(1, (eff - 3) / (MAX_LEVEL - 3));
  return 0.1 + eased * 0.2;
}

/**
 * Nos 2 primeiros níveis efetivos, só frutas de nome curto (EASY_FRUITS) --
 * dá tempo de pegar o jeito da mecânica antes de precisar digitar palavras
 * maiores. Dificuldades mais altas empurram esse teto pra frente também.
 */
export function pickFruit(level: number, difficulty: SaladaDifficulty = "facil"): FruitKind {
  const eff = effectiveLevel(level, difficulty);
  if (eff <= 2) return pickFrom(EASY_FRUITS);
  const roll = Math.random();
  const progress = Math.min(1, (eff - 1) / (MAX_LEVEL - 1));
  if (roll < 0.6 - progress * 0.4) return pickFrom(EASY_FRUITS);
  if (roll < 0.9 - progress * 0.2) return pickFrom(MEDIUM_FRUITS);
  return pickFrom(HARD_FRUITS);
}

export function juiceColorFor(emoji: string): string {
  return ALL_FRUITS.find((f) => f.emoji === emoji)?.juice ?? DEFAULT_JUICE_COLOR;
}

function pickFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** Fruta maior vale mais -- mesma lógica de "palavra difícil vale mais". */
export function pointsForWord(word: string): number {
  if (word.length <= 4) return 10;
  if (word.length <= 6) return 20;
  return 35;
}
