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
require("dotenv/config");
const database_1 = require("@unitedlinkgroup/database");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const http = __importStar(require("http"));
const url_1 = require("url");
function postJson(urlStr, payload) {
    const url = new url_1.URL(urlStr);
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: url.hostname,
            port: Number(url.port || 80),
            path: url.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(Buffer.from(c)));
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString('utf8');
                let body = null;
                try {
                    body = text ? JSON.parse(text) : null;
                }
                catch {
                    body = text;
                }
                resolve({ status: res.statusCode || 0, body });
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(payload));
        req.end();
    });
}
function getJson(urlStr, headers = {}) {
    const url = new url_1.URL(urlStr);
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: url.hostname,
            port: Number(url.port || 80),
            path: url.pathname,
            method: 'GET',
            headers,
        }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(Buffer.from(c)));
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString('utf8');
                let body = null;
                try {
                    body = text ? JSON.parse(text) : null;
                }
                catch {
                    body = text;
                }
                resolve({ status: res.statusCode || 0, body });
            });
        });
        req.on('error', reject);
        req.end();
    });
}
async function main() {
    var _a, _b;
    let ok = true;
    const args = new Set(process.argv.slice(2));
    const skipHttp = args.has('--skip-http') || args.has('--health-only');
    const apiBase = process.env.API_BASE_URL || 'http://localhost:3001';
    const email = process.env.SELF_TEST_EMAIL || 'superadmin@unitedlinksecurity.com';
    const password = process.env.SELF_TEST_PASSWORD || 'pastork';
    const dbUrl = process.env.DATABASE_URL || '';
    let sqlitePath = '';
    if (dbUrl.startsWith('file:')) {
        sqlitePath = dbUrl.replace(/^file:/, '');
        if (!path.isAbsolute(sqlitePath)) {
            sqlitePath = path.resolve(process.cwd(), sqlitePath);
        }
    }
    if (sqlitePath) {
        if (fs.existsSync(sqlitePath)) {
            console.log(`Database file OK: ${sqlitePath}`);
            process.env.DATABASE_URL = `file:${sqlitePath}`;
        }
        else {
            console.error(`Database file MISSING: ${sqlitePath}`);
            ok = false;
        }
    }
    else {
        console.log('Non-sqlite DATABASE_URL or not set, skipping file check');
    }
    const prisma = new database_1.PrismaClient();
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
            console.log(`User found: ${user.email} (role=${user.role})`);
        }
        else {
            console.error(`User not found: ${email}`);
            ok = false;
        }
    }
    catch (e) {
        console.error('Prisma connectivity failed');
        console.error(String(e));
        ok = false;
    }
    finally {
        await prisma.$disconnect();
    }
    if (!skipHttp) {
        try {
            const loginRes = await postJson(`${apiBase}/auth/login`, { email, password });
            if (loginRes.status >= 200 && loginRes.status < 300 && ((_a = loginRes.body) === null || _a === void 0 ? void 0 : _a.access_token)) {
                console.log('Login OK');
                const token = loginRes.body.access_token;
                const profileRes = await getJson(`${apiBase}/auth/profile`, { Authorization: `Bearer ${token}` });
                if (profileRes.status === 200 && ((_b = profileRes.body) === null || _b === void 0 ? void 0 : _b.email) === email) {
                    console.log('Profile OK');
                }
                else {
                    console.error('Profile check failed');
                    ok = false;
                }
            }
            else {
                console.error(`Login failed: status=${loginRes.status} body=${JSON.stringify(loginRes.body)}`);
                ok = false;
            }
        }
        catch (e) {
            console.error('HTTP checks failed');
            console.error(String(e));
            ok = false;
        }
    }
    if (!ok) {
        process.exitCode = 1;
        return;
    }
    console.log('Self-test passed');
}
main();
