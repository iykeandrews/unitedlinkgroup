import { PushSubscription } from 'web-push';
import { PrismaService } from '../prisma.service';
interface PushPayload {
    type: string;
    title: string;
    message: string;
    metadata?: any;
    iconUrl?: string;
    actionUrl?: string;
}
export declare class PushService {
    private prisma;
    private logger;
    constructor(prisma: PrismaService);
    registerWeb(userId: string, subscription: PushSubscription): Promise<void>;
    unregisterWeb(userId: string): Promise<void>;
    registerExpo(userId: string, token: string): Promise<void>;
    unregisterExpo(userId: string): Promise<void>;
    send(userId: string, payload: PushPayload): Promise<void>;
    private iconForType;
    private makeTag;
}
export {};
