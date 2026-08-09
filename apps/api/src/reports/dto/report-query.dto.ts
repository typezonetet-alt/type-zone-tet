import { IsIn, IsISO8601, IsOptional } from 'class-validator';
import type { ReportFormat } from '@tt-digita/shared';

export class ReportQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsIn(['json', 'csv'])
  format?: ReportFormat;
}
