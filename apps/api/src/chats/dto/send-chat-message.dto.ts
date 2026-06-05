import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, MinLength, ValidateNested } from 'class-validator';

class ChatAttachmentDto {
  @IsIn(['IMAGE', 'VIDEO', 'FILE'])
  type!: string;

  @IsString()
  @Matches(/^(https?:\/\/.+|\/uploads\/.+)$/, { message: 'attachment url must be an absolute URL or /uploads/... path' })
  url!: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsString()
  originalName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsInt()
  size?: number;
}

export class SendChatMessageDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  text?: string;

  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments?: ChatAttachmentDto[];
}
