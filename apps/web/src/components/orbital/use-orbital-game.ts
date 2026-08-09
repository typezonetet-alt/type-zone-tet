"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { pickWord, pointsForTier } from "./word-bank";

export interface FallingWord {
  id: number;
  text: string;
  typed: number;
  progress: number; // 0 (topo) a 1 (base)
  speed: number; // progresso por ms
  points: number;
  // Ancora horizontal 0-100: 0 = encostada na borda esquerda, 50 = centro,
  // 100 = encostada na direita. Nao e o centro da palavra -- o board converte
  // isso num posicionamento que mantem a palavra inteira dentro da tela,
  // qualquer que seja o comprimento dela (ver orbital-board.tsx).
  x: number;
}

// Efeito visual efemero (tiro/explosao/impacto). Vive dentro do proprio
// reducer -- nao num useEffect derivando do view layer -- porque o reducer ja
// sabe exatamente o instante de cada tiro/acerto/perda, e assim o componente
// de renderizacao (OrbitalBoard) pode ficar 100% puro (sem ref, sem estado
// proprio, sem setState em efeito).
export interface GameEffect {
  id: number;
  kind: "shot" | "burst" | "miss";
  x: number;
  y: number;
  createdAtElapsedMs: number;
}

export interface OrbitalState {
  status: "ready" | "playing" | "gameover";
  words: FallingWord[];
  score: number;
  combo: number;
  multiplier: number;
  lives: number;
  level: number;
  // Palavras completadas dentro do nivel atual -- zera a cada level up.
  wordsInLevel: number;
  // Momento (em elapsedMs) da ultima subida de nivel. O board usa isso pra
  // decidir se ainda mostra o anuncio de nivel novo -- derivado do estado,
  // sem timer proprio no componente.
  levelUpAtMs: number | null;
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
  // Bomba de emergencia (ref. ZType: "EMP bombs" pra quando a tela fica
  // sobrecarregada). Ganha por desempenho (subir de nivel), nunca comprada --
  // limpa a tela sem dar pontos nem quebrar o combo, e um botao de panico, nao
  // uma ferramenta de pontuacao.
  bombCharges: number;
  bombsUsed: number;
}

type OrbitalAction =
  | { type: "START" }
  | { type: "TICK"; deltaMs: number }
  | { type: "KEY"; key: string }
  | { type: "RELEASE_TARGET" }
  | { type: "USE_BOMB" }
  | { type: "RESET" };

const MAX_LIVES = 3;
const MAX_MULTIPLIER = 3;
export const MAX_BOMBS = 2;
export const EFFECT_LIFETIME_MS = 380;
export const LEVEL_UP_BANNER_MS = 2200;

// Dificuldade por nivel (nao por tempo corrido): comeca bem devagar e so
// acelera quando o jogador avanca de nivel, completando palavras.
//
// Nivel 1 e deliberadamente lento (22s pra uma palavra atravessar a tela, uma
// palavra nova a cada 3,5s) -- e o primeiro contato de um aluno que ainda esta
// aprendendo a digitar sem olhar, entao precisa dar tempo de procurar a tecla.
// O teto de dificuldade e atingido por volta do nivel 14.
const START_FALL_DURATION_MS = 22000;
const MIN_FALL_DURATION_MS = 5000;
const FALL_DURATION_STEP_MS = 1300;

const START_SPAWN_INTERVAL_MS = 3500;
const MIN_SPAWN_INTERVAL_MS = 700;
const SPAWN_INTERVAL_STEP_MS = 220;

function initialState(): OrbitalState {
  return {
    status: "ready",
    words: [],
    score: 0,
    combo: 0,
    multiplier: 1,
    lives: MAX_LIVES,
    level: 1,
    wordsInLevel: 0,
    levelUpAtMs: null,
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
    bombCharges: 0,
    bombsUsed: 0,
  };
}

// Quantas palavras precisam ser completadas para passar do nivel N pro N+1.
// Nivel 1 pede 5, nivel 2 pede 8, nivel 3 pede 11... cresce 3 por nivel.
export function wordsRequiredForLevel(level: number): number {
  return 5 + (level - 1) * 3;
}

function fallDurationFor(level: number): number {
  const reduction = Math.min(
    START_FALL_DURATION_MS - MIN_FALL_DURATION_MS,
    (level - 1) * FALL_DURATION_STEP_MS,
  );
  return START_FALL_DURATION_MS - reduction;
}

function spawnIntervalFor(level: number): number {
  const reduction = Math.min(
    START_SPAWN_INTERVAL_MS - MIN_SPAWN_INTERVAL_MS,
    (level - 1) * SPAWN_INTERVAL_STEP_MS,
  );
  return START_SPAWN_INTERVAL_MS - reduction;
}

