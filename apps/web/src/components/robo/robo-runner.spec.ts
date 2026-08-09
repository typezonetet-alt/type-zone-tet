import { handOf, pickChallenge, STAGE_LABELS } from "./robo-word-bank";
import { JUMP_MS, ROBOT_X, initialState, roboReducer, type RoboState } from "./use-robo-game";

// O T&T Robô virou um runner de verdade: o obstáculo anda pelo relógio do
// jogo e a tecla certa só serve pra PULAR na hora certa. Estes testes travam
// as duas coisas que definem o jogo -- a janela de acerto (pular cedo demais
// não salva) e a alternância de mãos (o motivo pedagógico do exercício).

function playing(overrides: Partial<RoboState> = {}): RoboState {
  return { ...initialState(), status: "playing", challenge: "f", hand: "left", ...overrides };
}

function tick(state: RoboState, deltaMs: number): RoboState {
  return roboReducer(state, { type: "TICK", deltaMs });
}

function tickFor(state: RoboState, totalMs: number, stepMs = 16): RoboState {
  let s = state;
  for (let t = 0; t < totalMs; t += stepMs) s = tick(s, stepMs);
  return s;
}

describe("T&T Robô — o obstáculo anda sozinho", () => {
  it("o obstáculo se aproxima do robô conforme o tempo passa", () => {
    const start = playing({ obstacleX: 100 });
    const after = tickFor(start, 300);

    expect(after.obstacleX).not.toBeNull();
    expect(after.obstacleX!).toBeLessThan(100);
  });

  it("bater no obstáculo sem pular custa uma vida", () => {
    const before = playing({ obstacleX: ROBOT_X + 5 });
    const after = tick(before, 16);

    expect(after.lives).toBe(before.lives - 1);
    expect(after.missAt).not.toBeNull();
  });

  it("o mesmo obstáculo não tira duas vidas", () => {
    let s = playing({ obstacleX: ROBOT_X + 5 });
    s = tickFor(s, 200);

    expect(s.lives).toBe(initialState().lives - 1);
  });
});

describe("T&T Robô — a tecla só pula; quem resolve é o encontro", () => {
  it("apertar a tecla NÃO vence o obstáculo na hora -- só faz pular", () => {
    const before = playing({ obstacleX: ROBOT_X + 40 });
    const after = roboReducer(before, { type: "KEY", key: "f" });

    expect(after.jumpStartedAt).not.toBeNull();
    // nada de pontuar/liberar antecipado: o obstáculo continua de pé, vindo
    expect(after.cleared).toBe(false);
    expect(after.score).toBe(0);
    expect(after.wordsCompleted).toBe(0);
  });

  it("pular na hora certa: no ar quando o obstáculo chega, aí sim pontua", () => {
    let s = playing({ obstacleX: ROBOT_X + 14 });
    s = roboReducer(s, { type: "KEY", key: "f" });
    s = tickFor(s, 400);

    expect(s.lives).toBe(initialState().lives);
    expect(s.score).toBeGreaterThan(0);
    expect(s.wordsCompleted).toBe(1);
  });

  it("pular cedo demais faz BATER: o robô já voltou pro chão", () => {
    // Obstáculo bem longe: o pulo (JUMP_MS) acaba muito antes dele chegar.
    let s = playing({ obstacleX: 100 });
    s = roboReducer(s, { type: "KEY", key: "f" });
    s = tickFor(s, JUMP_MS + 60);
    expect(s.jumpStartedAt).toBeNull(); // já aterrissou

    s = tickFor(s, 4000); // deixa o obstáculo chegar
    expect(s.lives).toBe(initialState().lives - 1);
    expect(s.score).toBe(0);
  });

  it("pulou cedo, aterrissou e pulou de novo na hora certa: passa", () => {
    let s = playing({ obstacleX: 100 });
    s = roboReducer(s, { type: "KEY", key: "f" }); // pulo desperdiçado
    s = tickFor(s, JUMP_MS + 60);
    expect(s.jumpStartedAt).toBeNull();

    // aproxima até a beira da zona de impacto e pula de novo
    while ((s.obstacleX ?? 0) > ROBOT_X + 12) s = tick(s, 16);
    s = roboReducer(s, { type: "KEY", key: "f" });
    s = tickFor(s, 400);

    expect(s.lives).toBe(initialState().lives);
    expect(s.score).toBeGreaterThan(0);
  });

  it("não existe pulo duplo: martelar a tecla no ar não estende o pulo", () => {
    let s = playing({ obstacleX: 100 });
    s = roboReducer(s, { type: "KEY", key: "f" });
    const startedAt = s.jumpStartedAt;

    s = tickFor(s, 200);
    s = roboReducer(s, { type: "KEY", key: "f" });
    expect(s.jumpStartedAt).toBe(startedAt); // ignorado, não reinicia
  });

  it("tecla errada não pula e zera o combo", () => {
    const before = playing({ obstacleX: ROBOT_X + 14, combo: 4 });
    const after = roboReducer(before, { type: "KEY", key: "k" });

    expect(after.jumpStartedAt).toBeNull();
    expect(after.combo).toBe(0);
    expect(after.totalIncorrect).toBe(1);
  });
});

