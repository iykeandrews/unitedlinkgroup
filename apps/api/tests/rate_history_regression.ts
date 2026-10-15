import assert from 'node:assert/strict';
import { rateChanges } from '../src/employees/rate-history.util';
import { EmployeesService } from '../src/employees/employees.service';
const base = { id: 'worker', businessId: 'business', role: 'EMPLOYEE', workerType: 'W2', payType: 'HOURLY', hourlyRate: 20, paySchedule: 'SEMI_MONTHLY', w2Profile: { rate: 20, payType: 'HOURLY', paySchedule: 'SEMI_MONTHLY' } };
async function main() {
  const withRate = (rate: number) => ({ ...base, w2Profile: { ...base.w2Profile, rate } });
  assert.deepEqual(rateChanges(base, { ...base, firstName: 'Updated' }), []);
  assert.equal(rateChanges(base, withRate(22))[0].percentage, 10);
  assert.equal(rateChanges(base, withRate(22))[0].previousRate, 20);
  assert.equal(rateChanges(base, withRate(18))[0].change, 'DECREASE');
  const salary = rateChanges(base, { ...base, w2Profile: { ...base.w2Profile, payType: 'SALARY', rate: 60000 } })[0];
  assert.equal(salary.change, 'PAY_TYPE_CHANGED'); assert.equal(salary.percentage, null);
  assert.equal(rateChanges(withRate(0), base)[0].percentage, null);
  const both = { ...base, workerType: 'BOTH', contractorProfile: { rate: 30 } };
  assert.deepEqual(rateChanges(both, { ...withRate(21), workerType: 'BOTH', contractorProfile: { rate: 35 } }).map(c => c.classification), ['W2', 'CONTRACTOR_1099']);
  assert.equal(rateChanges(base, { ...base, w2Profile: { ...base.w2Profile, paySchedule: 'WEEKLY' } }).length, 0);
  let state: any = structuredClone(base), logs: any[] = [], failAudit = false, locked = false;
  const prisma: any = {
    employee: {
      findFirst: async ({ where }: any) => where.businessId && where.businessId !== state.businessId ? null : structuredClone(state),
      findUnique: async () => structuredClone(state),
      update: async ({ data }: any) => { assert(locked); const { w2Profile, ...rest } = data; state = { ...state, ...rest, ...(w2Profile ? { w2Profile: { ...state.w2Profile, ...w2Profile.upsert.update } } : {}) }; return structuredClone(state); },
    },
    business: { findUnique: async () => ({ currencyCode: 'USD' }) },
    $queryRawUnsafe: async () => { locked = true; return [{ id: state.id }]; },
    auditLog: {
      create: async ({ data }: any) => { if (failAudit) throw new Error('Synthetic audit failure'); logs.push(data); return data; },
      findFirst: async () => null,
      findMany: async ({ where }: any) => { assert.equal(where.businessId, 'business'); assert.equal(where.resourceId, 'worker'); return logs.map((log, i) => ({ ...log, id: String(i), user: { firstName: 'Test', lastName: 'Admin' }, createdAt: new Date() })); },
    },
    $transaction: async (callback: any) => { const before = structuredClone(state), oldLogs = [...logs]; try { return await callback(prisma); } catch (e) { state = before; logs = oldLogs; throw e; } finally { locked = false; } },
  };
  const service = new EmployeesService(prisma, {} as any, {} as any, {} as any);
  const user = { role: 'SUPER_ADMIN', userId: 'admin' };
  await service.update(user, 'worker', { hourlyRate: 22 }, 'business');
  assert.equal(state.w2Profile.rate, 22); assert.equal(logs.length, 1); assert.equal(logs[0].userId, 'admin');
  await service.update(user, 'worker', { hourlyRate: 22 }, 'business'); assert.equal(logs.length, 1);
  failAudit = true; const originalError = console.error; console.error = () => {};
  try { await assert.rejects(() => service.update(user, 'worker', { hourlyRate: 25 }, 'business'), /Synthetic audit failure/); } finally { console.error = originalError; }
  assert.equal(state.w2Profile.rate, 22); assert.equal(logs.length, 1);
  const history = await service.getRateHistory(user, 'worker', 'business');
  assert.equal(history.items.length, 1); assert.equal(history.items[0].changedBy, 'Test Admin');
  await assert.rejects(() => service.getRateHistory(user, 'worker', 'other-business'), /Employee not found/);
  await assert.rejects(() => service.getRateHistory(user, 'worker', 'business', 'foreign-cursor'), /Invalid rate history cursor/);
  prisma.auditLog.findMany = async (query: any) => {
    assert.equal(query.take, 51);
    assert.deepEqual(query.orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
    return Array.from({ length: 51 }, (_, i) => ({ id: `entry-${i}`, createdAt: new Date(), user: null, details: JSON.stringify({ currencyCode: 'USD', changes: [] }) }));
  };
  const firstPage = await service.getRateHistory(user, 'worker', 'business');
  assert.equal(firstPage.items.length, 50); assert.equal(firstPage.nextCursor, 'entry-49');
  prisma.auditLog.findFirst = async () => ({ id: 'entry-49' });
  prisma.auditLog.findMany = async (query: any) => { assert.equal(query.cursor.id, 'entry-49'); assert.equal(query.skip, 1); return []; };
  assert.equal((await service.getRateHistory(user, 'worker', 'business', 'entry-49')).nextCursor, null);
  console.log('Rate history checks passed: increases, decreases, pay type, dual profiles, no-ops, rollback, actor and tenant isolation.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
