"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AttemptResult, CharStat, ExerciseDetail } from "@tt-digita/shared";
import { ApiError, submitAttempt } from "@/lib/api";
import { useGlobalKeydown } from "@/lib/use-global-keydown";
import { useTypingEngine } from "./use-typing-engine";
import { TypingTrack } from "./typing-track";
import { VirtualKeyboard } from "./virtual-keyboard";
import { ResultCard } from "./result-card";

export function TypingSession({ exercise }: { exercise: ExerciseDetail }) {
  const targetChars = useMemo(() => Array.from(exercise.content), [exercise.content]);
  const [state, dispatch] = useTypingEngine(targetChars);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitting = state.phase === "finished" && !result && !error;

  useEffect(() => {
    if (state.phase !== "finished" || result || error) return;

    const durationMs = state.startedAt ? performance.now() - state.startedAt : 0;
    const charStats: CharStat[] = Object.entries(state.charStats).map(
      ([char, stat]) => ({ char, attempts: stat.attempts, errors: stat.errors }),
    );

    submitAttempt({
      exerciseId: exercise.id,
      durationMs: Math.max(durationMs, 1),
      expectedChars: targetChars.length,
      typedChars: state.totalTyped,
      correctChars: state.totalCorrect,
      incorrectChars: state.totalIncorrect,
      backspaces: state.backspaces,
      charsPerSecondBuckets: state.buckets,
      charStats,
    })
      .then(setResult)
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : "Não foi possível salvar o resultado.",
        );
      });
  }, [state, result, error, exercise.id, targetChars.length]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (state.phase === "finished") return;

      if (event.key === "Backspace") {
        event.preventDefault();
        dispatch({ type: "BACKSPACE" });
        return;
      }

      // Ignora teclas de controle/modificadoras (Shift, Tab, setas...).
      if (event.key.length !== 1) return;
      event.preventDefault();

      dispatch({
        type: "TYPE",
        char: event.key,
        now: performance.now(),
      });
    },
    [state.phase, dispatch],
  );

  useGlobalKeydown(handleKeyDown, !result);

  function retry() {
    dispatch({ type: "RESET" });
    setResult(null);
    setError(null);
  }

  if (result) {
    return <ResultCard result={result} exercise={exercise} onRetry={retry} />;
  }

  const currentChar = targetChars[state.position] ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <TypingTrack
        targetChars={targetChars}
        position={state.position}
        wrongStreak={state.wrongStreak}
      />

      {error ? (
        <p role="alert" className="text-center text-sm text-[var(--color-error)]">
          {error}
        </p>
      ) : null}
      {submitting ? (
        <p className="text-center text-sm text-[var(--color-muted-foreground)]">
          Salvando resultado...
        </p>
      ) : null}

      <VirtualKeyboard targetChar={currentChar} />
    </div>
  );
}
