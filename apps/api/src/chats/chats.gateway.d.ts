import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma.service';
import { ChatsService } from './chats.service';
export declare class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private configService;
    private prisma;
    private chatsService;
    server: Server;
    private presence;
    constructor(jwtService: JwtService, configService: ConfigService, prisma: PrismaService, chatsService: ChatsService);
    private getToken;
    private isAdmin;
    private ensureEmployeeForUser;
    private businessRoom;
    private threadRoom;
    private emitPresenceSnapshot;
    private emitPresence;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    private assertThreadAccess;
    onJoin(client: Socket, payload: {
        threadId: string;
    }): Promise<void>;
    onLeave(client: Socket, payload: {
        threadId: string;
    }): Promise<void>;
    onTypingStart(client: Socket, payload: {
        threadId: string;
    }): Promise<void>;
    onTypingStop(client: Socket, payload: {
        threadId: string;
    }): Promise<void>;
    onReadMark(client: Socket, payload: {
        threadId: string;
    }): Promise<void>;
    onMessageSend(client: Socket, payload: {
        threadId: string;
        clientId?: string;
        text?: string;
        replyToId?: string;
        attachments?: any[];
    }): Promise<void>;
    private assertMessagePermission;
    onMessageEdit(client: Socket, payload: {
        messageId: string;
        text: string;
    }): Promise<void>;
    onMessageDelete(client: Socket, payload: {
        messageId: string;
    }): Promise<void>;
    onReactionToggle(client: Socket, payload: {
        messageId: string;
        emoji: string;
    }): Promise<void>;
}
