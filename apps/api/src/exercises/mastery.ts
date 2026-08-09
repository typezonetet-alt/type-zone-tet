import { meetsMasteryBar, type MasteryTier } from '@tt-digita/shared';

export { meetsMasteryBar };

// Niveis de dominio do briefing sec. 8: Bronze (concluiu), Prata (atingiu
// precisao alvo), Ouro (precisao + velocidade alvo), Diamante (superou meta
// avancada com consistencia). A referencia de mercado (TypingClub) reforca
// "repeticao e dominio gradual" -- por isso o calculo olha as ULTIMAS
// tentativas (nao so a melhor de sempre) e exige um minimo de tentativas
// antes de considerar o exercicio dominado. Sem isso, uma unica tentativa
// sortuda destrava o proximo exercicio (bug reportado pelo usuario).
export interface MasteryExercise {
  minAccuracy: number;
  targetWpm: number | null;
  minAttempts: number;
}

export interface MasteryAttempt {
  accuracy: number;
  wpmNet: number;
  consistency: number;
}

const DIAMOND_ACCURACY_BONUS = 0.05;
const DIAMOND_ACCURACY_CAP = 0.99;
const DIAMOND_WPM_MULTIPLIER = 1.3;
const DIAMOND_MIN_CONSISTENCY = 0.8;

// attemptsAsc precisa vir ordenado da tentativa mais antiga pra mais
// recente -- o calculo olha so a "janela" das ultimas minAttempts.
export function computeMastery(
  exercise: MasteryExercise,
  attemptsAsc: MasteryAttempt[],
): MasteryTier {
  if (attemptsAsc.length === 0) return 'none';

  const streakLen = Math.min(exercise.minAttempts, attemptsAsc.length);
  const recent = attemptsAsc.slice(-streakLen);

  const enoughAttempts = attemptsAsc.length >= exercise.minAttempts;
  const recentPassesAccuracy = recent.every(
    (a) => a.accuracy >= exercise.minAccuracy,
  );
  if (!enoughAttempts || !recentPassesAccuracy) return 'bronze';

  const targetWpm = exercise.targetWpm;
  const recentPassesWpm =
    targetWpm === null || recent.every((a) => a.wpmNet >= targetWpm);
  if (!recentPassesWpm) return 'prata';

  const diamondAccuracy = Math.min(
    DIAMOND_ACCURACY_CAP,
    exercise.minAccuracy + DIAMOND_ACCURACY_BONUS,
  );
  const diamondWpm =
    targetWpm === null ? null : targetWpm * DIAMOND_WPM_MULTIPLIER;
  const recentIsDiamond = recent.every(
    (a) =>
      a.accuracy >= diamondAccuracy &&
      (diamondWpm === null || a.wpmNet >= diamondWpm) &&
      a.consistency >= DIAMOND_MIN_CONSISTENCY,
  );

  return recentIsDiamond ? 'diamante' : 'ouro';
}

/**
 * Desbloqueia o PRÓXIMO exercício: basta ter, alguma vez, alcançado a
 * precisão mínima -- não precisa da sequência de `minAttempts` que o
 * DOMÍNIO (computeMastery, acima) exige. Essa distinção existe por causa
 * de duas reclamações reais, em direções opostas:
 *
 *  - Antes de existir `minAttempts`: uma única tentativa sortuda destrava
 *    o próximo exercício sem o aluno nunca ter praticado de verdade (ver
 *    comentário de computeMastery).
 *  - Depois de existir `minAttempts` (o bug reportado que motivou esta
 *    função): mesmo tendo terminado a atividade uma vez com precisão
 *    suficiente, o aluno ficava travado até repetir a MESMA proficiência
 *    `minAttempts` vezes seguidas -- e isso também travava a passagem pro
 *    próximo MUNDO inteiro, porque o desbloqueio em cascata depende do
 *    último exercício do mundo anterior.
 *
 * A solução: separar os dois conceitos. "Avançar" (esta função) exige só
 * ter provado, uma vez, que consegue -- "dominar" (computeMastery, os
 * medalhões bronze/prata/ouro/diamante) continua exigindo a sequência.
 *
 * `minAccuracy` é o "% definido pelo professor" pra este exercício -- o
 * default de 0.75 (ver schema.prisma) vale quando o professor não
 * personalizou o valor.
 */
export function meetsUnlockBar(
  minAccuracy: number,
  bestAccuracy: number | null,
): boolean {
  return bestAccuracy !== null && bestAccuracy >= minAccuracy;
}
