import {
  AchievementKey,
  CosmeticType,
  League,
  MissionKey,
} from '@tt-digita/shared';

// Catalogos estaticos (briefing secao 27-29). Nao ha tela de administracao
// pra isso nesta fase -- superusuario so gerencia login/turmas/professores
// (decisao combinada com o cliente). Progresso de cada aluno fica no banco;
// os catalogos em si sao codigo.

export const XP_PER_MISSION = 30;
export const COINS_PER_MISSION = 10;

export interface MissionDefinition {
  key: MissionKey;
  title: string;
  description: string;
  target: number;
}

export const MISSION_CATALOG: MissionDefinition[] = [
  {
    key: MissionKey.COMPLETE_TWO_LESSONS,
    title: 'Duas lições',
    description: 'Complete duas lições hoje.',
    target: 2,
  },
  {
    key: MissionKey.TRAIN_TEN_MINUTES,
    title: 'Dez minutos de treino',
    description: 'Treine por dez minutos hoje.',
    target: 600,
  },
  {
    key: MissionKey.HIT_ACCURACY_GOAL,
    title: 'Meta de precisão',
    description: 'Atinja 95% de precisão em algum exercício hoje.',
    target: 1,
  },
  {
    key: MissionKey.PRACTICE_WEAK_KEY,
    title: 'Treine uma tecla fraca',
    description: 'Pratique um exercício com uma das suas teclas fracas.',
    target: 1,
  },
  {
    key: MissionKey.JOIN_ROOM,
    title: 'Participe de uma sala',
    description: 'Entre em uma sala ao vivo hoje.',
    target: 1,
  },
  {
    key: MissionKey.IMPROVE_PERSONAL_AVERAGE,
    title: 'Melhore sua média',
    description: 'Supere sua velocidade média pessoal em algum exercício.',
    target: 1,
  },
];

export interface AchievementDefinition {
  key: AchievementKey;
  title: string;
  description: string;
}

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  {
    key: AchievementKey.FIRST_LESSON,
    title: 'Primeira lição',
    description: 'Conclua sua primeira lição.',
  },
  {
    key: AchievementKey.THOUSAND_WORDS,
    title: 'Mil palavras',
    description: 'Digite mil palavras corretas.',
  },
  {
    key: AchievementKey.TEN_THOUSAND_WORDS,
    title: 'Dez mil palavras',
    description: 'Digite dez mil palavras corretas.',
  },
  {
    key: AchievementKey.SEVEN_DAY_STREAK,
    title: 'Sete dias de prática',
    description: 'Pratique em sete dias diferentes.',
  },
  {
    key: AchievementKey.FIRST_DIAMOND_MASTERY,
    title: 'Primeiro domínio Diamante',
    description: 'Complete um exercício com domínio Diamante.',
  },
  {
    key: AchievementKey.FIRST_COMPETITION,
    title: 'Primeira competição',
    description: 'Finalize sua primeira sala ao vivo.',
  },
  {
    key: AchievementKey.PERFECT_ACCURACY,
    title: 'Precisão perfeita',
    description: 'Termine um desafio com 100% de precisão.',
  },
  {
    key: AchievementKey.NEW_PERSONAL_RECORD,
    title: 'Novo recorde pessoal',
    description: 'Supere seu recorde pessoal de velocidade.',
  },
];

export interface CosmeticDefinition {
  id: string;
  type: CosmeticType;
  name: string;
  cost: number;
  requiredLevel: number;
}

