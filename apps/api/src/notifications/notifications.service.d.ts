import { PrismaService } from '../prisma.service';
import { NotificationsStreamService } from './notifications-stream.service';
export declare class NotificationsService {
    private prisma;
    private stream;
    constructor(prisma: PrismaService, stream: NotificationsStreamService);
    createNotification(userId: string, type: string, title: string, message: string, metadata?: any): Promise<{
        id: string;
        userId: string;
        type: string;
        createdAt: Date;
        metadata: string | null;
        title: string;
        message: string;
        read: boolean;
    }>;
    getUserNotifications(userId: string): Promise<{
        id: string;
        userId: string;
        type: string;
        createdAt: Date;
        metadata: string | null;
        title: string;
        message: string;
        read: boolean;
    }[]>;
    markAsRead(id: string, userId: string): Promise<{
        id: string;
        userId: string;
        type: string;
        createdAt: Date;
        metadata: string | null;
        title: string;
        message: string;
        read: boolean;
    }>;
    markAllAsRead(userId: string): Promise<import("@unitedlinkgroup/database").Prisma.BatchPayload>;
    remove(id: string, userId: string): Promise<{
        id: string;
        userId: string;
        type: string;
        createdAt: Date;
        metadata: string | null;
        title: string;
        message: string;
        read: boolean;
    }>;
    sendEmail(to: string, subject: string, body: string): Promise<void>;
    sendPush(userId: string, payload: {
        type: string;
        title: string;
        message: string;
        metadata?: any;
        actionUrl?: string;
    }): Promise<void>;
    addConversationMessage(employeeId: string, senderUserId: string, text: string, senderUser?: any): Promise<{
        ok: boolean;
    }>;
    getConversation(employeeId: string, requestUser: any): Promise<{
        id: string;
        text: any;
        senderUserId: string | null;
        senderRole: any;
        senderName: string;
        createdAt: Date;
    }[]>;
}
