"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  ADAPT_WINDOW,
  BASE_TARGET_WPM,
  COMBO_BONUS_PER_STEP,
  NO_RITMO_BONUS,
  START_LIVES,
  beatWindowForWord,
  judgementForOffset,
  nextTargetWpm,
  pickRitmoWord,
  pointsForTier,
  type Judgement,
  type RitmoLevel,
} from "./ritmo-config";
import type { WordTier } from "../orbital/word-bank";

const DEFAULT_LEVEL: RitmoLevel = "facil";

export interface RitmoState {
  status: "ready" | "playing" | "gameover";
  level: RitmoLevel;
  /** Meta de velocidade (WPM) -- é o que a cadência adaptativa ajusta agora, não mais um intervalo fixo. */
  targetWpm: number;
  word: string;
  tier: WordTier;
  typed: number;
  awaitingNextBeat: boolean;
  wordAppearedAtMs: number;
  beatDeadlineMs: number;
  elapsedMs: number;
  score: number;
  combo: number;
  bestCombo: number;
  lives: number;
  beatsCompleted: number;
  beatsInWindow: number;
  missesInWindow: number;
  totalTyped: number;
  totalCorrect: number;
  totalIncorrect: number;
  actionAt: number | null;
  missAt: number | null;
  // Fracao da janela da batida usada em cada acerto (0 = terminou instantaneo,
  // 1 = terminou em cima do limite). E a materia-prima da consistencia: o
  // briefing (sec. 20) pede que o jogo "premie consistencia, nao apenas pico
  // de velocidade", entao o que importa e a REGULARIDADE desses valores, nao
  // se sao baixos.
  hitOffsets: number[];
  /** Julgamento do ÚLTIMO acerto -- feedback imediato, ver ritmo-config.ts. */
  lastJudgement: Judgement | null;
}

type RitmoAction =
  | { type: "START"; level: RitmoLevel }
  | { type: "RESET" }
  | { type: "TICK"; deltaMs: number }
  | { type: "KEY"; key: string };

function firstWord(level: RitmoLevel, beatsCompleted: number): Pick<RitmoState, "word" | "tier"> {
  const { text, tier } = pickRitmoWord(level, beatsCompleted);
  return { word: text, tier };
}

// Exportados para teste: o reducer é uma função pura, então dá pra travar as
// regras do jogo (a batida, o julgamento, a espera até a próxima batida) sem
// montar React nenhum -- mesmo padrão usado em use-salada-game.ts e
// use-robo-game.ts.
export function initialState(): RitmoState {
  const { word, tier } = firstWord(DEFAULT_LEVEL, 0);
  return {
    status: "ready",
    level: DEFAULT_LEVEL,
    targetWpm: BASE_TARGET_WPM,
    word,
    tier,
    typed: 0,
    awaitingNextBeat: false,
    wordAppearedAtMs: 0,
    beatDeadlineMs: beatWindowForWord(word, BASE_TARGET_WPM),
    elapsedMs: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    lives: START_LIVES,
    beatsCompleted: 0,
    beatsInWindow: 0,
    missesInWindow: 0,
    totalTyped: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    actionAt: null,
    missAt: null,
    hitOffsets: [],
    lastJudgement: null,
  };
}

// Consistencia = 1 - coeficiente de variacao dos tempos de acerto. Alguem que
// termina sempre "na metade da batida" pontua alto mesmo sem ser rapido;
// alguem que alterna entre instantaneo e no limite pontua baixo mesmo sendo
// rapido na media. Isso e exatamente o que o briefing sec. 20 pede.
export function consistencyFromOffsets(offsets: number[]): number {
  if (offsets.length < 2) return 1;
  const mean = offsets.reduce((sum, o) => sum + o, 0) / offsets.length;
  if (mean === 0) return 1;
  const variance =
    offsets.reduce((sum, o) => sum + (o - mean) ** 2, 0) / offsets.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.min(1, 1 - cv));
}

