"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
require("reflect-metadata");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_invoice_dto_1 = require("../src/invoices/dto/create-invoice.dto");
async function run() {
    const good = {
        clientId: '11111111-1111-4111-8111-111111111111',
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        items: [
            { description: 'Service', quantity: 2, rate: 50 },
            { description: 'Product', quantity: 1, rate: 100 },
        ],
    };
    const dto = (0, class_transformer_1.plainToInstance)(create_invoice_dto_1.CreateInvoiceDto, good);
    const errors = await (0, class_validator_1.validate)(dto);
    if (errors.length) {
        throw new Error('Expected valid DTO, got errors: ' + JSON.stringify(errors));
    }
    const bad = {
        clientId: 'not-a-uuid',
        issueDate: 'invalid',
        dueDate: 'invalid',
        items: [{ description: '', quantity: -1, rate: -5 }],
        locationId: 'also-invalid',
    };
    const dtoBad = (0, class_transformer_1.plainToInstance)(create_invoice_dto_1.CreateInvoiceDto, bad);
    const errorsBad = await (0, class_validator_1.validate)(dtoBad);
    if (errorsBad.length === 0) {
        throw new Error('Expected invalid DTO to produce errors');
    }
}
