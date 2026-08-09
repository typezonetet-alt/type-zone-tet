"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameBest, GameScoreResult } from "@tt-digita/shared";
import { Card, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiError, getRitmoBest, submitRitmoScore } from "@/lib/api";
import { useGlobalKeydown } from "@/lib/use-global-keydown";
import { consistencyFromOffsets, useRitmoGame } from "@/components/ritmo/use-ritmo-game";
import { useRitmoAudio } from "@/components/ritmo/use-ritmo-audio";
import { RitmoBoard } from "@/components/ritmo/ritmo-board";
import { RITMO_LEVELS, type RitmoLevel } from "@/components/ritmo/ritmo-config";
import { GameTitleScreen } from "@/components/games/game-title-screen";
import { GameScreenHeader } from "@/components/games/game-screen-header";
import { GAME_IDENTITIES } from "@/components/games/game-identity";
import { useRoomGameBridge } from "@/components/rooms/use-room-game-bridge";
import { RoomGameGate } from "@/components/rooms/room-game-gate";

export function RitmoGame({ roomCode = null }: { roomCode?: string | null }) {
  const { state, start, reset, handleKey } = useRitmoGame();
  const { inRoom, roomState, countdown, roomPodium, roomError, submitGameRound, readyToPlay } =
    useRoomGameBridge(roomCode);
  const [best, setBest] = useState<GameBest | null>(null);
  const [reducedEffects, setReducedEffects] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(false);
  const [pendingLevel, setPendingLevel] = useState<RitmoLevel>("facil");
  const [result, setResult] = useState<GameScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const submitting = state.status === "gameover" && !result && !error;
  const consistency = consistencyFromOffsets(state.hitOffsets);
  const identity = GAME_IDENTITIES.ritmo;

  useRitmoAudio({
    wordAppearedAtMs: state.wordAppearedAtMs,
    beatWindowMs: state.beatDeadlineMs - state.wordAppearedAtMs,
    lastJudgement: state.lastJudgement,
    actionAt: state.actionAt,
    missAt: state.missAt,
    combo: state.combo,
    status: state.status,
    soundOn,
    musicOn,
  });

  useEffect(() => {
    getRitmoBest()
      .then(setBest)
      .catch(() => undefined);
  }, []);

  // Sala de jogo: todos começam juntos quando o host manda "iniciar", com o
  // nível padrão (sem tela de escolha aqui).
  useEffect(() => {
    if (inRoom && readyToPlay && state.status === "ready") start(pendingLevel);
  }, [inRoom, readyToPlay, state.status, start, pendingLevel]);

  useEffect(() => {
    if (state.status !== "gameover" || submittedRef.current) return;
    submittedRef.current = true;

    const totalRelevant = state.totalCorrect + state.totalIncorrect;
    const accuracy = totalRelevant > 0 ? state.totalCorrect / totalRelevant : 1;
    const durationMs = Math.max(1, Math.round(state.elapsedMs));

    submitRitmoScore({
      score: state.score,
      wordsCompleted: state.beatsCompleted,
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
      submitGameRound({ score: state.score, wordsCompleted: state.beatsCompleted, accuracy, durationMs });
    }
  }, [state.status, state.score, state.beatsCompleted, state.totalCorrect, state.totalIncorrect, state.elapsedMs, inRoom, submitGameRound]);

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
      <GameScreenHeader slug="ritmo">
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
            <CardDescription>Meta</CardDescription>
            <p className="text-xl font-semibold">{Math.round(state.targetWpm)} PPM</p>
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
            <CardDescription>Consistência</CardDescription>
            <p className="text-xl font-semibold">
              {state.hitOffsets.length < 2 ? "—" : `${Math.round(consistency * 100)}%`}
            </p>
          </Card>
          <Card>
            <CardDescription>Vidas</CardDescription>
            <p className="text-xl font-semibold">{"♥".repeat(state.lives) || "—"}</p>
          </Card>
        </div>
      ) : null}

      {state.status === "ready" && !inRoom ? (
        <GameTitleScreen
          slug="ritmo"
          best={best}
          howTo={[
            { text: "Uma palavra por batida — termine antes que ela chegue na zona" },
            { text: "Nem cedo, nem em cima da hora: o meio da batida vale bônus" },
            { text: "A cadência se ajusta ao seu desempenho" },
          ]}
        >
          <div className="space-y-4 text-left">
            <fieldset>
              <legend className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
                Nível
              </legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {RITMO_LEVELS.map((lvl) => {
                  const active = pendingLevel === lvl.key;
                  return (
                    <button
                      key={lvl.key}
                      type="button"
                      onClick={() => setPendingLevel(lvl.key)}
                      aria-pressed={active}
                      className="rounded-2xl p-3.5 text-left transition-[transform,background-color] duration-150 ease-out hover:-translate-y-0.5 active:translate-y-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      style={{
                        backgroundColor: active ? identity.glow : "rgba(255,255,255,.08)",
                        color: active ? identity.to : "white",
                        boxShadow: active ? "0 4px 0 0 rgba(0,0,0,.35)" : "0 4px 0 0 rgba(0,0,0,.3)",
                      }}
                    >
                      <p className="font-black tracking-tight">{lvl.label}</p>
                      <p className={"mt-0.5 text-xs " + (active ? "opacity-80" : "text-white/60")}>
                        {lvl.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={() => start(pendingLevel)}
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
        <RitmoBoard
          word={state.word}
          typed={state.typed}
          elapsedMs={state.elapsedMs}
          wordAppearedAtMs={state.wordAppearedAtMs}
          beatDeadlineMs={state.beatDeadlineMs}
          awaitingNextBeat={state.awaitingNextBeat}
          actionAt={state.actionAt}
          missAt={state.missAt}
          lastJudgement={state.lastJudgement}
          hitOffsets={state.hitOffsets}
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
            {RITMO_LEVELS.find((l) => l.key === state.level)?.label} · {state.beatsCompleted} batidas
            no ritmo · combo máximo {state.bestCombo}x
            {state.hitOffsets.length >= 2
              ? ` · ${Math.round(consistency * 100)}% de consistência`
              : ""}
            {result ? ` · ${Math.round(result.accuracy * 100)}% de precisão` : ""}
          </p>
          {state.hitOffsets.length >= 2 ? (
            <p className="mx-auto mt-3 max-w-sm text-xs text-white/50">
              {consistency >= 0.8
                ? "Ritmo muito regular — é isso que constrói velocidade de verdade."
                : consistency >= 0.5
                  ? "Dá pra ficar mais regular: tente terminar cada palavra sempre no mesmo ponto da batida."
                  : "Você está digitando em rajadas. Desacelere os picos e busque um ritmo constante."}
            </p>
          ) : null}

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
