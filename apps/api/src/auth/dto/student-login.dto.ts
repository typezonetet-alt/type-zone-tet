import { IsString, MinLength } from 'class-validator';

export class StudentLoginDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
