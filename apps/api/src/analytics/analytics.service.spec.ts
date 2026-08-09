import { Test, type TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const prismaMock = {
    student: { count: jest.fn().mockResolvedValue(0) },
    attempt: { findMany: jest.fn().mockResolvedValue([]) },
    dailyActivity: { findMany: jest.fn().mockResolvedValue([]) },
    gameScore: {
      groupBy: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    liveRoomParticipant: {
      groupBy: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    liveRoom: { findMany: jest.fn().mockResolvedValue([]) },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.student.count.mockResolvedValue(0);
    prismaMock.attempt.findMany.mockResolvedValue([]);
    prismaMock.dailyActivity.findMany.mockResolvedValue([]);
    prismaMock.gameScore.groupBy.mockResolvedValue([]);
    prismaMock.gameScore.count.mockResolvedValue(0);
    prismaMock.liveRoomParticipant.groupBy.mockResolvedValue([]);
    prismaMock.liveRoomParticipant.count.mockResolvedValue(0);
    prismaMock.liveRoom.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  it('returns all zeros/nulls for a platform with no data', async () => {
    const result = await service.getProductAnalytics();

    expect(result.totalStudents).toBe(0);
    expect(result.activatedStudents).toBe(0);
    expect(result.activationRate).toBe(0);
    expect(result.averageAccuracy).toBeNull();
    expect(result.averageWpmNet).toBeNull();
    expect(result.averageSecondsToStartRoom).toBeNull();
    expect(result.weeklyActiveTrend).toEqual([]);
  });

  it('counts a student as activated only once they pass an exercise', async () => {
    prismaMock.student.count.mockResolvedValue(2);
    prismaMock.attempt.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        exerciseId: 'ex-1',
        accuracy: 0.5,
        wpmNet: 10,
        exercise: { minAccuracy: 0.85 },
      },
      {
        studentId: 'student-1',
        exerciseId: 'ex-1',
        accuracy: 0.9,
        wpmNet: 20,
        exercise: { minAccuracy: 0.85 },
      },
      {
        studentId: 'student-2',
        exerciseId: 'ex-1',
        accuracy: 0.3,
        wpmNet: 5,
        exercise: { minAccuracy: 0.85 },
      },
    ]);

    const result = await service.getProductAnalytics();

    expect(result.activatedStudents).toBe(1);
    expect(result.activationRate).toBe(0.5);
    expect(result.exercisesCompletedTotal).toBe(1);
    expect(result.averageAccuracy).toBeCloseTo((0.5 + 0.9 + 0.3) / 3, 4);
    expect(result.averageWpmNet).toBeCloseTo((10 + 20 + 5) / 3, 4);
  });

  it('computes qualified practice minutes only from days with a completed exercise', async () => {
    prismaMock.dailyActivity.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        date: new Date(),
        secondsTrained: 600,
        exercisesCompleted: 1,
      },
      {
        studentId: 'student-1',
        date: new Date(),
        secondsTrained: 300,
        exercisesCompleted: 0,
      },
      {
        studentId: 'student-2',
        date: new Date(),
        secondsTrained: 1200,
        exercisesCompleted: 2,
      },
    ]);

    const result = await service.getProductAnalytics();

    // Total: 600+300+1200 = 2100s = 35min
    expect(result.totalPracticeMinutes).toBe(35);
    // Qualificado: so os dias com exercisesCompleted>0 -> 600+1200=1800s=30min,
    // dividido por 2 alunos qualificados = 15min/aluno.
    expect(result.qualifiedPracticeMinutesPerActiveStudent).toBe(15);
  });

  it('buckets weekly active students by the Monday of their activity date', async () => {
    // Segunda e terca da semana ATUAL (calculadas a partir de "agora", nao
    // fixas) -- garante as duas datas no mesmo bucket sem depender da data
    // do sistema neste ambiente.
    const now = new Date();
    const day = now.getUTCDay();
    const mondayOffset = (day === 0 ? -6 : 1) - day;
    const monday = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + mondayOffset,
      ),
    );
    const tuesday = new Date(monday.getTime() + 24 * 60 * 60 * 1000);
    const expectedMonday = monday.toISOString().slice(0, 10);

    prismaMock.dailyActivity.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        date: monday,
        secondsTrained: 60,
        exercisesCompleted: 1,
      },
      {
        studentId: 'student-2',
        date: tuesday,
        secondsTrained: 60,
        exercisesCompleted: 1,
      },
    ]);

    const result = await service.getProductAnalytics();

    expect(result.weeklyActiveTrend).toEqual([
      { weekStart: expectedMonday, activeStudents: 2 },
    ]);
  });

  it('averages the delay between room creation and start', async () => {
    prismaMock.liveRoom.findMany.mockResolvedValue([
      {
        createdAt: new Date('2026-01-01T10:00:00Z'),
        startedAt: new Date('2026-01-01T10:00:30Z'),
      },
      {
        createdAt: new Date('2026-01-01T11:00:00Z'),
        startedAt: new Date('2026-01-01T11:01:30Z'),
      },
    ]);

    const result = await service.getProductAnalytics();

    // 30s e 90s -> media 60s
    expect(result.averageSecondsToStartRoom).toBe(60);
  });

  it('splits total vs. completed room participations correctly', async () => {
    prismaMock.liveRoomParticipant.groupBy.mockResolvedValue([
      { studentId: 'student-1' },
      { studentId: 'student-2' },
    ]);
    prismaMock.liveRoomParticipant.count
      .mockResolvedValueOnce(5) // total de participacoes
      .mockResolvedValueOnce(3); // com posicao final (completou a prova)

    const result = await service.getProductAnalytics();

    expect(result.studentsWhoJoinedRooms).toBe(2);
    expect(result.roomParticipationsTotal).toBe(5);
    expect(result.roomCompletionsTotal).toBe(3);
  });
});
