"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const database_1 = require("@unitedlinkgroup/database");
const tax_util_1 = require("../src/common/tax.util");
async function run() {
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:/Users/it/Documents/trae_projects/unitedlinkgroup/packages/database/prisma/dev.db';
    process.stdout.write(`Using DATABASE_URL=${process.env.DATABASE_URL}\n`);
    const prisma = new database_1.PrismaClient();
    try {
        const owner = await prisma.user.create({
            data: {
                email: `owner_${Date.now()}@example.com`,
                password: 'test',
                role: 'BUSINESS_ADMIN',
            },
        });
        const business = await prisma.business.create({
            data: {
                name: `Biz ${Date.now()}`,
                ownerId: owner.id,
                country: 'United Kingdom',
                currencyCode: 'GBP',
                governmentInfo: JSON.stringify({ taxSystem: 'VAT', defaultStandardRate: 20, inclusive: false }),
            },
        });
        const location = await prisma.location.create({
            data: {
                name: 'London Store',
                address: '221B Baker Street',
                businessId: business.id,
            },
        });
        await prisma.location.update({
            where: { id: location.id },
            data: { taxOverrideInfo: JSON.stringify({ taxSystem: 'VAT', rate: 16, inclusive: true }) },
        });
        // Case 1: Location override
        const ctxLoc = await (0, tax_util_1.resolveTaxContext)(prisma, business.id, location.id);
        if (ctxLoc.rate !== 16 || ctxLoc.inclusive !== true || ctxLoc.source !== 'location') {
            throw new Error(`Location override failed: ${JSON.stringify(ctxLoc)}`);
        }
        // Case 2: Business fallback
        const ctxBiz = await (0, tax_util_1.resolveTaxContext)(prisma, business.id, undefined);
        if (ctxBiz.rate !== 20 || ctxBiz.inclusive !== false || ctxBiz.source !== 'business') {
            throw new Error(`Business fallback failed: ${JSON.stringify(ctxBiz)}`);
        }
        // Case 3: Default 0 when no info
        const bizNoInfo = await prisma.business.create({
            data: {
                name: `BizNo ${Date.now()}`,
                ownerId: owner.id,
                country: 'United States',
            },
        });
        const ctxDefault = await (0, tax_util_1.resolveTaxContext)(prisma, bizNoInfo.id, undefined);
        if (ctxDefault.rate !== 0) {
            throw new Error(`Default fallback failed: ${JSON.stringify(ctxDefault)}`);
        }
    }
    finally {
        await prisma.$disconnect();
    }
}
