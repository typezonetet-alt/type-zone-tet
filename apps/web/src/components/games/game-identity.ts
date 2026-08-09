// Identidade visual de cada jogo, em UM lugar só. O card do arcade, a tela de
// título e a arte animada leem daqui -- então a cor que você vê no hub é
// literalmente a cor do jogo, não uma decoração escolhida à parte.
//
// Por que cores próprias e não os tokens da marca: cada jogo já tem uma
// paleta dentro dele (Orbital = espaço, Chuva = água, Defesa = base militar,
// Ritmo = noite). O hub só está mostrando essas paletas de fora, como uma
// fileira de fliperamas acesos.
import { GameType } from "@tt-digita/shared";

export type GameSlug = "orbital" | "robo" | "chuva" | "salada" | "ritmo";

export interface GameIdentity {
  slug: GameSlug;
  name: string;
  /** Uma linha, imperativa. É a chamada da máquina, não a documentação. */
  tagline: string;
  /** O que o jogo treina -- aparece como etiqueta pequena. */
  skill: string;
  /** Cor viva: brilho, borda, destaques. */
  glow: string;
  /** Fundo do gabinete (do topo pro pé). */
  from: string;
  to: string;
  /** Aresta inferior sólida (o "3D" estilo Duolingo). */
  edge: string;
}

export const GAME_IDENTITIES: Record<GameSlug, GameIdentity> = {
  orbital: {
    slug: "orbital",
    name: "T&T Orbital",
    tagline: "Atire nas palavras antes que elas cheguem na base.",
    skill: "Reconhecimento sob pressão",
    glow: "#60a5fa",
    from: "#1e3a8a",
    to: "#0b1026",
    edge: "#0a1130",
  },
  robo: {
    slug: "robo",
    name: "T&T Robô",
    tagline: "Digite pra fazer o robô saltar, abrir e avançar.",
    skill: "Precisão contra o relógio",
    glow: "#fbbf24",
    from: "#b45309",
    to: "#2a1505",
    edge: "#3d1f06",
  },
  chuva: {
    slug: "chuva",
    name: "Chuva de Palavras",
    tagline: "Seque a chuva antes que ela encoste no chão.",
    skill: "Ataque às teclas fracas",
    glow: "#22d3ee",
    from: "#0e7490",
    to: "#062430",
    edge: "#07303d",
  },
  salada: {
    slug: "salada",
    name: "Salada T&T",
    tagline: "Fatie a fruta. Deixe a bomba passar.",
    skill: "Ler antes de digitar",
    glow: "#fb7185",
    from: "#9f1239",
    to: "#2b0715",
    edge: "#3d0a1e",
  },
  ritmo: {
    slug: "ritmo",
    name: "Modo Ritmo",
    tagline: "Não corra. Mantenha a batida.",
    skill: "Consistência",
    glow: "#a78bfa",
    from: "#4c1d95",
    to: "#160b2e",
    edge: "#1d0f3d",
  },
};

// Ordem da parede de fliperama. Orbital primeiro por ser o carro-chefe (é o
// que a seção 15 do briefing trata como jogo principal).
export const ARCADE_ORDER: GameSlug[] = ["orbital", "robo", "chuva", "salada", "ritmo"];

// Slug do gabinete -> slug da API. Salada grava como FRUTA no backend.
export const GAME_API_SLUG: Record<GameSlug, string> = {
  orbital: "orbital",
  robo: "robo",
  chuva: "chuva",
  salada: "fruta",
  ritmo: "ritmo",
};

// Slug do gabinete -> GameType do Prisma/shared (usado em salas ao vivo,
// onde a sala guarda o GameType "de verdade", não o slug de rota). DEFESA
// fica de fora de propósito -- não é oferecido como atividade de sala nova
// (ver ACTIVE_ROOM_GAME_TYPES no backend).
export const GAME_TYPE_BY_SLUG: Record<GameSlug, GameType> = {
  orbital: GameType.ORBITAL,
  robo: GameType.ROBO,
  chuva: GameType.CHUVA_PALAVRAS,
  salada: GameType.FRUTA,
  ritmo: GameType.RITMO,
};

export function slugForGameType(gameType: GameType): GameSlug | null {
  const entry = (Object.entries(GAME_TYPE_BY_SLUG) as [GameSlug, GameType][]).find(
    ([, type]) => type === gameType,
  );
  return entry?.[0] ?? null;
}
