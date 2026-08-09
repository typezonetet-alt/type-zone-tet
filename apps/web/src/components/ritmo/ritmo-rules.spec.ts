import { NO_RITMO_BONUS, beatWindowForWord, judgementForOffset, pickRitmoWord } from "./ritmo-config";
import { consistencyFromOffsets, initialState, ritmoReducer, type RitmoState } from "./use-ritmo-game";
import { WORD_BANK } from "../orbital/word-bank";

// Modo Ritmo, depois do redesign: uma palavra por batida, mas agora com
// julgamento IMEDIATO (adiantado/no ritmo/apertado) e um bônus de pontos por
// pousar no terço do meio da janela -- é isso que dá sentido concreto, na
// hora, ao "não corra, mantenha o ritmo" do briefing (sec. 20). Modo Ritmo
// não tinha nenhum teste antes deste redesign.

function playing(overrides: Partial<RitmoState> = {}): RitmoState {
  return { ...initialState(), status: "playing", ...overrides };
}

function typeWord(state: RitmoState, word: string): RitmoState {
  return word.split("").reduce((s, key) => ritmoReducer(s, { type: "KEY", key }), state);
}

describe("Modo Ritmo — julgamento por batida", () => {
  it("terminar bem cedo (início da janela) é 'adiantado'", () => {
    expect(judgementForOffset(0.05)).toBe("adiantado");
  });

  it("terminar no meio da janela é 'noRitmo'", () => {
    expect(judgementForOffset(0.5)).toBe("noRitmo");
  });

  it("terminar em cima do limite é 'apertado'", () => {
    expect(judgementForOffset(0.95)).toBe("apertado");
  });
});

describe("Modo Ritmo — a palavra completa concede o julgamento e o bônus", () => {
  it("terminar no meio da batida rende o bônus de 'no ritmo'", () => {
    // janela de 2000ms; termina em ~1000ms => offset 0.5 => noRitmo
    const before = playing({
      word: "sol",
      tier: "short",
      wordAppearedAtMs: 0,
      beatDeadlineMs: 2000,
      elapsedMs: 1000,
    });
    const after = typeWord(before, "sol");

    expect(after.lastJudgement).toBe("noRitmo");
    expect(after.score).toBe(10 + 1 * 4 + NO_RITMO_BONUS); // pointsForTier(short) + combo*bonus + bônus
  });

  it("terminar assim que a palavra aparece (adiantado) NÃO ganha o bônus", () => {
    const before = playing({
      word: "sol",
      tier: "short",
      wordAppearedAtMs: 0,
      beatDeadlineMs: 2000,
      elapsedMs: 20, // quase instantâneo -- offset bem baixo
    });
    const after = typeWord(before, "sol");

    expect(after.lastJudgement).toBe("adiantado");
    expect(after.score).toBe(10 + 1 * 4); // sem NO_RITMO_BONUS
  });

  it("terminar quase no limite (apertado) também não ganha o bônus", () => {
    const before = playing({
      word: "sol",
      tier: "short",
      wordAppearedAtMs: 0,
      beatDeadlineMs: 2000,
      elapsedMs: 1980,
    });
    const after = typeWord(before, "sol");

    expect(after.lastJudgement).toBe("apertado");
    expect(after.score).toBe(10 + 1 * 4);
  });

  it("depois de completar, a palavra some do estado 'aguardando' até a próxima batida", () => {
    const before = playing({ word: "sol", wordAppearedAtMs: 0, beatDeadlineMs: 2000, elapsedMs: 500 });
    const after = typeWord(before, "sol");
    expect(after.awaitingNextBeat).toBe(true);
  });
});

describe("Modo Ritmo — esperar a próxima batida (não dá pra adiantar)", () => {
  it("teclas digitadas depois de terminar a palavra são ignoradas", () => {
    let s = playing({ word: "sol", wordAppearedAtMs: 0, beatDeadlineMs: 2000, elapsedMs: 500 });
    s = typeWord(s, "sol");
    const totalTypedBefore = s.totalTyped;

    s = ritmoReducer(s, { type: "KEY", key: "x" });
    expect(s.totalTyped).toBe(totalTypedBefore); // ignorado, nem conta erro
  });

  it("a batida só vira (nova palavra) quando o relógio passa do prazo", () => {
    let s = playing({ word: "sol", wordAppearedAtMs: 0, beatDeadlineMs: 2000, elapsedMs: 500 });
    s = typeWord(s, "sol");
    expect(s.awaitingNextBeat).toBe(true);

    s = ritmoReducer(s, { type: "TICK", deltaMs: 100 }); // ainda dentro da janela
    expect(s.awaitingNextBeat).toBe(true);
    expect(s.word).toBe("sol");

    s = ritmoReducer(s, { type: "TICK", deltaMs: 2000 }); // passa do prazo
    expect(s.word).not.toBe("");
    expect(s.awaitingNextBeat).toBe(false);
    expect(s.lives).toBe(initialState().lives); // terminou a tempo, não perdeu vida
  });
});