// Tela cheia de palavras assusta quem esta comecando. Nivel 1 mostra no maximo
// 3 ao mesmo tempo; a cada 2 niveis cabe mais uma, ate 8.
function maxWordsOnScreenFor(level: number): number {
  return Math.min(8, 3 + Math.floor((level - 1) / 2));
}

// Centro visual aproximado da palavra, em % do tabuleiro -- so pra mirar o
// feixe do drone. A posicao real e resolvida em CSS (orbital-board.tsx), que
// e exata; aqui uma estimativa basta, porque um feixe alguns pixels torto e
// imperceptivel. Medido no navegador: ~10.9px por caractere (fonte mono
// text-lg) + 22px de padding/borda, sobre um tabuleiro de ~630px.
const CHAR_WIDTH_PCT = (10.9 / 630) * 100;
const WORD_PADDING_PCT = (22 / 630) * 100;

function visualCenterX(word: { text: string; x: number }): number {
  const widthPct = Math.min(100, word.text.length * CHAR_WIDTH_PCT + WORD_PADDING_PCT);
  // Mesma conta que o CSS faz: left: x% + translateX(-x% da propria largura).
  return word.x * (1 - widthPct / 100) + widthPct / 2;
}

function multiplierForCombo(combo: number): number {
  return Math.min(MAX_MULTIPLIER, 1 + Math.floor(combo / 5) * 0.5);
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

function completeWord(
  state: OrbitalState,
  word: FallingWord,
  totalCorrect: number,
  totalTyped: number,
): OrbitalState {
  const combo = state.combo + 1;
  const multiplier = multiplierForCombo(combo);
  const { effects, nextEffectId } = addEffect(
    state.effects,
    state.nextEffectId,
    "burst",
    visualCenterX(word),
    word.progress * 92,
    state.elapsedMs,
  );

  // Sobe de nivel quando completa palavras suficientes -- so afeta a
  // velocidade/frequencia das PROXIMAS palavras a nascer (as que ja estao
  // caindo mantem a velocidade de quando surgiram).
  const wordsInLevel = state.wordsInLevel + 1;
  const levelUp = wordsInLevel >= wordsRequiredForLevel(state.level);
  const level = levelUp ? state.level + 1 : state.level;
  const bombCharges = levelUp ? Math.min(MAX_BOMBS, state.bombCharges + 1) : state.bombCharges;

  return {
    ...state,
    words: state.words.filter((w) => w.id !== word.id),
    score: state.score + Math.round(word.points * multiplier),
    combo,
    multiplier,
    level,
    wordsInLevel: levelUp ? 0 : wordsInLevel,
    levelUpAtMs: levelUp ? state.elapsedMs : state.levelUpAtMs,
    bombCharges,
    wordsCompleted: state.wordsCompleted + 1,
    focusedWordId: null,
    totalCorrect,
    totalTyped,
    effects,
    nextEffectId,
  };
}

function reducer(state: OrbitalState, action: OrbitalAction): OrbitalState {
  switch (action.type) {
    case "RESET":
      return initialState();

    case "START":
      if (state.status !== "ready") return state;
      return { ...state, status: "playing" };

    // Bomba de emergencia: limpa a tela sem pontuar e sem quebrar o combo --
    // e uma valvula de escape pra quando a tela ficou sobrecarregada, nao uma
    // ferramenta pra otimizar pontuacao (por isso nao da pontos pelas palavras
    // limpas e preserva o combo/multiplicador atual).
    case "USE_BOMB": {
      if (state.status !== "playing" || state.bombCharges <= 0 || state.words.length === 0) {
        return state;
      }
      let effects = state.effects;
      let nextEffectId = state.nextEffectId;
      for (const word of state.words) {
        const added = addEffect(effects, nextEffectId, "burst", visualCenterX(word), word.progress * 92, state.elapsedMs);
        effects = added.effects;
        nextEffectId = added.nextEffectId;
      }
      return {
        ...state,
        words: [],
        focusedWordId: null,
        bombCharges: state.bombCharges - 1,
        bombsUsed: state.bombsUsed + 1,
        effects,
        nextEffectId,
      };
    }

    // Solta o alvo atual de proposito (Esc), pra poder mirar outra palavra --
    // util quando uma outra esta quase alcancando a base. A palavra largada
    // volta a ficar intacta e pode ser mirada de novo depois.
    case "RELEASE_TARGET": {
      if (state.status !== "playing" || state.focusedWordId === null) return state;
      return {
        ...state,
        words: state.words.map((w) =>
          w.id === state.focusedWordId ? { ...w, typed: 0 } : w,
        ),
        focusedWordId: null,
      };
    }

    case "TICK": {
      if (state.status !== "playing") return state;

      const elapsedMs = state.elapsedMs + action.deltaMs;
      let words = state.words.map((word) => ({
        ...word,
        progress: word.progress + word.speed * action.deltaMs,
      }));

      let lives = state.lives;
      let combo = state.combo;
      let multiplier = state.multiplier;
      let focusedWordId = state.focusedWordId;
      let effects = state.effects;
      let nextEffectId = state.nextEffectId;

      // Palavra alcancou a base: some sem completar, quebra o combo.
      const reachedBase = words.filter((w) => w.progress >= 1);
      if (reachedBase.length > 0) {
        lives -= reachedBase.length;
        combo = 0;
        multiplier = 1;
        if (reachedBase.some((w) => w.id === focusedWordId)) {
          focusedWordId = null;
        }
        for (const word of reachedBase) {
          const added = addEffect(effects, nextEffectId, "miss", visualCenterX(word), 97, elapsedMs);
          effects = added.effects;
          nextEffectId = added.nextEffectId;
        }
        words = words.filter((w) => w.progress < 1);
      }

      effects = effects.filter((e) => elapsedMs - e.createdAtElapsedMs < EFFECT_LIFETIME_MS);

      let nextSpawnInMs = state.nextSpawnInMs - action.deltaMs;
      let nextWordId = state.nextWordId;
      if (nextSpawnInMs <= 0 && words.length < maxWordsOnScreenFor(state.level)) {
        const { text, tier } = pickWord(state.level);
        words = [
          ...words,
          {
            id: nextWordId,
            text,
            typed: 0,
            progress: 0,
            speed: 1 / fallDurationFor(state.level),
            points: pointsForTier(tier),
            // 0-100 e a ancora, nao o centro: o board garante que a palavra
            // inteira cabe na tela em qualquer um desses valores.
            x: Math.random() * 100,
          },
        ];
        nextWordId += 1;
        nextSpawnInMs = spawnIntervalFor(state.level);
      }

      return {
        ...state,
        elapsedMs,
        words,
        lives,
        combo,
        multiplier,
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
      const key = action.key.toLowerCase();
      const totalTyped = state.totalTyped + 1;

      const focused =
        state.focusedWordId !== null
          ? (state.words.find((w) => w.id === state.focusedWordId) ?? null)
          : null;

      // 1) Continuar a palavra em foco, quando a tecla e a proxima dela.
      if (focused && key === focused.text[focused.typed]) {
        const typed = focused.typed + 1;
        const totalCorrect = state.totalCorrect + 1;
        const shot = addEffect(
          state.effects,
          state.nextEffectId,
          "shot",
          visualCenterX(focused),
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

      // 2) Travado numa palavra e a tecla nao e a proxima dela: e so erro.
      // NAO troca de alvo sozinho -- se trocasse, um simples typo no meio de
      // "professor" (um "s" no lugar do "e") arrancaria o jogador pra "sol" e
      // ele perderia a palavra que ja estava quase pronta. Pra trocar de alvo
      // de proposito existe o Esc (acao RELEASE_TARGET).
      if (focused) {
        return {
          ...state,
          combo: 0,
          multiplier: 1,
          totalIncorrect: state.totalIncorrect + 1,
          totalTyped,
        };
      }

      // 3) Sem alvo: a tecla mira a primeira palavra que comeca com ela.
      const candidates = state.words.filter((w) => w.text[0] === key);
      if (candidates.length === 0) {
        return {
          ...state,
          combo: 0,
          multiplier: 1,
          totalIncorrect: state.totalIncorrect + 1,
          totalTyped,
        };
      }

      // Entre as que comecam com essa letra, mira a mais urgente (mais perto da base).
      const target = candidates.reduce((a, b) => (a.progress > b.progress ? a : b));
      const totalCorrect = state.totalCorrect + 1;
      const shot = addEffect(
        state.effects,
        state.nextEffectId,
        "shot",
        visualCenterX(target),
        target.progress * 92,
        state.elapsedMs,
      );
      const withShot = {
        ...state,
        effects: shot.effects,
        nextEffectId: shot.nextEffectId,
      };

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

export function useOrbitalGame() {
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

  const start = useCallback(() => dispatch({ type: "START" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const handleKey = useCallback((key: string) => dispatch({ type: "KEY", key }), []);
  const releaseTarget = useCallback(() => dispatch({ type: "RELEASE_TARGET" }), []);
  const activateBomb = useCallback(() => dispatch({ type: "USE_BOMB" }), []);

  return { state, start, reset, handleKey, releaseTarget, activateBomb };
}
