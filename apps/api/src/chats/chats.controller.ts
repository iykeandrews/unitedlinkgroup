import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ChatsService } from './chats.service';
import { AddChatGroupMemberDto } from './dto/add-chat-group-member.dto';
import { CreateDirectThreadDto } from './dto/create-direct-thread.dto';
import { CreateGroupThreadDto } from './dto/create-group-thread.dto';
import { EditChatMessageDto } from './dto/edit-chat-message.dto';
import { ReactChatMessageDto } from './dto/react-chat-message.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';

@Controller('chats')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get('threads')
  listThreads(@Request() req: any, @Headers('x-business-id') headerBusinessId?: string) {
    return this.chatsService.listThreads(req.user, headerBusinessId);
  }

  @Post('threads/direct')
  createDirect(@Request() req: any, @Headers('x-business-id') headerBusinessId: string | undefined, @Body() dto: CreateDirectThreadDto) {
    return this.chatsService.createDirectThread(req.user, headerBusinessId, dto.employeeId);
  }

  @Post('threads/support')
  createSupport(@Request() req: any, @Headers('x-business-id') headerBusinessId: string | undefined) {
    return this.chatsService.createSupportThread(req.user, headerBusinessId);
  }

  @Post('threads/group')
  createGroup(@Request() req: any, @Headers('x-business-id') headerBusinessId: string | undefined, @Body() dto: CreateGroupThreadDto) {
    return this.chatsService.createGroupThread(req.user, headerBusinessId, dto);
  }

  @Get('threads/:threadId')
  getThread(@Request() req: any, @Headers('x-business-id') headerBusinessId: string | undefined, @Param('threadId') threadId: string) {
    return this.chatsService.getThread(req.user, headerBusinessId, threadId);
  }

  @Patch('threads/:threadId')
  updateThread(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId: string | undefined,
    @Param('threadId') threadId: string,
    @Body() dto: UpdateThreadDto
  ) {
    return this.chatsService.updateThread(req.user, headerBusinessId, threadId, dto);
  }

  @Post('threads/:threadId/members')
  addMember(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId: string | undefined,
    @Param('threadId') threadId: string,
    @Body() dto: AddChatGroupMemberDto
  ) {
    return this.chatsService.addMember(req.user, headerBusinessId, threadId, dto.employeeId);
  }

  @Delete('threads/:threadId/members/:employeeId')
  removeMember(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId: string | undefined,
    @Param('threadId') threadId: string,
    @Param('employeeId') employeeId: string
  ) {
    return this.chatsService.removeMember(req.user, headerBusinessId, threadId, employeeId);
  }

  @Get('threads/:threadId/messages')
  listMessages(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId: string | undefined,
    @Param('threadId') threadId: string,
    @Query('before') before?: string,
    @Query('take') take?: string
  ) {
    const parsedTake = take ? parseInt(take, 10) : undefined;
    return this.chatsService.listMessages(req.user, headerBusinessId, threadId, before, parsedTake);
  }

  @Post('threads/:threadId/messages')
  sendMessage(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId: string | undefined,
    @Param('threadId') threadId: string,
    @Body() dto: SendChatMessageDto
  ) {
    return this.chatsService.sendMessage(req.user, headerBusinessId, threadId, dto);
  }

  @Post('threads/:threadId/read')
  markRead(@Request() req: any, @Headers('x-business-id') headerBusinessId: string | undefined, @Param('threadId') threadId: string) {
    return this.chatsService.markRead(req.user, headerBusinessId, threadId);
  }

  @Patch('messages/:messageId')
  editMessage(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId: string | undefined,
    @Param('messageId') messageId: string,
    @Body() dto: EditChatMessageDto
  ) {
    return this.chatsService.editMessage(req.user, headerBusinessId, messageId, dto);
  }

  @Delete('messages/:messageId')
  deleteMessage(@Request() req: any, @Headers('x-business-id') headerBusinessId: string | undefined, @Param('messageId') messageId: string) {
    return this.chatsService.deleteMessage(req.user, headerBusinessId, messageId);
  }

  @Post('messages/:messageId/reactions')
  addReaction(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId: string | undefined,
    @Param('messageId') messageId: string,
    @Body() dto: ReactChatMessageDto
  ) {
    return this.chatsService.addReaction(req.user, headerBusinessId, messageId, dto.emoji);
  }

  @Delete('messages/:messageId/reactions')
  removeReaction(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId: string | undefined,
    @Param('messageId') messageId: string,
    @Query('emoji') emoji?: string
  ) {
    return this.chatsService.removeReaction(req.user, headerBusinessId, messageId, emoji);
  }

  @Get('groups')
  listGroupsCompat(@Request() req: any, @Headers('x-business-id') headerBusinessId?: string) {
    return this.chatsService.listThreads(req.user, headerBusinessId, { type: 'GROUP' });
  }
}
