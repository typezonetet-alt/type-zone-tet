import { Test, type TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '@tt-digita/shared';
import { Role } from '@tt-digita/shared';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RoomsService', () => {
  let service: RoomsService;

  const prismaMock = {
    exercise: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    liveRoom: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
  };

  const teacher: AuthenticatedUser = {
    id: 'teacher-user-1',
    role: Role.TEACHER,
    name: 'Prof',
    email: 'prof@tt.com',
    code: null,
  };
  const admin: AuthenticatedUser = {
    id: 'admin-1',
    role: Role.ADMIN,
    name: 'Admin',
    email: 'admin@tt.com',
    code: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.exercise.findUnique.mockResolvedValue(null);
    prismaMock.exercise.findMany.mockResolvedValue([]);
    prismaMock.liveRoom.findUnique.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(RoomsService);
  });

  describe('create', () => {
    it('throws not found for a missing or unpublished exercise', async () => {
      prismaMock.exercise.findUnique.mockResolvedValue(null);
      await expect(
        service.create(teacher, { exerciseId: 'ex-1' }),
      ).rejects.toThrow(NotFoundException);

      prismaMock.exercise.findUnique.mockResolvedValue({
        id: 'ex-1',
        title: 'Fundação: F e J',
        status: 'DRAFT',
      });
      await expect(
        service.create(teacher, { exerciseId: 'ex-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a room with a generated code for a published exercise', async () => {
      prismaMock.exercise.findUnique.mockResolvedValue({
        id: 'ex-1',
        title: 'Fundação: F e J',
        status: 'PUBLISHED',
      });
      prismaMock.liveRoom.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'room-1',
          code: data.code,
          status: 'LOBBY',
          exerciseId: data.exerciseId,
        }),
      );

      const room = await service.create(teacher, { exerciseId: 'ex-1' });

      expect(room.code).toMatch(/^[A-Z2-9]{5}$/);
      expect(room.exerciseTitle).toBe('Fundação: F e J');
      expect(prismaMock.liveRoom.create).toHaveBeenCalledWith({
        data: { code: room.code, exerciseId: 'ex-1', hostUserId: teacher.id },
      });
    });
  });

  describe('listExercises', () => {
    it('maps published exercises with their world title', async () => {
      prismaMock.exercise.findMany.mockResolvedValue([
        {
          id: 'ex-1',
          title: 'Fundação: F e J',
          world: { title: 'Mundo 1: Base' },
        },
      ]);

      const result = await service.listExercises();

      expect(result).toEqual([
        { id: 'ex-1', title: 'Fundação: F e J', worldTitle: 'Mundo 1: Base' },
      ]);
      expect(prismaMock.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'PUBLISHED' } }),
      );
    });
  });

  describe('getForHostOrAdmin', () => {
    const room = {
      id: 'room-1',
      code: 'ABCDE',
      status: 'LOBBY',
      exerciseId: 'ex-1',
      hostUserId: 'teacher-user-1',
      exercise: { title: 'Fundação: F e J' },
    };

    it('throws not found for an unknown room', async () => {
      prismaMock.liveRoom.findUnique.mockResolvedValue(null);
      await expect(
        service.getForHostOrAdmin(teacher, 'missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows the host to view their own room', async () => {
      prismaMock.liveRoom.findUnique.mockResolvedValue(room);
      const result = await service.getForHostOrAdmin(teacher, 'room-1');
      expect(result.code).toBe('ABCDE');
    });

    it('allows an admin to view any room', async () => {
      prismaMock.liveRoom.findUnique.mockResolvedValue(room);
      const result = await service.getForHostOrAdmin(admin, 'room-1');
      expect(result.code).toBe('ABCDE');
    });

    it('forbids a different teacher from viewing the room', async () => {
      prismaMock.liveRoom.findUnique.mockResolvedValue(room);
      const other: AuthenticatedUser = { ...teacher, id: 'someone-else' };
      await expect(service.getForHostOrAdmin(other, 'room-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
