-- Number reservations survive invoice removal and use PostgreSQL atomic allocation.
CREATE TABLE "InvoiceNumberReservation" (
    "id" BIGSERIAL NOT NULL,
    "businessId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceNumberReservation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InvoiceNumberReservation_invoiceNumber_key" ON "InvoiceNumberReservation"("invoiceNumber");
CREATE INDEX "InvoiceNumberReservation_businessId_idx" ON "InvoiceNumberReservation"("businessId");
