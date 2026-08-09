"use client";

import { useRoomConnection } from "./use-room-connection";

// Casca fina sobre useRoomConnection pras 5 páginas de /jogar oferecerem um
// "modo sala" sem cada motor de jogo precisar saber o que é uma sala.
// `roomCode` nulo = partida solo de sempre (não abre socket nenhum, ver
// guarda em useRoomConnection). Com roomCode: o jogo só libera quando o
// host manda começar (RUNNING), e ao final da partida quem chama isto
// também emite SUBMIT_GAME_ROUND, além da submissão solo de sempre --
// o histórico pessoal (GameScore) continua intacto, a sala só recebe uma
// cópia do resultado pra pontuar a rodada.
export function useRoomGameBridge(roomCode: string | null) {
  const { state, countdown, podium, error, submitGameRound } = useRoomConnection(roomCode ?? "");

  const inRoom = Boolean(roomCode);
  const readyToPlay = !inRoom || state?.status === "RUNNING";

  return { inRoom, roomState: state, countdown, roomPodium: podium, roomError: error, submitGameRound, readyToPlay };
}