describe("T&T Robô — o tipo do obstáculo não muda no meio da ação", () => {
  // Bug real encontrado em playtest: o tipo era derivado de wordsCompleted, que
  // incrementa NO MESMO instante em que o obstáculo é vencido. Resultado: ao
  // pular, o robô já tocava a animação do obstáculo SEGUINTE -- agachava numa
  // cancela que deveria pular. Agora o tipo vive no estado, preso ao obstáculo.
  it("vencer o obstáculo não troca o tipo do que ainda está na pista", () => {
    const before = playing({ obstacleX: ROBOT_X + 14 });
    const after = roboReducer(before, { type: "KEY", key: "f" });

    expect(after.obstacleKind).toBe(before.obstacleKind);
  });

  it("o tipo só muda quando um obstáculo novo nasce", () => {
    let s = roboReducer(initialState(), { type: "START" });
    s = tickFor(s, 600);
    const first = s.obstacleKind;

    // vence e espera o próximo nascer
    s = roboReducer(s, { type: "KEY", key: s.challenge });
    expect(s.obstacleKind).toBe(first);

    s = tickFor(s, 8000);
    expect(s.spawnCount).toBeGreaterThan(1);
  });
});

describe("T&T Robô — só letras, e as duas mãos", () => {
  it("todo desafio é uma única tecla, nunca uma palavra", () => {
    for (let stage = 1; stage <= STAGE_LABELS.length; stage++) {
      for (let i = 0; i < 40; i++) {
        expect(pickChallenge(stage, null)).toHaveLength(1);
      }
    }
  });

  it("a letra seguinte é sempre da mão oposta à anterior", () => {
    for (let stage = 1; stage <= STAGE_LABELS.length; stage++) {
      for (let i = 0; i < 40; i++) {
        expect(handOf(pickChallenge(stage, "left"))).toBe("right");
        expect(handOf(pickChallenge(stage, "right"))).toBe("left");
      }
    }
  });

  it("jogando de verdade (pulando na hora certa), as mãos se alternam", () => {
    let s = roboReducer(initialState(), { type: "START" });
    const hands: string[] = [];

    for (let i = 0; i < 3000 && hands.length < 6; i++) {
      s = tick(s, 16);
      if (s.status !== "playing") break;
      // pula só quando o obstáculo está chegando -- como um jogador faria
      if (s.obstacleX !== null && !s.cleared && s.obstacleX <= ROBOT_X + 12) {
        const hand = handOf(s.challenge);
        if (hands[hands.length - 1] !== hand) hands.push(hand);
        s = roboReducer(s, { type: "KEY", key: s.challenge });
      }
    }

    expect(s.lives).toBe(initialState().lives); // sobreviveu pulando certo
    expect(hands.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < hands.length; i++) {
      expect(hands[i]).not.toBe(hands[i - 1]);
    }
  });
});
