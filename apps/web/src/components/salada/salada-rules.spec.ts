import { DESPAWN_Y, START_LIVES } from "./salada-config";
import {
  initialSaladaState,
  saladaReducer,
  type SaladaState,
  type Tossed,
} from "./use-salada-game";

// A regra que define a Salada T&T -- e que a separa do T&T Orbital -- é a
// inversão da bomba: digitar é ERRADO e deixar cair é CERTO. Esses testes
// travam esse comportamento, porque um "conserto" descuidado no futuro
// (tratar tudo como alvo) apagaria a razão de o jogo existir.

function playing(overrides: Partial<SaladaState> = {}): SaladaState {
  return { ...initialSaladaState(), status: "playing", nextWaveInMs: 999_999, ...overrides };
}

function item(overrides: Partial<Tossed> = {}): Tossed {
  return {
    id: 1,
    text: "uva",
    typed: 0,
    isBomb: false,
    emoji: "🍇",
    x: 50,
    y: 60,
    vx: 0,
    vy: -0.05,
    spin: 0,
    spinSpeed: 0,
    points: 10,
    ...overrides,
  };
}

function typeWord(state: SaladaState, word: string): SaladaState {
  return word.split("").reduce((s, key) => saladaReducer(s, { type: "KEY", key }), state);
}

describe("Salada T&T — fruta", () => {
  it("fatia a fruta ao completar a palavra e pontua", () => {
    const before = playing({ tossed: [item()] });
    const after = typeWord(before, "uva");

    expect(after.tossed).toHaveLength(0);
    expect(after.fruitsSliced).toBe(1);
    expect(after.score).toBeGreaterThan(0);
    expect(after.lives).toBe(START_LIVES);
  });

  it("fruta que cai sem ser cortada custa uma vida", () => {
    const falling = item({ y: DESPAWN_Y + 1, vy: 0.05 });
    const after = saladaReducer(playing({ tossed: [falling] }), { type: "TICK", deltaMs: 16 });

    expect(after.lives).toBe(START_LIVES - 1);
    expect(after.tossed).toHaveLength(0);
  });
});

describe("Salada T&T — bomba (mecânica invertida)", () => {
  it("digitar a bomba até o fim explode e custa uma vida", () => {
    const bomb = item({ text: "sol", isBomb: true, emoji: "💣", points: 0 });
    const after = typeWord(playing({ tossed: [bomb] }), "sol");

    expect(after.lives).toBe(START_LIVES - 1);
    expect(after.bombsHit).toBe(1);
    expect(after.score).toBe(0);
    expect(after.flash?.tone).toBe("bad");
  });

  it("deixar a bomba cair NÃO custa vida -- é a jogada certa", () => {
    const bomb = item({ text: "sol", isBomb: true, emoji: "💣", y: DESPAWN_Y + 1, vy: 0.05 });
    const after = saladaReducer(playing({ tossed: [bomb] }), { type: "TICK", deltaMs: 16 });

    expect(after.lives).toBe(START_LIVES);
    expect(after.bombsDodged).toBe(1);
    expect(after.tossed).toHaveLength(0);
  });

  it("começar a digitar a bomba ainda dá pra abortar com Esc, sem perder vida", () => {
    const bomb = item({ text: "sol", isBomb: true, emoji: "💣" });
    const targeted = saladaReducer(playing({ tossed: [bomb] }), { type: "KEY", key: "s" });
    expect(targeted.focusedId).toBe(bomb.id);

    const released = saladaReducer(targeted, { type: "RELEASE_TARGET" });
    expect(released.focusedId).toBeNull();
    expect(released.lives).toBe(START_LIVES);
    expect(released.tossed[0].typed).toBe(0);
  });

  it("explodir a última vida encerra a partida", () => {
    const bomb = item({ text: "sol", isBomb: true, emoji: "💣" });
    const after = typeWord(playing({ tossed: [bomb], lives: 1 }), "sol");

    expect(after.lives).toBe(0);
    expect(after.status).toBe("gameover");
  });
});

describe("Salada T&T — combo", () => {
  it("encadear cortes dentro da janela aumenta o multiplicador", () => {
    let s = playing({
      tossed: [item({ id: 1, text: "uva" }), item({ id: 2, text: "pera" }), item({ id: 3, text: "kiwi" })],
    });
    s = typeWord(s, "uva");
    s = typeWord(s, "pera");
    s = typeWord(s, "kiwi");

    expect(s.combo).toBe(3);
    expect(s.multiplier).toBeGreaterThan(1);
  });

  it("perder uma fruta zera o combo", () => {
    let s = playing({ tossed: [item({ id: 1, text: "uva" })] });
    s = typeWord(s, "uva");
    expect(s.combo).toBe(1);

    const missed = item({ id: 2, text: "pera", y: DESPAWN_Y + 1, vy: 0.05 });
    s = saladaReducer({ ...s, tossed: [missed] }, { type: "TICK", deltaMs: 16 });

    expect(s.combo).toBe(0);
    expect(s.multiplier).toBe(1);
  });
});

describe("Salada T&T — física de arremesso", () => {
  it("a gravidade desacelera a subida e devolve o item pra baixo", () => {
    const rising = item({ y: 90, vy: -0.08 });
    let s = playing({ tossed: [rising] });

    const heights: number[] = [];
    for (let i = 0; i < 260; i++) {
      s = saladaReducer(s, { type: "TICK", deltaMs: 16 });
      if (s.tossed[0]) heights.push(s.tossed[0].y);
    }

    const peak = Math.min(...heights);
    expect(peak).toBeLessThan(90); // subiu
    expect(heights[heights.length - 1]).toBeGreaterThan(peak); // e voltou a cair
  });
});
