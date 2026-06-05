"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTaxContext = resolveTaxContext;
async function resolveTaxContext(prisma, businessId, locationId) {
    let rate = 0;
    let inclusive = false;
    let source = 'default';
    if (locationId) {
        const loc = await prisma.location.findFirst({ where: { id: locationId, businessId } });
        const taxOverrideInfo = loc === null || loc === void 0 ? void 0 : loc.taxOverrideInfo;
        if (taxOverrideInfo) {
            try {
                const info = typeof taxOverrideInfo === 'string' ? JSON.parse(taxOverrideInfo) : taxOverrideInfo;
                if (typeof info.rate === 'number') {
                    rate = info.rate;
                    source = 'location';
                }
                if (typeof info.inclusive === 'boolean')
                    inclusive = info.inclusive;
            }
            catch { }
        }
    }
    if (rate === 0) {
        const biz = await prisma.business.findUnique({ where: { id: businessId } });
        const governmentInfo = biz === null || biz === void 0 ? void 0 : biz.governmentInfo;
        if (governmentInfo) {
            try {
                const gov = typeof governmentInfo === 'string' ? JSON.parse(governmentInfo) : governmentInfo;
                if (typeof gov.defaultStandardRate === 'number') {
                    rate = gov.defaultStandardRate;
                    source = 'business';
                }
                if (typeof gov.inclusive === 'boolean')
                    inclusive = gov.inclusive;
            }
            catch { }
        }
    }
    return { rate, inclusive, source };
}
