'use client';

import { EmployeeFormsAdmin } from '../../../../components/people/EmployeeFormsAdmin';
import Link from 'next/link';

export default function Page() {
  return (
    <>
      <Link href="/dashboard/people/employment-letters" className="mt-4 inline-flex rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-indigo-700 dark:border-slate-700 dark:text-indigo-300">
        Employee folders · Appointment letters
      </Link>
      <EmployeeFormsAdmin type="EMPLOYMENT_FORM" />
    </>
  );
}
