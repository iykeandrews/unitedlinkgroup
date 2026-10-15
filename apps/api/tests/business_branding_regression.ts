import assert from 'node:assert/strict';
import { BusinessesService } from '../src/businesses/businesses.service';
import { businessProfileFields, mergeBusinessSelection } from '../../web/src/context/business-selection';
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
  console.log('Business branding checks passed: persisted reload, unchanged preservation, explicit clearing, replacement and business isolation.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
