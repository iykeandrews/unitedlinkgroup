CREATE TABLE "OfficerAssessment" (
 "id" TEXT NOT NULL,
 "businessId" TEXT NOT NULL,
 "employeeId" TEXT NOT NULL,
 "locationId" TEXT NOT NULL,
 "evaluatorUserId" TEXT NOT NULL,
 "submissionId" TEXT NOT NULL,
 "observedAt" TIMESTAMP(3) NOT NULL,
 "ratings" TEXT NOT NULL,
 "checklist" TEXT NOT NULL,
 "score" DOUBLE PRECISION NOT NULL,
 "notes" TEXT NOT NULL,
 "action" TEXT NOT NULL,
 "followUpAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "OfficerAssessment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OfficerAssessment_submissionId_key" ON "OfficerAssessment"("submissionId");
CREATE INDEX "OfficerAssessment_businessId_createdAt_idx" ON "OfficerAssessment"("businessId", "createdAt");
CREATE INDEX "OfficerAssessment_businessId_employeeId_createdAt_idx" ON "OfficerAssessment"("businessId", "employeeId", "createdAt");
ALTER TABLE "OfficerAssessment" ADD CONSTRAINT "OfficerAssessment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfficerAssessment" ADD CONSTRAINT "OfficerAssessment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfficerAssessment" ADD CONSTRAINT "OfficerAssessment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfficerAssessment" ADD CONSTRAINT "OfficerAssessment_evaluatorUserId_fkey" FOREIGN KEY ("evaluatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
