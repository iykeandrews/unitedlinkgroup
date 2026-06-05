import { IsOptional, IsString, MinLength } from 'class-validator';

export class EditChatMessageDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  text?: string;
}

