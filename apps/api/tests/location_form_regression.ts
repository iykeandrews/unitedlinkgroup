import 'reflect-metadata';
import assert from 'node:assert/strict';
import { ValidationPipe } from '@nestjs/common';
import { CreateLocationDto } from '../src/locations/dto/create-location.dto';
import { UpdateLocationDto } from '../src/locations/dto/update-location.dto';
import { LocationsService } from '../src/locations/locations.service';

async function main() {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (body: any, metatype: any) => pipe.transform(body, { type: 'body', metatype });
  const payload = {
    name: 'New site', address: '123 Main Street', code: '', clientId: '',
    workOrder: null, startDate: null, endDate: null, geoLat: null, geoLng: null,
    status: 'ACTIVE', radius: 100, billingPins: [],
    incidentReportEmails: [], incidentReportCcEmails: [],
  };
  const empty = await validate(payload, CreateLocationDto);
  assert.deepEqual(empty.incidentReportEmails, []);
  const recipients = { incidentReportEmails: ['Client@example.com'], incidentReportCcEmails: ['manager@example.com'] };
  const populated = await validate({ ...payload, ...recipients }, CreateLocationDto);
  const update = await validate(recipients, UpdateLocationDto);
  assert.deepEqual(update.incidentReportEmails, recipients.incidentReportEmails);
  for (const dto of [CreateLocationDto, UpdateLocationDto]) {
    const base = dto === CreateLocationDto ? payload : {};
    for (const field of ['incidentReportEmails', 'incidentReportCcEmails']) {
      for (const invalid of ['client@example.com', ['invalid'], Array(51).fill('client@example.com')]) {
        await assert.rejects(() => validate({ ...base, [field]: invalid }, dto));
      }
    }
    await assert.rejects(() => validate({ ...base, unrelatedField: true }, dto));
  }
  let saved: any;
  const service = new LocationsService({
    business: { findUnique: async () => ({ id: 'business' }) },
    location: { create: async ({ data }: any) => { saved = data; return data; } },
  } as any, { geocode: async () => null } as any);
  await service.create({ role: 'SUPER_ADMIN' }, empty, 'business');
  assert.equal(saved.businessId, 'business');
  assert.equal(saved.incidentReportEmails, '[]');
  await service.create({ role: 'SUPER_ADMIN' }, populated, 'business');
  assert.deepEqual(JSON.parse(saved.incidentReportEmails), ['client@example.com']);
  assert.deepEqual(JSON.parse(saved.incidentReportCcEmails), ['manager@example.com']);
  console.log('PASS: new-site form, optional recipients, edit validation, invalid email rejection, strict field validation, and scoped persistence. No email sent.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
