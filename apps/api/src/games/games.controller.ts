import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type {
  AuthenticatedUser,
  GameBest,
  GameScoreResult,
} from '@tt-digita/shared';
import { Role } from '@tt-digita/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { GamesService } from './games.service';
import { SubmitGameScoreDto } from './dto/submit-game-score.dto';

@Controller('games')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class GamesController {
  constructor(
    private readonly gamesService: GamesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('orbital/scores')
  async submitOrbital(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitGameScoreDto,
  ): Promise<GameScoreResult> {
    return this.gamesService.submitOrbitalScore(
      await this.studentId(user),
      dto,
    );
  }

  @Get('orbital/best')
  async orbitalBest(@CurrentUser() user: AuthenticatedUser): Promise<GameBest> {
    return this.gamesService.getOrbitalBest(await this.studentId(user));
  }

  @Post('robo/scores')
  async submitRobo(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitGameScoreDto,
  ): Promise<GameScoreResult> {
    return this.gamesService.submitRoboScore(await this.studentId(user), dto);
  }

  @Get('robo/best')
  async roboBest(@CurrentUser() user: AuthenticatedUser): Promise<GameBest> {
    return this.gamesService.getRoboBest(await this.studentId(user));
  }

  @Post('chuva/scores')
  async submitChuva(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitGameScoreDto,
  ): Promise<GameScoreResult> {
    return this.gamesService.submitChuvaScore(await this.studentId(user), dto);
  }

  @Get('chuva/best')
  async chuvaBest(@CurrentUser() user: AuthenticatedUser): Promise<GameBest> {
    return this.gamesService.getChuvaBest(await this.studentId(user));
  }

  @Post('defesa/scores')
  async submitDefesa(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitGameScoreDto,
  ): Promise<GameScoreResult> {
    return this.gamesService.submitDefesaScore(await this.studentId(user), dto);
  }

  @Get('defesa/best')
  async defesaBest(@CurrentUser() user: AuthenticatedUser): Promise<GameBest> {
    return this.gamesService.getDefesaBest(await this.studentId(user));
  }

  @Post('fruta/scores')
  async submitFruta(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitGameScoreDto,
  ): Promise<GameScoreResult> {
    return this.gamesService.submitFrutaScore(await this.studentId(user), dto);
  }

  @Get('fruta/best')
  async frutaBest(@CurrentUser() user: AuthenticatedUser): Promise<GameBest> {
    return this.gamesService.getFrutaBest(await this.studentId(user));
  }

  @Post('ritmo/scores')
  async submitRitmo(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitGameScoreDto,
  ): Promise<GameScoreResult> {
    return this.gamesService.submitRitmoScore(await this.studentId(user), dto);
  }

  @Get('ritmo/best')
  async ritmoBest(@CurrentUser() user: AuthenticatedUser): Promise<GameBest> {
    return this.gamesService.getRitmoBest(await this.studentId(user));
  }

  private async studentId(user: AuthenticatedUser): Promise<string> {
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { userId: user.id },
      select: { id: true },
    });
    return student.id;
  }
}