export const COSMETIC_CATALOG: CosmeticDefinition[] = [
  {
    id: 'frame_bronze',
    type: CosmeticType.AVATAR_FRAME,
    name: 'Moldura Bronze',
    cost: 0,
    requiredLevel: 1,
  },
  {
    id: 'frame_prata',
    type: CosmeticType.AVATAR_FRAME,
    name: 'Moldura Prata',
    cost: 50,
    requiredLevel: 3,
  },
  {
    id: 'frame_ouro',
    type: CosmeticType.AVATAR_FRAME,
    name: 'Moldura Ouro',
    cost: 150,
    requiredLevel: 5,
  },
  {
    id: 'frame_neon',
    type: CosmeticType.AVATAR_FRAME,
    name: 'Moldura Neon',
    cost: 300,
    requiredLevel: 8,
  },
  {
    id: 'theme_padrao',
    type: CosmeticType.THEME,
    name: 'Tema Padrão',
    cost: 0,
    requiredLevel: 1,
  },
  {
    id: 'theme_por_do_sol',
    type: CosmeticType.THEME,
    name: 'Tema Pôr do Sol',
    cost: 100,
    requiredLevel: 4,
  },
  {
    id: 'theme_meia_noite',
    type: CosmeticType.THEME,
    name: 'Tema Meia-Noite',
    cost: 100,
    requiredLevel: 4,
  },
  {
    id: 'theme_floresta',
    type: CosmeticType.THEME,
    name: 'Tema Floresta',
    cost: 150,
    requiredLevel: 6,
  },
  {
    id: 'title_iniciante',
    type: CosmeticType.TITLE,
    name: 'Iniciante',
    cost: 0,
    requiredLevel: 1,
  },
  {
    id: 'title_dedicado',
    type: CosmeticType.TITLE,
    name: 'Dedicado',
    cost: 80,
    requiredLevel: 3,
  },
  {
    id: 'title_veloz',
    type: CosmeticType.TITLE,
    name: 'Veloz',
    cost: 200,
    requiredLevel: 7,
  },
  {
    id: 'title_lenda',
    type: CosmeticType.TITLE,
    name: 'Lenda T&T',
    cost: 500,
    requiredLevel: 10,
  },
];

// Fechamento de temporada, secao 27: pontos separados do XP vitalicio, mas
// alimentados pelos mesmos eventos (uma XP-earning action tambem soma ponto
// de temporada). Liga e so a faixa em que os pontos da temporada caem hoje.
export const LEAGUE_THRESHOLDS: { league: League; minPoints: number }[] = [
  { league: League.LENDA, minPoints: 7000 },
  { league: League.MESTRE, minPoints: 4000 },
  { league: League.DIAMANTE, minPoints: 2200 },
  { league: League.PLATINA, minPoints: 1200 },
  { league: League.OURO, minPoints: 600 },
  { league: League.PRATA, minPoints: 200 },
  { league: League.BRONZE, minPoints: 0 },
];

export function leagueForPoints(points: number): League {
  const tier = LEAGUE_THRESHOLDS.find((t) => points >= t.minPoints);
  return tier?.league ?? League.BRONZE;
}

export function nextLeague(
  current: League,
): { league: League; minPoints: number } | null {
  const index = LEAGUE_THRESHOLDS.findIndex((t) => t.league === current);
  return index > 0 ? LEAGUE_THRESHOLDS[index - 1] : null;
}

const SEASON_LENGTH_DAYS = 30;

export function seasonLengthDays(): number {
  return SEASON_LENGTH_DAYS;
}

// Curva de nivel: cada nivel exige um pouco mais de XP que o anterior
// (100, 220, 360, ...). Simples e previsivel, sem precisar de tabela externa.
export function xpForLevel(level: number): number {
  return 100 * level + 20 * level * (level - 1);
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level)) {
    level += 1;
  }
  return level;
}

export function xpProgress(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
} {
  const level = levelForXp(xp);
  const floor = level === 1 ? 0 : xpForLevel(level - 1);
  const ceiling = xpForLevel(level);
  return { level, xpIntoLevel: xp - floor, xpForNextLevel: ceiling - floor };
}

// "Ganhou XP por completar" so conta se passou na barra minima do exercicio
// (o mesmo minAccuracy que ja gate o avanco na trilha).
export function xpForExerciseCompletion(accuracy: number): number {
  return Math.round(20 + 40 * Math.min(1, Math.max(0, accuracy)));
}

export function xpForRoomFinish(
  position: number,
  participantCount: number,
): number {
  const base = 15;
  if (participantCount <= 1) return base;
  if (position === 1) return 40;
  if (position === 2) return 25;
  if (position === 3) return 15;
  return base;
}

export function coinsForXp(xp: number): number {
  return Math.floor(xp / 4);
}

// Dominio da secao 8, calculado na hora a partir da tentativa (nao existe
// maquina de estado de dominio por exercicio ainda -- isso fica pra um passo
// futuro do motor pedagogico). So usado aqui pra destravar a conquista de
// dominio Diamante.
export function isDiamondMastery(
  accuracy: number,
  incorrectChars: number,
  wpmNet: number,
  targetWpm: number | null,
): boolean {
  if (accuracy < 0.99 || incorrectChars > 0) return false;
  if (targetWpm === null) return true;
  return wpmNet >= targetWpm * 1.1;
}

export function dateOnlyUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
