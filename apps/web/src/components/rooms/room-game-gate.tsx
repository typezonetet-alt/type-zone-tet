"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { CountdownPayload, PodiumEntry, RoomState } from "@tt-digita/shared";
import { Card, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PodiumView, podiumFromParticipants } from "./podium-view";

// Envolve a tela normal de um jogo (children) quando ele é aberto a partir
// de uma sala ao vivo (?room=CODE) -- mostra lobby/contagem/pódio da sala
// por cima, e só libera o jogo de verdade quando o host manda começar.
// Compartilhado pelas 5 páginas de /jogar em vez de cada uma reimplementar
// o mesmo lobby que já existe em room-race-student.tsx.
export function RoomGameGate({
  roomState,
  countdown,
  roomPodium,
  roomError,
  children,
}: {
  roomState: RoomState | null;
  countdown: CountdownPayload | null;
  roomPodium: PodiumEntry[] | null;
  roomError: string | null;
  children: ReactNode;
}) {
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

  if (roomError) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <Card>
          <CardDescription>{roomError}</CardDescription>
        </Card>
      </main>
    );
  }

  if (!roomState) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <Card>
          <CardDescription>Conectando à sala...</CardDescription>
        </Card>
      </main>
    );
  }

  // PODIUM é efêmero -- reconstrói a partir de participants se essa conexão
  // só chegou depois que a sala já fechou.
  const effectivePodium =
    roomPodium ?? (roomState.status === "FINISHED" ? podiumFromParticipants(roomState.participants) : null);

  if (effectivePodium) {
    return (
      <main className="mx-auto max-w-xl space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Sala encerrada!</h1>
        <PodiumView podium={effectivePodium} />
      </main>
    );
  }

  if (roomState.status === "LOBBY") {
    return (
      <main className="mx-auto max-w-xl space-y-6 p-6">
        <div>
          <p className="text-sm font-medium text-[var(--color-primary)]">sala {roomState.code}</p>
          <h1 className="text-2xl font-semibold">Aguardando o professor iniciar...</h1>
        </div>
        <Card className="space-y-2">
          {roomState.participants.map((participant) => (
            <div key={participant.studentId} className="flex items-center justify-between text-sm">
              <span>{participant.name}</span>
              <Badge variant={participant.connected ? "success" : "muted"}>
                {participant.connected ? "Pronto" : "Offline"}
              </Badge>
            </div>
          ))}
          {roomState.participants.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Aguardando participantes...</p>
          ) : null}
        </Card>
      </main>
    );
  }

  if (countdown && secondsLeft !== null) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <Card className="text-center">
          <p className="text-7xl font-bold">{secondsLeft}</p>
          <CardDescription>Preparar...</CardDescription>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}
