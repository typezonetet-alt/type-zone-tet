import { Test, type TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExercisesService', () => {
  let service: ExercisesService;

  // minAttempts: 1 nesses fixtures -- essas provas sao sobre a cascata de
  // desbloqueio e o corte por mundo, nao sobre o numero de tentativas exigido
  // (isso tem sua propria bateria de testes mais abaixo e em mastery.spec.ts).
  const exercises = [
    {
      id: 'ex-1',
      worldId: 'world-1',
      title: 'Um',
      type: 'KEY_SEQUENCE',
      content: 'fj',
      order: 1,
      minAccuracy: 0.8,
      targetWpm: null,
      minAttempts: 1,
      status: 'PUBLISHED',
    },
    {
      id: 'ex-2',
      worldId: 'world-1',
      title: 'Dois',
      type: 'KEY_SEQUENCE',
      content: 'asdf',
      order: 2,
      minAccuracy: 0.85,
      targetWpm: null,
      minAttempts: 1,
      status: 'PUBLISHED',
    },
    {
      id: 'ex-3',
      worldId: 'world-2',
      title: 'Três',
      type: 'WORD_LIST',
      content: 'casa fase',
      order: 1,
      minAccuracy: 0.9,
      targetWpm: 20,
      minAttempts: 1,
      status: 'PUBLISHED',
    },
  ];

  const prismaMock = {
    exercise: {
      findMany: jest.fn().mockResolvedValue(exercises),
      findUniqueOrThrow: jest.fn(),
    },
    attempt: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.exercise.findMany.mockResolvedValue(exercises);
    prismaMock.attempt.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(ExercisesService);
  });

  it('the first exercise is always unlocked, regardless of attempts', async () => {
    const list = await service.listForStudent('student-1');
    expect(list[0].unlocked).toBe(true);
  });

  it('locks everything after the first when there are no attempts yet', async () => {
    const list = await service.listForStudent('student-1');
    expect(list[1].unlocked).toBe(false);
    expect(list[2].unlocked).toBe(false);
  });

  it('unlocks the next exercise once the previous one is passed with enough accuracy', async () => {
    prismaMock.attempt.findMany.mockResolvedValue([
      { exerciseId: 'ex-1', accuracy: 0.82 },
    ]);

    const list = await service.listForStudent('student-1');

    expect(list[1].unlocked).toBe(true);
    expect(list[2].unlocked).toBe(false);
  });

  it('does not unlock the next exercise if accuracy is below the minimum', async () => {
    prismaMock.attempt.findMany.mockResolvedValue([
      { exerciseId: 'ex-1', accuracy: 0.5 },
    ]);

    const list = await service.listForStudent('student-1');

    expect(list[1].unlocked).toBe(false);
  });

  it('uses the best accuracy across multiple attempts on the same exercise', async () => {
    prismaMock.attempt.findMany.mockResolvedValue([
      { exerciseId: 'ex-1', accuracy: 0.3 },
      { exerciseId: 'ex-1', accuracy: 0.95 },
    ]);

    const list = await service.listForStudent('student-1');

    expect(list[1].unlocked).toBe(true);
    expect(list[0].bestAccuracy).toBe(0.95);
  });

  it('exposes worldId and keeps the unlock cascade across a world boundary', async () => {
    prismaMock.attempt.findMany.mockResolvedValue([
      { exerciseId: 'ex-1', accuracy: 0.9 },
      { exerciseId: 'ex-2', accuracy: 0.9 },
    ]);

    const list = await service.listForStudent('student-1');

    expect(list[0].worldId).toBe('world-1');
    expect(list[2].worldId).toBe('world-2');
    // ex-3 e o primeiro exercicio do mundo 2, mas so desbloqueia depois que
    // ex-1 e ex-2 (mundo 1) forem passados -- a cascata nao reseta por mundo.
    expect(list[2].unlocked).toBe(true);
  });

  // Desbloquear o PRÓXIMO exercício e "dominar" (o medalhão bronze/prata/
  // ouro/diamante) são coisas DIFERENTES desde a correção do bug relatado:
  // terminar a última atividade de um mundo, uma vez, com precisão
  // suficiente, tem que desbloquear o mundo seguinte -- não pode exigir
  // repetir a mesma proficiência minAttempts vezes seguidas só pra AVANÇAR.
  // O domínio (o medalhão) continua exigindo a sequência; isso é testado em
  // mastery.spec.ts, não aqui.
  describe('avançar vs. dominar (minAttempts só bloqueia o medalhão, não o avanço)', () => {
    const exercisesWithRepetition = [
      { ...exercises[0], minAttempts: 2 },
      { ...exercises[1], minAttempts: 2 },
      exercises[2],
    ];

    beforeEach(() => {
      prismaMock.exercise.findMany.mockResolvedValue(exercisesWithRepetition);
    });

    it('uma única tentativa já basta pra avançar, mesmo que o domínio (mastery) exija minAttempts=2', async () => {
      prismaMock.attempt.findMany.mockResolvedValue([
        { exerciseId: 'ex-1', accuracy: 0.95, wpmNet: 30, consistency: 0.9 },
      ]);

      const list = await service.listForStudent('student-1');

      // Continua bronze (não completou a sequência de 2) -- mas isso não
      // trava mais o avanço pro próximo exercício.
      expect(list[0].mastery).toBe('bronze');
      expect(list[1].unlocked).toBe(true);
    });

    it('duas tentativas seguidas na precisão mínima também dão o medalhão de domínio', async () => {
      prismaMock.attempt.findMany.mockResolvedValue([
        { exerciseId: 'ex-1', accuracy: 0.95, wpmNet: 30, consistency: 0.9 },
        { exerciseId: 'ex-1', accuracy: 0.9, wpmNet: 30, consistency: 0.9 },
      ]);

      const list = await service.listForStudent('student-1');

      expect(list[0].mastery).not.toBe('bronze');
      expect(list[1].unlocked).toBe(true);
    });

    it('uma sequência quebrada (passa, falha, passa) ainda deixa o domínio em bronze, mas o avanço já valeu pela melhor tentativa', async () => {
      prismaMock.attempt.findMany.mockResolvedValue([
        { exerciseId: 'ex-1', accuracy: 0.95, wpmNet: 30, consistency: 0.9 },
        { exerciseId: 'ex-1', accuracy: 0.3, wpmNet: 30, consistency: 0.9 },
        { exerciseId: 'ex-1', accuracy: 0.95, wpmNet: 30, consistency: 0.9 },
      ]);

      const list = await service.listForStudent('student-1');

      // Ultimas 2 tentativas: 0.3 (falha) e 0.95 (passa) -- janela mista, fica bronze no medalhão.
      expect(list[0].mastery).toBe('bronze');
      // Mas a MELHOR tentativa (0.95) já passou de minAccuracy (0.85) -- avança.
      expect(list[1].unlocked).toBe(true);
    });

    it('não avança se NENHUMA tentativa jamais alcançou a precisão mínima', async () => {
      prismaMock.attempt.findMany.mockResolvedValue([
        { exerciseId: 'ex-1', accuracy: 0.5, wpmNet: 30, consistency: 0.9 },
        { exerciseId: 'ex-1', accuracy: 0.6, wpmNet: 30, consistency: 0.9 },
      ]);

      const list = await service.listForStudent('student-1');

      expect(list[0].mastery).toBe('bronze');
      expect(list[1].unlocked).toBe(false);
    });
  });

  describe('getForStudent', () => {
    it('throws NotFound for an exercise id that does not exist', async () => {
      await expect(
        service.getForStudent('student-1', 'ex-999'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws Forbidden for a locked exercise', async () => {
      await expect(
        service.getForStudent('student-1', 'ex-2'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns the content for an unlocked exercise', async () => {
      prismaMock.exercise.findUniqueOrThrow.mockResolvedValue(exercises[0]);

      const result = await service.getForStudent('student-1', 'ex-1');

      expect(result.content).toBe('fj');
      expect(result.unlocked).toBe(true);
    });
  });
});
