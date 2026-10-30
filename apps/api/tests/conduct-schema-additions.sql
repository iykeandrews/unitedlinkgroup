-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "complaintPortalKey" TEXT;

-- CreateTable
CREATE TABLE "ConductCase" (
    "customerEmail" TEXT,
    "publicTrackingHash" TEXT,
    "publicSubmissionId" TEXT,
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "employeeId" TEXT,
    "locationId" TEXT,
    "locationName" TEXT,
    "customerName" TEXT,
    "customerContact" TEXT,
    "ownerEmployeeId" TEXT,
    "ownerName" TEXT,
    "sourceCaseId" TEXT,
    "dueAt" TIMESTAMP(3),
    "followUpAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "resolution" TEXT,
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "preventiveAction" TEXT,
    "createdById" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConductCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConductCaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'INTERNAL',
    "message" TEXT NOT NULL,
    "changes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConductCaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConductCase_publicTrackingHash_key" ON "ConductCase"("publicTrackingHash");

-- CreateIndex
CREATE UNIQUE INDEX "ConductCase_publicSubmissionId_key" ON "ConductCase"("publicSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "ConductCase_reference_key" ON "ConductCase"("reference");

-- CreateIndex
CREATE INDEX "ConductCase_businessId_kind_status_createdAt_idx" ON "ConductCase"("businessId", "kind", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ConductCase_employeeId_issuedAt_idx" ON "ConductCase"("employeeId", "issuedAt");

-- CreateIndex
CREATE INDEX "ConductCaseEvent_caseId_createdAt_idx" ON "ConductCaseEvent"("caseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Business_complaintPortalKey_key" ON "Business"("complaintPortalKey");

-- AddForeignKey
ALTER TABLE "ConductCase" ADD CONSTRAINT "ConductCase_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConductCase" ADD CONSTRAINT "ConductCase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConductCaseEvent" ADD CONSTRAINT "ConductCaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ConductCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
