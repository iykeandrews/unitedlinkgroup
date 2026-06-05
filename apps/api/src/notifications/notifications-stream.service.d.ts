import { MessageEvent } from '@nestjs/common';
import { Subject } from 'rxjs';
export declare class NotificationsStreamService {
    private streams;
    getUserStream(userId: string): Subject<MessageEvent>;
    emitToUser(userId: string, data: any): void;
}
