-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "taxInclusive" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidReason" TEXT,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_paidAt_idx" ON "InvoicePayment"("invoiceId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePayment_invoiceId_idempotencyKey_key" ON "InvoicePayment"("invoiceId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Invoice_businessId_dueDate_idx" ON "Invoice"("businessId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_businessId_invoiceNumber_key" ON "Invoice"("businessId", "invoiceNumber");

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Payment amounts are always positive integer cents.
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_positive_amount" CHECK ("amountCents" > 0);
