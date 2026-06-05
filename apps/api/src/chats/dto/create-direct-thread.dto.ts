import { IsUUID } from 'class-validator';

export class CreateDirectThreadDto {
  @IsUUID()
  employeeId!: string;
}

