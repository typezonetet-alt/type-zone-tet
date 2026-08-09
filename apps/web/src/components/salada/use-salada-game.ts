"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  COMBO_WINDOW_MS,
  DESPAWN_Y,
  FRUITS_PER_LEVEL,
  GRAVITY,
  LAUNCH_Y,
  LETRAS_INTERVAL_MULTIPLIER,
  LETRAS_SPEED_MULTIPLIER,
  MAX_LEVEL,
  MAX_MULTIPLIER,
  START_LIVES,
  bombChanceFor,
  launchSpeedFor,
  pickAnyFruit,
  pickBombLetter,
  pickBombWord,
  pickFruit,
  pickLetter,
  pointsForWord,
  waveIntervalFor,
  waveSizeFor,
  type SaladaDifficulty,
  type SaladaMode,
} from "./salada-config";

export interface Tossed {
  id: number;
  text: string;
  typed: number;
  isBomb: boolean;
  emoji: string;
  /** 0-100 da esquerda pra direita. */
  x: number;
  /** 0 no topo, 100 na base. Começa abaixo de 100 e sobe (y diminui). */
  y: number;
  vx: number;
  vy: number;
  spin: number;
  spinSpeed: number;
  points: number;
}

export interface SaladaEffect {
  id: number;
  kind: "slice" | "boom" | "drop";
  x: number;
  y: number;
  createdAtElapsedMs: number;
  /** Só em "slice": qual fruta foi cortada, pra desenhar as duas metades voando. */
  emoji?: string;
}

export interface SaladaState {
  status: "ready" | "playing" | "gameover";
  mode: SaladaMode;
  difficulty: SaladaDifficulty;
  level: number;
  tossed: Tossed[];
  score: number;
  combo: number;
  multiplier: number;
  lives: number;
  fruitsSliced: number;
  fruitsInLevel: number;
  bombsHit: number;
  bombsDodged: number;
  totalTyped: number;
  totalCorrect: number;
  totalIncorrect: number;
  elapsedMs: number;
  focusedId: number | null;
  lastSliceAtMs: number | null;
  nextWaveInMs: number;
  nextId: number;
  effects: SaladaEffect[];
  nextEffectId: number;
  levelUpAtMs: number | null;
  /** Mensagem curta do último acontecimento (bomba, combo alto...). */
  flash: { text: string; tone: "good" | "bad"; atMs: number } | null;
}

export type SaladaAction =
  | { type: "START"; mode: SaladaMode; difficulty: SaladaDifficulty }
  | { type: "RESET" }
  | { type: "TICK"; deltaMs: number }
  | { type: "KEY"; key: string }
  | { type: "RELEASE_TARGET" };

export const EFFECT_LIFETIME_MS = 650;
export const FLASH_LIFETIME_MS = 1100;
export const LEVEL_UP_BANNER_MS = 1800;

// Exportados para teste: o reducer é uma função pura, então dá pra travar
// as regras do jogo (principalmente a da bomba) sem montar React nenhum.
export function initialSaladaState(): SaladaState {
  return {
    status: "ready",
    mode: "palavras",
    difficulty: "facil",
    level: 1,
    tossed: [],
    score: 0,
    combo: 0,
    multiplier: 1,
    lives: START_LIVES,
    fruitsSliced: 0,
    fruitsInLevel: 0,
    bombsHit: 0,
    bombsDodged: 0,
    totalTyped: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    elapsedMs: 0,
    focusedId: null,
    lastSliceAtMs: null,
    nextWaveInMs: 600,
    nextId: 0,
    effects: [],
    nextEffectId: 0,
    levelUpAtMs: null,
    flash: null,
  };
}

function addEffect(
  effects: SaladaEffect[],
  nextEffectId: number,
  kind: SaladaEffect["kind"],
  x: number,
  y: number,
  elapsedMs: number,
  emoji?: string,
): { effects: SaladaEffect[]; nextEffectId: number } {
  return {
    effects: [...effects, { id: nextEffectId, kind, x, y, createdAtElapsedMs: elapsedMs, emoji }],
    nextEffectId: nextEffectId + 1,
  };
}

// Arremesso: sai de baixo, com uma inclinação que sempre aponta pra dentro da
// tela (quem sai da esquerda vai pra direita e vice-versa), então nada some
// pela lateral logo de cara.
function toss(
  level: number,
  difficulty: SaladaDifficulty,
  mode: SaladaMode,
  id: number,
  laneX: number,
): Tossed {
  const isBomb = Math.random() < bombChanceFor(level, difficulty);
  // No modo Letras a fruta é só ilustração -- o texto vem do alfabeto
  // inteiro (pickLetter), não da inicial da fruta sorteada, pra cobrir as
  // duas mãos no teclado em vez de ficar preso às poucas letras que
  // começam nome de fruta.
  const fruit = isBomb ? null : mode === "letras" ? pickAnyFruit() : pickFruit(level, difficulty);
  const text = isBomb ? (mode === "letras" ? pickBombLetter() : pickBombWord()) : mode === "letras" ? pickLetter() : fruit!.word;
  const speedMultiplier = mode === "letras" ? LETRAS_SPEED_MULTIPLIER : 1;
  const speed = launchSpeedFor(level, difficulty) * speedMultiplier * (0.9 + Math.random() * 0.2);
  const towardCenter = (50 - laneX) / 50;

  return {
    id,
    text,
    typed: 0,
    isBomb,
    emoji: isBomb ? "💣" : fruit!.emoji,
    x: laneX,
    y: LAUNCH_Y,
    vx: towardCenter * 0.006 + (Math.random() - 0.5) * 0.004,
    vy: -speed,
    spin: 0,
    spinSpeed: (Math.random() - 0.5) * 0.22,
    points: isBomb ? 0 : pointsForWord(fruit!.word),
  };
}

