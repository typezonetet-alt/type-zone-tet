import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type {
  AuthenticatedUser,
  LeaderboardEntry,
  PracticeFrequencyRow,
  StudentEvolutionRow,
  TrailCompletionRow,
} from '@tt-digita/shared';
import { Role } from '@tt-digita/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CsvColumn, toCsv } from './csv.util';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@Controller('classes/:classId/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.ADMIN, Role.SUPERADMIN)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('practice-frequency')
  async practiceFrequency(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classId') classId: string,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PracticeFrequencyRow[] | void> {
    const rows = await this.reports.practiceFrequency(user, classId, query);
    return this.respond(res, query, rows, 'frequencia-pratica.csv', [
      { key: 'studentName', header: 'Aluno' },
      { key: 'daysActive', header: 'Dias ativos' },
      { key: 'totalMinutes', header: 'Minutos totais' },
      { key: 'avgMinutesPerActiveDay', header: 'Média min/dia ativo' },
    ]);
  }

  @Get('trail-completion')
  async trailCompletion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classId') classId: string,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TrailCompletionRow[] | void> {
    const rows = await this.reports.trailCompletion(user, classId);
    return this.respond(res, query, rows, 'conclusao-trilha.csv', [
      { key: 'studentName', header: 'Aluno' },
      { key: 'worldTitle', header: 'Mundo' },
      { key: 'exerciseTitle', header: 'Exercício' },
      { key: 'attempted', header: 'Tentou' },
      { key: 'passed', header: 'Concluiu' },
      { key: 'bestAccuracy', header: 'Melhor precisão' },
      { key: 'bestWpmNet', header: 'Melhor PPM' },
    ]);
  }

  @Get('students/:studentId/evolution')
  async studentEvolution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StudentEvolutionRow[] | void> {
    const rows = await this.reports.studentEvolution(
      user,
      classId,
      studentId,
      query,
    );
    return this.respond(res, query, rows, 'evolucao-aluno.csv', [
      { key: 'date', header: 'Data' },
      { key: 'worldTitle', header: 'Mundo' },
      { key: 'exerciseTitle', header: 'Exercício' },
      { key: 'accuracy', header: 'Precisão' },
      { key: 'wpmNet', header: 'PPM líquido' },
      { key: 'passed', header: 'Passou' },
    ]);
  }

  @Get('season-ranking')
  async seasonRanking(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classId') classId: string,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LeaderboardEntry[] | void> {
    const rows = await this.reports.seasonRanking(user, classId);
    return this.respond(res, query, rows, 'ranking-temporada.csv', [
      { key: 'rank', header: 'Posição' },
      { key: 'name', header: 'Aluno' },
      { key: 'league', header: 'Liga' },
      { key: 'points', header: 'Pontos' },
    ]);
  }

  private respond<T extends object>(
    res: Response,
    query: ReportQueryDto,
    rows: T[],
    filename: string,
    columns: CsvColumn<T>[],
  ): T[] | void {
    if (query.format !== 'csv') {
      return rows;
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(toCsv(rows, columns));
  }
}
