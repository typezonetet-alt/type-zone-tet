"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameBest, GameScoreResult } from "@tt-digita/shared";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiError, getOrbitalBest, submitOrbitalScore } from "@/lib/api";
import { useGlobalKeydown } from "@/lib/use-global-keydown";
import { useOrbitalGame, wordsRequiredForLevel } from "@/components/orbital/use-orbital-game";
import { OrbitalBoard } from "@/components/orbital/orbital-board";

export function OrbitalGame() {
  const { state, start, reset, handleKey, releaseTarget } = useOrbitalGame();
  const [best, setBest] = useState<GameBest | null>(null);
  const [reducedEffects, setReducedEffects] = useState(false);
  const [result, setResult] = useState<GameScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const submitting = state.status === "gameover" && !result && !error;

  useEffect(() => {
    getOrbitalBest()
      .then(setBest)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (state.status !== "gameover" || submittedRef.current) return;
    submittedRef.current = true;

    const totalRelevant = state.totalCorrect + state.totalIncorrect;
    const accuracy = totalRelevant > 0 ? state.totalCorrect / totalRelevant : 1;

    submitOrbitalScore({
      score: state.score,
      wordsCompleted: state.wordsCompleted,
      accuracy,
      durationMs: Math.max(1, Math.round(state.elapsedMs)),
    })
      .then((res) => {
        setResult(res);
        setBest((prev) => ({
          score: res.isNewBest ? res.score : (prev?.score ?? res.score),
          wordsCompleted: res.isNewBest ? res.wordsCompleted : (prev?.wordsCompleted ?? res.wordsCompleted),
          accuracy: res.isNewBest ? res.accuracy : (prev?.accuracy ?? res.accuracy),
        }));
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Não foi possível salvar a pontuação.");
      });
  }, [state.status, state.score, state.wordsCompleted, state.totalCorrect, state.totalIncorrect, state.elapsedMs]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Esc solta a palavra em foco pra poder mirar outra (ex.: uma que esta
      // quase alcancando a base).
      if (event.key === "Escape") {
        event.preventDefault();
        releaseTarget();
        return;
      }
      if (event.key.length !== 1) return;
      event.preventDefault();
      handleKey(event.key);
    },
    [handleKey, releaseTarget],
  );

  useGlobalKeydown(handleKeyDown, state.status === "playing");

  function playAgain() {
    reset();
    setResult(null);
    setError(null);
    submittedRef.current = false;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-primary)]">Jogar</p>
          <h1 className="text-2xl font-semibold">T&T Orbital</h1>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
          <input
            type="checkbox"
            checked={reducedEffects}
            onChange={(e) => setReducedEffects(e.target.checked)}
          />
          Efeitos reduzidos
        </label>
      </div>

      {state.status === "playing" ? (
        <div className="grid grid-cols-5 gap-3 text-center">
          <Card>
            <CardDescription>Nível</CardDescription>
            <p className="text-xl font-semibold">{state.level}</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {state.wordsInLevel}/{wordsRequiredForLevel(state.level)}
            </p>
          </Card>
          <Card>
            <CardDescription>Pontos</CardDescription>
            <p className="text-xl font-semibold">{state.score}</p>
          </Card>
          <Card>
            <CardDescription>Combo</CardDescription>
            <p className="text-xl font-semibold">{state.combo}x</p>
          </Card>
          <Card>
            <CardDescription>Multiplicador</CardDescription>
            <p className="text-xl font-semibold">{state.multiplier.toFixed(1)}×</p>
          </Card>
          <Card>
            <CardDescription>Vidas</CardDescription>
            <p className="text-xl font-semibold">{"♥".repeat(state.lives) || "—"}</p>
          </Card>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <Card className="space-y-4 text-center">
          <CardTitle>Pronto para decolar?</CardTitle>
          <CardDescription>
            Digite a primeira letra de uma palavra para mirar nela, depois complete antes que
            alcance a base. Errar não troca de alvo — use <kbd className="rounded border border-[var(--color-border)] px-1 font-mono text-xs">Esc</kbd> para soltar a palavra e mirar outra.
          </CardDescription>
          {best?.score !== null && best?.score !== undefined ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Seu recorde: {best.score} pontos
            </p>
          ) : null}
          <Button onClick={start}>Jogar</Button>
        </Card>
      ) : null}

      {state.status === "playing" ? (
        <>
          <OrbitalBoard
            words={state.words}
            focusedWordId={state.focusedWordId}
            effects={state.effects}
            level={state.level}
            levelUpAtMs={state.levelUpAtMs}
            elapsedMs={state.elapsedMs}
            reducedEffects={reducedEffects}
          />
          <p className="text-center text-sm text-[var(--color-muted-foreground)]">
            {state.focusedWordId !== null
              ? "Esc solta a palavra atual para mirar outra."
              : "Digite a primeira letra de uma palavra para mirar nela."}
          </p>
        </>
      ) : null}

      {state.status === "gameover" ? (
        <Card className="space-y-3 text-center">
          <CardTitle>Fim de jogo</CardTitle>
          <p className="text-3xl font-bold">{state.score} pontos</p>
          <CardDescription>
            Nível {state.level} · {state.wordsCompleted} palavras completadas
            {result ? ` · ${Math.round(result.accuracy * 100)}% de precisão` : ""}
          </CardDescription>
          {result?.isNewBest ? <Badge variant="success">Novo recorde!</Badge> : null}
          {error ? <p className="text-sm text-[var(--color-error)]">{error}</p> : null}
          {submitting ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Salvando pontuação...</p>
          ) : null}
          <Button onClick={playAgain}>Jogar de novo</Button>
        </Card>
      ) : null}
    </div>
  );
}
