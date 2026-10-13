import assert from 'node:assert/strict';
import { EmployeesService } from '../src/employees/employees.service';
import { DirectoryEmployee, directoryCsv, matchesDirectory, roleLabel, savedPay, toggleVisibleSelection } from '../../web/src/components/people/directory';
const employee: DirectoryEmployee = { id: 'person', firstName: 'Ada', lastName: 'Jones', email: 'ada@example.test', role: 'EMPLOYEE', status: 'ACTIVE', type: 'FULL_TIME', payType: 'HOURLY', defaultLocationId: 'site', defaultLocation: { id: 'site', name: 'North Gate' } };
let checks = 0;
function check(actual: unknown, expected: unknown) { assert.deepEqual(actual, expected); checks++; }
async function main() {
  check(savedPay(employee), null);
  check(savedPay({ ...employee, hourlyRate: 0 }), { amount: 0, unit: 'hour' });
  check(savedPay({ ...employee, payType: 'SALARY', salary: 52000 }), { amount: 52000, unit: 'year' });
  check(savedPay({ ...employee, hourlyRate: 19, w2Profile: { rate: 28, payType: 'HOURLY' } }), { amount: 28, unit: 'hour' });
  check(savedPay({ ...employee, workerType: 'CONTRACTOR_1099', contractorProfile: { rate: 35 } }), { amount: 35, unit: 'hour' });
  check(savedPay({ ...employee, hourlyRate: NaN }), null);
  check(matchesDirectory(employee, 'Ada Jones'), true);
  check(matchesDirectory(employee, 'north ada'), true);
  check(matchesDirectory(employee, 'south'), false);
  check(roleLabel({ ...employee, role: 'SECURITY_OFFICER' }), 'Security Officer');
  check(roleLabel({ ...employee, customRole: { name: 'Site Supervisor' } }), 'Site Supervisor');
  check(Array.from(toggleVisibleSelection(new Set(['other', 'person']), ['person'])), ['other']);
  check(Array.from(toggleVisibleSelection(new Set(['other']), ['person'])), ['other', 'person']);
  const csv = directoryCsv([{ ...employee, firstName: '=2+2', lastName: 'Jones, "Ada"' }]);
  check(csv.includes('"\'=2+2"'), true);
  check(csv.includes('"Jones, ""Ada"""'), true);
  check(csv.includes('SSN'), false);
  const user = { role: 'SUPER_ADMIN', userId: 'admin' };
  let written: any;
  const person = { ...employee, businessId: 'business', ssn: 'encrypted-tax-id' };
  const prisma: any = {
    employee: {
      findFirst: async ({ where }: any) => where.email ? null : person,
      findMany: async () => [person],
      update: async ({ data }: any) => { written = data; return { ...person, ...data }; },
      create: async ({ data }: any) => { written = data; return data; },
    },
    shift: { findFirst: async () => ({ id: 'upcoming-shift' }) },
    timesheet: { findFirst: async () => null },
    location: { findFirst: async () => null },
  };
  const service = new EmployeesService(prisma, { decrypt: () => { throw new Error('Directory must not decrypt tax identifiers'); } } as any, {} as any, {} as any);
  const directory = await service.findAll(user, undefined, 'business');
  check('ssn' in directory[0], false);
  await assert.rejects(() => service.update(user, 'person', { status: 'INACTIVE' }, 'business'), /upcoming shifts and open timesheets/); checks++;
  prisma.shift.findFirst = async () => null;
  prisma.timesheet.findFirst = async () => ({ id: 'active-timesheet' });
  await assert.rejects(() => service.update(user, 'person', { status: 'INACTIVE' }, 'business'), /open timesheets/); checks++;
  prisma.timesheet.findFirst = async () => null;
  await service.update(user, 'person', { status: 'INACTIVE' }, 'business');
  check(written.status, 'INACTIVE');
  await service.update(user, 'person', { status: 'ACTIVE' }, 'business');
  check(written.status, 'ACTIVE');
  await assert.rejects(() => service.update(user, 'person', { status: 'UNKNOWN' }, 'business'), /Invalid employee status/); checks++;
  await assert.rejects(() => service.update(user, 'person', { defaultLocationId: 'other-site' }, 'business'), /from this business/); checks++;
  await assert.rejects(() => service.update(user, 'person', { supervisorId: 'person' }, 'business'), /cannot supervise themselves/); checks++;
  prisma.location.findFirst = async () => ({ id: 'site', businessId: 'business', status: 'ACTIVE' });
  await service.create(user, { ...employee, firstName: ' Ada ', lastName: ' Jones ', email: ' ADA@EXAMPLE.TEST ' }, 'business');
  check(written.email, 'ada@example.test'); check(written.firstName, 'Ada');
  await assert.rejects(() => service.create(user, { ...employee, email: 'invalid' }, 'business'), /valid email/); checks++;
  await assert.rejects(() => service.update(user, 'person', { email: 'bad' }, 'business'), /valid email/); checks++;
  console.log(`Passed ${checks} People regression checks`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
