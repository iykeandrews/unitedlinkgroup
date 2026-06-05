import { ChatsService } from './chats.service';
import { AddChatGroupMemberDto } from './dto/add-chat-group-member.dto';
import { CreateDirectThreadDto } from './dto/create-direct-thread.dto';
import { CreateGroupThreadDto } from './dto/create-group-thread.dto';
import { EditChatMessageDto } from './dto/edit-chat-message.dto';
import { ReactChatMessageDto } from './dto/react-chat-message.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
export declare class ChatsController {
    private readonly chatsService;
    constructor(chatsService: ChatsService);
    listThreads(req: any, headerBusinessId?: string): Promise<{
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
    createDirect(req: any, headerBusinessId: string | undefined, dto: CreateDirectThreadDto): Promise<{
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
    createSupport(req: any, headerBusinessId: string | undefined): Promise<{
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
    createGroup(req: any, headerBusinessId: string | undefined, dto: CreateGroupThreadDto): Promise<{
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
    getThread(req: any, headerBusinessId: string | undefined, threadId: string): Promise<{
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
    updateThread(req: any, headerBusinessId: string | undefined, threadId: string, dto: UpdateThreadDto): Promise<{
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
    addMember(req: any, headerBusinessId: string | undefined, threadId: string, dto: AddChatGroupMemberDto): Promise<{
        ok: boolean;
    }>;
    removeMember(req: any, headerBusinessId: string | undefined, threadId: string, employeeId: string): Promise<{
        ok: boolean;
    }>;
    listMessages(req: any, headerBusinessId: string | undefined, threadId: string, before?: string, take?: string): Promise<{
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
    sendMessage(req: any, headerBusinessId: string | undefined, threadId: string, dto: SendChatMessageDto): Promise<{
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
    markRead(req: any, headerBusinessId: string | undefined, threadId: string): Promise<{
        threadId: string;
        employeeId: string;
        lastReadAt: Date;
    }>;
    editMessage(req: any, headerBusinessId: string | undefined, messageId: string, dto: EditChatMessageDto): Promise<{
        id: string;
        createdAt: Date;
        threadId: string;
        senderEmployeeId: string;
        text: string | null;
        replyToId: string | null;
        editedAt: Date | null;
        deletedAt: Date | null;
    }>;
    deleteMessage(req: any, headerBusinessId: string | undefined, messageId: string): Promise<{
        id: string;
        createdAt: Date;
        threadId: string;
        senderEmployeeId: string;
        text: string | null;
        replyToId: string | null;
        editedAt: Date | null;
        deletedAt: Date | null;
    }>;
    addReaction(req: any, headerBusinessId: string | undefined, messageId: string, dto: ReactChatMessageDto): Promise<{
        ok: boolean;
    }>;
    removeReaction(req: any, headerBusinessId: string | undefined, messageId: string, emoji?: string): Promise<{
        ok: boolean;
    }>;
    listGroupsCompat(req: any, headerBusinessId?: string): Promise<{
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
}
