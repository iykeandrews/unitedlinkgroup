-- CreateTable
CREATE TABLE "PatrolLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "servicePinId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CHECK',
    "geoLat" REAL,
    "geoLng" REAL,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatrolLog_servicePinId_fkey" FOREIGN KEY ("servicePinId") REFERENCES "ServicePin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PatrolLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
