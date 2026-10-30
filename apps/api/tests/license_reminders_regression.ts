import assert from 'node:assert/strict';
import { EmployeesService } from '../src/employees/employees.service';

async function main() {
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const today = new Date(`${day}T00:00:00Z`);
  const records = [0, 1, 29, 30, 59, 60, 90, 91].map(days => ({
    id: `license-${days}`, type: 'LICENSE', name: 'Officer license',
    expiryDate: new Date(today.getTime() + days * 86400000),
    employee: { userId: 'worker', businessId: 'business', firstName: 'TEST', lastName: 'WORKER', business: { ownerId: 'admin' } },
  }));
  const saved = new Map<string, any>();
  let deliveries = 0;
  const db: any = {
    qualification: {
      findMany: async (q: any) => {
        if (!q.include) { assert.equal(q.where.status, 'ACTIVE'); return []; }
        assert.deepEqual(q.where.employee.status.in, ['ACTIVE', 'ON_LEAVE']);
        return records;
      },
    },
    employee: { findMany: async () => [{ userId: 'admin' }, { userId: 'second-admin' }] },
    notification: { create: async ({ data }: any) => {
      if (saved.has(data.id)) throw { code: 'P2002' };
      saved.set(data.id, data);
      return data;
    } },
  };
  const service = new EmployeesService(db, {} as any, { sendPush: async () => { deliveries++; } } as any, { send: async () => {} } as any);
  await service.checkExpiringQualifications();
  assert.equal(saved.size, 21, 'seven eligible days, employee and two distinct admins');
  assert.equal(deliveries, 21);
  await service.checkExpiringQualifications();
  assert.equal(deliveries, 21, 'hourly reruns must not redeliver');
  records[0].expiryDate = new Date(today.getTime() + 2 * 86400000);
  await service.checkExpiringQualifications();
  assert.equal(deliveries, 24, 'renewed expiry has independent reminders');
  (service as any).getBusinessId = async () => 'business';
  db.employee.findFirst = async () => null;
  assert.deepEqual(await service.getExpiringQualifications({ role: 'EMPLOYEE', userId: 'unlinked' }), [], 'unlinked employee must not see other employees');
  console.log('License reminder regression checks passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
