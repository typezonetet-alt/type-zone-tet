import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '@tt-digita/shared';
import { League, Role } from '@tt-digita/shared';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClassesService } from '../classes/classes.service';
import { GamificationService } from '../gamification/gamification.service';

describe('ReportsService', () => {
  let service: ReportsService;

  const prismaMock = {
    classMember: { findMany: jest.fn(), findUnique: jest.fn() },
    dailyActivity: { findMany: jest.fn() },
    exercise: { findMany: jest.fn() },
    attempt: { findMany: jest.fn() },
    seasonScore: { findMany: jest.fn() },
  };

  const classesMock = {
    assertAccessToClass: jest.fn().mockResolvedValue(undefined),
  };
  const gamificationMock = { getActiveSeasonId: jest.fn() };

  const admin: AuthenticatedUser = {
    id: 'admin-1',
    role: Role.ADMIN,
    name: 'Admin',
    email: 'admin@tt.com',
    code: null,
  };

  const members = [
    {
      studentId: 'student-1',
      classId: 'class-1',
      student: { id: 'student-1', name: 'Aluno 1' },
    },
    {
      studentId: 'student-2',
      classId: 'class-1',
      student: { id: 'student-2', name: 'Aluno 2' },
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.classMember.findMany.mockResolvedValue(members);
    prismaMock.classMember.findUnique.mockResolvedValue(null);
    prismaMock.dailyActivity.findMany.mockResolvedValue([]);
    prismaMock.exercise.findMany.mockResolvedValue([]);
    prismaMock.attempt.findMany.mockResolvedValue([]);
    prismaMock.seasonScore.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ClassesService, useValue: classesMock },
        { provide: GamificationService, useValue: gamificationMock },
      ],
    }).compile();

    service = module.get(ReportsService);
  });

  describe('practiceFrequency', () => {
    it('aggregates minutes and active days per student', async () => {
      prismaMock.dailyActivity.findMany.mockResolvedValue([
        { studentId: 'student-1', secondsTrained: 600 },
        { studentId: 'student-1', secondsTrained: 300 },
        { studentId: 'student-2', secondsTrained: 0 },
      ]);

      const rows = await service.practiceFrequency(admin, 'class-1', {});

      expect(classesMock.assertAccessToClass).toHaveBeenCalledWith(
        admin,
        'class-1',
      );
      const student1 = rows.find((r) => r.studentId === 'student-1')!;
      expect(student1.daysActive).toBe(2);
      expect(student1.totalMinutes).toBe(15);
      expect(student1.avgMinutesPerActiveDay).toBe(7.5);

      const student2 = rows.find((r) => r.studentId === 'student-2')!;
      expect(student2.daysActive).toBe(1);
      expect(student2.totalMinutes).toBe(0);
    });

    it('reports zero for a student with no activity in range', async () => {
      const rows = await service.practiceFrequency(admin, 'class-1', {});
      expect(rows).toHaveLength(2);
      expect(rows.every((r) => r.daysActive === 0)).toBe(true);
    });
  });

  describe('trailCompletion', () => {
    it('marks an exercise as passed only when best accuracy meets the bar', async () => {
      prismaMock.exercise.findMany.mockResolvedValue([
        {
          id: 'ex-1',
          title: 'Fundação',
          minAccuracy: 0.85,
          world: { title: 'Mundo 1' },
        },
      ]);
      prismaMock.attempt.findMany.mockResolvedValue([
        {
          studentId: 'student-1',
          exerciseId: 'ex-1',
          accuracy: 0.5,
          wpmNet: 10,
        },
        {
          studentId: 'student-1',
          exerciseId: 'ex-1',
          accuracy: 0.9,
          wpmNet: 20,
        },
      ]);

      const rows = await service.trailCompletion(admin, 'class-1');

      const student1Row = rows.find((r) => r.studentId === 'student-1')!;
      expect(student1Row.attempted).toBe(true);
      expect(student1Row.passed).toBe(true);
      expect(student1Row.bestAccuracy).toBe(0.9);
      expect(student1Row.bestWpmNet).toBe(20);

      const student2Row = rows.find((r) => r.studentId === 'student-2')!;
      expect(student2Row.attempted).toBe(false);
      expect(student2Row.passed).toBe(false);
      expect(student2Row.bestAccuracy).toBeNull();
    });
  });

  describe('studentEvolution', () => {
    it('throws not found when the student is not a member of the class', async () => {
      prismaMock.classMember.findUnique.mockResolvedValue(null);
      await expect(
        service.studentEvolution(admin, 'class-1', 'student-1', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('maps attempts to evolution rows in order', async () => {
      prismaMock.classMember.findUnique.mockResolvedValue({
        id: 'membership-1',
      });
      prismaMock.attempt.findMany.mockResolvedValue([
        {
          id: 'attempt-1',
          createdAt: new Date('2026-01-01T10:00:00Z'),
          accuracy: 0.9,
          wpmNet: 30,
          exercise: {
            title: 'Fundação',
            minAccuracy: 0.85,
            world: { title: 'Mundo 1' },
          },
        },
      ]);

      const rows = await service.studentEvolution(
        admin,
        'class-1',
        'student-1',
        {},
      );

      expect(rows).toEqual([
        {
          attemptId: 'attempt-1',
          date: '2026-01-01T10:00:00.000Z',
          worldTitle: 'Mundo 1',
          exerciseTitle: 'Fundação',
          accuracy: 0.9,
          wpmNet: 30,
          passed: true,
        },
      ]);
    });
  });

  describe('seasonRanking', () => {
    it('returns an empty ranking when there is no active season', async () => {
      gamificationMock.getActiveSeasonId.mockResolvedValue(null);
      const rows = await service.seasonRanking(admin, 'class-1');
      expect(rows).toEqual([]);
    });

    it('ranks only students who belong to the class, ordered by points', async () => {
      gamificationMock.getActiveSeasonId.mockResolvedValue('season-1');
      prismaMock.seasonScore.findMany.mockResolvedValue([
        {
          studentId: 'student-1',
          points: 300,
          league: League.OURO,
          student: { name: 'Aluno 1' },
        },
        {
          studentId: 'student-2',
          points: 100,
          league: League.BRONZE,
          student: { name: 'Aluno 2' },
        },
      ]);

      const rows = await service.seasonRanking(admin, 'class-1');

      expect(rows).toEqual([
        {
          studentId: 'student-1',
          name: 'Aluno 1',
          points: 300,
          league: League.OURO,
          rank: 1,
          isCurrentStudent: false,
        },
        {
          studentId: 'student-2',
          name: 'Aluno 2',
          points: 100,
          league: League.BRONZE,
          rank: 2,
          isCurrentStudent: false,
        },
      ]);
    });
  });
});
