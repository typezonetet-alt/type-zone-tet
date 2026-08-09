import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  GameType as PrismaGameType,
  LiveRoomActivityType as PrismaLiveRoomActivityType,
  LiveRoomStatus as PrismaLiveRoomStatus,
} from '@prisma/client';
import type {
  AuthenticatedUser,
  CreateRoomPayload,
  RoomGameOption,
  RoomResultRow,
  RoomSummary,
  RoomWorldOption,
} from '@tt-digita/shared';
import {
  GameType,
  LiveRoomActivityType,
  LiveRoomStatus,
  Role,
} from '@tt-digita/shared';
import { PrismaService } from '../prisma/prisma.service';
import { generateRoomCode } from '../common/credentials.util';

// DEFESA foi aposentado do arcade (ver packages/shared/src/games.ts) -- não
// oferecido como atividade de sala nova, só mantido no enum por histórico.
const ACTIVE_ROOM_GAME_TYPES: GameType[] = [
  GameType.ORBITAL,
  GameType.ROBO,
  GameType.CHUVA_PALAVRAS,
  GameType.FRUTA,
  GameType.RITMO,
];

// O enum do Prisma e o do pacote compartilhado tem os mesmos valores de
// string (ver schema.prisma / games.ts) -- so tipos TS diferentes, por isso
// os casts abaixo em vez de duas fontes de verdade.
function toSharedStatus(status: PrismaLiveRoomStatus): LiveRoomStatus {
  return status as unknown as LiveRoomStatus;
}

function toSharedActivityType(
  type: PrismaLiveRoomActivityType,
): LiveRoomActivityType {
  return type as unknown as LiveRoomActivityType;
}

function toSharedGameType(type: PrismaGameType): GameType;
function toSharedGameType(type: PrismaGameType | null): GameType | null;
function toSharedGameType(type: PrismaGameType | null): GameType | null {
  return type as unknown as GameType | null;
}

function toPrismaGameType(type: GameType): PrismaGameType {
  return type;
}

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateRoomPayload,
  ): Promise<RoomSummary> {
    const code = await this.uniqueCode();

    if (dto.activityType === LiveRoomActivityType.WORLD) {
      if (!dto.worldId) {
        throw new BadRequestException('Selecione um Mundo.');
      }
      const world = await this.prisma.world.findUnique({
        where: { id: dto.worldId },
      });
      if (!world) throw new NotFoundException('Mundo não encontrado.');

      const exercises = await this.prisma.exercise.findMany({
        where: { worldId: world.id, status: 'PUBLISHED' },
        orderBy: { order: 'asc' },
        select: { id: true },
      });
      if (exercises.length === 0) {
        throw new BadRequestException(
          'Este Mundo ainda não tem exercícios publicados.',
        );
      }

      const room = await this.prisma.liveRoom.create({
        data: {
          code,
          hostUserId: user.id,
          activityType: 'WORLD',
          worldId: world.id,
          roundExerciseIds: exercises.map((e) => e.id),
          roundCount: exercises.length,
        },
      });

      return {
        id: room.id,
        code: room.code,
        status: toSharedStatus(room.status),
        activityType: toSharedActivityType(room.activityType),
        worldId: world.id,
        worldTitle: world.title,
        gameType: null,
        roundCount: room.roundCount,
      };
    }

    if (!dto.gameType || !ACTIVE_ROOM_GAME_TYPES.includes(dto.gameType)) {
      throw new BadRequestException('Selecione um jogo válido.');
    }

    const room = await this.prisma.liveRoom.create({
      data: {
        code,
        hostUserId: user.id,
        activityType: 'GAME',
        gameType: toPrismaGameType(dto.gameType),
        roundCount: 1,
      },
    });

    return {
      id: room.id,
      code: room.code,
      status: toSharedStatus(room.status),
      activityType: toSharedActivityType(room.activityType),
      worldId: null,
      worldTitle: null,
      gameType: toSharedGameType(room.gameType),
      roundCount: room.roundCount,
    };
  }

  async getForHostOrAdmin(
    user: AuthenticatedUser,
    roomId: string,
  ): Promise<RoomSummary> {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      include: { world: true },
    });
    if (!room) {
      throw new NotFoundException('Sala não encontrada.');
    }
    this.assertHostOrAdmin(user, room.hostUserId);

    return {
      id: room.id,
      code: room.code,
      status: toSharedStatus(room.status),
      activityType: toSharedActivityType(room.activityType),
      worldId: room.worldId,
      worldTitle: room.world?.title ?? null,
      gameType: toSharedGameType(room.gameType),
      roundCount: room.roundCount,
    };
  }

  // Relatorio "Competicao" (briefing secao 35): resultado oficial agregado de
  // uma sala ja encerrada (pode ter varias rodadas -- metricas por rodada
  // ficam em LiveRoomRoundResult, aqui so o total/posicao final que o podio
  // ja mostrou ao vivo).
  async getResults(
    user: AuthenticatedUser,
    roomId: string,
  ): Promise<RoomResultRow[]> {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: { include: { student: { select: { name: true } } } },
        roundResults: { select: { studentId: true } },
      },
    });
    if (!room) {
      throw new NotFoundException('Sala não encontrada.');
    }
    this.assertHostOrAdmin(user, room.hostUserId);

    const roundsByStudent = new Map<string, number>();
    for (const result of room.roundResults) {
      roundsByStudent.set(
        result.studentId,
        (roundsByStudent.get(result.studentId) ?? 0) + 1,
      );
    }

    return room.participants
      .sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity))
      .map((participant) => ({
        studentId: participant.studentId,
        studentName: participant.student.name,
        position: participant.position,
        totalPoints: participant.totalPoints,
        roundsCompleted: roundsByStudent.get(participant.studentId) ?? 0,
      }));
  }

  async listWorlds(): Promise<RoomWorldOption[]> {
    const worlds = await this.prisma.world.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { exercises: { where: { status: 'PUBLISHED' } } } },
      },
    });

    return worlds
      .filter((world) => world._count.exercises > 0)
      .map((world) => ({
        id: world.id,
        title: world.title,
        focus: world.focus,
        exerciseCount: world._count.exercises,
      }));
  }

  listGameTypes(): RoomGameOption[] {
    return ACTIVE_ROOM_GAME_TYPES.map((gameType) => ({ gameType }));
  }

  assertHostOrAdmin(user: AuthenticatedUser, hostUserId: string): void {
    if (user.id === hostUserId) return;
    if (user.role === Role.ADMIN || user.role === Role.SUPERADMIN) return;
    throw new ForbiddenException('Você não é o anfitrião desta sala.');
  }

  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateRoomCode();
      const existing = await this.prisma.liveRoom.findUnique({
        where: { code },
      });
      if (!existing) return code;
    }
    throw new ConflictException(
      'Não foi possível gerar um código único, tente novamente.',
    );
  }
}
