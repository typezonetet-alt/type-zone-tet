import type { CharStat } from "./exercises";

export enum LiveRoomStatus {
  LOBBY = "LOBBY",
  COUNTDOWN = "COUNTDOWN",
  RUNNING = "RUNNING",
  FINISHED = "FINISHED",
  CANCELLED = "CANCELLED",
}

export interface CreateRoomPayload {
  exerciseId: string;
}

export interface RoomExerciseOption {
  id: string;
  title: string;
  worldTitle: string;
}

export interface RoomSummary {
  id: string;
  code: string;
  status: LiveRoomStatus;
  exerciseId: string;
  exerciseTitle: string;
}

export interface RoomParticipantView {
  studentId: string;
  name: string;
  connected: boolean;
  finished: boolean;
  wpmNet: number | null;
  accuracy: number | null;
  position: number | null;
}

export interface RoomState {
  id: string;
  code: string;
  status: LiveRoomStatus;
  isHost: boolean;
  exerciseId: string;
  exerciseTitle: string;
  content: string | null;
  participants: RoomParticipantView[];
  countdownStartsAt: string | null;
  countdownSeconds: number;
}

export interface RoomFinishPayload {
  expectedChars: number;
  typedChars: number;
  correctChars: number;
  incorrectChars: number;
  backspaces: number;
  durationMs: number;
  charsPerSecondBuckets: number[];
  charStats: CharStat[];
}

export interface PodiumEntry {
  studentId: string;
  name: string;
  position: number;
  wpmNet: number;
  accuracy: number;
}

export interface CountdownPayload {
  startsAt: string;
  seconds: number;
}

export interface GameStartPayload {
  startedAt: string;
}

export interface RoomErrorPayload {
  message: string;
}

// Nomes de evento do WebSocket (briefing secao 45). Compartilhados entre
// cliente e servidor para nao depender de strings soltas nos dois lados.
//
// Em vez de eventos granulares por mudanca (participante entrou/saiu/etc.),
// o servidor rebroadcast o ROOM_STATE inteiro a cada mudanca de participantes
// -- estado pequeno, poucas dezenas de participantes (secao 25, meta de 50),
// e evita bugs de sincronizacao de eventos incrementais perdidos.
export const ROOM_EVENTS = {
  // Cliente -> servidor
  JOIN_ROOM: "join_room",
  START_ROOM: "start_room",
  END_ROOM: "end_room",
  FINISH_ROOM: "finish_room",
  LEAVE_ROOM: "leave_room",
  // Servidor -> cliente
  ROOM_STATE: "room_state",
  COUNTDOWN: "countdown",
  GAME_START: "game_start",
  PODIUM: "podium",
  ERROR: "room_error",
} as const;
