import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type InvoicePdfArgs = {
  business: any;
  invoice: any;
  businessEmail?: string;
};

const money = (n: number) => {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return `$${v.toFixed(2)}`;
};

export async function generateInvoicePdf({ business, invoice, businessEmail }: InvoicePdfArgs): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 48;
  const rightX = pageWidth - margin;
  const contentWidth = pageWidth - margin * 2;

  const white = rgb(1, 1, 1);
  const blue = rgb(0.05, 0.16, 0.36);
  const green = rgb(0.03, 0.78, 0.58);
  const text = rgb(0.06, 0.08, 0.14);
  const muted = rgb(0.42, 0.45, 0.5);
  const line = rgb(0.88, 0.9, 0.92);
  const cardBorder = rgb(0.86, 0.9, 0.95);

  const measure = (t: string, size: number, isBold = false) => (isBold ? bold : font).widthOfTextAtSize(t, size);

  const drawLeft = (x: number, y: number, t: string, size: number, isBold = false, color = text) => {
    page.drawText(t, { x, y, size, font: isBold ? bold : font, color });
  };

  const drawRight = (xRight: number, y: number, t: string, size: number, isBold = false, color = text) => {
    const w = measure(t, size, isBold);
    drawLeft(xRight - w, y, t, size, isBold, color);
  };

  const drawCentered = (xCenter: number, y: number, t: string, size: number, isBold = false, color = muted) => {
    const w = measure(t, size, isBold);
    drawLeft(xCenter - w / 2, y, t, size, isBold, color);
  };

  const wrapText = (t: string, maxWidth: number, size: number, isBold = false) => {
    const rawWords = String(t || '').split(/\s+/).filter(Boolean);
    const words: string[] = [];
    for (const w of rawWords) {
      if (measure(w, size, isBold) <= maxWidth) {
        words.push(w);
        continue;
      }
      let cur = w;
      while (cur.length) {
        let chunk = cur;
        while (chunk.length && measure(chunk, size, isBold) > maxWidth) chunk = chunk.slice(0, -1);
        if (!chunk.length) break;
        words.push(chunk);
        cur = cur.slice(chunk.length);
      }
    }
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (measure(candidate, size, isBold) <= maxWidth) current = candidate;
      else {
        if (current) lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  };

  const ellipsis = (t: string, maxWidth: number, size: number, isBold = false) => {
    const s = String(t || '');
    if (measure(s, size, isBold) <= maxWidth) return s;
    let cur = s;
    while (cur.length > 0 && measure(`${cur}…`, size, isBold) > maxWidth) cur = cur.slice(0, -1);
    return `${cur}…`;
  };

  const drawCard = (x: number, y: number, w: number, h: number) => {
    page.drawRectangle({ x, y, width: w, height: h, color: white, borderColor: cardBorder, borderWidth: 1 });
  };

  const businessName = business?.name || 'United Link Security Agency';
  const addressParts = [business?.address, business?.city, business?.state, business?.zip].filter(Boolean);
  const businessAddress = addressParts.join(', ');
  const businessPhone = business?.mobile ? String(business.mobile) : '';
  const businessEmailLine = businessEmail ? String(businessEmail) : '';

  const invoiceNumber = String(invoice?.invoiceNumber || '');
  const issueDate = invoice?.issueDate ? new Date(invoice.issueDate).toLocaleDateString('en-US') : '—';
  const dueDate = invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-US') : '—';

  const client = invoice?.client || {};
  const billToName = client?.name || 'Client';
  const billToEmail = client?.billingContactEmail || '';
  const billToAddress = client?.billingAddress || client?.address || '';
  const billToCityLine = [client?.city, client?.state, client?.zip].filter(Boolean).join(', ');
  const billToCountry = client?.country || '';

  const serviceLocationName = invoice?.location?.name || '';
  const serviceLocationAddress = invoice?.location?.address || '';

  page.drawRectangle({ x: 0, y: pageHeight - 6, width: pageWidth, height: 2, color: blue });
  page.drawRectangle({ x: 0, y: pageHeight - 8, width: pageWidth, height: 2, color: green });

  drawLeft(margin, pageHeight - 54, businessName, 18, true, text);
  const contactPieces = [businessEmailLine, businessPhone].filter(Boolean);
  const contactText = contactPieces.join('   ');
  if (contactText) drawLeft(margin, pageHeight - 74, contactText, 10, false, muted);
  if (businessAddress) drawLeft(margin, pageHeight - 90, businessAddress, 10, false, muted);

  drawRight(rightX, pageHeight - 56, 'INVOICE', 22, true, blue);

  const metaW = 240;
  const metaH = 72;
  const metaX = pageWidth - margin - metaW;
  const metaY = pageHeight - 126;
  page.drawRectangle({ x: metaX, y: metaY, width: metaW, height: metaH, color: white, borderColor: rgb(0.12, 0.32, 0.64), borderWidth: 1 });
  page.drawRectangle({ x: metaX, y: metaY + metaH - 4, width: metaW, height: 4, color: green });

  const metaRight = metaX + metaW - 12;
  drawRight(metaRight, metaY + metaH - 18, `#${invoiceNumber}`, 11, true, text);
  drawRight(metaRight, metaY + metaH - 34, `Issue: ${issueDate}`, 9, false, muted);
  drawRight(metaRight, metaY + metaH - 48, `Due: ${dueDate}`, 9, false, muted);

  const bodyTopY = pageHeight - 170;
  const leftCardX = margin;
  const cardW = (contentWidth - 16) / 2;
  const rightCardX = leftCardX + cardW + 16;
  const cardH = 120;
  const cardY = bodyTopY - cardH;

  drawCard(leftCardX, cardY, cardW, cardH);
  page.drawRectangle({ x: leftCardX, y: cardY + cardH - 3, width: cardW, height: 3, color: blue });
  drawLeft(leftCardX + 14, cardY + cardH - 26, 'BILL TO', 10, true, muted);
  drawLeft(leftCardX + 14, cardY + cardH - 48, billToName, 13, true, text);
  let billY = cardY + cardH - 66;
  const billLines = [
    ...wrapText(billToAddress, cardW - 28, 10, false).slice(0, 2),
    billToCityLine,
    billToCountry,
  ].filter(Boolean);
  for (const ln of billLines.slice(0, 4)) {
    drawLeft(leftCardX + 14, billY, ln, 10, false, muted);
    billY -= 14;
  }
  if (billToEmail) drawLeft(leftCardX + 14, cardY + 14, billToEmail, 10, false, rgb(0.06, 0.35, 0.68));

  drawCard(rightCardX, cardY, cardW, cardH);
  page.drawRectangle({ x: rightCardX, y: cardY + cardH - 3, width: cardW, height: 3, color: green });
  drawLeft(rightCardX + 14, cardY + cardH - 26, 'SERVICE LOCATION', 10, true, muted);
  const locTitle = serviceLocationName || '—';
  drawLeft(rightCardX + 14, cardY + cardH - 48, ellipsis(locTitle, cardW - 28, 12, true), 12, true, text);
  let locY = cardY + cardH - 66;
  const locLines = wrapText(serviceLocationAddress, cardW - 28, 10, false).slice(0, 3);
  for (const ln of locLines) {
    drawLeft(rightCardX + 14, locY, ln, 10, false, muted);
    locY -= 14;
  }

  const tableX = margin;
  const tableW = contentWidth;
  const tableTop = cardY - 18;
  const headerRowH = 26;

  const colDescW = 290;
  const colQtyW = 60;
  const colRateW = 80;
  const colAmtW = tableW - colDescW - colQtyW - colRateW;

  page.drawRectangle({ x: tableX, y: tableTop - headerRowH, width: tableW, height: headerRowH, color: rgb(0.97, 0.98, 0.99), borderColor: cardBorder, borderWidth: 1 });
  page.drawRectangle({ x: tableX, y: tableTop - headerRowH, width: 4, height: headerRowH, color: green });
  drawLeft(tableX + 14, tableTop - 18, 'DESCRIPTION', 10, true, blue);
  drawRight(tableX + colDescW + colQtyW - 14, tableTop - 18, 'QTY', 10, true, blue);
  drawRight(tableX + colDescW + colQtyW + colRateW - 14, tableTop - 18, 'RATE', 10, true, blue);
  drawRight(tableX + tableW - 14, tableTop - 18, 'AMOUNT', 10, true, blue);

  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  let curTop = tableTop - headerRowH - 10;
  let rowIndex = 0;
  for (const it of items) {
    if (curTop < 240) break;
    const qty = typeof it.quantity === 'number' ? it.quantity : 0;
    const rate = typeof it.rate === 'number' ? it.rate : 0;
    const amount = typeof it.amount === 'number' ? it.amount : qty * rate;
    const descLines = wrapText(String(it.description || ''), colDescW - 28, 10, false).slice(0, 3);
    const rowH = Math.max(1, descLines.length) * 14 + 10;

    const fill = rowIndex % 2 === 0 ? rgb(1, 1, 1) : rgb(0.985, 0.995, 0.99);
    const rowBottom = curTop - rowH;
    page.drawRectangle({ x: tableX, y: rowBottom, width: tableW, height: rowH, color: fill, borderColor: rgb(0.9, 0.93, 0.96), borderWidth: 1 });

    let dy = curTop - 16;
    for (const ln of descLines) {
      drawLeft(tableX + 14, dy, ln, 10, false, text);
      dy -= 14;
    }
    const valY = curTop - 16;
    drawRight(tableX + colDescW + colQtyW - 14, valY, String(qty), 10, false, text);
    drawRight(tableX + colDescW + colQtyW + colRateW - 14, valY, money(rate), 10, false, text);
    drawRight(tableX + tableW - 14, valY, money(amount), 10, true, text);

    curTop = rowBottom;
    rowIndex += 1;
  }

  const subtotal = typeof invoice?.subtotal === 'number' ? invoice.subtotal : 0;
  const taxAmount = typeof invoice?.taxAmount === 'number' ? invoice.taxAmount : 0;
  const taxRate = typeof invoice?.taxRate === 'number' ? invoice.taxRate : 0;
  const total = typeof invoice?.total === 'number' ? invoice.total : subtotal + taxAmount;

  const totalsW = 240;
  const totalsH = 108;
  const totalsX = pageWidth - margin - totalsW;
  const totalsY = 84;
  drawCard(totalsX, totalsY, totalsW, totalsH);
  page.drawRectangle({ x: totalsX, y: totalsY, width: 6, height: totalsH, color: blue });
  page.drawRectangle({ x: totalsX, y: totalsY, width: totalsW, height: 3, color: green });

  const totalsRight = totalsX + totalsW - 14;
  const totalsLabelRight = totalsRight - 118;
  let tY = totalsY + totalsH - 28;
  drawRight(totalsLabelRight, tY, 'Subtotal', 10, false, muted);
  drawRight(totalsRight, tY, money(subtotal), 10, false, text);
  tY -= 18;
  drawRight(totalsLabelRight, tY, `Tax (${taxRate.toFixed(0)}%)`, 10, false, muted);
  drawRight(totalsRight, tY, money(taxAmount), 10, false, text);
  tY -= 14;
  page.drawLine({ start: { x: totalsX + 14, y: tY }, end: { x: totalsRight, y: tY }, thickness: 1, color: line });
  tY -= 22;
  drawRight(totalsLabelRight, tY, 'Total', 12, true, text);
  drawRight(totalsRight, tY, money(total), 12, true, text);

  const footer = 'Thank you for your business!';
  drawCentered(pageWidth / 2, 48, footer, 10, false, muted);
  if (businessEmailLine) drawCentered(pageWidth / 2, 34, `Questions? ${businessEmailLine}`, 9, false, muted);

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
