import { PrismaService } from '../prisma.service';

export interface TaxContext {
  rate: number;
  inclusive: boolean;
  source: 'location' | 'business' | 'default';
}

export async function resolveTaxContext(prisma: PrismaService, businessId: string, locationId?: string): Promise<TaxContext> {
  let rate = 0;
  let inclusive = false;
  let source: TaxContext['source'] = 'default';

  if (locationId) {
    const loc = await prisma.location.findFirst({ where: { id: locationId, businessId } });
    const taxOverrideInfo = (loc as any)?.taxOverrideInfo;
    if (taxOverrideInfo) {
      try {
        const info = typeof taxOverrideInfo === 'string' ? JSON.parse(taxOverrideInfo) : taxOverrideInfo;
        if (typeof info.rate === 'number') {
          rate = info.rate;
          source = 'location';
        }
        if (typeof info.inclusive === 'boolean') inclusive = info.inclusive;
      } catch {}
    }
  }

  if (rate === 0) {
    const biz = await prisma.business.findUnique({ where: { id: businessId } });
    const governmentInfo = (biz as any)?.governmentInfo;
    if (governmentInfo) {
      try {
        const gov = typeof governmentInfo === 'string' ? JSON.parse(governmentInfo) : governmentInfo;
        if (typeof gov.defaultStandardRate === 'number') {
          rate = gov.defaultStandardRate;
          source = 'business';
        }
        if (typeof gov.inclusive === 'boolean') inclusive = gov.inclusive;
      } catch {}
    }
  }

  return { rate, inclusive, source };
}

