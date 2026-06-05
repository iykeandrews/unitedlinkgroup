import { Controller, Post, Delete, Body, UseGuards, Request, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PushService } from './push.service';
import { PrismaService } from '../prisma.service';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private pushService: PushService, private prisma: PrismaService) {}

  @Get('vapid-public-key')
  vapidPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY || null };
  }

  @Get('debug')
  async debug(@Request() req: any) {
    const userId: string = req.user.userId;
    const [expoTokens, webSubs] = await Promise.all([
      this.prisma.expoPushToken.findMany({ where: { userId }, select: { token: true, createdAt: true, lastUsedAt: true } }),
      this.prisma.webPushSubscription.findMany({ where: { userId }, select: { endpoint: true, createdAt: true, lastUsedAt: true } }),
    ]);
    return {
      userId,
      expoTokensCount: expoTokens.length,
      webSubscriptionsCount: webSubs.length,
      hasVapidPublicKey: !!process.env.VAPID_PUBLIC_KEY,
      hasVapidPrivateKey: !!process.env.VAPID_PRIVATE_KEY,
    };
  }

  @Post('test')
  async test(@Request() req: any, @Body() body: any) {
    const userId: string = req.user.userId;
    const title = String(body?.title || 'Test notification');
    const message = String(body?.message || 'Hello from server');
    const actionUrl = String(body?.actionUrl || '/dashboard/communications/chats');
    const metadata = { kind: 'PUSH_TEST', at: new Date().toISOString() };
    await this.pushService.send(userId, { type: 'INFO', title, message, metadata, actionUrl });
    return { ok: true };
  }

  @Post('register')
  register(@Request() req: any, @Body() body: any) {
    const userId: string = req.user.userId;
    const platform: 'web' | 'expo' = body.platform;
    if (platform === 'web' && body.subscription) {
      this.pushService.registerWeb(userId, body.subscription);
      return { ok: true };
    }
    if (platform === 'expo' && body.token) {
      this.pushService.registerExpo(userId, body.token);
      return { ok: true };
    }
    return { ok: false, error: 'Invalid registration payload' };
  }

  @Delete('register')
  unregister(@Request() req: any, @Body() body: any) {
    const userId: string = req.user.userId;
    const platform: 'web' | 'expo' = body.platform;
    if (platform === 'web') {
      this.pushService.unregisterWeb(userId);
      return { ok: true };
    }
    if (platform === 'expo') {
      this.pushService.unregisterExpo(userId);
      return { ok: true };
    }
    return { ok: false, error: 'Invalid unregistration payload' };
  }
}
