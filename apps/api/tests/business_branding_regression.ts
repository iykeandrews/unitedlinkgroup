import assert from 'node:assert/strict';
import { BusinessesService } from '../src/businesses/businesses.service';
import { businessProfileFields, hydrateBusinessProfile, mergeBusinessSelection } from '../../web/src/context/business-selection';
async function main() {
  const records: any = { A: { id: 'A', name: 'Company A', ownerId: 'ownerA', status: 'ACTIVE', logoUrl: 'https://logos.example.test/a.png' }, B: { id: 'B', name: 'Company B', ownerId: 'ownerB', status: 'ACTIVE', logoUrl: 'https://logos.example.test/b.png' } };
  const db: any = { business: {
    findUnique: async ({ where }: any) => structuredClone(records[where.id]),
    findFirst: async ({ where }: any) => structuredClone(Object.values(records).find((business: any) => where.ownerId ? business.ownerId === where.ownerId : business.id === where.id)),
    update: async ({ where, data }: any) => { records[where.id] = { ...records[where.id], ...data }; return structuredClone(records[where.id]); },
  } };
  const service = new BusinessesService(db);
  const unchanged = businessProfileFields({ name: 'Updated Company A', logoUrl: '' }, false);
  assert(!('logoUrl' in unchanged));
  await service.updateForUser({ role: 'SUPER_ADMIN' }, 'A', unchanged, 'A');
  await service.updateForUser({ role: 'SUPER_ADMIN' }, 'A', { logoUrl: '' }, 'A');
  const fresh = await service.findMine('ownerA');
  assert(fresh);
  assert.equal(fresh.logoUrl, 'https://logos.example.test/a.png');
  assert.equal(mergeBusinessSelection({ id: 'A', name: 'Summary A' } as any, fresh).logoUrl, fresh.logoUrl);
  assert.equal(mergeBusinessSelection({ id: 'B', name: 'Summary B' } as any, fresh).logoUrl, undefined);
  await service.updateForUser({ role: 'SUPER_ADMIN' }, 'A', businessProfileFields({ logoUrl: '' }, true), 'A');
  assert.equal((await service.findMine('ownerA'))?.logoUrl, '');
  await service.updateForUser({ role: 'SUPER_ADMIN' }, 'A', businessProfileFields({ logoUrl: ' https://logos.example.test/new-a.png ' }, true), 'A');
  assert.equal((await service.findMine('ownerA'))?.logoUrl, 'https://logos.example.test/new-a.png');
  assert.equal(records.B.logoUrl, 'https://logos.example.test/b.png');
  await assert.rejects(() => service.updateForUser({ role: 'SUPER_ADMIN' }, 'B', {}, 'A'), /another business/);
  const profile = {
    name: 'Saved company', ein: '12-3456789', industry: 'Security', businessType: 'LLC',
    employeeCount: '42', currencyCode: 'USD', mobile: '2025550100', address: '100 Example Street',
    city: 'Bowie', state: 'MD', zip: '20720', country: 'United States',
    logoUrl: 'https://logos.example.test/saved.png', softwareName: 'Saved workspace',
  };
  const edited = new Set(Object.keys(profile));
  const fields = businessProfileFields(profile, true, edited);
  delete fields.softwareName;
  await service.updateForUser({ role: 'SUPER_ADMIN' }, 'A', { ...fields, settings: JSON.stringify({ softwareName: profile.softwareName }) }, 'A');
  const reloaded: any = await service.findMine('ownerA');
  for (const [key, value] of Object.entries(profile)) {
    assert.equal(key === 'softwareName' ? JSON.parse(reloaded.settings).softwareName : reloaded[key], value, `saved ${key} must survive a fresh read`);
  }
  const clearAddress = businessProfileFields({ address: '', currencyCode: 'USD', name: '' }, false, new Set(['address']));
  assert.deepEqual(clearAddress, { address: '' });
  await service.updateForUser({ role: 'SUPER_ADMIN' }, 'A', clearAddress, 'A');
  const cleared: any = await service.findMine('ownerA');
  assert.equal(cleared.address, '');
  assert.equal(cleared.name, profile.name);
  assert.equal(cleared.logoUrl, profile.logoUrl);
  assert.deepEqual(hydrateBusinessProfile({ name: 'Server name', city: 'Saved city' }, { name: 'Pending edit', city: '' }, new Set(['name'])), { name: 'Pending edit', city: 'Saved city' });
  assert.equal(records.B.name, 'Company B');
  console.log('Business profile checks passed: all fields, optional field clearing, draft preservation, persisted reload, unchanged preservation, explicit clearing, replacement and business isolation.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
