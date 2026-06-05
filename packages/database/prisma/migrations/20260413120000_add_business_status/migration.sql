-- Add business status for deactivate/delete flows
ALTER TABLE "Business" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

