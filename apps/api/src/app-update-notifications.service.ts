import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { createHash } from "crypto";
import { PrismaService } from "./prisma.service";
import { PushService } from "./push/push.service";
import { NotificationsService } from "./notifications/notifications.service";
import { mobileRelease } from "./mobile-release";
const newer = (a: string, b: string) =>
  a
    .split(".")
    .map(Number)
    .some(
      (n, i, as) =>
        as.slice(0, i).every((v, j) => v === Number(b.split(".")[j])) &&
        n > Number(b.split(".")[i]),
    );
@Injectable()
export class AppUpdateNotificationsService {
  private logger = new Logger(AppUpdateNotificationsService.name);
  constructor(
    private db: PrismaService,
    private push: PushService,
    private notifications: NotificationsService,
  ) {}
  @Cron(CronExpression.EVERY_10_MINUTES)
  async notifyReleasedUpdates() {
    for (const platform of ["ios", "android"]) {
      const release = await mobileRelease(platform);
      if (!release) continue;
      const devices: any[] = await (this.db.expoPushToken as any).findMany({
        where: {
          platform,
          appVersion: { not: null },
          user: {
            employeeProfiles: {
              some: { status: { in: ["ACTIVE", "ON_LEAVE"] } },
            },
          },
        },
        select: { id: true, userId: true, token: true, appVersion: true },
      });
      const groups = new Map<string, any[]>();
      for (const device of devices) {
        if (
          !/^\d+\.\d+\.\d+$/.test(device.appVersion || "") ||
          !newer(release.version, device.appVersion)
        )
          continue;
        groups.set(device.userId, [
          ...(groups.get(device.userId) || []),
          device,
        ]);
      }
      for (const [userId, tokens] of groups) {
        const id =
          "app-update-" +
          createHash("sha256")
            .update([userId, platform, release.version].join(":"))
            .digest("hex");
        const title = "Required app update",
          message =
            "A new version of United Link Group is available. Update the app to continue using it.";
        const metadata = {
          kind: "APP_UPDATE",
          platform,
          version: release.version,
          actionUrl: "/mobile/app-update",
        };
        try {
          await this.db.notification.create({
            data: {
              id,
              userId,
              type: "APP_UPDATE",
              title,
              message,
              metadata: JSON.stringify(metadata),
            },
          });
        } catch (error: any) {
          if (error.code === "P2002") continue;
          this.logger.warn("Unable to record update notification");
          continue;
        }
        await this.notifications
          .sendPush(userId, {
            type: "APP_UPDATE",
            title,
            message,
            metadata,
            actionUrl: "/mobile/app-update",
          })
          .catch(() => {});
        await this.push.sendExpoUpdate(tokens, {
          type: "APP_UPDATE",
          title,
          message,
          metadata,
          actionUrl: "/mobile/app-update",
        });
      }
    }
  }
}
