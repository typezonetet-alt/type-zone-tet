"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  RoomFinishPayload,
  RoomParticipantView,
  RoomProgressPayload,
} from "@tt-digita/shared";
import { LiveRoomActivityType } from "@tt-digita/shared";
import { useRoomConnection } from "@/components/rooms/use-room-connection";
import { useGlobalKeydown } from "@/lib/use-global-keydown";
import { useTypingEngine } from "@/components/typing/use-typing-engine";
import { TypingTrack } from "@/components/typing/typing-track";
import { VirtualKeyboard } from "@/components/typing/virtual-keyboard";
import { PodiumView, PodiumRow, podiumFromParticipants } from "@/components/rooms/podium-view";
import { RaceTrack } from "@/components/rooms/race-track";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { slugForGameType } from "@/components/games/game-identity";

const PROGRESS_THROTTLE_MS = 200;

// Motor de digitação de UMA rodada. Montado com key={roundIndex} pelo pai --
// isso garante um useTypingEngine (e um submittedRef) totalmente novo a cada
// rodada, em vez de tentar "resetar" o estado da rodada anterior na mão.
// Um bug real apareceu na primeira versão sem esse key: o efeito que resetava
// o motor e o efeito que submetia o resultado rodavam na MESMA leva de
// efeitos quando a rodada mudava, e o de submissão via o `session` ainda
// antigo (fase "finished" da rodada anterior) -- reenviava o resultado da
// rodada passada como se fosse da nova, duplicando a pontuação.
function RoundTyping({
  content,
  roundIndex,
  roundCount,
  participants,
  studentName,
  finishRound,
  sendProgress,
}: {
  content: string;
  roundIndex: number;
  roundCount: number;
  participants: RoomParticipantView[];
  studentName: string;
  finishRound: (payload: RoomFinishPayload) => void;
  sendProgress: (payload: RoomProgressPayload) => void;
}) {
  const targetChars = useMemo(() => Array.from(content), [content]);
  const [session, dispatch] = useTypingEngine(targetChars);
  const submittedRef = useRef(false);
  const lastProgressSentAt = useRef(0);

  useEffect(() => {
    if (session.phase !== "finished" || submittedRef.current) return;
    submittedRef.current = true;

    const durationMs = session.startedAt ? performance.now() - session.startedAt : 0;
    finishRound({
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
  }, [session, finishRound, targetChars.length]);

  // Barra de progresso ao vivo do T&T Turbo -- cosmetico, throttled pra nao
  // inundar o socket a cada tecla (o resultado oficial so vem do finish acima).
  useEffect(() => {
    if (session.phase === "finished") return;
    const now = performance.now();
    if (now - lastProgressSentAt.current < PROGRESS_THROTTLE_MS) return;
    lastProgressSentAt.current = now;
    sendProgress({
      typedChars: session.totalTyped,
      correctChars: session.totalCorrect,
      incorrectChars: session.totalIncorrect,
    });
  }, [session.totalTyped, session.totalCorrect, session.totalIncorrect, session.phase, sendProgress]);

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
        now: performance.now(),
      });
    },
    [session.phase, dispatch],
  );

  useGlobalKeydown(handleKeyDown, session.phase !== "finished");

  if (session.phase === "finished") {
    return (
      <main className="mx-auto max-w-xl space-y-6 p-6">
        <Card className="space-y-3 text-center">
          <CardTitle className="text-base">Você terminou!</CardTitle>
          <CardDescription>Aguardando os outros participantes...</CardDescription>
        </Card>
        <RaceTrack participants={participants} currentStudentName={studentName} />
      </main>
    );
  }

  const currentChar = targetChars[session.position] ?? null;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <p className="text-center text-sm font-medium text-[var(--color-primary)]">
        Rodada {roundIndex} de {roundCount}
      </p>
      <RaceTrack participants={participants} currentStudentName={studentName} />
      <TypingTrack
        targetChars={targetChars}
        position={session.position}
        wrongStreak={session.wrongStreak}
      />
      <VirtualKeyboard targetChar={currentChar} />
    </main>
  );
}

export function RoomRaceStudent({
  code,
  studentName,
}: {
  code: string;
  studentName: string;
}) {
  const router = useRouter();
  const { state, countdown, roundResult, podium, error, finishRound, sendProgress } =
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

  // Sala de Jogo: a rodada não é digitação, o aluno joga o minigame normal
  // (com a ponte de sala cuidando da pontuação) -- so redireciona uma vez.
  useEffect(() => {
    if (state?.activityType !== LiveRoomActivityType.GAME || !state.roundGameType) return;
    const slug = slugForGameType(state.roundGameType);
    if (slug) router.replace(`/jogar/${slug}?room=${code}`);
  }, [state?.activityType, state?.roundGameType, code, router]);

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

  // O evento PODIUM é efêmero -- se a sala já tiver fechado antes desta
  // conexão existir (reconexão do aluno), reconstrói a partir das posições
  // já persistidas em state.participants.
  const effectivePodium =
    podium ?? (state.status === "FINISHED" ? podiumFromParticipants(state.participants) : null);

  if (effectivePodium) {
    return (
      <main className="mx-auto max-w-xl space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Sala encerrada!</h1>
        <PodiumView podium={effectivePodium} />
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
          <p className="text-sm font-medium text-[var(--color-primary)]">sala {state.code}</p>
          <h1 className="text-2xl font-semibold">
            {state.activityType === LiveRoomActivityType.WORLD
              ? `${state.roundCount} ${state.roundCount === 1 ? "rodada" : "rodadas"}`
              : "Modo Jogo"}
          </h1>
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

  // Rodada fechou (todos terminaram) mas a sala não é a última rodada, ou o
  // host ainda não avançou -- mostra o mini-placar e espera.
  if (roundResult) {
    return (
      <main className="mx-auto max-w-xl space-y-6 p-6">
        <div>
          <p className="text-sm font-medium text-[var(--color-primary)]">
            Rodada {state.roundIndex} de {state.roundCount}
          </p>
          <h1 className="text-2xl font-semibold">Rodada concluída!</h1>
        </div>
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
        <CardDescription className="text-center">
          Aguardando o professor avançar a sala...
        </CardDescription>
      </main>
    );
  }

  if (state.activityType !== LiveRoomActivityType.WORLD || !state.content) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <Card>
          <CardDescription>Abrindo o jogo...</CardDescription>
        </Card>
      </main>
    );
  }

  return (
    <RoundTyping
      key={state.roundIndex}
      content={state.content}
      roundIndex={state.roundIndex}
      roundCount={state.roundCount}
      participants={state.participants}
      studentName={studentName}
      finishRound={finishRound}
      sendProgress={sendProgress}
    />
  );
}
