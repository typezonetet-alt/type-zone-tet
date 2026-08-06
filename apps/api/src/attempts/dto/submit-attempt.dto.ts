import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CharStatDto {
  @IsString()
  @MinLength(1)
  char!: string;

  @IsInt()
  @Min(0)
  attempts!: number;

  @IsInt()
  @Min(0)
  errors!: number;
}

export class SubmitAttemptDto {
  @IsString()
  exerciseId!: string;

  @IsNumber()
  @IsPositive()
  durationMs!: number;

  @IsInt()
  @Min(0)
  expectedChars!: number;

  @IsInt()
  @Min(0)
  typedChars!: number;

  @IsInt()
  @Min(0)
  correctChars!: number;

  @IsInt()
  @Min(0)
  incorrectChars!: number;

  @IsInt()
  @Min(0)
  backspaces!: number;

  @IsArray()
  @IsNumber({}, { each: true })
  charsPerSecondBuckets!: number[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharStatDto)
  charStats!: CharStatDto[];
}
