import { BadRequestException } from '@nestjs/common';

export const METRICS_FORMULA_VERSION = 'v1';

export interface AttemptCounts {
  durationMs: number;
  typedChars: number;
  correctChars: number;
  incorrectChars: number;
  charsPerSecondBuckets: number[];
}

export interface ComputedMetrics {
  wpmRaw: number;
  wpmNet: number;
  accuracy: number;
  consistency: number;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Integridade leve (nao e sala ao vivo/ranking oficial ainda, briefing secao 46
// reserva a rigidez anti-fraude pra quando isso existir): so barra payloads
// fisicamente impossiveis, sem tentar recalcular a partir de log bruto de teclas.
//
// O motor de digitacao bloqueia o avanco em erro (a pessoa precisa acertar
// pra seguir), entao "incorrectChars" e ilimitado por natureza -- alguem
// pode errar a mesma tecla dezenas de vezes. Ja "correctChars" nunca passa
// do tamanho do exercicio, porque cada acerto avanca o cursor uma vez so.
//
// Compartilhado entre o modo pratica (AttemptsService) e salas ao vivo
// (RoomsGateway) -- mesma mecanica de digitacao, mesma checagem.
export function assertPlausibleCounts(counts: {
  expectedChars: number;
  typedChars: number;
  correctChars: number;
  incorrectChars: number;
}): void {
  if (counts.correctChars + counts.incorrectChars !== counts.typedChars) {
    throw new BadRequestException('Contagem de caracteres inconsistente.');
  }
  if (counts.correctChars > counts.expectedChars) {
    throw new BadRequestException(
      'Quantidade de acertos maior que o exercício.',
    );
  }
  if (counts.incorrectChars > counts.expectedChars * 50 + 500) {
    throw new BadRequestException('Quantidade de erros implausível.');
  }
}

export function computeMetrics(counts: AttemptCounts): ComputedMetrics {
  const minutes = counts.durationMs / 60_000;

  const wpmRaw = minutes > 0 ? round(counts.typedChars / 5 / minutes) : 0;
  const wpmNet = minutes > 0 ? round(counts.correctChars / 5 / minutes) : 0;

  const totalRelevant = counts.correctChars + counts.incorrectChars;
  const accuracy =
    totalRelevant > 0 ? round(counts.correctChars / totalRelevant, 4) : 1;

  const consistency = round(computeConsistency(counts.charsPerSecondBuckets));

  return { wpmRaw, wpmNet, accuracy, consistency };
}

// Coeficiente de variacao dos caracteres corretos por segundo, convertido para
// uma escala 0-100 (quanto mais estavel o ritmo, mais perto de 100). Mesma
// ideia da funcao "kogasa" do Monkeytype, numa versao simplificada.
function computeConsistency(buckets: number[]): number {
  if (buckets.length < 2) {
    return 100;
  }

  const mean = buckets.reduce((sum, value) => sum + value, 0) / buckets.length;
  if (mean <= 0) {
    return 100;
  }

  const variance =
    buckets.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    buckets.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;

  return Math.max(0, Math.min(100, 100 * (1 - coefficientOfVariation)));
}
