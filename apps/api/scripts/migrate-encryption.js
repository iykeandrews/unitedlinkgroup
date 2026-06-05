"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@unitedlinkgroup/database");
const crypto = __importStar(require("crypto"));
const prisma = new database_1.PrismaClient();
const secret = process.env.ENCRYPTION_SECRET || 'development_secret_do_not_use_in_prod';
const key = crypto.scryptSync(secret, 'salt', 32);
const algorithm = 'aes-256-cbc';
function encrypt(text) {
    if (!text)
        return text;
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    }
    catch (error) {
        console.error('Encryption failed:', error);
        return text;
    }
}
async function main() {
    console.log('Starting SSN encryption migration...');
    const employees = await prisma.employee.findMany({
        where: {
            ssn: { not: null }
        }
    });
    let count = 0;
    for (const emp of employees) {
        if (!emp.ssn)
            continue;
        // Check if already encrypted (heuristic: contains colon and hex-like)
        if (emp.ssn.includes(':') && emp.ssn.split(':')[0].length === 32) {
            console.log(`Skipping ${emp.firstName} ${emp.lastName} (already encrypted)`);
            continue;
        }
        console.log(`Encrypting SSN for ${emp.firstName} ${emp.lastName}`);
        const encryptedSSN = encrypt(emp.ssn);
        await prisma.employee.update({
            where: { id: emp.id },
            data: { ssn: encryptedSSN }
        });
        count++;
    }
    console.log(`Migration complete. Encrypted ${count} records.`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
