import {
  EASY_FRUITS,
  HARD_FRUITS,
  MAX_LEVEL,
  MEDIUM_FRUITS,
  START_LIVES,
  bombChanceFor,
  pickAnyFruit,
  pickBombLetter,
  pickBombWord,
  pickFruit,
  pickLetter,
  waveIntervalFor,
  waveSizeFor,
} from "./salada-config";

const ALL_FRUIT_WORDS = new Set([...EASY_FRUITS, ...MEDIUM_FRUITS, ...HARD_FRUITS].map((f) => f.word));

// Trava a curva de dificuldade pedida depois do primeiro playtest: nível 1
// tem que ser manso (uma fruta de cada vez, nomes curtos, sem bomba), e a
// dificuldade só sobe aos poucos a partir daí.

describe("Salada T&T — vidas", () => {
  it("começa com 5 vidas", () => {
    expect(START_LIVES).toBe(5);
  });
});

describe("Salada T&T — ritmo de entrada (nível 1 manso)", () => {
  it("nível 1 lança uma fruta de cada vez", () => {
    expect(waveSizeFor(1)).toBe(1);
  });

  it("nível 1 não tem bomba nenhuma", () => {
    expect(bombChanceFor(1)).toBe(0);
    expect(bombChanceFor(2)).toBe(0);
  });

  it("níveis 1 e 2 só sorteiam frutas de nome curto", () => {
    const easyWords = new Set(EASY_FRUITS.map((f) => f.word));
    for (let i = 0; i < 50; i++) {
      expect(easyWords.has(pickFruit(1).word)).toBe(true);
      expect(easyWords.has(pickFruit(2).word)).toBe(true);
    }
  });
});

describe("Salada T&T — progressão gradual", () => {
  it("o tamanho da leva nunca cai conforme o nível sobe", () => {
    let previous = waveSizeFor(1);
    for (let level = 2; level <= MAX_LEVEL; level++) {
      const current = waveSizeFor(level);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  it("o intervalo entre levas nunca aumenta conforme o nível sobe", () => {
    let previous = waveIntervalFor(1);
    for (let level = 2; level <= MAX_LEVEL; level++) {
      const current = waveIntervalFor(level);
      expect(current).toBeLessThanOrEqual(previous);
      previous = current;
    }
  });

  it("a chance de bomba nunca cai conforme o nível sobe", () => {
    let previous = bombChanceFor(1);
    for (let level = 2; level <= MAX_LEVEL; level++) {
      const current = bombChanceFor(level);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });
});

// Depois do primeiro playtest com bomba, veio o feedback oposto: no nível 1
// padrão (Fácil) a bomba nunca aparecia, então quem jogasse rápido nunca via
// a mecânica central do jogo. A saída foi um menu de dificuldade -- Médio e
// Difícil "furam" a curva gentil e já nascem com bomba na roda.
describe("Salada T&T — dificuldade (Médio/Difícil trazem bomba mais cedo)", () => {
  it("Fácil no nível 1 continua sem bomba nenhuma", () => {
    expect(bombChanceFor(1, "facil")).toBe(0);
  });

  it("Médio e Difícil já têm bomba desde o nível 1", () => {
    expect(bombChanceFor(1, "medio")).toBeGreaterThan(0);
    expect(bombChanceFor(1, "dificil")).toBeGreaterThan(0);
  });

  it("no mesmo nível, a chance de bomba nunca cai ao subir de dificuldade", () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const facil = bombChanceFor(level, "facil");
      const medio = bombChanceFor(level, "medio");
      const dificil = bombChanceFor(level, "dificil");
      expect(medio).toBeGreaterThanOrEqual(facil);
      expect(dificil).toBeGreaterThanOrEqual(medio);
    }
  });
});

// Depois do feedback de que só m/u/p/k/c/l/g apareciam (as iniciais das
// frutas fáceis), o modo Letras passou a sortear do alfabeto inteiro --
// senão o exercício nunca cobre a mão direita do teclado.
describe("Salada T&T — modo Letras usa o teclado inteiro", () => {
  it("pickLetter sorteia entre as 26 letras, cobrindo os dois lados do teclado", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(pickLetter());

    expect(seen.size).toBeGreaterThan(20);
    // amostra de teclas claramente "mão direita" no QWERTY/ABNT2 --
    // nenhuma delas é inicial de fruta, então só aparecem se o sorteio for
    // do alfabeto inteiro, não das iniciais de EASY_FRUITS.
    for (const rightHandKey of ["h", "j", "n", "o", "y"]) {
      expect(seen.has(rightHandKey)).toBe(true);
    }
  });

  it("pickAnyFruit não fica restrito às frutas fáceis (serve só de ilustração no modo Letras)", () => {
    const hardWords = new Set(HARD_FRUITS.map((f) => f.word));
    let sawHard = false;
    for (let i = 0; i < 200; i++) {
      if (hardWords.has(pickAnyFruit().word)) sawHard = true;
    }
    expect(sawHard).toBe(true);
  });

  it("a bomba do modo Letras também é uma letra só, do mesmo alfabeto", () => {
    for (let i = 0; i < 20; i++) {
      expect(pickBombLetter()).toHaveLength(1);
    }
  });
});

// O feedback também pediu bomba disfarçada de fruta de verdade, não uma
// palavra qualquer -- só assim quem só lê o texto (sem olhar o ícone) cai
// na pegadinha, que é o ponto central do jogo.
describe("Salada T&T — bomba disfarçada de fruta", () => {
  it("pickBombWord sempre sorteia um nome de fruta real", () => {
    for (let i = 0; i < 100; i++) {
      expect(ALL_FRUIT_WORDS.has(pickBombWord())).toBe(true);
    }
  });
});
