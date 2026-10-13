import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

export interface TaxContext {
  rate: number;
  inclusive: boolean;
  source: "location" | "business" | "default";
}

export async function resolveTaxContext(
  prisma: PrismaService,
  businessId: string,
  locationId?: string,
  strict = false,
): Promise<TaxContext> {
  let rate = 0;
  let inclusive = false;
  let source: TaxContext["source"] = "default";

  if (locationId) {
    const loc = await prisma.location.findFirst({
      where: { id: locationId, businessId },
    });
    const taxOverrideInfo = (loc as any)?.taxOverrideInfo;
    if (taxOverrideInfo) {
      try {
        const info =
          typeof taxOverrideInfo === "string"
            ? JSON.parse(taxOverrideInfo)
            : taxOverrideInfo;
        if (
          strict &&
          (!info ||
            typeof info !== "object" ||
            Array.isArray(info) ||
            (info.rate !== undefined &&
              (typeof info.rate !== "number" ||
                !Number.isFinite(info.rate) ||
                info.rate < 0 ||
                info.rate > 100)) ||
            (info.inclusive !== undefined &&
              typeof info.inclusive !== "boolean"))
        )
          throw new Error("Invalid site tax settings.");
        if (typeof info.rate === "number") {
          rate = info.rate;
          source = "location";
        }
        if (typeof info.inclusive === "boolean") inclusive = info.inclusive;
      } catch {
        if (strict)
          throw new BadRequestException(
            "Tax settings are invalid. Correct the business or site tax configuration before invoicing.",
          );
      }
    }
  }

  if (source !== "location") {
    const biz = await prisma.business.findUnique({ where: { id: businessId } });
    const governmentInfo = (biz as any)?.governmentInfo;
    if (governmentInfo) {
      try {
        const gov =
          typeof governmentInfo === "string"
            ? JSON.parse(governmentInfo)
            : governmentInfo;
        if (
          strict &&
          (!gov ||
            typeof gov !== "object" ||
            Array.isArray(gov) ||
            (gov.defaultStandardRate !== undefined &&
              (typeof gov.defaultStandardRate !== "number" ||
                !Number.isFinite(gov.defaultStandardRate) ||
                gov.defaultStandardRate < 0 ||
                gov.defaultStandardRate > 100)) ||
            (gov.inclusive !== undefined && typeof gov.inclusive !== "boolean"))
        )
          throw new Error("Invalid business tax settings.");
        if (typeof gov.defaultStandardRate === "number") {
          rate = gov.defaultStandardRate;
          source = "business";
        }
        if (typeof gov.inclusive === "boolean") inclusive = gov.inclusive;
      } catch {
        if (strict)
          throw new BadRequestException(
            "Tax settings are invalid. Correct the business or site tax configuration before invoicing.",
          );
      }
    }
  }

  return { rate, inclusive, source };
}
