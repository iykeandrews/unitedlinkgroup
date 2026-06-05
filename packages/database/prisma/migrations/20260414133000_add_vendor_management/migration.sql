-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactFirstName" TEXT,
    "contactLastName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "serviceCategory" TEXT,
    "portalSlug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "accessReports" BOOLEAN NOT NULL DEFAULT true,
    "accessContracts" BOOLEAN NOT NULL DEFAULT true,
    "accessCompliance" BOOLEAN NOT NULL DEFAULT true,
    "accessAnnouncements" BOOLEAN NOT NULL DEFAULT true,
    "accessIncidentReports" BOOLEAN NOT NULL DEFAULT false,
    "accessTimeTracking" BOOLEAN NOT NULL DEFAULT false,
    "agreementStartDate" DATETIME,
    "agreementEndDate" DATETIME,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vendor_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Vendor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_userId_key" ON "Vendor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_email_key" ON "Vendor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_portalSlug_key" ON "Vendor"("portalSlug");

-- CreateIndex
CREATE INDEX "Vendor_businessId_status_idx" ON "Vendor"("businessId", "status");

-- CreateIndex
CREATE INDEX "Vendor_portalSlug_status_idx" ON "Vendor"("portalSlug", "status");
