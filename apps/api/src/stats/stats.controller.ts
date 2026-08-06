import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser, WeakKey } from '@tt-digita/shared';
import { Role } from '@tt-digita/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from './stats.service';

@Controller('stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('weak-keys')
  async weakKeys(@CurrentUser() user: AuthenticatedUser): Promise<WeakKey[]> {
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { userId: user.id },
      select: { id: true },
    });
    return this.statsService.getWeakKeys(student.id);
  }
}
