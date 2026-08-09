import { Test, type TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '@tt-digita/shared';
import { GameType, LiveRoomActivityType, Role } from '@tt-digita/shared';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RoomsService', () => {
  let service: RoomsService;

  const prismaMock = {
    world: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    exercise: {
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
    prismaMock.world.findUnique.mockResolvedValue(null);
    prismaMock.world.findMany.mockResolvedValue([]);
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

  describe('create · Mundo', () => {
    it('throws not found for a missing world', async () => {
      prismaMock.world.findUnique.mockResolvedValue(null);
      await expect(
        service.create(teacher, {
          activityType: LiveRoomActivityType.WORLD,
          worldId: 'world-x',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws bad request when the world has no published exercises', async () => {
      prismaMock.world.findUnique.mockResolvedValue({
        id: 'world-1',
        title: 'Mundo 1: Base',
      });
      prismaMock.exercise.findMany.mockResolvedValue([]);

      await expect(
        service.create(teacher, {
          activityType: LiveRoomActivityType.WORLD,
          worldId: 'world-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a room with one round per published exercise, in order', async () => {
      prismaMock.world.findUnique.mockResolvedValue({
        id: 'world-1',
        title: 'Mundo 1: Base',
      });
      prismaMock.exercise.findMany.mockResolvedValue([
        { id: 'ex-1' },
        { id: 'ex-2' },
        { id: 'ex-3' },
      ]);
      prismaMock.liveRoom.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'room-1',
          code: data.code,
          status: 'LOBBY',
          activityType: 'WORLD',
          roundCount: data.roundCount,
        }),
      );

      const room = await service.create(teacher, {
        activityType: LiveRoomActivityType.WORLD,
        worldId: 'world-1',
      });

      expect(room.code).toMatch(/^[A-Z2-9]{5}$/);
      expect(room.worldTitle).toBe('Mundo 1: Base');
      expect(room.roundCount).toBe(3);
      expect(prismaMock.liveRoom.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          activityType: 'WORLD',
          worldId: 'world-1',
          roundExerciseIds: ['ex-1', 'ex-2', 'ex-3'],
          roundCount: 3,
        }),
      });
    });
  });

  describe('create · Jogo', () => {
    it('rejects a retired game type (DEFESA)', async () => {
      await expect(
        service.create(teacher, {
          activityType: LiveRoomActivityType.GAME,
          gameType: GameType.DEFESA,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a single-round room for an active game type', async () => {
      prismaMock.liveRoom.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'room-2',
          code: data.code,
          status: 'LOBBY',
          activityType: 'GAME',
          gameType: data.gameType,
          roundCount: 1,
        }),
      );

      const room = await service.create(teacher, {
        activityType: LiveRoomActivityType.GAME,
        gameType: GameType.ORBITAL,
      });

      expect(room.gameType).toBe(GameType.ORBITAL);
      expect(room.roundCount).toBe(1);
      expect(room.worldId).toBeNull();
    });
  });

  describe('listWorlds', () => {
    it('only lists worlds that have at least one published exercise', async () => {
      prismaMock.world.findMany.mockResolvedValue([
        {
          id: 'world-1',
          title: 'Mundo 1: Base',
          focus: 'Postura, F, J e linha guia',
          _count: { exercises: 8 },
        },
        {
          id: 'world-9',
          title: 'Mundo 9: Dados',
          focus: 'Números',
          _count: { exercises: 0 },
        },
      ]);

      const result = await service.listWorlds();

      expect(result).toEqual([
        {
          id: 'world-1',
          title: 'Mundo 1: Base',
          focus: 'Postura, F, J e linha guia',
          exerciseCount: 8,
        },
      ]);
    });
  });

  describe('listGameTypes', () => {
    it('excludes the retired DEFESA game type', () => {
      const result = service.listGameTypes();
      expect(result.map((g) => g.gameType)).not.toContain(GameType.DEFESA);
      expect(result.map((g) => g.gameType)).toEqual([
        GameType.ORBITAL,
        GameType.ROBO,
        GameType.CHUVA_PALAVRAS,
        GameType.FRUTA,
        GameType.RITMO,
      ]);
    });
  });

  describe('getForHostOrAdmin', () => {
    const room = {
      id: 'room-1',
      code: 'ABCDE',
      status: 'LOBBY',
      activityType: 'WORLD',
      worldId: 'world-1',
      gameType: null,
      roundCount: 3,
      hostUserId: 'teacher-user-1',
      world: { title: 'Mundo 1: Base' },
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
      expect(result.worldTitle).toBe('Mundo 1: Base');
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

  describe('getResults', () => {
    const finishedRoom = {
      id: 'room-1',
      hostUserId: 'teacher-user-1',
      participants: [
        {
          studentId: 'student-2',
          position: 2,
          totalPoints: 80,
          student: { name: 'Aluno 2' },
        },
        {
          studentId: 'student-1',
          position: 1,
          totalPoints: 180,
          student: { name: 'Aluno 1' },
        },
      ],
      roundResults: [
        { studentId: 'student-1' },
        { studentId: 'student-1' },
        { studentId: 'student-2' },
      ],
    };

    it('throws not found for an unknown room', async () => {
      prismaMock.liveRoom.findUnique.mockResolvedValue(null);
      await expect(service.getResults(teacher, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('forbids a different teacher from viewing the results', async () => {
      prismaMock.liveRoom.findUnique.mockResolvedValue(finishedRoom);
      const other: AuthenticatedUser = { ...teacher, id: 'someone-else' };
      await expect(service.getResults(other, 'room-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('orders participants by finishing position and counts rounds completed', async () => {
      prismaMock.liveRoom.findUnique.mockResolvedValue(finishedRoom);
      const rows = await service.getResults(teacher, 'room-1');

      expect(rows.map((r) => r.studentId)).toEqual(['student-1', 'student-2']);
      expect(rows[0]).toEqual({
        studentId: 'student-1',
        studentName: 'Aluno 1',
        position: 1,
        totalPoints: 180,
        roundsCompleted: 2,
      });
      expect(rows[1]).toEqual({
        studentId: 'student-2',
        studentName: 'Aluno 2',
        position: 2,
        totalPoints: 80,
        roundsCompleted: 1,
      });
    });
  });
});
