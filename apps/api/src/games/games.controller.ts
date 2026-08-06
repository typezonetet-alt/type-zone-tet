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

@Controller('games/orbital')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class GamesController {
  constructor(
    private readonly gamesService: GamesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('scores')
  async submitScore(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitGameScoreDto,
  ): Promise<GameScoreResult> {
    const studentId = await this.studentId(user);
    return this.gamesService.submitOrbitalScore(studentId, dto);
  }

  @Get('best')
  async getBest(@CurrentUser() user: AuthenticatedUser): Promise<GameBest> {
    const studentId = await this.studentId(user);
    return this.gamesService.getOrbitalBest(studentId);
  }

  private async studentId(user: AuthenticatedUser): Promise<string> {
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { userId: user.id },
      select: { id: true },
    });
    return student.id;
  }
}
