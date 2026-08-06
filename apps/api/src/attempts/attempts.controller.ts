import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { AttemptResult, AuthenticatedUser } from '@tt-digita/shared';
import { Role } from '@tt-digita/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AttemptsService } from './attempts.service';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Controller('attempts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class AttemptsController {
  constructor(
    private readonly attemptsService: AttemptsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitAttemptDto,
  ): Promise<AttemptResult> {
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { userId: user.id },
      select: { id: true },
    });
    return this.attemptsService.submit(student.id, dto);
  }
}
