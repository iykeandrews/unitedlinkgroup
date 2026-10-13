"use client";
import InvoiceWorkspace from "@/components/invoices/InvoiceWorkspace";
import { useBusiness } from "@/context/business-context";
export default function InvoicesPage() {
  const { selectedBusiness } = useBusiness();
  return <InvoiceWorkspace key={selectedBusiness?.id || "none"} />;
}
