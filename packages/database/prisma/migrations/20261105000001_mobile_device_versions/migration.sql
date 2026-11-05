-- Optional version metadata for targeted app-update notifications.
ALTER TABLE "ExpoPushToken" ADD COLUMN IF NOT EXISTS "platform" TEXT;
ALTER TABLE "ExpoPushToken" ADD COLUMN IF NOT EXISTS "appVersion" TEXT;
