"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@unitedlinkgroup/database");
async function main() {
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:/Users/it/Documents/trae_projects/unitedlinkgroup/packages/database/prisma/dev.db';
    const prisma = new database_1.PrismaClient();
    try {
        const cols = await prisma.$queryRawUnsafe('PRAGMA table_info(\"Location\");');
        console.log(cols);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
