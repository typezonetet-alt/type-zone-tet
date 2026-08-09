"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameBest, GameScoreResult } from "@tt-digita/shared";
import { Card, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiError, getFrutaBest, submitFrutaScore } from "@/lib/api";
import { useGlobalKeydown } from "@/lib/use-global-keydown";
import {
  SALADA_DIFFICULTIES,
  SALADA_MODES,
  type SaladaDifficulty,
  type SaladaMode,
} from "@/components/salada/salada-config";
import { useSaladaGame } from "@/components/salada/use-salada-game";
import { useSaladaSound } from "@/components/salada/use-salada-sound";
import { useSaladaMusic } from "@/components/salada/use-salada-music";
import { SaladaBoard } from "@/components/salada/salada-board";
import { GameTitleScreen } from "@/components/games/game-title-screen";
import { GameScreenHeader } from "@/components/games/game-screen-header";
import { GAME_IDENTITIES } from "@/components/games/game-identity";
import { useRoomGameBridge } from "@/components/rooms/use-room-game-bridge";
import { RoomGameGate } from "@/components/rooms/room-game-gate";

export function SaladaGame({ roomCode = null }: { roomCode?: string | null }) {
  const { state, start, reset, handleKey, releaseTarget } = useSaladaGame();
  const { inRoom, roomState, countdown, roomPodium, roomError, submitGameRound, readyToPlay } =
    useRoomGameBridge(roomCode);
  const [best, setBest] = useState<GameBest | null>(null);
  const [reducedEffects, setReducedEffects] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(false);
  const [pendingMode, setPendingMode] = useState<SaladaMode>("palavras");
  const [pendingDifficulty, setPendingDifficulty] = useState<SaladaDifficulty>("facil");
  const [result, setResult] = useState<GameScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const submitting = state.status === "gameover" && !result && !error;
  const identity = GAME_IDENTITIES.salada;

  useSaladaSound(state.fruitsSliced, state.bombsHit, soundOn && state.status === "playing");
  useSaladaMusic(musicOn && state.status === "playing");

  useEffect(() => {
    getFrutaBest()
      .then(setBest)
      .catch(() => undefined);
  }, []);

  // Sala de jogo: todos começam juntos quando o host manda "iniciar", com o
  // modo/dificuldade padrão (sem tela de escolha aqui).
  useEffect(() => {
    if (inRoom && readyToPlay && state.status === "ready") start(pendingMode, pendingDifficulty);
  }, [inRoom, readyToPlay, state.status, start, pendingMode, pendingDifficulty]);

  useEffect(() => {
    if (state.status !== "gameover" || submittedRef.current) return;
    submittedRef.current = true;

    const totalRelevant = state.totalCorrect + state.totalIncorrect;
    const accuracy = totalRelevant > 0 ? state.totalCorrect / totalRelevant : 1;
    const durationMs = Math.max(1, Math.round(state.elapsedMs));

    submitFrutaScore({
      score: state.score,
      wordsCompleted: state.fruitsSliced,
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
      submitGameRound({ score: state.score, wordsCompleted: state.fruitsSliced, accuracy, durationMs });
    }
  }, [state.status, state.score, state.fruitsSliced, state.totalCorrect, state.totalIncorrect, state.elapsedMs, inRoom, submitGameRound]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
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

  const modeLabel = SALADA_MODES.find((m) => m.key === state.mode)?.label;
  const difficultyLabel = SALADA_DIFFICULTIES.find((d) => d.key === state.difficulty)?.label;

  const gameContent = (
    <div className="mx-auto max-w-2xl space-y-4">
      <GameScreenHeader slug="salada">
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
        <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-5">
          <Card>
            <CardDescription>Nível</CardDescription>
            <p className="text-xl font-semibold">{state.level}</p>
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
            <p className="text-xl font-semibold">{state.multiplier}×</p>
          </Card>
          <Card>
            <CardDescription>Vidas</CardDescription>
            <p className="text-xl font-semibold">{"♥".repeat(state.lives) || "—"}</p>
          </Card>
        </div>
      ) : null}

      {state.status === "ready" && !inRoom ? (
        <GameTitleScreen
          slug="salada"
          best={best}
          howTo={[
            {
              text:
                pendingMode === "letras"
                  ? "Digite a letra mostrada pra fatiar"
                  : "Digite o nome da fruta pra fatiar",
            },
            { key: "Esc", text: "solta o alvo" },
            { text: "💣 Não digite a bomba — deixe cair" },
            { text: "Fruta que cai custa uma vida" },
          ]}
        >
          <div className="space-y-4 text-left">
            <fieldset>
              <legend className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
                Conteúdo
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {SALADA_MODES.map((mode) => {
                  const active = pendingMode === mode.key;
                  return (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => setPendingMode(mode.key)}
                      aria-pressed={active}
                      className="rounded-2xl p-3.5 text-left transition-[transform,background-color] duration-150 ease-out hover:-translate-y-0.5 active:translate-y-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      style={{
                        backgroundColor: active ? identity.glow : "rgba(255,255,255,.08)",
                        color: active ? identity.to : "white",
                        boxShadow: active ? "0 4px 0 0 rgba(0,0,0,.35)" : "0 4px 0 0 rgba(0,0,0,.3)",
                      }}
                    >
                      <p className="font-black tracking-tight">{mode.label}</p>
                      <p className={"mt-0.5 text-xs " + (active ? "opacity-80" : "text-white/60")}>
                        {mode.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
                Dificuldade
              </legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {SALADA_DIFFICULTIES.map((d) => {
                  const active = pendingDifficulty === d.key;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setPendingDifficulty(d.key)}
                      aria-pressed={active}
                      className="rounded-2xl p-3.5 text-left transition-[transform,background-color] duration-150 ease-out hover:-translate-y-0.5 active:translate-y-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      style={{
                        backgroundColor: active ? identity.glow : "rgba(255,255,255,.08)",
                        color: active ? identity.to : "white",
                        boxShadow: active ? "0 4px 0 0 rgba(0,0,0,.35)" : "0 4px 0 0 rgba(0,0,0,.3)",
                      }}
                    >
                      <p className="font-black tracking-tight">{d.label}</p>
                      <p className={"mt-0.5 text-xs " + (active ? "opacity-80" : "text-white/60")}>
                        {d.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={() => start(pendingMode, pendingDifficulty)}
              className="mx-auto block w-full max-w-xs rounded-2xl px-8 py-4 text-center text-lg font-black uppercase tracking-wide transition-transform duration-150 ease-out hover:-translate-y-0.5 active:translate-y-[5px] focus-visible:outline-2 focus-visible:outline-offset-4"
              style={{
                backgroundColor: identity.glow,
                color: identity.to,
                boxShadow: "0 6px 0 0 rgba(0,0,0,.35)",
                outlineColor: identity.glow,
              }}
            >
              Jogar
            </button>
          </div>
        </GameTitleScreen>
      ) : null}

      {state.status === "playing" ? (
        <>
          <SaladaBoard
            tossed={state.tossed}
            focusedId={state.focusedId}
            effects={state.effects}
            level={state.level}
            levelUpAtMs={state.levelUpAtMs}
            elapsedMs={state.elapsedMs}
            reducedEffects={reducedEffects}
          />
          <p
            className={
              "text-center text-sm " +
              (state.flash?.tone === "bad"
                ? "font-semibold text-[var(--color-error)]"
                : state.flash?.tone === "good"
                  ? "font-semibold text-[var(--color-success)]"
                  : "text-[var(--color-muted-foreground)]")
            }
          >
            {state.flash
              ? state.flash.text
              : state.focusedId !== null
                ? "Esc solta o alvo atual."
                : "Digite a primeira letra da fruta. Bombas não se digita."}
          </p>
        </>
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
            {modeLabel} · {difficultyLabel} · Nível {state.level}
            <br />
            {state.fruitsSliced} frutas fatiadas · {state.bombsDodged} bombas evitadas
            {state.bombsHit > 0 ? ` · ${state.bombsHit} explodiram` : ""}
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
