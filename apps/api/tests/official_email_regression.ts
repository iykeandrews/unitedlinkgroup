import assert from 'node:assert/strict';
import * as bcrypt from 'bcryptjs';
import {AuthService} from '../src/auth/auth.service';
async function main() {
  const password = await bcrypt.hash('Synthetic-test-password', 4);
  const user:any = {id:'staff-account',email:'personal@example.test',role:'EMPLOYEE',password};
  const employee:any = {id:'staff',userId:user.id,role:'EMPLOYEE',status:'ACTIVE',businessId:'business',officialEmail:'work@example.test',user};
  const prisma:any = {employee:{findFirst:async ({where}:any) => where.officialEmail ? (where.officialEmail.equals === employee.officialEmail?.toLowerCase() ? employee : null) : employee},user:{update:async()=>{throw Error('Tests must never write login records')}}};
  const service = new AuthService({findOne:async (email:string)=>email===user.email?user:null} as any,{} as any,prisma);
  let checks = 0;
  for (const role of ['EMPLOYEE','MANAGER']) {
    user.role = role; employee.role = role;
    const result = await service.validateUser(' WORK@EXAMPLE.TEST ','Synthetic-test-password');
    assert.equal(result.employeeId,employee.id); assert.equal(result.password,undefined);checks++;
    assert.equal(await service.validateUser('personal@example.test','Synthetic-test-password'),null);checks++;
    assert.equal(await service.validateUser('work@example.test','wrong-password'),null);checks++;
    employee.officialEmail=null;
    assert.equal(await service.validateUser('personal@example.test','Synthetic-test-password'),null);checks++;
    employee.officialEmail='work@example.test';
  }
  console.log(`Passed ${checks} read-only official-email login checks for employee and manager accounts. Both web and mobile use the same /auth/login service; no accounts or passwords were changed.`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
