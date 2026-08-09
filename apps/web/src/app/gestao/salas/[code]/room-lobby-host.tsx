"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LiveRoomActivityType } from "@tt-digita/shared";
import { useRoomConnection } from "@/components/rooms/use-room-connection";
import { PodiumView, PodiumRow, podiumFromParticipants } from "@/components/rooms/podium-view";
import { RaceTrack } from "@/components/rooms/race-track";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function RoomLobbyHost({ code }: { code: string }) {
  const { state, countdown, roundResult, podium, error, start, end, nextRound } =
    useRoomConnection(code);
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

  if (error) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <Card>
          <CardDescription>{error}</CardDescription>
        </Card>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <Card>
          <CardDescription>Conectando...</CardDescription>
        </Card>
      </main>
    );
  }

  const isLastRound = state.roundIndex >= state.roundCount;
  // O evento PODIUM é efêmero -- se a sala já tiver fechado antes desta
  // conexão existir (host reabriu a aba, telão aberto tarde), reconstrói a
  // partir das posições já persistidas em state.participants.
  const effectivePodium =
    podium ?? (state.status === "FINISHED" ? podiumFromParticipants(state.participants) : null);

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-primary)]">
            {state.activityType === LiveRoomActivityType.WORLD
              ? `Rodada ${Math.max(state.roundIndex, 1)} de ${state.roundCount}`
              : "Modo Jogo"}
          </p>
          <h1 className="text-3xl font-bold tracking-widest">{state.code}</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {state.roundExerciseTitle ?? "Aguardando início"}
          </p>
        </div>
        <Link
          href={`/gestao/salas/${state.code}/telao`}
          target="_blank"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          Abrir telão
        </Link>
      </div>

      {countdown && secondsLeft !== null ? (
        <Card className="text-center">
          <p className="text-6xl font-bold">{secondsLeft}</p>
          <CardDescription>Preparando...</CardDescription>
        </Card>
      ) : null}

      {effectivePodium ? (
        <PodiumView podium={effectivePodium} />
      ) : roundResult ? (
        <Card className="space-y-3">
          <CardTitle className="text-base">Placar da rodada</CardTitle>
          <ol className="space-y-2">
            {roundResult.map((entry) => (
              <PodiumRow
                key={entry.studentId}
                entry={{
                  position: entry.position,
                  name: entry.name,
                  detail: `${entry.roundPoints} pts · ${entry.totalPoints} total`,
                }}
              />
            ))}
          </ol>
        </Card>
      ) : state.status === "RUNNING" && state.activityType === LiveRoomActivityType.WORLD ? (
        <RaceTrack participants={state.participants} />
      ) : (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Participantes ({state.participants.length})
            </CardTitle>
            <Badge variant={state.status === "LOBBY" ? "primary" : "muted"}>
              {state.status}
            </Badge>
          </div>
          <ul className="space-y-2">
            {state.participants.map((participant) => (
              <li
                key={participant.studentId}
                className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-border)] p-3 text-sm"
              >
                <span>{participant.name}</span>
                <span className="flex items-center gap-2">
                  {participant.finished ? (
                    <Badge variant="success">{participant.totalPoints} pts</Badge>
                  ) : null}
                  <Badge variant={participant.connected ? "success" : "muted"}>
                    {participant.connected ? "Conectado" : "Offline"}
                  </Badge>
                </span>
              </li>
            ))}
            {state.participants.length === 0 ? (
              <li className="text-sm text-[var(--color-muted-foreground)]">
                Aguardando participantes...
              </li>
            ) : null}
          </ul>
        </Card>
      )}

      {state.status === "LOBBY" ? (
        <Button onClick={start} disabled={state.participants.length === 0}>
          Iniciar sala
        </Button>
      ) : null}
      {state.status === "RUNNING" && roundResult ? (
        <Button onClick={nextRound}>
          {isLastRound ? "Ver pódio final" : "Próxima rodada"}
        </Button>
      ) : null}
      {state.status === "RUNNING" && !roundResult ? (
        <Button variant="secondary" onClick={end}>
          Encerrar agora
        </Button>
      ) : null}
    </main>
  );
}
