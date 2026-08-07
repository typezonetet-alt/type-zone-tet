import { IsIn, IsOptional } from 'class-validator';
import type { LeaderboardScope } from '@tt-digita/shared';

export class LeaderboardQueryDto {
  @IsOptional()
  @IsIn(['geral', 'turma'])
  scope?: LeaderboardScope;
}
