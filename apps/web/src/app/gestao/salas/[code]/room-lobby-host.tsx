"use client";

import { useEffect, useState } from "react";
import { useRoomConnection } from "@/components/rooms/use-room-connection";
import { PodiumView } from "@/components/rooms/podium-view";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function RoomLobbyHost({ code }: { code: string }) {
  const { state, countdown, podium, error, start, end } = useRoomConnection(code);
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

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-[var(--color-primary)]">Sala ao vivo</p>
        <h1 className="text-3xl font-bold tracking-widest">{state.code}</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">{state.exerciseTitle}</p>
      </div>

      {countdown && secondsLeft !== null ? (
        <Card className="text-center">
          <p className="text-6xl font-bold">{secondsLeft}</p>
          <CardDescription>Preparando...</CardDescription>
        </Card>
      ) : null}

      {podium ? (
        <PodiumView podium={podium} />
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
                    <Badge variant="success">{participant.wpmNet?.toFixed(1)} WPM</Badge>
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
          Iniciar corrida
        </Button>
      ) : null}
      {state.status === "RUNNING" ? (
        <Button variant="secondary" onClick={end}>
          Encerrar agora
        </Button>
      ) : null}
    </main>
  );
}
