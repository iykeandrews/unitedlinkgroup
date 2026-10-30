import { PDFDocument, rgb } from "pdf-lib";
import { loadInvoiceLogo } from "../invoices/invoice-logo";

/** Add a separate header without covering or recalculating the issued statement. */
export type PayslipLogoCache = Map<string, ReturnType<typeof loadInvoiceLogo>>;
export async function brandIssuedPayslip(
  data: Buffer,
  business: any,
  logos: PayslipLogoCache = new Map(),
): Promise<Buffer> {
  if (!business?.logoUrl) return data;
  if (!logos.has(business.logoUrl))
    logos.set(business.logoUrl, loadInvoiceLogo(business.logoUrl));
  const logo = await logos.get(business.logoUrl);
  if (!logo) return data;
  const doc = await PDFDocument.load(data, { updateMetadata: false });
  const image =
    logo.format === "PNG"
      ? await doc.embedPng(logo.bytes)
      : await doc.embedJpg(logo.bytes);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    page.setSize(width, height + 64);
    const size = image.scale(Math.min(100 / image.width, 44 / image.height));
    page.drawImage(image, {
      x: 24,
      y: height + (64 - size.height) / 2,
      ...size,
    });
    page.drawLine({
      start: { x: 24, y: height + 4 },
      end: { x: width - 24, y: height + 4 },
      color: rgb(0.85, 0.88, 0.92),
      thickness: 0.5,
    });
  }
  return Buffer.from(await doc.save());
}
