import { IsArray, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateChatGroupDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  memberEmployeeIds?: string[];
}

