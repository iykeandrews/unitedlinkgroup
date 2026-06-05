-- AlterTable
ALTER TABLE "LeaveType" ADD COLUMN "accrualFrequency" TEXT;
ALTER TABLE "LeaveType" ADD COLUMN "accrualRate" REAL;
ALTER TABLE "LeaveType" ADD COLUMN "carryOverLimit" REAL;
ALTER TABLE "LeaveType" ADD COLUMN "maxBalance" REAL;
