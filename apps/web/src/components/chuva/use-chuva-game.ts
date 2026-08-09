"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { type ChuvaMode, type ChuvaModeConfig, modeConfig, pickChuvaWord, pointsForTier } from "./chuva-modes";

export interface FallingWord {
  id: number;
  text: string;
  typed: number;
  progress: number;
  speed: number;
  points: number;
  x: number;
}

export interface GameEffect {
  id: number;
  kind: "drop" | "splash" | "miss";
  x: number;
  y: number;
  createdAtElapsedMs: number;
}

export interface ChuvaState {
  status: "ready" | "playing" | "gameover";
  mode: ChuvaMode;
  weakChars: string[];
  words: FallingWord[];
  score: number;
  combo: number;
  lives: number;
  wordsCompleted: number;
  totalTyped: number;
  totalCorrect: number;
  totalIncorrect: number;
  elapsedMs: number;
  focusedWordId: number | null;
  nextSpawnInMs: number;
  nextWordId: number;
  effects: GameEffect[];
  nextEffectId: number;
  // "Zapper" de emergência (ref. Typer Shark Deluxe: o "Shark Zapper" limpa a
  // tela quando carregado). Ganho por combo, nunca comprado -- ao contrário da
  // bomba do Orbital, aqui ele ainda paga metade dos pontos das palavras
  // limpas (elas já estavam prestes a cair de qualquer forma) em vez de zero,
  // pra reforçar que usá-lo bem também é uma boa jogada, não só um resgate.
  zapperCharges: number;
  zappersUsed: number;
}

type ChuvaAction =
  | { type: "START"; mode: ChuvaMode; weakChars: string[] }
  | { type: "TICK"; deltaMs: number }
  | { type: "KEY"; key: string }
  | { type: "RELEASE_TARGET" }
  | { type: "USE_ZAPPER" }
  | { type: "RESET" };

export const EFFECT_LIFETIME_MS = 380;
export const MAX_ZAPPERS = 2;
export const ZAPPER_COMBO_MILESTONE = 8;

function initialState(): ChuvaState {
  return {
    status: "ready",
    mode: "normal",
    weakChars: [],
    words: [],
    score: 0,
    combo: 0,
    lives: 4,
    wordsCompleted: 0,
    totalTyped: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    elapsedMs: 0,
    focusedWordId: null,
    nextSpawnInMs: 0,
    nextWordId: 0,
    effects: [],
    nextEffectId: 0,
    zapperCharges: 0,
    zappersUsed: 0,
  };
}

function addEffect(
  effects: GameEffect[],
  nextEffectId: number,
  kind: GameEffect["kind"],
  x: number,
  y: number,
  elapsedMs: number,
): { effects: GameEffect[]; nextEffectId: number } {
  return {
    effects: [...effects, { id: nextEffectId, kind, x, y, createdAtElapsedMs: elapsedMs }],
    nextEffectId: nextEffectId + 1,
  };
}

function spawnWord(
  config: ChuvaModeConfig,
  weakChars: string[],
  nextWordId: number,
): FallingWord {
  const { text, tier } = pickChuvaWord(config, weakChars);
  return {
    id: nextWordId,
    text,
    typed: 0,
    progress: 0,
    speed: 1 / config.fallDurationMs,
    points: pointsForTier(tier),
    x: Math.random() * 100,
  };
}

function completeWord(
  state: ChuvaState,
  word: FallingWord,
  totalCorrect: number,
  totalTyped: number,
): ChuvaState {
  const combo = state.combo + 1;
  const { effects, nextEffectId } = addEffect(
    state.effects,
    state.nextEffectId,
    "splash",
    word.x,
    word.progress * 92,
    state.elapsedMs,
  );
  const earnedZapper = combo % ZAPPER_COMBO_MILESTONE === 0;
  const zapperCharges = earnedZapper
    ? Math.min(MAX_ZAPPERS, state.zapperCharges + 1)
    : state.zapperCharges;

  return {
    ...state,
    words: state.words.filter((w) => w.id !== word.id),
    score: state.score + word.points + combo * 2,
    combo,
    zapperCharges,
    wordsCompleted: state.wordsCompleted + 1,
    focusedWordId: null,
    totalCorrect,
    totalTyped,
    effects,
    nextEffectId,
  };
}

