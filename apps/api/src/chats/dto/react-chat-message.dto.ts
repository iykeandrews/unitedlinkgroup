import { IsString, MinLength } from 'class-validator';

export class ReactChatMessageDto {
  @IsString()
  @MinLength(1)
  emoji!: string;
}

