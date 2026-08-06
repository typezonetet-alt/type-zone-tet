"use client";

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type {
  CountdownPayload,
  PodiumEntry,
  RoomErrorPayload,
  RoomFinishPayload,
  RoomState,
} from "@tt-digita/shared";
import { ROOM_EVENTS } from "@tt-digita/shared";
import { createRoomSocket } from "@/lib/room-socket";

export function useRoomConnection(code: string) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [countdown, setCountdown] = useState<CountdownPayload | null>(null);
  const [podium, setPodium] = useState<PodiumEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    socket.on(ROOM_EVENTS.GAME_START, () => {
      setCountdown(null);
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

  function finish(payload: RoomFinishPayload) {
    socketRef.current?.emit(ROOM_EVENTS.FINISH_ROOM, payload);
  }

  return { state, countdown, podium, error, start, end, finish };
}
