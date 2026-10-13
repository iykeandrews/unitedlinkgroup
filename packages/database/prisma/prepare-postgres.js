const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'schema.prisma'), 'utf8');
if (!/provider\s*=\s*"postgresql"/.test(source)) throw new Error('Canonical schema must use PostgreSQL.');
fs.mkdirSync(path.join(__dirname, 'postgres'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'postgres/schema.prisma'), source.replace('output   = "./client"', 'output   = "../client"'));
