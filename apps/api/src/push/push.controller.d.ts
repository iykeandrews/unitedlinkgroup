import { PushService } from './push.service';
import { PrismaService } from '../prisma.service';
export declare class PushController {
    private pushService;
    private prisma;
    constructor(pushService: PushService, prisma: PrismaService);
    vapidPublicKey(): {
        publicKey: string | null;
    };
    debug(req: any): Promise<{
        userId: string;
        expoTokensCount: number;
        webSubscriptionsCount: number;
        hasVapidPublicKey: boolean;
        hasVapidPrivateKey: boolean;
    }>;
    test(req: any, body: any): Promise<{
        ok: boolean;
    }>;
    register(req: any, body: any): {
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
    };
    unregister(req: any, body: any): {
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
    };
}
