"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRoomConnection } from "@/components/rooms/use-room-connection";
import { useGlobalKeydown } from "@/lib/use-global-keydown";
import { useTypingEngine } from "@/components/typing/use-typing-engine";
import { TypingTrack } from "@/components/typing/typing-track";
import { VirtualKeyboard } from "@/components/typing/virtual-keyboard";
import { PodiumView } from "@/components/rooms/podium-view";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function RoomRaceStudent({ code }: { code: string }) {
  const { state, countdown, podium, error, finish } = useRoomConnection(code);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const targetChars = useMemo(() => Array.from(state?.content ?? ""), [state?.content]);
  const [session, dispatch] = useTypingEngine(targetChars.length);
  const submittedRef = useRef(false);

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

  useEffect(() => {
    if (state?.status === "RUNNING") {
      submittedRef.current = false;
      dispatch({ type: "RESET" });
    }
  }, [state?.status, dispatch]);

  useEffect(() => {
    if (session.phase !== "finished" || submittedRef.current) return;
    submittedRef.current = true;

    const durationMs = session.startedAt ? performance.now() - session.startedAt : 0;
    finish({
      expectedChars: targetChars.length,
      typedChars: session.totalTyped,
      correctChars: session.totalCorrect,
      incorrectChars: session.totalIncorrect,
      backspaces: session.backspaces,
      durationMs: Math.max(durationMs, 1),
      charsPerSecondBuckets: session.buckets,
      charStats: Object.entries(session.charStats).map(([char, stat]) => ({
        char,
        attempts: stat.attempts,
        errors: stat.errors,
      })),
    });
  }, [session, finish, targetChars.length]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (session.phase === "finished") return;

      if (event.key === "Backspace") {
        event.preventDefault();
        dispatch({ type: "BACKSPACE" });
        return;
      }

      if (event.key.length !== 1) return;
      event.preventDefault();

      dispatch({
        type: "TYPE",
        char: event.key,
        expected: targetChars[session.position],
        now: performance.now(),
      });
    },
    [session.phase, session.position, targetChars, dispatch],
  );

  useGlobalKeydown(handleKeyDown, state?.status === "RUNNING");

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

  if (podium) {
    return (
      <main className="mx-auto max-w-xl space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Corrida finalizada!</h1>
        <PodiumView podium={podium} />
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

  if (state.status === "LOBBY") {
    return (
      <main className="mx-auto max-w-xl space-y-6 p-6">
        <div>
          <p className="text-sm font-medium text-[var(--color-primary)]">Sala {state.code}</p>
          <h1 className="text-2xl font-semibold">{state.exerciseTitle}</h1>
        </div>
        <Card className="space-y-3">
          <CardTitle className="text-base">Aguardando o professor iniciar...</CardTitle>
          <ul className="space-y-2">
            {state.participants.map((participant) => (
              <li
                key={participant.studentId}
                className="flex items-center justify-between text-sm"
              >
                <span>{participant.name}</span>
                <Badge variant={participant.connected ? "success" : "muted"}>
                  {participant.connected ? "Pronto" : "Offline"}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </main>
    );
  }

  if (session.phase === "finished") {
    return (
      <main className="mx-auto max-w-xl space-y-6 p-6">
        <Card className="space-y-3 text-center">
          <CardTitle className="text-base">Você terminou!</CardTitle>
          <CardDescription>Aguardando os outros participantes...</CardDescription>
        </Card>
        <ul className="space-y-2">
          {state.participants.map((participant) => (
            <li
              key={participant.studentId}
              className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-border)] p-3 text-sm"
            >
              <span>{participant.name}</span>
              {participant.finished ? (
                <Badge variant="success">{participant.wpmNet?.toFixed(1)} WPM</Badge>
              ) : (
                <Badge variant="muted">Correndo...</Badge>
              )}
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const currentChar = targetChars[session.position] ?? null;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <TypingTrack
        targetChars={targetChars}
        position={session.position}
        wrongStreak={session.wrongStreak}
      />
      <VirtualKeyboard targetChar={currentChar} />
    </main>
  );
}
