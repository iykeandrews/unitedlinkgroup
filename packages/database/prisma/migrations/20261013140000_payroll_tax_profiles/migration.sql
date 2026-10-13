ALTER TABLE "Employee" ADD COLUMN "payrollTaxProfile" TEXT;
ALTER TABLE "Payroll" ADD COLUMN "paySchedule" TEXT;
ALTER TABLE "Payroll" ADD COLUMN "calendarTimeZone" TEXT NOT NULL DEFAULT 'UTC';