function reducer(state: ChuvaState, action: ChuvaAction): ChuvaState {
  switch (action.type) {
    case "RESET":
      return initialState();

    case "START": {
      if (state.status !== "ready") return state;
      const config = modeConfig(action.mode);
      return {
        ...initialState(),
        status: "playing",
        mode: action.mode,
        weakChars: action.weakChars,
        lives: config.lives,
      };
    }

    case "RELEASE_TARGET": {
      if (state.status !== "playing" || state.focusedWordId === null) return state;
      return {
        ...state,
        words: state.words.map((w) => (w.id === state.focusedWordId ? { ...w, typed: 0 } : w)),
        focusedWordId: null,
      };
    }

    case "USE_ZAPPER": {
      if (state.status !== "playing" || state.zapperCharges <= 0 || state.words.length === 0) {
        return state;
      }
      let effects = state.effects;
      let nextEffectId = state.nextEffectId;
      let bonus = 0;
      for (const word of state.words) {
        bonus += Math.floor(word.points / 2);
        const added = addEffect(effects, nextEffectId, "splash", word.x, word.progress * 92, state.elapsedMs);
        effects = added.effects;
        nextEffectId = added.nextEffectId;
      }
      return {
        ...state,
        words: [],
        focusedWordId: null,
        score: state.score + bonus,
        zapperCharges: state.zapperCharges - 1,
        zappersUsed: state.zappersUsed + 1,
        effects,
        nextEffectId,
      };
    }

    case "TICK": {
      if (state.status !== "playing") return state;
      const config = modeConfig(state.mode);

      const elapsedMs = state.elapsedMs + action.deltaMs;
      let words = state.words.map((word) => ({
        ...word,
        progress: word.progress + word.speed * action.deltaMs,
      }));

      let lives = state.lives;
      let combo = state.combo;
      let focusedWordId = state.focusedWordId;
      let effects = state.effects;
      let nextEffectId = state.nextEffectId;

      const reachedBottom = words.filter((w) => w.progress >= 1);
      if (reachedBottom.length > 0) {
        lives -= reachedBottom.length;
        combo = 0;
        if (reachedBottom.some((w) => w.id === focusedWordId)) focusedWordId = null;
        for (const word of reachedBottom) {
          const added = addEffect(effects, nextEffectId, "miss", word.x, 97, elapsedMs);
          effects = added.effects;
          nextEffectId = added.nextEffectId;
        }
        words = words.filter((w) => w.progress < 1);
      }

      effects = effects.filter((e) => elapsedMs - e.createdAtElapsedMs < EFFECT_LIFETIME_MS);

      let nextSpawnInMs = state.nextSpawnInMs - action.deltaMs;
      let nextWordId = state.nextWordId;
      if (nextSpawnInMs <= 0 && words.length < config.maxWordsOnScreen) {
        words = [...words, spawnWord(config, state.weakChars, nextWordId)];
        nextWordId += 1;
        nextSpawnInMs = config.spawnIntervalMs;
      }

      return {
        ...state,
        elapsedMs,
        words,
        lives,
        combo,
        focusedWordId,
        nextSpawnInMs,
        nextWordId,
        effects,
        nextEffectId,
        status: lives <= 0 ? "gameover" : "playing",
      };
    }

    case "KEY": {
      if (state.status !== "playing") return state;
      const config = modeConfig(state.mode);
      const key = action.key.toLowerCase();
      const totalTyped = state.totalTyped + 1;

      const focused =
        state.focusedWordId !== null
          ? (state.words.find((w) => w.id === state.focusedWordId) ?? null)
          : null;

      if (focused && key === focused.text[focused.typed]) {
        const typed = focused.typed + 1;
        const totalCorrect = state.totalCorrect + 1;
        const shot = addEffect(
          state.effects,
          state.nextEffectId,
          "drop",
          focused.x,
          focused.progress * 92,
          state.elapsedMs,
        );
        const withShot = { ...state, effects: shot.effects, nextEffectId: shot.nextEffectId };

        if (typed >= focused.text.length) {
          return completeWord(withShot, focused, totalCorrect, totalTyped);
        }
        return {
          ...withShot,
          words: state.words.map((w) => (w.id === focused.id ? { ...w, typed } : w)),
          totalCorrect,
          totalTyped,
        };
      }

      if (focused) {
        return {
          ...state,
          combo: 0,
          score: Math.max(0, state.score - config.errorScorePenalty),
          totalIncorrect: state.totalIncorrect + 1,
          totalTyped,
        };
      }

      const candidates = state.words.filter((w) => w.text[0] === key);
      if (candidates.length === 0) {
        return {
          ...state,
          combo: 0,
          score: Math.max(0, state.score - config.errorScorePenalty),
          totalIncorrect: state.totalIncorrect + 1,
          totalTyped,
        };
      }

      const target = candidates.reduce((a, b) => (a.progress > b.progress ? a : b));
      const totalCorrect = state.totalCorrect + 1;
      const shot = addEffect(
        state.effects,
        state.nextEffectId,
        "drop",
        target.x,
        target.progress * 92,
        state.elapsedMs,
      );
      const withShot = { ...state, effects: shot.effects, nextEffectId: shot.nextEffectId };

      if (target.text.length === 1) {
        return completeWord(withShot, target, totalCorrect, totalTyped);
      }

      return {
        ...withShot,
        words: state.words.map((w) => (w.id === target.id ? { ...w, typed: 1 } : w)),
        focusedWordId: target.id,
        totalCorrect,
        totalTyped,
      };
    }

    default:
      return state;
  }
}

export function useChuvaGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
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

  const start = useCallback(
    (mode: ChuvaMode, weakChars: string[]) => dispatch({ type: "START", mode, weakChars }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const handleKey = useCallback((key: string) => dispatch({ type: "KEY", key }), []);
  const releaseTarget = useCallback(() => dispatch({ type: "RELEASE_TARGET" }), []);
  const activateZapper = useCallback(() => dispatch({ type: "USE_ZAPPER" }), []);

  return { state, start, reset, handleKey, releaseTarget, activateZapper };
}
