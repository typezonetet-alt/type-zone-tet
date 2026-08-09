"use client";

import { useMemo, useReducer } from "react";

export interface TypingSessionState {
  // Numero de caracteres corretamente concluidos (o cursor). So avanca com o
  // caractere certo -- errar nao avanca, so soma no total de erros.
  position: number;
  // Erros seguidos na posicao atual, sem avancar. Usado so pra reforcar o
  // feedback visual (sacode); zera ao acertar ou apagar.
  wrongStreak: number;
  totalTyped: number;
  totalCorrect: number;
  totalIncorrect: number;
  backspaces: number;
  startedAt: number | null;
  buckets: number[];
  // Tentativas/erros por caractere-alvo (a tecla que precisava ser pressionada),
  // nao pelo que a pessoa efetivamente digitou. Base do mapa de teclas fracas.
  charStats: Record<string, { attempts: number; errors: number }>;
  phase: "typing" | "finished";
}

export type TypingSessionAction =
  | { type: "TYPE"; char: string; now: number }
  | { type: "BACKSPACE" }
  | { type: "RESET" };

function initialState(): TypingSessionState {
  return {
    position: 0,
    wrongStreak: 0,
    totalTyped: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    backspaces: 0,
    startedAt: null,
    buckets: [],
    charStats: {},
    phase: "typing",
  };
}

// O caractere esperado e derivado AQUI DENTRO, a partir do state.position que
// o proprio reducer recebe -- nunca de um valor calculado no componente e
// passado junto na action. useReducer garante que cada dispatch roda contra o
// estado mais recente, mas isso so vale se o reducer for a UNICA fonte de
// "qual e a proxima tecla esperada"; se o chamador computasse isso ele mesmo
// (via um closure de handleKeyDown), digitação muito rapida -- varios keydown
// disparados antes do React re-renderizar entre eles -- podia fazer duas
// teclas seguidas serem avaliadas contra o MESMO "esperado" desatualizado,
// corrompendo a contagem de acerto/erro exatamente pros digitadores mais
// rapidos (a persona que o produto menos pode atrapalhar).
function createReducer(targetChars: string[]) {
  return function sessionReducer(
    state: TypingSessionState,
    action: TypingSessionAction,
  ): TypingSessionState {
    if (action.type === "RESET") return initialState();
    if (state.phase === "finished") return state;

    switch (action.type) {
      case "BACKSPACE": {
        if (state.position === 0) return state;
        return {
          ...state,
          position: state.position - 1,
          wrongStreak: 0,
          backspaces: state.backspaces + 1,
        };
      }

      case "TYPE": {
        const expected = targetChars[state.position];
        const startedAt = state.startedAt ?? action.now;
        const correct = action.char === expected;
        const elapsedSeconds = Math.floor((action.now - startedAt) / 1000);
        const buckets = [...state.buckets];
        // Preenche segundos sem nenhuma tecla com 0 para o array nunca ficar
        // esparso (índices "buracos" viram null no JSON e falham a validação).
        while (buckets.length <= elapsedSeconds) buckets.push(0);
        buckets[elapsedSeconds] += 1;

        // Erro nao avanca o cursor: a pessoa precisa acertar pra seguir. O erro
        // ainda conta pra precisao final (nao vira "de graca").
        const position = correct ? state.position + 1 : state.position;

        const prevCharStat = state.charStats[expected] ?? { attempts: 0, errors: 0 };
        const charStats = {
          ...state.charStats,
          [expected]: {
            attempts: prevCharStat.attempts + 1,
            errors: prevCharStat.errors + (correct ? 0 : 1),
          },
        };

        return {
          ...state,
          position,
          startedAt,
          buckets,
          charStats,
          wrongStreak: correct ? 0 : state.wrongStreak + 1,
          totalTyped: state.totalTyped + 1,
          totalCorrect: state.totalCorrect + (correct ? 1 : 0),
          totalIncorrect: state.totalIncorrect + (correct ? 0 : 1),
          phase: position === targetChars.length ? "finished" : "typing",
        };
      }

      default:
        return state;
    }
  };
}

export function useTypingEngine(targetChars: string[]) {
  const reducer = useMemo(() => createReducer(targetChars), [targetChars]);
  return useReducer(reducer, undefined, initialState);
}
