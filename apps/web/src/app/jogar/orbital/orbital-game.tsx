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
import { GameTitleScreen } from "@/components/games/game-title-screen";
import { GameScreenHeader } from "@/components/games/game-screen-header";
import { useRoomGameBridge } from "@/components/rooms/use-room-game-bridge";
import { RoomGameGate } from "@/components/rooms/room-game-gate";

export function OrbitalGame({ roomCode = null }: { roomCode?: string | null }) {
  const { state, start, reset, handleKey, releaseTarget, activateBomb } = useOrbitalGame();
  const { inRoom, roomState, countdown, roomPodium, roomError, submitGameRound, readyToPlay } =
    useRoomGameBridge(roomCode);
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

  // Sala de jogo: todos começam juntos quando o host manda "iniciar" -- sem
  // tela de título manual aqui.
  useEffect(() => {
    if (inRoom && readyToPlay && state.status === "ready") start();
  }, [inRoom, readyToPlay, state.status, start]);

  useEffect(() => {
    if (state.status !== "gameover" || submittedRef.current) return;
    submittedRef.current = true;

    const totalRelevant = state.totalCorrect + state.totalIncorrect;
    const accuracy = totalRelevant > 0 ? state.totalCorrect / totalRelevant : 1;
    const durationMs = Math.max(1, Math.round(state.elapsedMs));

    submitOrbitalScore({
      score: state.score,
      wordsCompleted: state.wordsCompleted,
      accuracy,
      durationMs,
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

    if (inRoom) {
      submitGameRound({ score: state.score, wordsCompleted: state.wordsCompleted, accuracy, durationMs });
    }
  }, [state.status, state.score, state.wordsCompleted, state.totalCorrect, state.totalIncorrect, state.elapsedMs, inRoom, submitGameRound]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Esc solta a palavra em foco pra poder mirar outra (ex.: uma que esta
      // quase alcancando a base).
      if (event.key === "Escape") {
        event.preventDefault();
        releaseTarget();
        return;
      }
      // Espaço nunca é a primeira letra de uma palavra do banco -- fica livre
      // pra acionar a bomba de emergência sem conflitar com a digitação.
      if (event.key === " ") {
        event.preventDefault();
        activateBomb();
        return;
      }
      if (event.key.length !== 1) return;
      event.preventDefault();
      handleKey(event.key);
    },
    [handleKey, releaseTarget, activateBomb],
  );

  useGlobalKeydown(handleKeyDown, state.status === "playing");

  function playAgain() {
    reset();
    setResult(null);
    setError(null);
    submittedRef.current = false;
  }

  const gameContent = (
    <div className="mx-auto max-w-2xl space-y-4">
      <GameScreenHeader slug="orbital">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={reducedEffects}
            onChange={(e) => setReducedEffects(e.target.checked)}
          />
          Efeitos reduzidos
        </label>
      </GameScreenHeader>

      {state.status === "playing" ? (
        <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-6">
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
          <Card className={state.bombCharges > 0 ? "ring-2 ring-[var(--color-accent)]" : ""}>
            <CardDescription>Bomba</CardDescription>
            <p className="text-xl font-semibold">{"💣".repeat(state.bombCharges) || "—"}</p>
          </Card>
        </div>
      ) : null}

      {state.status === "ready" && !inRoom ? (
        <GameTitleScreen
          slug="orbital"
          best={best}
          onPlay={start}
          howTo={[
            { text: "Digite a 1ª letra pra mirar" },
            { key: "Esc", text: "solta o alvo" },
            { key: "Espaço", text: "bomba de emergência" },
          ]}
        />
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
              : state.bombCharges > 0
                ? "Digite a primeira letra de uma palavra, ou aperte Espaço pra usar a bomba."
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

  if (inRoom) {
    return (
      <RoomGameGate roomState={roomState} countdown={countdown} roomPodium={roomPodium} roomError={roomError}>
        {gameContent}
      </RoomGameGate>
    );
  }

  return gameContent;
}
