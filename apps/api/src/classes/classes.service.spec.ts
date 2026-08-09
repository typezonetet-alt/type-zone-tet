import { Test, type TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '@tt-digita/shared';
import { Role } from '@tt-digita/shared';
import { ClassesService } from './classes.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StatsService } from '../stats/stats.service';

describe('ClassesService', () => {
  let service: ClassesService;

  const prismaMockBase = {
    class: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
    teacher: {
      findUnique: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn(),
    },
    classMember: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    },
    student: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'student-new' }),
    },
    exercise: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    attempt: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      create: jest.fn().mockResolvedValue({ id: 'user-1' }),
    },
  };

  const prismaMock = {
    ...prismaMockBase,
    $transaction: jest.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prismaMockBase) => Promise<unknown>)(
          prismaMockBase,
        );
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
  };

  const auditMock = { log: jest.fn().mockResolvedValue(undefined) };
  const statsMock = { getWeakKeysForStudents: jest.fn().mockResolvedValue([]) };

  const admin: AuthenticatedUser = {
    id: 'admin-1',
    role: Role.ADMIN,
    name: 'Admin',
    email: 'admin@tt.com',
    code: null,
  };
  const teacher: AuthenticatedUser = {
    id: 'teacher-user-1',
    role: Role.TEACHER,
    name: 'Prof',
    email: 'prof@tt.com',
    code: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.class.findMany.mockResolvedValue([]);
    prismaMock.class.findUnique.mockResolvedValue(null);
    prismaMock.teacher.findUnique.mockResolvedValue(null);
    prismaMock.teacher.findUniqueOrThrow.mockReset();
    prismaMock.classMember.findMany.mockResolvedValue([]);
    prismaMock.classMember.findUnique.mockResolvedValue(null);
    prismaMock.student.findUnique.mockResolvedValue(null);
    prismaMock.exercise.findMany.mockResolvedValue([]);
    prismaMock.attempt.findMany.mockResolvedValue([]);
    statsMock.getWeakKeysForStudents.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
        { provide: StatsService, useValue: statsMock },
      ],
    }).compile();

    service = module.get(ClassesService);
  });

  describe('listForUser', () => {
    it('lists every class for an admin', async () => {
      await service.listForUser(admin);
      expect(prismaMock.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });

    it("scopes to the teacher's own classes only", async () => {
      prismaMock.teacher.findUniqueOrThrow.mockResolvedValue({
        id: 'teacher-1',
      });
      await service.listForUser(teacher);
      expect(prismaMock.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { teacherId: 'teacher-1' } }),
      );
    });
  });

  describe('getDetail', () => {
    const baseClass = {
      id: 'class-1',
      name: 'Turma A',
      course: null,
      shift: null,
      status: 'ACTIVE',
      teacherId: 'teacher-1',
      teacher: { name: 'Prof' },
      _count: { members: 1 },
    };

    it('denies access to a teacher who does not own the class', async () => {
      prismaMock.class.findUnique.mockResolvedValue(baseClass);
      prismaMock.teacher.findUniqueOrThrow.mockResolvedValue({
        id: 'someone-else',
      });

      await expect(service.getDetail(teacher, 'class-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws not found for an unknown class', async () => {
      prismaMock.class.findUnique.mockResolvedValue(null);
      await expect(service.getDetail(admin, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('computes exercisesCompleted from best accuracy vs each exercise minAccuracy', async () => {
      prismaMock.class.findUnique.mockResolvedValue(baseClass);
      prismaMock.classMember.findMany.mockResolvedValue([
        {
          studentId: 'student-1',
          student: { id: 'student-1', name: 'Aluno 1', code: 'a1' },
        },
      ]);
      prismaMock.exercise.findMany.mockResolvedValue([
        { id: 'ex-1', minAccuracy: 0.85 },
        { id: 'ex-2', minAccuracy: 0.9 },
      ]);
      prismaMock.attempt.findMany.mockResolvedValue([
        {
          studentId: 'student-1',
          exerciseId: 'ex-1',
          accuracy: 0.4,
          wpmNet: 5,
          createdAt: new Date('2026-01-01'),
        },
        {
          studentId: 'student-1',
          exerciseId: 'ex-1',
          accuracy: 0.9,
          wpmNet: 20,
          createdAt: new Date('2026-01-02'),
        },
        {
          studentId: 'student-1',
          exerciseId: 'ex-2',
          accuracy: 0.5,
          wpmNet: 10,
          createdAt: new Date('2026-01-03'),
        },
      ]);

      const detail = await service.getDetail(admin, 'class-1');

      expect(detail.students).toHaveLength(1);
      const [progress] = detail.students;
      expect(progress.exercisesCompleted).toBe(1); // so ex-1 passou (0.9 >= 0.85); ex-2 nao (0.5 < 0.9)
      expect(progress.exercisesTotal).toBe(2);
      expect(progress.bestAccuracyAvg).toBeCloseTo((0.9 + 0.5) / 2, 4);
      expect(progress.lastPracticeAt).toBe(
        new Date('2026-01-03').toISOString(),
      );
    });
  });

  describe('createStudent', () => {
    it('generates a unique code when none is provided', async () => {
      prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
      prismaMock.student.findUnique.mockResolvedValue(null);

      const result = await service.createStudent('class-1', {
        name: 'Novo Aluno',
      });

      expect(result.code).toMatch(/^aluno/);
      expect(result.temporaryPassword).toHaveLength(10);
      expect(auditMock.log).toHaveBeenCalledWith(
        'STUDENT_CREATED',
        null,
        expect.objectContaining({ classId: 'class-1' }),
      );
    });

    it('rejects an explicit code that is already taken', async () => {
      prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
      prismaMock.student.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createStudent('class-1', {
          name: 'Novo Aluno',
          code: 'aluno01',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws not found for an unknown class', async () => {
      prismaMock.class.findUnique.mockResolvedValue(null);
      await expect(
        service.createStudent('missing', { name: 'Novo Aluno' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createStudentsBulk', () => {
    it('creates every valid name and skips blank lines', async () => {
      prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
      prismaMock.student.findUnique.mockResolvedValue(null);

      const result = await service.createStudentsBulk('class-1', [
        'Maria Silva',
        '   ',
        'João Souza',
      ]);

      expect(result.created).toHaveLength(2);
      expect(result.created.map((s) => s.name)).toEqual([
        'Maria Silva',
        'João Souza',
      ]);
      expect(result.created[0].code).toMatch(/^aluno/);
      expect(result.failed).toEqual([{ name: '   ', reason: 'Nome vazio.' }]);
    });

    it('keeps processing remaining names when one row fails', async () => {
      prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
      prismaMock.teacher.findUniqueOrThrow.mockReset();

      let call = 0;
      prismaMock.student.findUnique.mockImplementation(() => {
        call += 1;
        // Forca a primeira tentativa de codigo a colidir 5x seguidas (esgota
        // uniqueStudentCode) so pro primeiro nome; os demais seguem normais.
        return Promise.resolve(call <= 5 ? { id: 'taken' } : null);
      });

      const result = await service.createStudentsBulk('class-1', [
        'Nome Um',
        'Nome Dois',
      ]);

      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].name).toBe('Nome Um');
      expect(result.created).toHaveLength(1);
      expect(result.created[0].name).toBe('Nome Dois');
    });

    it('throws not found for an unknown class', async () => {
      prismaMock.class.findUnique.mockResolvedValue(null);
      await expect(
        service.createStudentsBulk('missing', ['Nome']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addExistingMember', () => {
    it('rejects when the student is already a member', async () => {
      prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
      prismaMock.student.findUnique.mockResolvedValue({ id: 'student-1' });
      prismaMock.classMember.findUnique.mockResolvedValue({
        id: 'membership-1',
      });

      await expect(
        service.addExistingMember('class-1', 'aluno01'),
      ).rejects.toThrow(ConflictException);
    });

    it('throws not found when the code does not match any student', async () => {
      prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
      prismaMock.student.findUnique.mockResolvedValue(null);

      await expect(
        service.addExistingMember('class-1', 'ghost'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMember', () => {
    it('throws not found when the membership does not exist', async () => {
      prismaMock.classMember.findUnique.mockResolvedValue(null);
      await expect(
        service.removeMember('class-1', 'student-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
