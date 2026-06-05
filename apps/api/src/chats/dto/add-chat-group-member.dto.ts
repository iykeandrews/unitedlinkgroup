import { IsUUID } from 'class-validator';

export class AddChatGroupMemberDto {
  @IsUUID()
  employeeId!: string;
}

