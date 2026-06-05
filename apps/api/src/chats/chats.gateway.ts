import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma.service';
import { UserRole } from '@unitedlinkgroup/types';
import { ChatsService } from './chats.service';

type PresenceState = { count: number; lastSeenAt: Date | null; businessId: string };

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private presence = new Map<string, PresenceState>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private chatsService: ChatsService
  ) {}

  private getToken(client: Socket) {
    const authToken = (client.handshake.auth as any)?.token;
    if (typeof authToken === 'string' && authToken) return authToken;

    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) return header.slice('Bearer '.length);

    const queryToken = (client.handshake.query as any)?.token;
    if (typeof queryToken === 'string' && queryToken) return queryToken;

    return null;
  }

  private isAdmin(role: string | null | undefined) {
    return role === UserRole.SUPER_ADMIN || role === UserRole.BUSINESS_ADMIN;
  }

  private async ensureEmployeeForUser(userId: string, businessId: string, role: string | undefined) {
    const existing = await this.prisma.employee.findFirst({ where: { userId, businessId }, select: { id: true, businessId: true } });
    if (existing) return existing;
    if (!this.isAdmin(role)) return null;

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, firstName: true, lastName: true, role: true } });
    if (!user) return null;

    const created = await this.prisma.employee.create({
      data: {
        firstName: user.firstName || 'Admin',
        lastName: user.lastName || 'User',
        email: user.email,
        businessId,
        userId: user.id,
        role: user.role === UserRole.SUPER_ADMIN ? UserRole.BUSINESS_ADMIN : user.role,
        type: 'FULL_TIME',
        payType: 'SALARY',
        status: 'ACTIVE',
      } as any,
      select: { id: true, businessId: true },
    });
    return created;
  }

  private businessRoom(businessId: string) {
    return `business:${businessId}`;
  }

  private threadRoom(threadId: string) {
    return `thread:${threadId}`;
  }

  private emitPresenceSnapshot(client: Socket, businessId: string) {
    const snapshot = Array.from(this.presence.entries())
      .filter(([, state]) => state.businessId === businessId)
      .map(([employeeId, state]) => ({
        employeeId,
        online: state.count > 0,
        lastSeenAt: state.lastSeenAt,
      }));
    client.emit('presence:snapshot', snapshot);
  }

  private emitPresence(businessId: string, employeeId: string, online: boolean, lastSeenAt: Date | null) {
    this.server.to(this.businessRoom(businessId)).emit('presence:update', {
      employeeId,
      online,
      lastSeenAt,
    });
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.getToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }

      const decoded: any = await this.jwtService.verifyAsync(token, { secret: this.configService.get<string>('JWT_SECRET') });
      const userId = decoded?.sub;
      const role = decoded?.role;
      const businessIdFromToken = decoded?.businessId as string | undefined;
      const businessIdFromClient = (client.handshake.auth as any)?.businessId as string | undefined;

      let employee = null as any;
      if (userId) {
        employee = await this.prisma.employee.findFirst({
          where: { userId, ...(businessIdFromToken ? { businessId: businessIdFromToken } : {}) },
          select: { id: true, businessId: true },
        });
      }

      const businessId = businessIdFromToken || businessIdFromClient || employee?.businessId;
      if (!businessId) {
        client.disconnect(true);
        return;
      }

      if (userId && !employee?.id) {
        employee = await this.ensureEmployeeForUser(userId, businessId, role);
      }

      client.data.userId = userId;
      client.data.role = role;
      client.data.businessId = businessId;
      client.data.employeeId = employee?.id || null;

      await client.join(this.businessRoom(businessId));

      if (employee?.id) {
        const state = this.presence.get(employee.id) || { count: 0, lastSeenAt: null, businessId };
        state.count += 1;
        state.lastSeenAt = null;
        state.businessId = businessId;
        this.presence.set(employee.id, state);
        this.emitPresence(businessId, employee.id, true, null);
      }

      this.emitPresenceSnapshot(client, businessId);
      client.emit('socket:ready', {
        businessId,
        employeeId: employee?.id || null,
        role,
      });
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const businessId = client.data?.businessId as string | undefined;
    const employeeId = client.data?.employeeId as string | undefined;
    if (!businessId || !employeeId) return;

    const state = this.presence.get(employeeId) || { count: 0, lastSeenAt: null, businessId };
    state.count = Math.max(0, state.count - 1);
    if (state.count === 0) {
      state.lastSeenAt = new Date();
      state.businessId = businessId;
      this.presence.set(employeeId, state);
      this.emitPresence(businessId, employeeId, false, state.lastSeenAt);
    } else {
      state.businessId = businessId;
      this.presence.set(employeeId, state);
    }
  }

  private async assertThreadAccess(client: Socket, threadId: string) {
    const businessId = client.data?.businessId as string | undefined;
    if (!businessId) throw new ForbiddenException();

    const thread = await this.prisma.chatThread.findFirst({
      where: { id: threadId, businessId },
      select: { id: true, businessId: true, type: true },
    });
    if (!thread) throw new ForbiddenException();

    const employeeId = client.data?.employeeId as string | undefined;
    if (!employeeId) throw new ForbiddenException();

    const member = await this.prisma.chatParticipant.findFirst({ where: { threadId, employeeId }, select: { id: true } });
    if (!member) throw new ForbiddenException();
  }

  @SubscribeMessage('thread:join')
  async onJoin(client: Socket, payload: { threadId: string }) {
    const threadId = String(payload?.threadId || '');
    if (!threadId) return;
    await this.assertThreadAccess(client, threadId);
    await client.join(this.threadRoom(threadId));
    client.emit('thread:joined', { threadId });
  }

  @SubscribeMessage('thread:leave')
  async onLeave(client: Socket, payload: { threadId: string }) {
    const threadId = String(payload?.threadId || '');
    if (!threadId) return;
    await client.leave(this.threadRoom(threadId));
    client.emit('thread:left', { threadId });
  }

  @SubscribeMessage('typing:start')
  async onTypingStart(client: Socket, payload: { threadId: string }) {
    const threadId = String(payload?.threadId || '');
    if (!threadId) return;
    await this.assertThreadAccess(client, threadId);
    const employeeId = client.data?.employeeId as string | undefined;
    if (!employeeId) return;
    client.to(this.threadRoom(threadId)).emit('typing:update', { threadId, employeeId, typing: true });
  }

  @SubscribeMessage('typing:stop')
  async onTypingStop(client: Socket, payload: { threadId: string }) {
    const threadId = String(payload?.threadId || '');
    if (!threadId) return;
    await this.assertThreadAccess(client, threadId);
    const employeeId = client.data?.employeeId as string | undefined;
    if (!employeeId) return;
    client.to(this.threadRoom(threadId)).emit('typing:update', { threadId, employeeId, typing: false });
  }

  @SubscribeMessage('read:mark')
  async onReadMark(client: Socket, payload: { threadId: string }) {
    const threadId = String(payload?.threadId || '');
    if (!threadId) return;
    await this.assertThreadAccess(client, threadId);
    const employeeId = client.data?.employeeId as string | undefined;
    if (!employeeId) return;

    const lastReadAt = new Date();
    await this.prisma.chatParticipant.upsert({
      where: { threadId_employeeId: { threadId, employeeId } },
      update: { lastReadAt },
      create: { threadId, employeeId, lastReadAt, role: 'MEMBER' },
    });

    const userId = client.data?.userId as string | undefined;
    if (userId) {
      const threadIdNeedle = `"threadId":"${threadId}"`;
      await this.prisma.notification.updateMany({
        where: { userId, type: 'CHAT', read: false, metadata: { contains: threadIdNeedle } },
        data: { read: true },
      });
    }

    this.server.to(this.threadRoom(threadId)).emit('read:update', { threadId, employeeId, lastReadAt });
  }

  @SubscribeMessage('message:send')
  async onMessageSend(
    client: Socket,
    payload: { threadId: string; clientId?: string; text?: string; replyToId?: string; attachments?: any[] }
  ) {
    const threadId = String(payload?.threadId || '');
    if (!threadId) return;
    await this.assertThreadAccess(client, threadId);

    const businessId = client.data?.businessId as string | undefined;
    const employeeId = client.data?.employeeId as string | undefined;
    if (!businessId || !employeeId) throw new ForbiddenException();

    const text = String(payload?.text || '').trim();
    const attachments = Array.isArray(payload?.attachments) ? payload.attachments : [];
    if (!text && attachments.length === 0) return;

    if (payload?.replyToId) {
      const reply = await this.prisma.chatMessage.findFirst({ where: { id: payload.replyToId, threadId } });
      if (!reply) return;
    }

    const msg = await this.prisma.chatMessage.create({
      data: {
        threadId,
        senderEmployeeId: employeeId,
        text: text || null,
        replyToId: payload.replyToId || null,
        attachments: {
          create: attachments.map((a: any) => ({
            type: a.type,
            url: a.url,
            filename: a.filename || null,
            originalName: a.originalName || null,
            mimeType: a.mimeType || null,
            size: typeof a.size === 'number' ? a.size : null,
          })),
        },
      },
      include: {
        senderEmployee: { select: { id: true, firstName: true, lastName: true } },
        attachments: true,
        reactions: true,
        replyTo: { include: { senderEmployee: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    await this.prisma.chatThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });

    await this.chatsService.notifyNewChatMessage({
      businessId,
      threadId,
      messageId: msg.id,
      senderEmployeeId: msg.senderEmployeeId,
      senderName: `${msg.senderEmployee?.firstName || ''} ${msg.senderEmployee?.lastName || ''}`.trim(),
      text: msg.text,
      hasAttachments: (msg.attachments || []).length > 0,
    });

    const event = {
      id: msg.id,
      threadId: msg.threadId,
      senderEmployeeId: msg.senderEmployeeId,
      senderName: `${msg.senderEmployee?.firstName || ''} ${msg.senderEmployee?.lastName || ''}`.trim(),
      text: msg.text,
      createdAt: msg.createdAt,
      editedAt: msg.editedAt,
      deletedAt: msg.deletedAt,
      replyTo: msg.replyTo
        ? {
            id: msg.replyTo.id,
            senderEmployeeId: msg.replyTo.senderEmployeeId,
            senderName: `${msg.replyTo.senderEmployee?.firstName || ''} ${msg.replyTo.senderEmployee?.lastName || ''}`.trim(),
            text: msg.replyTo.deletedAt ? null : msg.replyTo.text,
          }
        : null,
      attachments: (msg.attachments || []).map((a: any) => ({
        id: a.id,
        type: a.type,
        url: a.url,
        filename: a.filename,
        originalName: a.originalName,
        mimeType: a.mimeType,
        size: a.size,
      })),
      reactions: [],
      clientId: payload?.clientId || null,
    };

    this.server.to(this.threadRoom(threadId)).emit('message:new', event);
    client.emit('message:ack', { threadId, clientId: payload?.clientId || null, messageId: msg.id, createdAt: msg.createdAt });
  }

  private async assertMessagePermission(client: Socket, messageId: string) {
    const businessId = client.data?.businessId as string | undefined;
    if (!businessId) throw new ForbiddenException();

    const msg = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, thread: { businessId } },
      include: { thread: true },
    });
    if (!msg) throw new ForbiddenException();

    await this.assertThreadAccess(client, msg.threadId);

    const employeeId = client.data?.employeeId as string | undefined;
    if (!employeeId) throw new ForbiddenException();
    if (msg.senderEmployeeId === employeeId) return msg;

    const participant = await this.prisma.chatParticipant.findFirst({ where: { threadId: msg.threadId, employeeId }, select: { role: true } });
    if (participant?.role === 'ADMIN') return msg;

    throw new ForbiddenException();
  }

  @SubscribeMessage('message:edit')
  async onMessageEdit(client: Socket, payload: { messageId: string; text: string }) {
    const messageId = String(payload?.messageId || '');
    const text = String(payload?.text || '').trim();
    if (!messageId || !text) return;

    const msg = await this.assertMessagePermission(client, messageId);
    if (msg.deletedAt) return;
    if (Date.now() - new Date(msg.createdAt).getTime() > 30 * 60 * 1000) {
      throw new BadRequestException('Messages cannot be edited after 30 minutes');
    }
    const replyExists = await this.prisma.chatMessage.findFirst({
      where: { replyToId: messageId, deletedAt: null },
      select: { id: true },
    });
    if (replyExists) {
      throw new BadRequestException('Messages cannot be edited after a reply');
    }

    const updated = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { text, editedAt: new Date() },
      include: {
        senderEmployee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    this.server.to(this.threadRoom(updated.threadId)).emit('message:updated', {
      messageId: updated.id,
      threadId: updated.threadId,
      text: updated.text,
      editedAt: updated.editedAt,
    });
  }

  @SubscribeMessage('message:delete')
  async onMessageDelete(client: Socket, payload: { messageId: string }) {
    const messageId = String(payload?.messageId || '');
    if (!messageId) return;

    const msg = await this.assertMessagePermission(client, messageId);
    if (msg.deletedAt) return;

    await this.prisma.chatAttachment.deleteMany({ where: { messageId } });
    await this.prisma.chatReaction.deleteMany({ where: { messageId } });
    const deleted = await this.prisma.chatMessage.update({ where: { id: messageId }, data: { deletedAt: new Date(), text: null } });

    this.server.to(this.threadRoom(deleted.threadId)).emit('message:deleted', {
      messageId: deleted.id,
      threadId: deleted.threadId,
      deletedAt: deleted.deletedAt,
    });
  }

  @SubscribeMessage('reaction:toggle')
  async onReactionToggle(client: Socket, payload: { messageId: string; emoji: string }) {
    const messageId = String(payload?.messageId || '');
    const emoji = String(payload?.emoji || '').trim();
    if (!messageId || !emoji) return;

    const msg = await this.assertMessagePermission(client, messageId);
    const employeeId = client.data?.employeeId as string | undefined;
    if (!employeeId) return;

    const existing = await this.prisma.chatReaction.findFirst({ where: { messageId, employeeId, emoji } });
    if (existing) {
      await this.prisma.chatReaction.deleteMany({ where: { messageId, employeeId, emoji } });
    } else {
      await this.prisma.chatReaction.create({ data: { messageId, employeeId, emoji } });
    }

    const reactions = await this.prisma.chatReaction.findMany({
      where: { messageId },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
    });

    this.server.to(this.threadRoom(msg.threadId)).emit('reactions:updated', {
      messageId,
      threadId: msg.threadId,
      reactions: reactions.map((r: any) => ({
        id: r.id,
        emoji: r.emoji,
        employeeId: r.employeeId,
        employeeName: `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim(),
      })),
    });
  }
}
