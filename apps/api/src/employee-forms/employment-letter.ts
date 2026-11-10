import { readFileSync } from "node:fs";
import { join } from "node:path";
import { jsPDF } from "jspdf";

export const unitedLinkName = "United Link Security Agency LLC";

export const employmentLetterTitles = {
  APPOINTMENT: "Letter of Appointment",
  ACCEPTANCE: "Letter of Acceptance",
} as const;

export type EmploymentLetterType = keyof typeof employmentLetterTitles;
type LetterBusiness = {
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  mobile?: string | null;
};

type Letter = {
  type: EmploymentLetterType;
  employeeName: string;
  position: string;
  letterDate: string;
  startDate: string;
  hourlyRate?: string;
  signatory?: string;
  notes?: string;
};

function displayDate(day: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(day));
}

export function renderEmploymentLetter(business: LetterBusiness, letter?: Letter) {
  const doc = new jsPDF({ format: "letter", unit: "pt" });
  const isUnitedLink = /^(united\s*link)(\s+security\s+agency)?([,\s]+llc)?$/i.test(business.name.trim());
  const companyName = isUnitedLink ? unitedLinkName : business.name;
  const ink = "#14263D";
  const muted = "#46576A";
  const accent = "#138052";
  const divider = "#D2DDE4";
  const left = 52;
  const width = 508;
  let y = 0;

  const text = (value: string, x: number, top: number, size: number, color = ink, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.text(value, x, top);
  };
  const line = (x: number, top: number, length: number, color: string) => {
    doc.setDrawColor(color);
    doc.line(x, top, x + length, top);
  };
  const masthead = () => {
    doc.setFillColor(ink);
    doc.rect(0, 0, 612, 6, "F");
    doc.setFillColor(accent);
    doc.rect(0, 0, 154, 6, "F");
    if (isUnitedLink) {
      const logo = readFileSync(join(__dirname, "united-link-letterhead.jpg"));
      doc.addImage(logo, "JPEG", left, 42, 218, 218 * 81 / 371);
      text("13811 Heatherstone Dr", 350, 55, 9, muted);
      text("Bowie, MD 20720", 350, 69, 9, muted);
      text("+1 (202) 394-8050", 350, 83, 9, muted);
    } else {
      text(companyName, left, 60, 18, ink, true);
      const locality = [business.city, [business.state, business.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
      text([business.address, locality].filter(Boolean).join("  |  "), left, 82, 9, muted);
    }
    line(left, 109, width, divider);
    y = 148;
  };
  const footer = () => {
    line(left, 716, width, divider);
    if (isUnitedLink) {
      text("info@unitedlinksecurity.com  |  www.unitedlinksecurity.com", left, 735, 9, ink);
      text("P.O. Box 5052, Hyattsville, MD 20782-9997  |  Fax 240-542-4348 or 240-828-9401", left, 750, 8.5, muted);
    } else if (business.mobile) {
      text(business.mobile, left, 735, 9, muted);
    }
  };
  const ensureRoom = (height: number) => {
    if (y + height <= 684) return;
    doc.addPage();
    masthead();
  };
  const paragraph = (value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const rows = doc.splitTextToSize(value, width) as string[];
    for (const row of rows) {
      ensureRoom(17);
      text(row, left, y, 11);
      y += 17;
    }
    y += 10;
  };

  doc.setProperties({ title: letter ? employmentLetterTitles[letter.type] : companyName + " Letterhead", author: companyName });
  masthead();
  if (letter) {
    const appointment = letter.type === "APPOINTMENT";
    text("EMPLOYMENT CORRESPONDENCE", left, y, 9, accent, true);
    text(appointment ? "Offer of Appointment" : employmentLetterTitles[letter.type], left, y + 30, 25, ink, true);
    y += 57;
    paragraph(`${displayDate(letter.letterDate)}\n${appointment ? letter.employeeName : "To: Human Resources, " + companyName}`);
    paragraph(appointment ? `Dear ${letter.employeeName},` : "Dear Human Resources,");
    if (appointment) {
      const rate = Number(letter.hourlyRate).toLocaleString("en-US", { style: "currency", currency: "USD" });
      paragraph(`Following your application and interview for the position of ${letter.position}, we are pleased to offer you an appointment with ${companyName}, effective ${displayDate(letter.startDate)}.`);
      paragraph("PROBATION. Your appointment begins with a three-month probationary period. During this time, we will review your performance and conduct. Either party may end the appointment at will during probation. Call-outs during this period may result in an extension.");
      paragraph("BENEFITS. You become eligible for company benefits, including insurance and health care, after successfully completing probation.");
      paragraph(`COMPENSATION. During probation, your base pay will be ${rate} per hour.`);
      paragraph("You will receive your duties and responsibilities during orientation on your first day.");
      if (letter.notes) paragraph(letter.notes);
      paragraph("If you agree to these terms, please sign and return the Letter of Acceptance at your earliest convenience.");
    } else {
      paragraph(`I, ${letter.employeeName}, accept the appointment to the position of ${letter.position} with ${companyName}, effective ${displayDate(letter.startDate)}.`);
      if (letter.notes) paragraph(letter.notes);
    }
    ensureRoom(85);
    text("Sincerely,", left, y, 11);
    y += 32;
    line(left, y, 242, divider);
    if (!appointment) line(340, y, 160, divider);
    y += 15;
    if (!appointment) text("Date signed", 340, y, 11);
    paragraph(appointment
      ? (letter.signatory || (isUnitedLink ? "Joseph Osigwe\nCEO" : "Authorized company representative"))
      : letter.employeeName + " | Employee signature");
  }

  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    footer();
  }
  return Buffer.from(doc.output("arraybuffer"));
}
