import { Injectable, Logger } from '@nestjs/common';
import webpush, { PushSubscription } from 'web-push';
import axios from 'axios';
import { PrismaService } from '../prisma.service';

interface PushPayload {
  type: string;
  title: string;
  message: string;
  metadata?: any;
  iconUrl?: string;
  actionUrl?: string;
}

@Injectable()
export class PushService {
  private logger = new Logger(PushService.name);

  constructor(private prisma: PrismaService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const mailto = process.env.VAPID_MAILTO || 'mailto:notifications@unitedlinkgroup.local';
    if (publicKey && privateKey) {
      webpush.setVapidDetails(mailto, publicKey, privateKey);
    }
  }

  registerWeb(userId: string, subscription: PushSubscription): Promise<void> {
    const sub: any = subscription as any;
    const endpoint: string = sub?.endpoint;
    const keys = sub?.keys || {};
    const p256dh: string = keys.p256dh || sub?.p256dh;
    const auth: string = keys.auth || sub?.auth;
    if (!endpoint || !p256dh || !auth) {
      return Promise.resolve();
    }
    return this.prisma.webPushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh, auth, lastUsedAt: new Date() },
      create: { userId, endpoint, p256dh, auth, lastUsedAt: new Date() },
    }).then(() => undefined);
  }

  unregisterWeb(userId: string): Promise<void> {
    return this.prisma.webPushSubscription.deleteMany({ where: { userId } }).then(() => undefined);
  }

  registerExpo(userId: string, token: string): Promise<void> {
    return this.prisma.expoPushToken.upsert({
      where: { token },
      update: { userId, lastUsedAt: new Date() },
      create: { userId, token, lastUsedAt: new Date() },
    }).then(() => undefined);
  }

  unregisterExpo(userId: string): Promise<void> {
    return this.prisma.expoPushToken.deleteMany({ where: { userId } }).then(() => undefined);
  }

  async send(userId: string, payload: PushPayload) {
    const iconUrl = payload.iconUrl || this.iconForType(payload.type);
    // Send browser push via Web Push if configured and subscription exists
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      const subs = await this.prisma.webPushSubscription.findMany({ where: { userId } });
      for (const s of subs) {
        try {
          const pushSub = {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          } as any;
          const webPayload = {
            title: payload.title,
            body: payload.message,
            icon: iconUrl,
            data: { ...payload.metadata, actionUrl: payload.actionUrl },
            tag: this.makeTag(payload),
          };
          await webpush.sendNotification(pushSub, JSON.stringify(webPayload));
          await this.prisma.webPushSubscription.update({ where: { endpoint: s.endpoint }, data: { lastUsedAt: new Date() } });
        } catch (err) {
          this.logger.warn(`Web push failed for user ${userId}: ${(err as any)?.message || String(err)}`);
        }
      }
    }

    // Send native push via Expo if token exists
    const expoTokens = await this.prisma.expoPushToken.findMany({ where: { userId } });
    for (const t of expoTokens) {
      try {
        await axios.post('https://exp.host/--/api/v2/push/send', {
          to: t.token,
          title: payload.title,
          body: payload.message,
          sound: 'default',
          data: { ...payload.metadata, actionUrl: payload.actionUrl, type: payload.type },
        });
        await this.prisma.expoPushToken.update({ where: { token: t.token }, data: { lastUsedAt: new Date() } });
      } catch (err) {
        this.logger.warn(`Expo push failed for user ${userId}: ${(err as any)?.message || String(err)}`);
      }
    }
  }
  
  private iconForType(type: string) {
    // Map types to icons; using favicon as default placeholder
    switch (type) {
      case 'SUCCESS':
        return '/favicon.ico';
      case 'WARNING':
        return '/favicon.ico';
      case 'ERROR':
        return '/favicon.ico';
      case 'INFO':
      default:
        return '/favicon.ico';
    }
  }

  private makeTag(payload: PushPayload) {
    // Simple de-duplication tag derived from title+type+metadata shiftId/start/end
    const parts = [
      payload.type,
      payload.title,
      payload.metadata?.messageId,
      payload.metadata?.threadId,
      payload.metadata?.shiftId,
      payload.metadata?.start,
      payload.metadata?.end,
    ].filter(Boolean);
    return parts.join(':');
  }
}
