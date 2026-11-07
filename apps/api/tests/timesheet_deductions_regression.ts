import assert from 'node:assert/strict';
import { timesheetDeductions } from '../src/time-tracking/timesheet-deductions';
const loan = {id:'advance', employeeId:'worker', reason:'Salary advance [2026-10-16 to 2026-10-31]', amount:35, status:'APPROVED'};
assert.deepEqual(timesheetDeductions([loan], [], '2026-10-16', '2026-10-31'), {worker:35});
assert.deepEqual(timesheetDeductions([loan], [], '2026-11-01', '2026-11-15'), {});
assert.deepEqual(timesheetDeductions([loan], [{employeeId:'worker',deductions:35,deductionDetails:JSON.stringify({loans:[{loanId:'advance',amount:35}]})}], '2026-10-16','2026-10-31'), {worker:35});
assert.deepEqual(timesheetDeductions([{...loan,status:'REJECTED'}], [], '2026-10-16', '2026-10-31'), {});
console.log('Timesheet deduction period and duplicate recovery checks passed');
