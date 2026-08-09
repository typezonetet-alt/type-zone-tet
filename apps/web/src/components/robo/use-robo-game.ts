"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  MAX_STAGE,
  STAGE_SUCCESSES_REQUIRED,
  handOf,
  obstacleKindFor,
  pickChallenge,
  type Hand,
  type ObstacleKind,
} from "./robo-word-bank";

// T&T Robô é um runner de verdade: o obstáculo se move sozinho pelo relógio
// do jogo (não pelo que você digitou), e a tecla certa só serve pra PULAR.
// Isso muda a habilidade treinada: não é "digite rápido", é "acerte a tecla
// certa NO MOMENTO certo" -- reação e precisão, não velocidade bruta.

const START_LIVES = 3;

/** Posição fixa do robô na pista (% da largura). Ele corre no lugar; o mundo passa. */
export const ROBOT_X = 22;
const SPAWN_X = 108;
/** Fora da tela pela esquerda: obstáculo já resolvido, some e nasce outro. */
const DESPAWN_X = -12;

/** Quanto tempo o robô fica no ar depois de acertar a tecla. */
export const JUMP_MS = 620;
/** Meia-largura da zona de colisão em torno do robô. */
const HIT_HALF_WIDTH = 6;

// Ritmo de runner com rampa: a fase 1 é deliberadamente calma (~4,3s pra o
// obstáculo cruzar a tela) pra dar tempo de olhar a tecla, achar o dedo certo
// e reagir sem correria. A partir daí cada fase acelera, e na fase 6 o mesmo
// trajeto leva ~1,8s -- aí sim é reflexo puro.
/** Velocidade do obstáculo (% da largura por ms). Sobe a cada fase. */
export function stageSpeed(stage: number): number {
  return 0.028 + (stage - 1) * 0.0078;
}

/** Intervalo entre um obstáculo e o próximo nascer -- também aperta por fase. */
function stageGapMs(stage: number): number {
  return Math.max(520, 1500 - (stage - 1) * 180);
}

export interface RoboState {
  status: "ready" | "playing" | "gameover";
  stage: number;
  stageSuccesses: number;
  /** A letra que precisa ser digitada pra pular o obstáculo atual. */
  challenge: string;
  /** Mão da letra atual -- usada pra garantir alternância no próximo sorteio. */
  hand: Hand | null;
  /** Posição do obstáculo atual (% da largura). null = nenhum na pista. */
  obstacleX: number | null;
  /**
   * Tipo do obstáculo que está NA PISTA agora.
   *
   * Fica no estado (em vez de derivado de wordsCompleted na hora de
   * desenhar) porque wordsCompleted incrementa no mesmo instante em que o
   * obstáculo é vencido -- derivar dele fazia o robô tocar a animação do
   * obstáculo SEGUINTE, então ele agachava quando devia pular.
   */
  obstacleKind: ObstacleKind;
  /** Quantos obstáculos já nasceram -- só pra alternar o tipo do próximo. */
  spawnCount: number;
  /** Momento (elapsedMs) em que o pulo começou; null = no chão. */
  jumpStartedAt: number | null;
  /** Se o obstáculo atual já foi resolvido (pulado com sucesso). */
  cleared: boolean;
  lives: number;
  combo: number;
  score: number;
  elapsedMs: number;
  nextSpawnAtMs: number;
  totalCorrect: number;
  totalIncorrect: number;
  wordsCompleted: number;
  actionAt: number | null;
  missAt: number | null;
}

type RoboAction =
  | { type: "START" }
  | { type: "RESET" }
  | { type: "TICK"; deltaMs: number }
  | { type: "KEY"; key: string };

export function initialState(): RoboState {
  return {
    status: "ready",
    stage: 1,
    stageSuccesses: 0,
    challenge: "",
    hand: null,
    obstacleX: null,
    obstacleKind: obstacleKindFor(0),
    spawnCount: 0,
    jumpStartedAt: null,
    cleared: false,
    lives: START_LIVES,
    combo: 0,
    score: 0,
    elapsedMs: 0,
    nextSpawnAtMs: 400,
    totalCorrect: 0,
    totalIncorrect: 0,
    wordsCompleted: 0,
    actionAt: null,
    missAt: null,
  };
}

function spawnObstacle(state: RoboState): RoboState {
  const challenge = pickChallenge(state.stage, state.hand);
  return {
    ...state,
    challenge,
    hand: handOf(challenge),
    obstacleX: SPAWN_X,
    obstacleKind: obstacleKindFor(state.spawnCount),
    spawnCount: state.spawnCount + 1,
    cleared: false,
  };
}

