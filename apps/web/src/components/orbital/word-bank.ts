// Banco de palavras do T&T Orbital (briefing secao 15). Sem acentuacao dificil
// nem pontuacao -- e um jogo de velocidade de reconhecimento, nao de precisao
// ortografica avancada (isso fica pro Modo Profissional/Elite).
export type WordTier = "short" | "medium" | "long";

export const WORD_BANK: Record<WordTier, string[]> = {
  short: [
    "sol",
    "mar",
    "paz",
    "luz",
    "voz",
    "flor",
    "casa",
    "gato",
    "livro",
    "porta",
    "mesa",
    "fogo",
    "agua",
    "vento",
    "pedra",
    "nuvem",
    "praia",
    "tempo",
    "papel",
    "chave",
  ],
  medium: [
    "cachorro",
    "computador",
    "bicicleta",
    "professor",
    "elefante",
    "jardim",
    "estrela",
    "montanha",
    "caderno",
    "sapato",
    "janela",
    "cadeira",
    "relogio",
    "cidade",
    "familia",
    "musica",
    "viagem",
    "floresta",
    "borboleta",
    "chocolate",
  ],
  long: [
    "extraordinario",
    "responsabilidade",
    "conhecimento",
    "universidade",
    "tranquilidade",
    "oportunidade",
    "acontecimento",
    "desenvolvimento",
    "internacional",
    "circunstancia",
    "aproximadamente",
    "administracao",
    "characteristico",
    "correspondencia",
    "extraordinaria",
  ],
};

const TIER_POINTS: Record<WordTier, number> = {
  short: 10,
  medium: 25,
  long: 50,
};

export function pointsForTier(tier: WordTier): number {
  return TIER_POINTS[tier];
}

// Conforme o nivel avanca, palavras mais dificeis ficam mais provaveis
// (briefing: "palavras mais dificeis valem mais", dificuldade progressiva).
// Atinge o teto de dificuldade por volta do nivel 11.
export function pickWord(level: number): { text: string; tier: WordTier } {
  const progress = Math.min(1, (level - 1) / 10);
  const roll = Math.random();

  let tier: WordTier;
  if (roll < 0.5 - progress * 0.3) {
    tier = "short";
  } else if (roll < 0.85 - progress * 0.1) {
    tier = "medium";
  } else {
    tier = "long";
  }

  const options = WORD_BANK[tier];
  const text = options[Math.floor(Math.random() * options.length)];
  return { text, tier };
}
