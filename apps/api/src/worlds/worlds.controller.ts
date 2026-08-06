import { Controller, Get, UseGuards } from '@nestjs/common';
import type { WorldSummary } from '@tt-digita/shared';
import { Role } from '@tt-digita/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WorldsService } from './worlds.service';

@Controller('worlds')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class WorldsController {
  constructor(private readonly worldsService: WorldsService) {}

  @Get()
  list(): Promise<WorldSummary[]> {
    return this.worldsService.list();
  }
}
