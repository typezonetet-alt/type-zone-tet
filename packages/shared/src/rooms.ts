import type { CharStat } from "./exercises";
import { GameType } from "./games";

export enum LiveRoomStatus {
  LOBBY = "LOBBY",
  COUNTDOWN = "COUNTDOWN",
  RUNNING = "RUNNING",
  FINISHED = "FINISHED",
  CANCELLED = "CANCELLED",
}

// Uma sala roda um Mundo inteiro (uma rodada por exercício, na ordem da
// trilha) ou um Jogo (rodada única, todos jogam o mesmo GameType ao mesmo
// tempo) -- nunca as duas coisas na mesma sala.
export enum LiveRoomActivityType {
  WORLD = "WORLD",
  GAME = "GAME",
}

export interface CreateRoomPayload {
  activityType: LiveRoomActivityType;
  worldId?: string;
  gameType?: GameType;
}

export interface RoomWorldOption {
  id: string;
  title: string;
  focus: string;
  exerciseCount: number;
}

// Só os tipos de jogo ativos no arcade (DEFESA foi aposentado -- ver games.ts).
export interface RoomGameOption {
  gameType: GameType;
}

export interface RoomSummary {
  id: string;
  code: string;
  status: LiveRoomStatus;
  activityType: LiveRoomActivityType;
  worldId: string | null;
  worldTitle: string | null;
  gameType: GameType | null;
  roundCount: number;
}

export interface RoomParticipantView {
  studentId: string;
  name: string;
  connected: boolean;
  finished: boolean;
  // Resultado bruto da rodada ATUAL -- só faz sentido pra rodada WORLD (T&T
  // Turbo); null em rodada GAME ou antes de terminar.
  wpmNet: number | null;
  accuracy: number | null;
  // Pontuação (regra de colocação, seção 3 do plano) desta rodada e somada
  // de todas as rodadas já fechadas -- é isso que ordena o pódio.
  roundPoints: number | null;
  totalPoints: number;
  position: number | null;
  // 0 a 1 -- avanco ao vivo na pista do T&T Turbo (secao 16). So chega a 1
  // quando o servidor confirma o resultado final via finish_round; antes
  // disso fica no maximo em 0.98 mesmo que o aluno ja tenha digitado tudo.
  progress: number;
}

export interface RoomState {
  id: string;
  code: string;
  status: LiveRoomStatus;
  isHost: boolean;
  activityType: LiveRoomActivityType;
  roundIndex: number; // 1-based; 0 antes de começar
  roundCount: number;
  roundExerciseId: string | null;
  roundExerciseTitle: string | null;
  roundGameType: GameType | null;
  content: string | null; // só preenchido em rodada WORLD
  participants: RoomParticipantView[];
  countdownStartsAt: string | null;
  countdownSeconds: number;
}

// Enviado periodicamente pelo cliente durante a corrida (T&T Turbo, secao 16)
// pra alimentar a barra de progresso ao vivo dos outros participantes.
// Cosmetico apenas -- o resultado oficial so vem de RoomFinishPayload.
export interface RoomProgressPayload {
  typedChars: number;
  correctChars: number;
  incorrectChars: number;
}

// Resultado de uma rodada WORLD (mesmo formato de sempre).
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

// Resultado de uma rodada GAME -- placar do minigame, não métricas de
// digitação (ver seção 3 do plano: desempate por score bruto do jogo).
export interface GameRoundFinishPayload {
  score: number;
  wordsCompleted: number;
  accuracy: number;
  durationMs: number;
}

// Mini-standings emitidos quando uma rodada fecha (todos terminaram ou o
// host encerrou) -- mostrado no telão/host entre rodadas.
export interface RoundResultEntry {
  studentId: string;
  name: string;
  roundPoints: number;
  totalPoints: number;
  position: number;
}

// Pódio final da sala (última rodada, ou END_ROOM forçado pelo host).
export interface PodiumEntry {
  studentId: string;
  name: string;
  position: number;
  totalPoints: number;
}

export interface CountdownPayload {
  startsAt: string;
  seconds: number;
}

export interface GameStartPayload {
  startedAt: string;
  roundIndex: number;
  roundCount: number;
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
  LEAVE_ROOM: "leave_room",
  PROGRESS_UPDATE: "progress_update",
  // Fecha a rodada atual (renomeado de FINISH_ROOM -- agora fecha uma
  // RODADA, não necessariamente a sala inteira).
  FINISH_ROUND: "finish_round",
  // Variante de finish_round pra rodada de Jogo (placar em vez de métricas
  // de digitação).
  SUBMIT_GAME_ROUND: "submit_game_round",
  // Host-only: avança pra próxima rodada, ou finaliza a sala se era a última.
  NEXT_ROUND: "next_round",

  // Servidor -> cliente
  ROOM_STATE: "room_state",
  COUNTDOWN: "countdown",
  GAME_START: "game_start", // dispara a cada início de rodada, não só uma vez
  ROUND_RESULT: "round_result", // mini-standings da rodada que acabou de fechar
  PODIUM: "podium", // só na última rodada (ou END_ROOM forçado)
  ERROR: "room_error",
} as const;

// Pontuação por colocação dentro da rodada (seção 3 do plano) -- mesma regra
// pra rodada WORLD e GAME, o que permite explicar pra turma numa frase só:
// "1º lugar 100 pontos, 2º 80, 3º 65, 4º 55... até um mínimo de 10 por
// terminar. Quem não terminar não pontua. No final, mais pontos vence."
export const ROUND_PLACEMENT_POINTS = [100, 80, 65, 55, 47, 41, 36, 32, 29, 26];
export const ROUND_MIN_POINTS = 10;

export function pointsForRoundPlacement(position: number): number {
  return ROUND_PLACEMENT_POINTS[position - 1] ?? ROUND_MIN_POINTS;
}