function launchWave(state: SaladaState): { tossed: Tossed[]; nextId: number } {
  const count = waveSizeFor(state.level, state.difficulty);
  const tossed = [...state.tossed];
  let nextId = state.nextId;
  for (let i = 0; i < count; i++) {
    // Faixas distribuídas: evita duas coisas nascendo exatamente no mesmo x.
    const laneX = 14 + ((i + Math.random() * 0.7) / count) * 72;
    tossed.push(toss(state.level, state.difficulty, state.mode, nextId, laneX));
    nextId += 1;
  }
  return { tossed, nextId };
}

function sliceFruit(state: SaladaState, fruit: Tossed, totalCorrect: number, totalTyped: number): SaladaState {
  // Combo só continua se o corte veio dentro da janela -- encadear é o que
  // vale ponto, igual ao combo de "vários numa passada só" do Fruit Ninja.
  const withinWindow =
    state.lastSliceAtMs !== null && state.elapsedMs - state.lastSliceAtMs <= COMBO_WINDOW_MS;
  const combo = withinWindow ? state.combo + 1 : 1;
  const multiplier = Math.min(MAX_MULTIPLIER, 1 + Math.floor(combo / 3));

  const hit = addEffect(
    state.effects,
    state.nextEffectId,
    "slice",
    fruit.x,
    fruit.y,
    state.elapsedMs,
    fruit.emoji,
  );

  const fruitsInLevel = state.fruitsInLevel + 1;
  const levelUp = fruitsInLevel >= FRUITS_PER_LEVEL && state.level < MAX_LEVEL;

  return {
    ...state,
    tossed: state.tossed.filter((t) => t.id !== fruit.id),
    score: state.score + fruit.points * multiplier,
    combo,
    multiplier,
    level: levelUp ? state.level + 1 : state.level,
    fruitsInLevel: levelUp ? 0 : fruitsInLevel,
    levelUpAtMs: levelUp ? state.elapsedMs : state.levelUpAtMs,
    fruitsSliced: state.fruitsSliced + 1,
    lastSliceAtMs: state.elapsedMs,
    focusedId: null,
    totalCorrect,
    totalTyped,
    effects: hit.effects,
    nextEffectId: hit.nextEffectId,
    flash:
      combo >= 3
        ? { text: `Combo ${combo}x · ${multiplier}× pontos`, tone: "good", atMs: state.elapsedMs }
        : state.flash,
  };
}

function detonate(state: SaladaState, bomb: Tossed, totalTyped: number): SaladaState {
  const boom = addEffect(state.effects, state.nextEffectId, "boom", bomb.x, bomb.y, state.elapsedMs);
  const lives = state.lives - 1;
  return {
    ...state,
    tossed: state.tossed.filter((t) => t.id !== bomb.id),
    lives,
    combo: 0,
    multiplier: 1,
    bombsHit: state.bombsHit + 1,
    focusedId: null,
    totalTyped,
    totalIncorrect: state.totalIncorrect + 1,
    effects: boom.effects,
    nextEffectId: boom.nextEffectId,
    flash: { text: "Bomba! Deixe a bomba cair.", tone: "bad", atMs: state.elapsedMs },
    status: lives <= 0 ? "gameover" : state.status,
  };
}

