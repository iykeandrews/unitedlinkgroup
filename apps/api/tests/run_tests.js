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
async function run(name, fn) {
    process.stdout.write(`Running ${name}...\n`);
    try {
        await fn();
        process.stdout.write(`✓ ${name} passed\n`);
    }
    catch (e) {
        process.stderr.write(`✗ ${name} failed: ${String(e)}\n`);
        throw e;
    }
}
async function main() {
    const tests = [
        ['DTO: CreateInvoiceDto validation', async () => (await Promise.resolve().then(() => __importStar(require('./test_invoice_dto')))).run()],
        ['Util: resolveTaxContext', async () => (await Promise.resolve().then(() => __importStar(require('./test_tax_util')))).run()],
    ];
    let ok = true;
    for (const [name, fn] of tests) {
        try {
            await run(name, fn);
        }
        catch {
            ok = false;
        }
    }
    if (!ok) {
        process.exitCode = 1;
    }
    else {
        process.stdout.write('All tests passed\n');
    }
}
main();
