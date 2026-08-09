"use client";

import { useEffect, useState } from "react";
import { LiveRoomActivityType } from "@tt-digita/shared";
import { useRoomConnection } from "@/components/rooms/use-room-connection";
import { PodiumView, PodiumRow, podiumFromParticipants } from "@/components/rooms/podium-view";
import { RaceTrack } from "@/components/rooms/race-track";

// Visão espectador, pensada pra ficar projetada pra turma toda ver enquanto
// compete -- fontes grandes, fundo escuro, ZERO botões de controle (mesmo
// que o servidor mande isHost:true pra essa sessão, essa página nunca
// renderiza Iniciar/Próxima rodada/Encerrar: quem controla é a outra aba,
// a do host).
export function RoomTelao({ code }: { code: string }) {
  const { state, countdown, roundResult, podium } = useRoomConnection(code);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!countdown) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(countdown.startsAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [countdown]);

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b1026] text-white">
        <p className="text-2xl opacity-70">Conectando...</p>
      </main>
    );
  }

  // O evento PODIUM é efêmero -- se o telão abrir depois que a sala já
  // fechou, reconstrói a partir das posições já persistidas em
  // state.participants.
  const effectivePodium =
    podium ?? (state.status === "FINISHED" ? podiumFromParticipants(state.participants) : null);

  if (effectivePodium) {
    return (
      <main className="min-h-screen space-y-10 bg-[#0b1026] p-12 text-white">
        <h1 className="text-center text-5xl font-bold">🏆 Pódio final</h1>
        <div className="mx-auto max-w-3xl">
          <PodiumView podium={effectivePodium} size="large" />
        </div>
      </main>
    );
  }

  if (countdown && secondsLeft !== null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0b1026] text-white">
        <p className="text-3xl opacity-80">Preparando...</p>
        <p className="font-bold leading-none" style={{ fontSize: "clamp(6rem, 20vw, 12rem)" }}>
          {secondsLeft}
        </p>
      </main>
    );
  }

  if (roundResult) {
    return (
      <main className="min-h-screen space-y-10 bg-[#0b1026] p-12 text-white">
        <h1 className="text-center text-4xl font-bold">Placar da rodada</h1>
        <div className="mx-auto max-w-3xl">
          <ol className="space-y-3">
            {roundResult.map((entry) => (
              <PodiumRow
                key={entry.studentId}
                size="large"
                entry={{
                  position: entry.position,
                  name: entry.name,
                  detail: `${entry.roundPoints} pts · ${entry.totalPoints} total`,
                }}
              />
            ))}
          </ol>
        </div>
      </main>
    );
  }

  if (state.status === "LOBBY") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-[#0b1026] p-12 text-white">
        <div className="text-center">
          <p className="text-2xl opacity-70">Entre na sala com o código</p>
          <p
            className="font-black leading-none tracking-widest"
            style={{ fontSize: "clamp(3.5rem, 14vw, 10rem)" }}
          >
            {state.code}
          </p>
        </div>
        <div className="w-full max-w-xl space-y-2">
          {state.participants.map((participant) => (
            <div
              key={participant.studentId}
              className="rounded-2xl bg-white/10 px-6 py-4 text-2xl font-semibold"
            >
              {participant.name}
            </div>
          ))}
          {state.participants.length === 0 ? (
            <p className="text-center text-xl opacity-60">Aguardando participantes...</p>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen space-y-8 bg-[#0b1026] p-12 text-white">
      <div className="text-center">
        <p className="text-xl opacity-70">
          Rodada {state.roundIndex} de {state.roundCount}
        </p>
        <h1 className="text-4xl font-bold">
          {state.activityType === LiveRoomActivityType.WORLD
            ? state.roundExerciseTitle
            : "Modo Jogo — ao vivo"}
        </h1>
      </div>
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 text-[var(--foreground)]">
        <RaceTrack participants={state.participants} />
      </div>
    </main>
  );
}
