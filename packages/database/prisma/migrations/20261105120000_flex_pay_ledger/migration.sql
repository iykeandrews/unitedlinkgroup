-- Additive Flex Pay ledger; no existing rows are changed.

CREATE TABLE "FlexPay" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "shiftStart" TIMESTAMP(3) NOT NULL,
    "shiftEnd" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OFFERED',
    "reason" TEXT NOT NULL,
    "responseNote" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "timesheetId" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "recordedByUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlexPay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FlexPayReconciliation" (
    "id" TEXT NOT NULL,
    "flexPayId" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlexPayReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FlexPay_submissionId_key" ON "FlexPay"("submissionId");

CREATE UNIQUE INDEX "FlexPay_timesheetId_key" ON "FlexPay"("timesheetId");

CREATE INDEX "FlexPay_businessId_status_createdAt_idx" ON "FlexPay"("businessId", "status", "createdAt");

CREATE INDEX "FlexPay_employeeId_status_paidAt_idx" ON "FlexPay"("employeeId", "status", "paidAt");

CREATE INDEX "FlexPay_shiftId_status_idx" ON "FlexPay"("shiftId", "status");

CREATE UNIQUE INDEX "FlexPay_businessId_paymentReference_key" ON "FlexPay"("businessId", "paymentReference");

CREATE INDEX "FlexPayReconciliation_payrollId_idx" ON "FlexPayReconciliation"("payrollId");

CREATE UNIQUE INDEX "FlexPayReconciliation_flexPayId_payrollId_key" ON "FlexPayReconciliation"("flexPayId", "payrollId");

ALTER TABLE "FlexPay" ADD CONSTRAINT "FlexPay_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FlexPay" ADD CONSTRAINT "FlexPay_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FlexPay" ADD CONSTRAINT "FlexPay_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FlexPay" ADD CONSTRAINT "FlexPay_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FlexPayReconciliation" ADD CONSTRAINT "FlexPayReconciliation_flexPayId_fkey" FOREIGN KEY ("flexPayId") REFERENCES "FlexPay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FlexPayReconciliation" ADD CONSTRAINT "FlexPayReconciliation_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FlexPay" ADD CONSTRAINT "FlexPay_amounts_check" CHECK ("amountCents" > 0 AND "balanceCents" >= 0 AND "balanceCents" <= "amountCents");
ALTER TABLE "FlexPay" ADD CONSTRAINT "FlexPay_status_check" CHECK ("status" IN ('OFFERED','ACCEPTED','DECLINED','CANCELLED','PAID','RECONCILED'));
ALTER TABLE "FlexPay" ADD CONSTRAINT "FlexPay_paid_evidence_check" CHECK ("status" NOT IN ('PAID','RECONCILED') OR ("timesheetId" IS NOT NULL AND "paidAt" IS NOT NULL AND "acceptedAt" IS NOT NULL AND "paymentMethod" IS NOT NULL AND "paymentReference" IS NOT NULL));
ALTER TABLE "FlexPay" ADD CONSTRAINT "FlexPay_reconciled_balance_check" CHECK ("status" <> 'RECONCILED' OR "balanceCents" = 0);
ALTER TABLE "FlexPayReconciliation" ADD CONSTRAINT "FlexPayReconciliation_amount_check" CHECK ("amountCents" > 0);
