import { Injectable } from '@nestjs/common';
import {
  AdaptiveBlock,
  type AdaptiveSessionItem,
  type ExerciseSummary,
} from '@tt-digita/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import { ExercisesService } from './exercises.service';
import { meetsMasteryBar } from './mastery';

// Motor adaptativo (briefing secao 12). Composicao inicial recomendada:
// 20% revisao dominada, 40% fraquezas principais, 30% conteudo do nivel
// atual, 10% desafio acima do nivel. O briefing e explicito que esses
// percentuais sao configuracao inicial, nao regra fixa -- por isso ficam
// como constantes simples, faceis de reajustar sem mexer no algoritmo.
const SESSION_SIZE = 10;
const BLOCK_SIZES: Record<AdaptiveBlock, number> = {
  [AdaptiveBlock.REVISAO]: 2,
  [AdaptiveBlock.FRAQUEZA]: 4,
  [AdaptiveBlock.ATUAL]: 3,
  [AdaptiveBlock.DESAFIO]: 1,
};
const INTERLEAVE_ORDER: AdaptiveBlock[] = [
  AdaptiveBlock.FRAQUEZA,
  AdaptiveBlock.ATUAL,
  AdaptiveBlock.REVISAO,
  AdaptiveBlock.DESAFIO,
];

function isMastered(exercise: ExerciseSummary): boolean {
  return meetsMasteryBar(exercise.mastery);
}

function weakCharDensity(content: string, weakChars: Set<string>): number {
  if (content.length === 0 || weakChars.size === 0) return 0;
  let hits = 0;
  for (const ch of content.toLowerCase()) {
    if (weakChars.has(ch)) hits += 1;
  }
  return hits / content.length;
}

@Injectable()
export class AdaptiveSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exercises: ExercisesService,
    private readonly stats: StatsService,
  ) {}

  async buildSession(studentId: string): Promise<AdaptiveSessionItem[]> {
    const summaries = await this.exercises.listForStudent(studentId);
    const unlocked = summaries.filter((s) => s.unlocked);
    if (unlocked.length === 0) return [];

    const unlockedIds = unlocked.map((s) => s.id);
    const [contents, attempts, weakKeys] = await Promise.all([
      this.prisma.exercise.findMany({
        where: { id: { in: unlockedIds } },
        select: { id: true, content: true },
      }),
      this.prisma.attempt.findMany({
        where: { studentId, exerciseId: { in: unlockedIds } },
        select: { exerciseId: true, finishedAt: true },
      }),
      this.stats.getWeakKeys(studentId),
    ]);

    const contentById = new Map(contents.map((c) => [c.id, c.content]));
    const lastSeenById = new Map<string, number>();
    for (const attempt of attempts) {
      const finishedAtMs = attempt.finishedAt.getTime();
      const current = lastSeenById.get(attempt.exerciseId);
      if (current === undefined || finishedAtMs > current) {
        lastSeenById.set(attempt.exerciseId, finishedAtMs);
      }
    }

    const mastered = unlocked.filter(isMastered);
    const notMastered = unlocked.filter((s) => !isMastered(s));
    const weakChars = new Set(weakKeys.map((w) => w.char));

    // Revisão dominada: repetição espaçada -- exercícios já passados, os
    // revistos há mais tempo primeiro (ou nunca revistos desde que passaram).
    const revisaoPool = [...mastered].sort(
      (a, b) => (lastSeenById.get(a.id) ?? 0) - (lastSeenById.get(b.id) ?? 0),
    );

    // Fraquezas principais: entre o desbloqueado, o que mais concentra os
    // caracteres marcados como fracos pelo aluno (StatsService já exige um
    // mínimo de tentativas antes de marcar uma tecla como fraca).
    const fraquezaPool =
      weakChars.size === 0
        ? []
        : [...unlocked]
            .map((item) => ({
              item,
              density: weakCharDensity(
                contentById.get(item.id) ?? '',
                weakChars,
              ),
            }))
            .filter((entry) => entry.density > 0)
            .sort((a, b) => b.density - a.density)
            .map((entry) => entry.item);

    // Conteúdo do nível atual: a fronteira normal de progresso, em ordem.
    // Sob o desbloqueio sequencial (ExercisesService), só existe UM exercício
    // desbloqueado-e-não-dominado por vez -- o resto já foi dominado ou ainda
    // está bloqueado.
    const atualPool = notMastered;

    // Desafio acima do nível: como o desbloqueio é sequencial, não existe um
    // segundo item "desbloqueado só que mais difícil" pra oferecer aqui sem
    // pular a fila de verdade. Em vez de burlar o bloqueio, mostramos o
    // próximo exercício BLOQUEADO como uma prévia (o aluno vê o que vem a
    // seguir, mas o conteúdo continua indisponível até ele passar da etapa
    // atual de verdade).
    const nextLocked = summaries.find((s) => !s.unlocked);
    const desafioPool = nextLocked ? [nextLocked] : [];

    const buckets: Record<AdaptiveBlock, AdaptiveSessionItem[]> = {
      [AdaptiveBlock.REVISAO]: [],
      [AdaptiveBlock.FRAQUEZA]: [],
      [AdaptiveBlock.ATUAL]: [],
      [AdaptiveBlock.DESAFIO]: [],
    };
    const usedIds = new Set<string>();

    function take(pool: ExerciseSummary[], block: AdaptiveBlock, size: number) {
      let added = 0;
      for (const item of pool) {
        if (added >= size) break;
        if (usedIds.has(item.id)) continue;
        buckets[block].push({ ...item, block });
        usedIds.add(item.id);
        added += 1;
      }
    }

    take(
      revisaoPool,
      AdaptiveBlock.REVISAO,
      BLOCK_SIZES[AdaptiveBlock.REVISAO],
    );
    take(
      fraquezaPool,
      AdaptiveBlock.FRAQUEZA,
      BLOCK_SIZES[AdaptiveBlock.FRAQUEZA],
    );
    take(atualPool, AdaptiveBlock.ATUAL, BLOCK_SIZES[AdaptiveBlock.ATUAL]);
    take(
      desafioPool,
      AdaptiveBlock.DESAFIO,
      BLOCK_SIZES[AdaptiveBlock.DESAFIO],
    );

    const chosenCount = Object.values(buckets).reduce(
      (sum, b) => sum + b.length,
      0,
    );
    if (chosenCount < SESSION_SIZE) {
      take(
        [...notMastered, ...unlocked],
        AdaptiveBlock.ATUAL,
        SESSION_SIZE - chosenCount,
      );
    }

    // Intercala os blocos em vez de agrupar tudo junto -- o briefing pede
    // para não transformar a sessão em repetição frustrante de um só tipo.
    const merged: AdaptiveSessionItem[] = [];
    let anyLeft = true;
    while (anyLeft && merged.length < SESSION_SIZE) {
      anyLeft = false;
      for (const block of INTERLEAVE_ORDER) {
        const bucket = buckets[block];
        if (bucket.length > 0) {
          merged.push(bucket.shift()!);
          anyLeft = true;
        }
      }
    }

    return merged;
  }
}
