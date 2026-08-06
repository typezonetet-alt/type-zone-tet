import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type {
  AuthenticatedUser,
  RoomExerciseOption,
  RoomSummary,
} from '@tt-digita/shared';
import { Role } from '@tt-digita/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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

  @Get('exercises')
  listExercises(): Promise<RoomExerciseOption[]> {
    return this.roomsService.listExercises();
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<RoomSummary> {
    return this.roomsService.getForHostOrAdmin(user, id);
  }
}
