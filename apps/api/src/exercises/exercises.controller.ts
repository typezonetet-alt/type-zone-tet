import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type {
  AdaptiveSessionItem,
  AuthenticatedUser,
  ExerciseDetail,
  ExerciseSummary,
} from '@tt-digita/shared';
import { Role } from '@tt-digita/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ExercisesService } from './exercises.service';
import { AdaptiveSessionService } from './adaptive-session.service';

@Controller('exercises')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class ExercisesController {
  constructor(
    private readonly exercisesService: ExercisesService,
    private readonly adaptiveSessionService: AdaptiveSessionService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExerciseSummary[]> {
    const studentId = await this.studentId(user);
    return this.exercisesService.listForStudent(studentId);
  }

  // Precisa vir antes de ':id' -- senao o Nest casaria "/exercises/session"
  // com a rota parametrizada abaixo e trataria "session" como um id.
  @Get('session')
  async session(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdaptiveSessionItem[]> {
    const studentId = await this.studentId(user);
    return this.adaptiveSessionService.buildSession(studentId);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ExerciseDetail> {
    const studentId = await this.studentId(user);
    return this.exercisesService.getForStudent(studentId, id);
  }

  private async studentId(user: AuthenticatedUser): Promise<string> {
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { userId: user.id },
      select: { id: true },
    });
    return student.id;
  }
}
