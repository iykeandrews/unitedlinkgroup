"use client";
import InvoiceWorkspace from "./InvoiceWorkspace";
export default function InvoiceList({
  clientId,
  client,
}: {
  clientId: string;
  client?: any;
}) {
  return <InvoiceWorkspace clientId={clientId} client={client} embedded />;
}
