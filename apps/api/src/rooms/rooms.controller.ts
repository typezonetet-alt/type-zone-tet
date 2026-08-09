import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type {
  AuthenticatedUser,
  RoomGameOption,
  RoomResultRow,
  RoomSummary,
  RoomWorldOption,
} from '@tt-digita/shared';
import { Role } from '@tt-digita/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toCsv } from '../reports/csv.util';
import { ReportQueryDto } from '../reports/dto/report-query.dto';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.ADMIN, Role.SUPERADMIN)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoomDto,
  ): Promise<RoomSummary> {
    return this.roomsService.create(user, dto);
  }

  @Get('worlds')
  listWorlds(): Promise<RoomWorldOption[]> {
    return this.roomsService.listWorlds();
  }

  @Get('games')
  listGameTypes(): RoomGameOption[] {
    return this.roomsService.listGameTypes();
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<RoomSummary> {
    return this.roomsService.getForHostOrAdmin(user, id);
  }

  @Get(':id/results')
  async results(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RoomResultRow[] | void> {
    const rows = await this.roomsService.getResults(user, id);
    if (query.format !== 'csv') return rows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="resultado-sala.csv"',
    );
    res.send(
      toCsv(rows, [
        { key: 'position', header: 'Posição' },
        { key: 'studentName', header: 'Aluno' },
        { key: 'totalPoints', header: 'Pontos' },
        { key: 'roundsCompleted', header: 'Rodadas concluídas' },
      ]),
    );
  }
}
