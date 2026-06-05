
import { PrismaClient } from '@unitedlinkgroup/database';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const secret = process.env.ENCRYPTION_SECRET || 'development_secret_do_not_use_in_prod';
const key = crypto.scryptSync(secret, 'salt', 32);
const algorithm = 'aes-256-cbc';

function encrypt(text: string): string {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
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
        if (!emp.ssn) continue;
        
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
