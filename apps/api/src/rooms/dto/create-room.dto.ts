import { IsEnum, IsString, ValidateIf } from 'class-validator';
import { GameType, LiveRoomActivityType } from '@tt-digita/shared';

export class CreateRoomDto {
  @IsEnum(LiveRoomActivityType)
  activityType!: LiveRoomActivityType;

  @ValidateIf(
    (dto: CreateRoomDto) => dto.activityType === LiveRoomActivityType.WORLD,
  )
  @IsString()
  worldId?: string;

  @ValidateIf(
    (dto: CreateRoomDto) => dto.activityType === LiveRoomActivityType.GAME,
  )
  @IsEnum(GameType)
  gameType?: GameType;
}