describe("Modo Ritmo — perder a batida", () => {
  it("não terminar a palavra a tempo custa uma vida e zera o combo", () => {
    let s = playing({ word: "sol", wordAppearedAtMs: 0, beatDeadlineMs: 2000, elapsedMs: 0, combo: 3 });
    s = ritmoReducer(s, { type: "TICK", deltaMs: 2001 });

    expect(s.lives).toBe(initialState().lives - 1);
    expect(s.combo).toBe(0);
    expect(s.missAt).not.toBeNull();
  });

  it("perder todas as vidas encerra o jogo", () => {
    let s = playing({ word: "sol", wordAppearedAtMs: 0, beatDeadlineMs: 2000, elapsedMs: 0, lives: 1 });
    s = ritmoReducer(s, { type: "TICK", deltaMs: 2001 });

    expect(s.lives).toBe(0);
    expect(s.status).toBe("gameover");
  });
});

// Bug real de playtest (nº1): a versão anterior escolhia o tamanho da
// palavra a partir do PRÓPRIO intervalMs -- quando a cadência desacelerava
// pra ajudar alguém com dificuldade, a próxima palavra ficava mais LONGA (o
// oposto de ajudar). Agora a dificuldade da palavra vem só do nível
// escolhido no menu, nunca da cadência.
//
// Bug real de playtest (nº2): toda palavra recebia a MESMA janela de tempo
// (2,5s pra "sol" e pra "responsabilidade"). Corrigido em beatWindowForWord
// (ver testes na próxima seção). Este bloco cobre a metodologia de
// progressão: começar só com palavras curtas e destravar as maiores
// conforme a sessão avança, não desde a primeira palavra.
describe("Modo Ritmo — dificuldade da palavra vem do NÍVEL, nunca da cadência", () => {
  it("nível fácil só sorteia palavras curtas, do início ao fim da sessão", () => {
    const shortWords = new Set(WORD_BANK.short);
    for (const beatsCompleted of [0, 5, 20, 100]) {
      for (let i = 0; i < 15; i++) {
        const { tier, text } = pickRitmoWord("facil", beatsCompleted);
        expect(tier).toBe("short");
        expect(shortWords.has(text)).toBe(true);
      }
    }
  });

  it("nível médio/difícil começam só com palavras curtas (0 batidas completadas)", () => {
    for (let i = 0; i < 30; i++) {
      expect(pickRitmoWord("medio", 0).tier).toBe("short");
      expect(pickRitmoWord("dificil", 0).tier).toBe("short");
    }
  });

  it("nível médio destrava palavras médias depois de algumas batidas, mas nunca longas", () => {
    let sawMedium = false;
    for (let i = 0; i < 100; i++) {
      const tier = pickRitmoWord("medio", 20).tier;
      expect(tier).not.toBe("long");
      if (tier === "medium") sawMedium = true;
    }
    expect(sawMedium).toBe(true);
  });

  it("nível difícil eventualmente destrava palavras longas depois de bastante progresso", () => {
    let sawLong = false;
    for (let i = 0; i < 100; i++) {
      if (pickRitmoWord("dificil", 30).tier === "long") sawLong = true;
    }
    expect(sawLong).toBe(true);
  });

  it("uma cadência lenta (jogo já ajudando) não força palavra mais difícil no nível fácil", () => {
    // Simula a situação do bug nº1: mesmo com muitas batidas já completadas
    // (o tipo de progresso que antes empurrava pra palavras maiores), o
    // nível fácil continua só com palavras curtas.
    for (let i = 0; i < 30; i++) {
      expect(pickRitmoWord("facil", 50).tier).toBe("short");
    }
  });
});

describe("Modo Ritmo — o tempo por palavra é proporcional ao tamanho dela", () => {
  it("uma palavra de 16 letras recebe uma janela bem maior que uma de 3 letras, na mesma meta de WPM", () => {
    const shortWindow = beatWindowForWord("sol", 18);
    const longWindow = beatWindowForWord("responsabilidade", 18);
    expect(longWindow).toBeGreaterThan(shortWindow * 3);
  });

  it("na mesma palavra, uma meta de WPM maior encolhe a janela (mais difícil)", () => {
    const slow = beatWindowForWord("computador", 15);
    const fast = beatWindowForWord("computador", 40);
    expect(fast).toBeLessThan(slow);
  });
});

describe("Modo Ritmo — START define o nível escolhido no menu", () => {
  it("START com um nível guarda esse nível no estado e sorteia a primeira palavra por ele", () => {
    const shortWords = new Set(WORD_BANK.short);
    const s = ritmoReducer(initialState(), { type: "START", level: "facil" });

    expect(s.level).toBe("facil");
    expect(s.tier).toBe("short");
    expect(shortWords.has(s.word)).toBe(true);
  });
});

describe("Modo Ritmo — consistência (regularidade, não velocidade)", () => {
  it("offsets idênticos rendem consistência máxima mesmo não sendo o offset 'perfeito'", () => {
    expect(consistencyFromOffsets([0.9, 0.9, 0.9, 0.9])).toBeCloseTo(1);
  });

  it("offsets espalhados (rajadas) rendem consistência baixa", () => {
    const steady = consistencyFromOffsets([0.5, 0.52, 0.48, 0.5]);
    const bursty = consistencyFromOffsets([0.05, 0.95, 0.1, 0.9]);
    expect(steady).toBeGreaterThan(bursty);
  });
});
