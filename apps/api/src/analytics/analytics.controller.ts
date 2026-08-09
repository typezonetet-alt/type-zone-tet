import { Controller, Get, UseGuards } from '@nestjs/common';
import type { ProductAnalytics } from '@tt-digita/shared';
import { Role } from '@tt-digita/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERADMIN)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  get(): Promise<ProductAnalytics> {
    return this.analytics.getProductAnalytics();
  }
}
