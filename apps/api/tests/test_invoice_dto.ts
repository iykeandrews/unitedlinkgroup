import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateInvoiceDto } from '../src/invoices/dto/create-invoice.dto';

export async function run() {
  const good = {
    clientId: '11111111-1111-4111-8111-111111111111',
    issueDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    items: [
      { description: 'Service', quantity: 2, rate: 50 },
      { description: 'Product', quantity: 1, rate: 100 },
    ],
  };
  const dto = plainToInstance(CreateInvoiceDto, good);
  const errors = await validate(dto);
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
  const dtoBad = plainToInstance(CreateInvoiceDto, bad);
  const errorsBad = await validate(dtoBad);
  if (errorsBad.length === 0) {
    throw new Error('Expected invalid DTO to produce errors');
  }
}

