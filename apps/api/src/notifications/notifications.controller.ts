import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Sse, Query, MessageEvent, Delete } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsStreamService } from './notifications-stream.service';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly streamService: NotificationsStreamService,
    private readonly jwtService: JwtService
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req: any) {
    return this.notificationsService.getUserNotifications(req.user.userId);
  }

  // Fetch a threaded conversation tied to an employee's activity log
  @Get('conversation/:employeeId')
  @UseGuards(JwtAuthGuard)
  getConversation(@Param('employeeId') employeeId: string, @Request() req: any) {
    return this.notificationsService.getConversation(employeeId, req.user);
  }

  // Add a message to the employee-admin conversation and notify recipient
  @Post('conversation')
  @UseGuards(JwtAuthGuard)
  addConversationMessage(@Body() body: { employeeId: string; text: string }, @Request() req: any) {
    if (!body?.employeeId || !body?.text?.trim()) {
      return Promise.reject({ statusCode: 400, message: 'employeeId and text are required' });
    }
    return this.notificationsService.addConversationMessage(body.employeeId, req.user.userId, body.text.trim(), req.user);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  markAsRead(@Param('id') id: string, @Request() req: any) {
    // Ideally verify user owns notification
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.remove(id, req.user.userId);
  }

  // Server-Sent Events stream for push notifications
  @Sse('stream')
  stream(@Query('token') token?: string): Observable<MessageEvent> {
    if (!token) {
      // If no token, return an empty observable to avoid exposing anything
      return new Observable<MessageEvent>((subscriber) => subscriber.complete());
    }
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      return new Observable<MessageEvent>((subscriber) => subscriber.complete());
    }
    const userId: string = payload?.userId;
    const subject = this.streamService.getUserStream(userId);
    return subject.asObservable();
  }
}
