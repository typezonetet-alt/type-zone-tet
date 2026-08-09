"use client";

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type {
  CountdownPayload,
  GameRoundFinishPayload,
  GameStartPayload,
  PodiumEntry,
  RoomErrorPayload,
  RoomFinishPayload,
  RoomProgressPayload,
  RoomState,
  RoundResultEntry,
} from "@tt-digita/shared";
import { ROOM_EVENTS } from "@tt-digita/shared";
import { createRoomSocket } from "@/lib/room-socket";

export function useRoomConnection(code: string) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [countdown, setCountdown] = useState<CountdownPayload | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResultEntry[] | null>(null);
  const [podium, setPodium] = useState<PodiumEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sem código, não há sala pra entrar -- caso comum de useRoomGameBridge
    // quando um jogo é aberto fora do fluxo de sala (partida solo).
    if (!code) return;

    const socket = createRoomSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit(ROOM_EVENTS.JOIN_ROOM, { code });
    });
    socket.on("connect_error", (err: Error) => {
      setError(err.message || "Não foi possível conectar à sala.");
    });
    socket.on(ROOM_EVENTS.ROOM_STATE, (payload: RoomState) => {
      setState(payload);
    });
    socket.on(ROOM_EVENTS.COUNTDOWN, (payload: CountdownPayload) => {
      setCountdown(payload);
    });
    socket.on(ROOM_EVENTS.GAME_START, (_payload: GameStartPayload) => {
      setCountdown(null);
      setRoundResult(null);
    });
    socket.on(ROOM_EVENTS.ROUND_RESULT, (payload: RoundResultEntry[]) => {
      setRoundResult(payload);
    });
    socket.on(ROOM_EVENTS.PODIUM, (payload: PodiumEntry[]) => {
      setPodium(payload);
    });
    socket.on(ROOM_EVENTS.ERROR, (payload: RoomErrorPayload) => {
      setError(payload.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [code]);

  function start() {
    socketRef.current?.emit(ROOM_EVENTS.START_ROOM);
  }

  function end() {
    socketRef.current?.emit(ROOM_EVENTS.END_ROOM);
  }

  function nextRound() {
    socketRef.current?.emit(ROOM_EVENTS.NEXT_ROUND);
  }

  function finishRound(payload: RoomFinishPayload) {
    socketRef.current?.emit(ROOM_EVENTS.FINISH_ROUND, payload);
  }

  function submitGameRound(payload: GameRoundFinishPayload) {
    socketRef.current?.emit(ROOM_EVENTS.SUBMIT_GAME_ROUND, payload);
  }

  function sendProgress(payload: RoomProgressPayload) {
    socketRef.current?.emit(ROOM_EVENTS.PROGRESS_UPDATE, payload);
  }

  return {
    state,
    countdown,
    roundResult,
    podium,
    error,
    start,
    end,
    nextRound,
    finishRound,
    submitGameRound,
    sendProgress,
  };
}
