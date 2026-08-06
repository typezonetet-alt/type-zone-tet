import { IsString, MinLength } from 'class-validator';

export class AddMemberDto {
  @IsString()
  @MinLength(3)
  code!: string;
}