export function roboReducer(state: RoboState, action: RoboAction): RoboState {
  switch (action.type) {
    case "RESET":
      return initialState();

    case "START":
      if (state.status !== "ready") return state;
      return { ...initialState(), status: "playing" };

    case "TICK": {
      if (state.status !== "playing") return state;
      const elapsedMs = state.elapsedMs + action.deltaMs;

      // Pulo termina sozinho depois de JUMP_MS -- se o obstáculo ainda não
      // passou, o robô cai em cima dele (a janela de acerto é real).
      const jumpStartedAt =
        state.jumpStartedAt !== null && elapsedMs - state.jumpStartedAt >= JUMP_MS
          ? null
          : state.jumpStartedAt;
      const airborne = jumpStartedAt !== null;

      let {
        obstacleX,
        cleared,
        lives,
        combo,
        score,
        stageSuccesses,
        stage,
        wordsCompleted,
        actionAt,
        missAt,
        nextSpawnAtMs,
      } = state;
      let next: RoboState = { ...state, elapsedMs, jumpStartedAt };

      if (obstacleX !== null) {
        obstacleX -= stageSpeed(stage) * action.deltaMs;

        const inHitZone = Math.abs(obstacleX - ROBOT_X) <= HIT_HALF_WIDTH;

        // O ENCONTRO é aqui, não na tecla. Quando o obstáculo alcança o robô,
        // o que decide tudo é uma só coisa: ele está no ar ou não?
        //
        // Isso é o coração do jogo. Apertar a tecla NÃO resolve o obstáculo --
        // apertar só faz pular. Quem apertou cedo demais já voltou pro chão e
        // bate; quem apertou na hora certa está no ar e passa por cima.
        if (inHitZone && !cleared) {
          cleared = true; // resolvido de um jeito ou de outro, não repete
          if (airborne) {
            const nextSuccesses = stageSuccesses + 1;
            const advanceStage = nextSuccesses >= STAGE_SUCCESSES_REQUIRED && stage < MAX_STAGE;
            score += 10 * stage;
            combo += 1;
            wordsCompleted += 1;
            stageSuccesses = advanceStage ? 0 : nextSuccesses;
            stage = advanceStage ? stage + 1 : stage;
            actionAt = elapsedMs;
          } else {
            lives -= 1;
            combo = 0;
            missAt = elapsedMs;
            if (lives <= 0) {
              return { ...next, obstacleX, cleared, lives, combo, missAt, status: "gameover" };
            }
          }
        }

        // Passou pela esquerda: sai de cena e agenda o próximo.
        if (obstacleX <= DESPAWN_X) {
          obstacleX = null;
          nextSpawnAtMs = elapsedMs + stageGapMs(stage);
        }
      } else if (elapsedMs >= nextSpawnAtMs) {
        next = spawnObstacle({ ...next, stage });
        return { ...next, elapsedMs, jumpStartedAt, lives, combo, missAt };
      }

      return {
        ...next,
        obstacleX,
        cleared,
        lives,
        combo,
        score,
        stageSuccesses,
        stage,
        wordsCompleted,
        actionAt,
        missAt,
        nextSpawnAtMs,
      };
    }

    case "KEY": {
      if (state.status !== "playing") return state;

      // Tecla errada: erra a estatística e zera o combo, mas não pula --
      // o obstáculo continua vindo, então ainda dá tempo de corrigir.
      if (action.key !== state.challenge) {
        return {
          ...state,
          combo: 0,
          totalIncorrect: state.totalIncorrect + 1,
          missAt: state.elapsedMs,
        };
      }

      const totalCorrect = state.totalCorrect + 1;

      // A tecla certa SÓ PULA. Ela não vence o obstáculo, não pontua e não
      // "libera" nada -- quem decide isso é o encontro no TICK, olhando se o
      // robô está no ar quando o obstáculo chega. Pular cedo é permitido
      // (e comum): o robô sobe, volta pro chão, e dá pra pular de novo.
      if (state.jumpStartedAt !== null) {
        // Já está no ar: sem pulo duplo. Segurar/martelar a tecla não mantém
        // o robô flutuando -- ele precisa aterrissar pra pular outra vez.
        return { ...state, totalCorrect };
      }

      return { ...state, totalCorrect, jumpStartedAt: state.elapsedMs };
    }

    default:
      return state;
  }
}

export function useRoboGame() {
  const [state, dispatch] = useReducer(roboReducer, undefined, initialState);
  const lastTickRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.status !== "playing") {
      lastTickRef.current = null;
      return;
    }

    function tick(now: number) {
      if (lastTickRef.current !== null) {
        const deltaMs = Math.min(100, now - lastTickRef.current);
        dispatch({ type: "TICK", deltaMs });
      }
      lastTickRef.current = now;
      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [state.status]);

  const start = useCallback(() => dispatch({ type: "START" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const handleKey = useCallback((key: string) => dispatch({ type: "KEY", key }), []);

  return { state, start, reset, handleKey };
}
