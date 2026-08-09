"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameBest, GameScoreResult } from "@tt-digita/shared";
import { Card, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiError, getRoboBest, submitRoboScore } from "@/lib/api";
import { useGlobalKeydown } from "@/lib/use-global-keydown";
import { useRoboGame } from "@/components/robo/use-robo-game";
import { useRoboAudio } from "@/components/robo/use-robo-audio";
import { RoboBoard } from "@/components/robo/robo-board";
import { GameTitleScreen } from "@/components/games/game-title-screen";
import { GameScreenHeader } from "@/components/games/game-screen-header";
import { GAME_IDENTITIES } from "@/components/games/game-identity";
import { STAGE_LABELS } from "@/components/robo/robo-word-bank";
import { useRoomGameBridge } from "@/components/rooms/use-room-game-bridge";
import { RoomGameGate } from "@/components/rooms/room-game-gate";

export function RoboGame({ roomCode = null }: { roomCode?: string | null }) {
  const { state, start, reset, handleKey } = useRoboGame();
  const { inRoom, roomState, countdown, roomPodium, roomError, submitGameRound, readyToPlay } =
    useRoomGameBridge(roomCode);
  const [best, setBest] = useState<GameBest | null>(null);
  const [reducedEffects, setReducedEffects] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(false);
  const [result, setResult] = useState<GameScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const submitting = state.status === "gameover" && !result && !error;
  const identity = GAME_IDENTITIES.robo;

  useRoboAudio({
    jumpStartedAt: state.jumpStartedAt,
    score: state.score,
    lives: state.lives,
    stage: state.stage,
    status: state.status,
    soundOn,
    musicOn,
  });

  useEffect(() => {
    getRoboBest()
      .then(setBest)
      .catch(() => undefined);
  }, []);

  // Sala de jogo: todos começam juntos quando o host manda "iniciar".
  useEffect(() => {
    if (inRoom && readyToPlay && state.status === "ready") start();
  }, [inRoom, readyToPlay, state.status, start]);

  useEffect(() => {
    if (state.status !== "gameover" || submittedRef.current) return;
    submittedRef.current = true;

    const totalRelevant = state.totalCorrect + state.totalIncorrect;
    const accuracy = totalRelevant > 0 ? state.totalCorrect / totalRelevant : 1;
    const durationMs = Math.max(1, Math.round(state.elapsedMs));

    submitRoboScore({
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
      if (event.key.length !== 1) return;
      event.preventDefault();
      handleKey(event.key);
    },
    [handleKey],
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
      <GameScreenHeader slug="robo">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={soundOn}
            onChange={(e) => setSoundOn(e.target.checked)}
          />
          Som
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={musicOn}
            onChange={(e) => setMusicOn(e.target.checked)}
          />
          Música
        </label>
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
        <div className="grid grid-cols-4 gap-3 text-center">
          <Card>
            <CardDescription>Fase</CardDescription>
            <p className="text-xl font-semibold">{state.stage}</p>
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
        </div>
      ) : null}

      {state.status === "ready" && !inRoom ? (
        <GameTitleScreen
          slug="robo"
          best={best}
          onPlay={start}
          howTo={[
            { text: "Aperte a tecla mostrada quando o obstáculo chegar" },
            { text: "As letras alternam entre mão esquerda e direita" },
            { text: "6 fases: linha guia → teclado inteiro" },
            { text: "Bater no obstáculo custa uma vida" },
          ]}
        />
      ) : null}

      {state.status === "playing" ? (
        <RoboBoard
          challenge={state.challenge}
          stage={state.stage}
          stageSuccesses={state.stageSuccesses}
          obstacleKind={state.obstacleKind}
          elapsedMs={state.elapsedMs}
          obstacleX={state.obstacleX}
          jumpStartedAt={state.jumpStartedAt}
          cleared={state.cleared}
          missAt={state.missAt}
          reducedEffects={reducedEffects}
        />
      ) : null}

      {state.status === "gameover" ? (
        <section
          className="overflow-hidden rounded-[26px] px-6 py-10 text-center text-white sm:px-10"
          style={{
            background: `linear-gradient(160deg, ${identity.from} 0%, ${identity.to} 100%)`,
            boxShadow: `0 7px 0 0 ${identity.edge}, 0 22px 40px -18px rgba(0,0,0,.8)`,
          }}
        >
          <p
            className="font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{ color: identity.glow }}
          >
            Fim de jogo
          </p>
          <p className="mt-2 text-5xl font-black tracking-tight">{state.score}</p>
          <p className="text-sm text-white/60">pontos</p>

          <p className="mx-auto mt-5 max-w-sm text-sm text-white/70">
            Fase {state.stage} · {STAGE_LABELS[state.stage - 1]}
            <br />
            {state.wordsCompleted} desafios concluídos
            {result ? ` · ${Math.round(result.accuracy * 100)}% de precisão` : ""}
          </p>

          {result?.isNewBest ? (
            <div className="mt-4">
              <Badge variant="success">Novo recorde!</Badge>
            </div>
          ) : null}
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          {submitting ? <p className="mt-3 text-sm text-white/50">Salvando pontuação...</p> : null}

          <button
            type="button"
            onClick={playAgain}
            className="mx-auto mt-7 block w-full max-w-xs rounded-2xl px-8 py-4 text-lg font-black uppercase tracking-wide transition-transform duration-150 ease-out hover:-translate-y-0.5 active:translate-y-[5px] focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{
              backgroundColor: identity.glow,
              color: identity.to,
              boxShadow: "0 6px 0 0 rgba(0,0,0,.35)",
              outlineColor: identity.glow,
            }}
          >
            Jogar de novo
          </button>
        </section>
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
