/** Reserve numbers independently of invoice lifecycle; void/deletion never frees one. */
export async function reserveInvoiceNumber(tx: any, businessId: string): Promise<string> {
  for (;;) {
    const reservation = await tx.invoiceNumberReservation.create({ data: { businessId } });
    const invoiceNumber = `INV-${reservation.createdAt.getUTCFullYear()}-${reservation.id.toString().padStart(6, '0')}`;
    // Preserve all pre-existing/custom numbers, across businesses as well.
    const existing = await tx.invoice.findFirst({ where: { invoiceNumber }, select: { id: true } });
    const reserved = await tx.invoiceNumberReservation.findUnique({ where: { invoiceNumber }, select: { id: true } });
    if (existing || reserved) continue;
    await tx.invoiceNumberReservation.update({ where: { id: reservation.id }, data: { invoiceNumber } });
    return invoiceNumber;
  }
}
