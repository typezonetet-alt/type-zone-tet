import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { LiveRoomStatus as PrismaLiveRoomStatus } from '@prisma/client';
import type {
  AuthenticatedUser,
  CreateRoomPayload,
  RoomExerciseOption,
  RoomSummary,
} from '@tt-digita/shared';
import { LiveRoomStatus, Role } from '@tt-digita/shared';
import { PrismaService } from '../prisma/prisma.service';
import { generateRoomCode } from '../common/credentials.util';

function toSharedStatus(status: PrismaLiveRoomStatus): LiveRoomStatus {
  return status as unknown as LiveRoomStatus;
}

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateRoomPayload,
  ): Promise<RoomSummary> {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: dto.exerciseId },
    });
    if (!exercise || exercise.status !== 'PUBLISHED') {
      throw new NotFoundException('Exercício não encontrado.');
    }

    const code = await this.uniqueCode();

    const room = await this.prisma.liveRoom.create({
      data: { code, exerciseId: exercise.id, hostUserId: user.id },
    });

    return {
      id: room.id,
      code: room.code,
      status: toSharedStatus(room.status),
      exerciseId: exercise.id,
      exerciseTitle: exercise.title,
    };
  }

  async getForHostOrAdmin(
    user: AuthenticatedUser,
    roomId: string,
  ): Promise<RoomSummary> {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      include: { exercise: true },
    });
    if (!room) {
      throw new NotFoundException('Sala não encontrada.');
    }
    this.assertHostOrAdmin(user, room.hostUserId);

    return {
      id: room.id,
      code: room.code,
      status: toSharedStatus(room.status),
      exerciseId: room.exerciseId,
      exerciseTitle: room.exercise.title,
    };
  }

  async listExercises(): Promise<RoomExerciseOption[]> {
    const exercises = await this.prisma.exercise.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ world: { order: 'asc' } }, { order: 'asc' }],
      include: { world: true },
    });

    return exercises.map((exercise) => ({
      id: exercise.id,
      title: exercise.title,
      worldTitle: exercise.world.title,
    }));
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
