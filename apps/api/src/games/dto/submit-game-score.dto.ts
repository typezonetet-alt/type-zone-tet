import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class SubmitGameScoreDto {
  @IsInt()
  @Min(0)
  score!: number;

  @IsInt()
  @Min(0)
  wordsCompleted!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  accuracy!: number;

  @IsInt()
  @Min(1)
  durationMs!: number;
}