export function ritmoReducer(state: RitmoState, action: RitmoAction): RitmoState {
  switch (action.type) {
    case "RESET":
      return initialState();

    case "START": {
      if (state.status !== "ready") return state;
      const { word, tier } = firstWord(action.level, 0);
      return {
        ...initialState(),
        status: "playing",
        level: action.level,
        word,
        tier,
        beatDeadlineMs: beatWindowForWord(word, BASE_TARGET_WPM),
      };
    }

    case "TICK": {
      if (state.status !== "playing") return state;
      const elapsedMs = state.elapsedMs + action.deltaMs;

      if (elapsedMs < state.beatDeadlineMs) {
        return { ...state, elapsedMs };
      }

      const missed = !state.awaitingNextBeat;
      const lives = missed ? state.lives - 1 : state.lives;
      const combo = missed ? 0 : state.combo;
      const missesInWindow = missed ? state.missesInWindow + 1 : state.missesInWindow;
      const beatsInWindow = state.beatsInWindow + 1;

      let targetWpm = state.targetWpm;
      let nextBeatsInWindow = beatsInWindow;
      let nextMissesInWindow = missesInWindow;
      if (beatsInWindow >= ADAPT_WINDOW) {
        targetWpm = nextTargetWpm(state.targetWpm, missesInWindow);
        nextBeatsInWindow = 0;
        nextMissesInWindow = 0;
      }

      const wordAppearedAtMs = state.beatDeadlineMs;
      const { text: word, tier } = pickRitmoWord(state.level, state.beatsCompleted);

      return {
        ...state,
        elapsedMs,
        lives,
        combo,
        missesInWindow: nextMissesInWindow,
        beatsInWindow: nextBeatsInWindow,
        targetWpm,
        word,
        tier,
        typed: 0,
        awaitingNextBeat: false,
        wordAppearedAtMs,
        beatDeadlineMs: wordAppearedAtMs + beatWindowForWord(word, targetWpm),
        missAt: missed ? elapsedMs : state.missAt,
        status: lives <= 0 ? "gameover" : "playing",
      };
    }

    case "KEY": {
      if (state.status !== "playing" || state.awaitingNextBeat) return state;
      const key = action.key.toLowerCase();
      const totalTyped = state.totalTyped + 1;

      if (key !== state.word[state.typed]) {
        return { ...state, totalIncorrect: state.totalIncorrect + 1, totalTyped };
      }

      const typed = state.typed + 1;
      const totalCorrect = state.totalCorrect + 1;

      if (typed < state.word.length) {
        return { ...state, typed, totalCorrect, totalTyped };
      }

      const combo = state.combo + 1;
      const bestCombo = Math.max(state.bestCombo, combo);
      const beatWindowMs = Math.max(1, state.beatDeadlineMs - state.wordAppearedAtMs);
      const offset = Math.min(1, (state.elapsedMs - state.wordAppearedAtMs) / beatWindowMs);
      const judgement = judgementForOffset(offset);
      const score =
        state.score +
        pointsForTier(state.tier) +
        combo * COMBO_BONUS_PER_STEP +
        (judgement === "noRitmo" ? NO_RITMO_BONUS : 0);

      return {
        ...state,
        typed,
        totalCorrect,
        totalTyped,
        combo,
        bestCombo,
        score,
        hitOffsets: [...state.hitOffsets, offset],
        lastJudgement: judgement,
        beatsCompleted: state.beatsCompleted + 1,
        awaitingNextBeat: true,
        actionAt: state.elapsedMs,
      };
    }

    default:
      return state;
  }
}

export function useRitmoGame() {
  const [state, dispatch] = useReducer(ritmoReducer, undefined, initialState);
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

  const start = useCallback((level: RitmoLevel) => dispatch({ type: "START", level }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const handleKey = useCallback((key: string) => dispatch({ type: "KEY", key }), []);

  return { state, start, reset, handleKey };
}
