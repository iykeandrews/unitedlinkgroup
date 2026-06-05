import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../push/push.service';
import { CreateGroupThreadDto } from './dto/create-group-thread.dto';
import { EditChatMessageDto } from './dto/edit-chat-message.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
export declare class ChatsService {
    private prisma;
    private notifications;
    private push;
    constructor(prisma: PrismaService, notifications: NotificationsService, push: PushService);
    private getUserId;
    private isAdmin;
    private getBusinessId;
    private getEmployeeForUser;
    private requireEmployee;
    private ensureEmployeeForUserId;
    private getThreadOrThrow;
    private requireThreadAccess;
    private directKey;
    private roleToDesignation;
    notifyNewChatMessage(args: {
        businessId: string;
        threadId: string;
        messageId: string;
        senderEmployeeId: string;
        senderName: string;
        text: string | null;
        hasAttachments: boolean;
    }): Promise<void>;
    listThreads(user: any, businessIdHeader?: string, opts?: {
        type?: string;
    }): Promise<{
        id: any;
        type: any;
        title: any;
        imageUrl: any;
        displayTitle: any;
        displayImageUrl: any;
        displayDesignation: string;
        updatedAt: any;
        unreadCount: number;
        participants: any;
        lastMessage: {
            id: any;
            text: any;
            createdAt: any;
            senderEmployeeId: any;
            senderName: string;
            attachments: any;
        } | null;
    }[]>;
    createDirectThread(user: any, businessIdHeader: string | undefined, otherEmployeeId: string): Promise<{
        id: string;
        businessId: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        title: string | null;
        imageUrl: string | null;
        directKey: string | null;
        createdById: string | null;
    }>;
    createSupportThread(user: any, businessIdHeader: string | undefined): Promise<{
        id: string;
        businessId: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        title: string | null;
        imageUrl: string | null;
        directKey: string | null;
        createdById: string | null;
    }>;
    createGroupThread(user: any, businessIdHeader: string | undefined, dto: CreateGroupThreadDto): Promise<{
        id: string;
        businessId: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        title: string | null;
        imageUrl: string | null;
        directKey: string | null;
        createdById: string | null;
    }>;
    getThread(user: any, businessIdHeader: string | undefined, threadId: string): Promise<{
        id: string;
        type: string;
        title: string | null;
        imageUrl: string | null;
        directKey: string | null;
        updatedAt: Date;
        myRole: string | null;
        myLastReadAt: Date | null;
        participants: {
            employeeId: any;
            role: any;
            lastReadAt: any;
            employee: any;
        }[];
    }>;
    updateThread(user: any, businessIdHeader: string | undefined, threadId: string, dto: UpdateThreadDto): Promise<{
        id: string;
        businessId: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        title: string | null;
        imageUrl: string | null;
        directKey: string | null;
        createdById: string | null;
    }>;
    addMember(user: any, businessIdHeader: string | undefined, threadId: string, employeeId: string): Promise<{
        ok: boolean;
    }>;
    removeMember(user: any, businessIdHeader: string | undefined, threadId: string, employeeId: string): Promise<{
        ok: boolean;
    }>;
    listMessages(user: any, businessIdHeader: string | undefined, threadId: string, before?: string, take?: number): Promise<{
        id: any;
        threadId: any;
        senderEmployeeId: any;
        senderName: string;
        text: any;
        createdAt: any;
        editedAt: any;
        deletedAt: any;
        replyTo: {
            id: any;
            senderEmployeeId: any;
            senderName: string;
            text: any;
        } | null;
        attachments: any;
        reactions: any;
    }[]>;
    sendMessage(user: any, businessIdHeader: string | undefined, threadId: string, dto: SendChatMessageDto): Promise<{
        id: string;
        threadId: string;
        senderEmployeeId: string;
        senderName: string;
        text: string | null;
        createdAt: Date;
        editedAt: Date | null;
        deletedAt: Date | null;
        replyTo: {
            id: string;
            senderEmployeeId: string;
            senderName: string;
            text: string | null;
        } | null;
        attachments: {
            id: any;
            type: any;
            url: any;
            filename: any;
            originalName: any;
            mimeType: any;
            size: any;
        }[];
        reactions: never[];
        thread: {
            type: string;
        };
    }>;
    markRead(user: any, businessIdHeader: string | undefined, threadId: string): Promise<{
        threadId: string;
        employeeId: string;
        lastReadAt: Date;
    }>;
    editMessage(user: any, businessIdHeader: string | undefined, messageId: string, dto: EditChatMessageDto): Promise<{
        id: string;
        createdAt: Date;
        threadId: string;
        senderEmployeeId: string;
        text: string | null;
        replyToId: string | null;
        editedAt: Date | null;
        deletedAt: Date | null;
    }>;
    deleteMessage(user: any, businessIdHeader: string | undefined, messageId: string): Promise<{
        id: string;
        createdAt: Date;
        threadId: string;
        senderEmployeeId: string;
        text: string | null;
        replyToId: string | null;
        editedAt: Date | null;
        deletedAt: Date | null;
    }>;
    addReaction(user: any, businessIdHeader: string | undefined, messageId: string, emoji: string): Promise<{
        ok: boolean;
    }>;
    removeReaction(user: any, businessIdHeader: string | undefined, messageId: string, emoji?: string): Promise<{
        ok: boolean;
    }>;
}
