import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
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

  afterInit(server: Server) {
    this.chatsService.realtime = async (event, payload) => {
      if (event === 'member:removed') {
        server.to(`employee:${payload.employeeId}`).emit(event, payload);
        await server.in(`employee:${payload.employeeId}`).socketsLeave(this.threadRoom(payload.threadId));
        return;
      }
      server.to(this.threadRoom(payload.threadId)).emit(event, payload);
      if (event === 'message:new') {
        const members = await this.prisma.chatParticipant.findMany({where: {threadId: payload.threadId}, select: {employeeId: true}});
        server.to(members.map(m => `employee:${m.employeeId}`)).emit('thread:activity', {threadId: payload.threadId});
      }
    };
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

      if (!userId) { client.disconnect(true); return; }
      const identity = await this.chatsService.resolveSocketIdentity({userId, role}, businessIdFromClient || businessIdFromToken);
      const {businessId} = identity;
      const employee = {id: identity.employeeId};
      client.data.userId = userId;
      client.data.role = role;
      client.data.businessId = businessId;
      client.data.employeeId = employee?.id || null;

      await client.join(this.businessRoom(businessId));
      await client.join(`employee:${employee.id}`);

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

  private async perform(client: Socket, action: () => Promise<any>) {
    try { return await action(); }
    catch (error: any) {
      const message = typeof error?.getResponse === 'function' ? error.message : 'Unable to complete chat action';
      client.emit('chat:error', {message});
      return {ok: false, message};
    }
  }

  private actor(client: Socket) { return {userId: client.data.userId, role: client.data.role}; }

  @SubscribeMessage('read:mark')
  onReadMark(client: Socket, payload: {threadId: string}) {
    return this.perform(client, () => this.chatsService.markRead(this.actor(client), client.data.businessId, String(payload?.threadId || '')));
  }

  @SubscribeMessage('message:send')
  onMessageSend(client: Socket, payload: any) {
    return this.perform(client, async () => {
      const {threadId, clientId, ...body} = payload || {};
      const dto = plainToInstance(SendChatMessageDto, body);
      if ((await validate(dto, {whitelist: true, forbidNonWhitelisted: true})).length) throw new BadRequestException('Invalid message or attachment');
      const message = await this.chatsService.sendMessage(this.actor(client), client.data.businessId, String(threadId || ''), dto, typeof clientId === 'string' ? clientId : undefined);
      client.emit('message:ack', {threadId, clientId, messageId: message.id, createdAt: message.createdAt});
      return {ok: true, messageId: message.id};
    });
  }

  @SubscribeMessage('message:edit')
  onMessageEdit(client: Socket, payload: {messageId: string; text: string}) {
    return this.perform(client, () => this.chatsService.editMessage(this.actor(client), client.data.businessId, String(payload?.messageId || ''), {text: String(payload?.text || '')}));
  }

  @SubscribeMessage('message:delete')
  onMessageDelete(client: Socket, payload: {messageId: string}) {
    return this.perform(client, () => this.chatsService.deleteMessage(this.actor(client), client.data.businessId, String(payload?.messageId || '')));
  }

  @SubscribeMessage('reaction:toggle')
  onReactionToggle(client: Socket, payload: {messageId: string; emoji: string}) {
    return this.perform(client, async () => {
      const messageId = String(payload?.messageId || ''), emoji = String(payload?.emoji || '').trim();
      const message = await this.prisma.chatMessage.findUnique({where: {id: messageId}, select: {threadId: true}});
      if (!message) throw new ForbiddenException();
      await this.assertThreadAccess(client, message.threadId);
      const existing = await this.prisma.chatReaction.findFirst({where: {messageId, employeeId: client.data.employeeId, emoji}});
      return existing
        ? this.chatsService.removeReaction(this.actor(client), client.data.businessId, messageId, emoji)
        : this.chatsService.addReaction(this.actor(client), client.data.businessId, messageId, emoji);
    });
  }
}
