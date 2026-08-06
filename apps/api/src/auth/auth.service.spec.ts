import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let passwordHash: string;

  const fakeStudentUser = {
    id: 'user-student-1',
    role: 'STUDENT',
    status: 'ACTIVE',
    email: null,
  };

  const fakeStaffUser = {
    id: 'user-staff-1',
    role: 'TEACHER',
    status: 'ACTIVE',
    email: 'professor@tt.local',
  };

  const prismaMock = {
    student: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue(undefined),
    },
  };

  beforeAll(async () => {
    passwordHash = await argon2.hash('Aluno#2026');
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        AuditService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('fake.jwt.token'),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('validateStudent', () => {
    it('returns the authenticated user for correct code and password', async () => {
      prismaMock.student.findUnique.mockResolvedValue({
        id: 'student-1',
        code: 'aluno01',
        name: 'Aluno Demo 1',
        user: { ...fakeStudentUser, passwordHash },
      });

      const result = await service.validateStudent(' ALUNO01 ', 'Aluno#2026');

      expect(result).toEqual({
        id: 'user-student-1',
        role: 'STUDENT',
        name: 'Aluno Demo 1',
        email: null,
        code: 'aluno01',
      });
      expect(prismaMock.student.findUnique).toHaveBeenCalledWith({
        where: { code: 'aluno01' },
        include: { user: true },
      });
    });

    it('throws for an unknown code', async () => {
      prismaMock.student.findUnique.mockResolvedValue(null);

      await expect(
        service.validateStudent('naoexiste', 'qualquer'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'LOGIN_FAILURE' }),
        }),
      );
    });

    it('throws for a wrong password without revealing which field was wrong', async () => {
      prismaMock.student.findUnique.mockResolvedValue({
        id: 'student-1',
        code: 'aluno01',
        name: 'Aluno Demo 1',
        user: { ...fakeStudentUser, passwordHash },
      });

      await expect(
        service.validateStudent('aluno01', 'senha-errada'),
      ).rejects.toThrow('Código ou senha inválidos.');
    });

    it('throws for a suspended/archived account even with correct password', async () => {
      prismaMock.student.findUnique.mockResolvedValue({
        id: 'student-1',
        code: 'aluno01',
        name: 'Aluno Demo 1',
        user: { ...fakeStudentUser, status: 'SUSPENDED', passwordHash },
      });

      await expect(
        service.validateStudent('aluno01', 'Aluno#2026'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('validateStaff', () => {
    it('returns the authenticated user for correct email and password', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...fakeStaffUser,
        passwordHash,
        teacher: { name: 'Professora Ana' },
      });

      const result = await service.validateStaff(
        ' Professor@TT.local ',
        'Aluno#2026',
      );

      expect(result).toEqual({
        id: 'user-staff-1',
        role: 'TEACHER',
        name: 'Professora Ana',
        email: 'professor@tt.local',
        code: null,
      });
    });

    it('rejects a student trying to log in through the staff endpoint', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...fakeStudentUser,
        passwordHash,
        teacher: null,
      });

      await expect(
        service.validateStaff('aluno@tt.local', 'Aluno#2026'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
