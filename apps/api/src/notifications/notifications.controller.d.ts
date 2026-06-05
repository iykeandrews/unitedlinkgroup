import { MessageEvent } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsStreamService } from './notifications-stream.service';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
export declare class NotificationsController {
    private readonly notificationsService;
    private readonly streamService;
    private readonly jwtService;
    constructor(notificationsService: NotificationsService, streamService: NotificationsStreamService, jwtService: JwtService);
    findAll(req: any): Promise<{
        id: string;
        userId: string;
        type: string;
        createdAt: Date;
        metadata: string | null;
        title: string;
        message: string;
        read: boolean;
    }[]>;
    getConversation(employeeId: string, req: any): Promise<{
        id: string;
        text: any;
        senderUserId: string | null;
        senderRole: any;
        senderName: string;
        createdAt: Date;
    }[]>;
    addConversationMessage(body: {
        employeeId: string;
        text: string;
    }, req: any): Promise<{
        ok: boolean;
    }>;
    markAsRead(id: string, req: any): Promise<{
        id: string;
        userId: string;
        type: string;
        createdAt: Date;
        metadata: string | null;
        title: string;
        message: string;
        read: boolean;
    }>;
    markAllAsRead(req: any): Promise<import("@unitedlinkgroup/database").Prisma.BatchPayload>;
    remove(id: string, req: any): Promise<{
        id: string;
        userId: string;
        type: string;
        createdAt: Date;
        metadata: string | null;
        title: string;
        message: string;
        read: boolean;
    }>;
    stream(token?: string): Observable<MessageEvent>;
}
