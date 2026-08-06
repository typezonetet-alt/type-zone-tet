import { Test, type TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('AdminService', () => {
  let service: AdminService;

  const prismaMockBase = {
    teacher: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue(undefined),
    },
    class: { count: jest.fn().mockResolvedValue(0) },
    student: {
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'user-1' }),
    },
    attempt: { deleteMany: jest.fn().mockResolvedValue(undefined) },
    keystrokeStat: { deleteMany: jest.fn().mockResolvedValue(undefined) },
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

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.student.findUnique.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();

    service = module.get(AdminService);
  });

  describe('overview', () => {
    it('aggregates counts from teachers, classes and students', async () => {
      prismaMock.teacher.count.mockResolvedValue(2);
      prismaMock.class.count.mockResolvedValue(3);
      prismaMock.student.count.mockResolvedValue(40);

      expect(await service.overview()).toEqual({
        teacherCount: 2,
        classCount: 3,
        studentCount: 40,
      });
    });
  });

  describe('createTeacher', () => {
    it('creates a user+teacher pair and returns a one-time password', async () => {
      const credentials = await service.createTeacher({
        name: 'Nova Professora',
        email: 'Nova@TT.com',
      });

      expect(credentials.email).toBe('nova@tt.com');
      expect(credentials.code).toBeNull();
      expect(credentials.temporaryPassword).toHaveLength(10);
      expect(auditMock.log).toHaveBeenCalledWith(
        'TEACHER_CREATED',
        null,
        expect.objectContaining({ email: 'nova@tt.com' }),
      );
    });

    it('rejects an email already in use', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createTeacher({ name: 'Duplicada', email: 'ja@tt.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('resetStudentProgress', () => {
    it('deletes attempts and keystroke stats for the student', async () => {
      prismaMock.student.findUnique.mockResolvedValue({ id: 'student-1' });

      await service.resetStudentProgress('student-1');

      expect(prismaMock.attempt.deleteMany).toHaveBeenCalledWith({
        where: { studentId: 'student-1' },
      });
      expect(prismaMock.keystrokeStat.deleteMany).toHaveBeenCalledWith({
        where: { studentId: 'student-1' },
      });
      expect(auditMock.log).toHaveBeenCalledWith(
        'STUDENT_PROGRESS_RESET',
        null,
        expect.objectContaining({ studentId: 'student-1' }),
      );
    });

    it('throws not found for an unknown student', async () => {
      prismaMock.student.findUnique.mockResolvedValue(null);
      await expect(service.resetStudentProgress('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
