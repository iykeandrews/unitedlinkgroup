'use client';

import { useParams } from 'next/navigation';
import { EmployeeFormFill } from '../../../../components/people/EmployeeFormFill';

export default function Page() {
  const params = useParams();
  const id = String((params as any)?.id || '');
  return <EmployeeFormFill assignmentId={id} />;
}

