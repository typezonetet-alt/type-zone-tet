import { Injectable } from '@nestjs/common';
import type { WorldSummary } from '@tt-digita/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorldsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<WorldSummary[]> {
    const worlds = await this.prisma.world.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { exercises: { where: { status: 'PUBLISHED' } } } },
      },
    });

    return worlds.map((world) => ({
      id: world.id,
      title: world.title,
      focus: world.focus,
      order: world.order,
      hasContent: world._count.exercises > 0,
    }));
  }
}