export function saladaReducer(state: SaladaState, action: SaladaAction): SaladaState {
  switch (action.type) {
    case "RESET":
      return initialSaladaState();

    case "START":
      if (state.status !== "ready") return state;
      return { ...state, status: "playing", mode: action.mode, difficulty: action.difficulty };

    case "RELEASE_TARGET": {
      if (state.status !== "playing" || state.focusedId === null) return state;
      return {
        ...state,
        tossed: state.tossed.map((t) => (t.id === state.focusedId ? { ...t, typed: 0 } : t)),
        focusedId: null,
      };
    }

    case "TICK": {
      if (state.status !== "playing") return state;
      const elapsedMs = state.elapsedMs + action.deltaMs;

      // Física de arremesso: gravidade puxa vy pra baixo o tempo todo, então
      // cada item descreve uma parábola de verdade (sobe, desacelera, cai).
      let tossed = state.tossed.map((t) => ({
        ...t,
        x: t.x + t.vx * action.deltaMs,
        y: t.y + t.vy * action.deltaMs,
        vy: t.vy + GRAVITY * action.deltaMs,
        spin: t.spin + t.spinSpeed * action.deltaMs,
      }));

      let lives = state.lives;
      let combo = state.combo;
      let multiplier = state.multiplier;
      let focusedId = state.focusedId;
      let effects = state.effects;
      let nextEffectId = state.nextEffectId;
      let bombsDodged = state.bombsDodged;
      let flash = state.flash;

      // Saiu por baixo: fruta perdida custa vida; bomba que caiu é a jogada
      // certa e não custa nada.
      const gone = tossed.filter((t) => t.y > DESPAWN_Y && t.vy > 0);
      if (gone.length > 0) {
        for (const item of gone) {
          if (item.isBomb) {
            bombsDodged += 1;
            continue;
          }
          lives -= 1;
          combo = 0;
          multiplier = 1;
          const missed = addEffect(effects, nextEffectId, "drop", item.x, 100, elapsedMs);
          effects = missed.effects;
          nextEffectId = missed.nextEffectId;
        }
        if (gone.some((t) => t.id === focusedId)) focusedId = null;
        tossed = tossed.filter((t) => !(t.y > DESPAWN_Y && t.vy > 0));
      }

      effects = effects.filter((e) => elapsedMs - e.createdAtElapsedMs < EFFECT_LIFETIME_MS);
      if (flash && elapsedMs - flash.atMs > FLASH_LIFETIME_MS) flash = null;

      let nextWaveInMs = state.nextWaveInMs - action.deltaMs;
      let nextId = state.nextId;
      if (nextWaveInMs <= 0) {
        const launched = launchWave({ ...state, tossed, nextId });
        tossed = launched.tossed;
        nextId = launched.nextId;
        nextWaveInMs =
          waveIntervalFor(state.level, state.difficulty) *
          (state.mode === "letras" ? LETRAS_INTERVAL_MULTIPLIER : 1);
      }

      return {
        ...state,
        elapsedMs,
        tossed,
        lives,
        combo,
        multiplier,
        focusedId,
        bombsDodged,
        nextWaveInMs,
        nextId,
        effects,
        nextEffectId,
        flash,
        status: lives <= 0 ? "gameover" : "playing",
      };
    }

    case "KEY": {
      if (state.status !== "playing") return state;
      const key = action.key.toLowerCase();
      const totalTyped = state.totalTyped + 1;

      const focused =
        state.focusedId !== null ? (state.tossed.find((t) => t.id === state.focusedId) ?? null) : null;

      // 1) Continuando o alvo travado.
      if (focused && key === focused.text[focused.typed]) {
        const typed = focused.typed + 1;
        const totalCorrect = state.totalCorrect + 1;

        if (typed >= focused.text.length) {
          return focused.isBomb
            ? detonate(state, focused, totalTyped)
            : sliceFruit(state, focused, totalCorrect, totalTyped);
        }
        return {
          ...state,
          tossed: state.tossed.map((t) => (t.id === focused.id ? { ...t, typed } : t)),
          totalCorrect,
          totalTyped,
        };
      }

      // 2) Travado e errou a tecla: só erro, não troca de alvo (Esc solta).
      if (focused) {
        return { ...state, combo: 0, multiplier: 1, totalIncorrect: state.totalIncorrect + 1, totalTyped };
      }

      // 3) Sem alvo: a tecla mira quem começa com ela. Entre os candidatos,
      // prioriza o que está mais perto de cair (vy > 0 e y maior) -- é o mais
      // urgente, mesma lógica de urgência do Orbital.
      const candidates = state.tossed.filter((t) => t.text[0] === key);
      if (candidates.length === 0) {
        return { ...state, combo: 0, multiplier: 1, totalIncorrect: state.totalIncorrect + 1, totalTyped };
      }

      const target = candidates.reduce((a, b) => (a.y > b.y ? a : b));
      const totalCorrect = state.totalCorrect + 1;

      if (target.text.length === 1) {
        return target.isBomb
          ? detonate(state, target, totalTyped)
          : sliceFruit(state, target, totalCorrect, totalTyped);
      }

      return {
        ...state,
        tossed: state.tossed.map((t) => (t.id === target.id ? { ...t, typed: 1 } : t)),
        focusedId: target.id,
        totalCorrect,
        totalTyped,
      };
    }

    default:
      return state;
  }
}

export function useSaladaGame() {
  const [state, dispatch] = useReducer(saladaReducer, undefined, initialSaladaState);
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
    (mode: SaladaMode, difficulty: SaladaDifficulty) => dispatch({ type: "START", mode, difficulty }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const handleKey = useCallback((key: string) => dispatch({ type: "KEY", key }), []);
  const releaseTarget = useCallback(() => dispatch({ type: "RELEASE_TARGET" }), []);

  return { state, start, reset, handleKey, releaseTarget };
}
