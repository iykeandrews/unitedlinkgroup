import { PrismaService } from '../prisma.service';
export interface TaxContext {
    rate: number;
    inclusive: boolean;
    source: 'location' | 'business' | 'default';
}
export declare function resolveTaxContext(prisma: PrismaService, businessId: string, locationId?: string): Promise<TaxContext>;
