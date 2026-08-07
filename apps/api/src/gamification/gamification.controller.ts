import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type {
  AchievementView,
  AuthenticatedUser,
  CosmeticView,
  LeaderboardEntry,
  MissionView,
  ProfileView,
  SeasonView,
} from '@tt-digita/shared';
import { Role } from '@tt-digita/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from './gamification.service';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';

@Controller('gamification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class GamificationController {
  constructor(
    private readonly gamification: GamificationService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('profile')
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProfileView> {
    return this.gamification.getProfileView(await this.studentId(user));
  }

  @Get('missions')
  async getMissions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MissionView[]> {
    return this.gamification.getMissionsView(await this.studentId(user));
  }

  @Get('achievements')
  async getAchievements(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AchievementView[]> {
    return this.gamification.getAchievementsView(await this.studentId(user));
  }

  @Get('cosmetics')
  async getCosmetics(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CosmeticView[]> {
    return this.gamification.getCosmeticsView(await this.studentId(user));
  }

  @Post('cosmetics/:id/purchase')
  async purchase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CosmeticView[]> {
    return this.gamification.purchaseCosmetic(await this.studentId(user), id);
  }

  @Post('cosmetics/:id/equip')
  async equip(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CosmeticView[]> {
    return this.gamification.equipCosmetic(await this.studentId(user), id);
  }

  @Get('season')
  async getSeason(@CurrentUser() user: AuthenticatedUser): Promise<SeasonView> {
    return this.gamification.getSeasonView(await this.studentId(user));
  }

  @Get('leaderboard')
  async getLeaderboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LeaderboardQueryDto,
  ): Promise<LeaderboardEntry[]> {
    const studentId = await this.studentId(user);
    return this.gamification.getLeaderboard(studentId, query.scope ?? 'geral');
  }

  private async studentId(user: AuthenticatedUser): Promise<string> {
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { userId: user.id },
      select: { id: true },
    });
    return student.id;
  }
}
