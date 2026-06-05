import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelLeaveRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cancelledByLabel?: string;
}

