"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameBest, GameScoreResult } from "@tt-digita/shared";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiError, getChuvaBest, getWeakKeys, submitChuvaScore } from "@/lib/api";
import { useGlobalKeydown } from "@/lib/use-global-keydown";
import { ZAPPER_COMBO_MILESTONE, useChuvaGame } from "@/components/chuva/use-chuva-game";
import { ChuvaBoard } from "@/components/chuva/chuva-board";
import { CHUVA_MODES, type ChuvaMode } from "@/components/chuva/chuva-modes";
import { GameTitleScreen } from "@/components/games/game-title-screen";
import { GameScreenHeader } from "@/components/games/game-screen-header";
import { useRoomGameBridge } from "@/components/rooms/use-room-game-bridge";
import { RoomGameGate } from "@/components/rooms/room-game-gate";

export function ChuvaGame({ roomCode = null }: { roomCode?: string | null }) {
  const { state, start, reset, handleKey, releaseTarget, activateZapper } = useChuvaGame();
  const { inRoom, roomState, countdown, roomPodium, roomError, submitGameRound, readyToPlay } =
    useRoomGameBridge(roomCode);
  const [best, setBest] = useState<GameBest | null>(null);
  const [weakChars, setWeakChars] = useState<string[]>([]);
  const [reducedEffects, setReducedEffects] = useState(false);
  const [result, setResult] = useState<GameScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const submitting = state.status === "gameover" && !result && !error;

  useEffect(() => {
    getChuvaBest()
      .then(setBest)
      .catch(() => undefined);
    getWeakKeys()
      .then((keys) => setWeakChars(keys.map((k) => k.char)))
      .catch(() => undefined);
  }, []);

  // Sala de jogo: todos começam juntos quando o host manda "iniciar" -- sem
  // tela de escolha de modo aqui, usa "Normal" (equilibrado) como padrão.
  useEffect(() => {
    if (inRoom && readyToPlay && state.status === "ready") start("normal", weakChars);
  }, [inRoom, readyToPlay, state.status, start, weakChars]);

  useEffect(() => {
    if (state.status !== "gameover" || submittedRef.current) return;
    submittedRef.current = true;

    const totalRelevant = state.totalCorrect + state.totalIncorrect;
    const accuracy = totalRelevant > 0 ? state.totalCorrect / totalRelevant : 1;
    const durationMs = Math.max(1, Math.round(state.elapsedMs));

    submitChuvaScore({
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
      if (event.key === "Escape") {
        event.preventDefault();
        releaseTarget();
        return;
      }
      // Espaço nunca é a primeira letra de uma palavra do banco -- fica livre
      // pro zapper de emergência.
      if (event.key === " ") {
        event.preventDefault();
        activateZapper();
        return;
      }
      if (event.key.length !== 1) return;
      event.preventDefault();
      handleKey(event.key);
    },
    [handleKey, releaseTarget, activateZapper],
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
      <GameScreenHeader slug="chuva">
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
        <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-5">
          <Card>
            <CardDescription>Modo</CardDescription>
            <p className="text-sm font-semibold">
              {CHUVA_MODES.find((m) => m.key === state.mode)?.label}
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
            <CardDescription>Vidas</CardDescription>
            <p className="text-xl font-semibold">{"♥".repeat(state.lives) || "—"}</p>
          </Card>
          <Card className={state.zapperCharges > 0 ? "ring-2 ring-[var(--color-accent)]" : ""}>
            <CardDescription>Zapper</CardDescription>
            <p className="text-xl font-semibold">{"⚡".repeat(state.zapperCharges) || "—"}</p>
          </Card>
        </div>
      ) : null}

      {state.status === "ready" && !inRoom ? (
        <GameTitleScreen
          slug="chuva"
          best={best}
          howTo={[
            { text: "Digite a 1ª letra pra mirar" },
            { key: "Esc", text: "solta o alvo" },
            { key: "Espaço", text: `zapper (a cada ${ZAPPER_COMBO_MILESTONE} de combo)` },
            ...(weakChars.length > 0
              ? [
                  {
                    text: `Prioriza suas teclas fracas: ${weakChars
                      .map((c) => (c === " " ? "espaço" : c))
                      .join(", ")}`,
                  },
                ]
              : []),
          ]}
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            {CHUVA_MODES.map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => start(mode.key as ChuvaMode, weakChars)}
                className="rounded-2xl bg-white/10 p-4 text-left transition-[transform,background-color] duration-150 ease-out hover:-translate-y-0.5 hover:bg-white/20 active:translate-y-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                style={{ boxShadow: "0 4px 0 0 rgba(0,0,0,.3)" }}
              >
                <p className="font-black tracking-tight text-white">{mode.label}</p>
                <p className="mt-0.5 text-xs text-white/60">{mode.description}</p>
              </button>
            ))}
          </div>
        </GameTitleScreen>
      ) : null}

      {state.status === "playing" ? (
        <>
          <ChuvaBoard
            words={state.words}
            focusedWordId={state.focusedWordId}
            effects={state.effects}
            reducedEffects={reducedEffects}
          />
          <p className="text-center text-sm text-[var(--color-muted-foreground)]">
            {state.focusedWordId !== null
              ? "Esc solta a palavra atual para mirar outra."
              : state.zapperCharges > 0
                ? "Digite a primeira letra de uma palavra, ou aperte Espaço pra usar o zapper."
                : "Digite a primeira letra de uma palavra para mirar nela."}
          </p>
        </>
      ) : null}

      {state.status === "gameover" ? (
        <Card className="space-y-3 text-center">
          <CardTitle>Fim de jogo</CardTitle>
          <p className="text-3xl font-bold">{state.score} pontos</p>
          <CardDescription>
            {CHUVA_MODES.find((m) => m.key === state.mode)?.label} · {state.wordsCompleted}{" "}
            palavras completadas
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
