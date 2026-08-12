import { io, type Socket } from "socket.io-client";
import { API_ORIGIN } from "./api";

// Uma conexao por montagem de componente -- quem chama e responsavel por
// desconectar (socket.disconnect()) no cleanup do useEffect.
export function createRoomSocket(): Socket {
  return io(`${API_ORIGIN}/rooms`, {
    withCredentials: true,
  });
}
