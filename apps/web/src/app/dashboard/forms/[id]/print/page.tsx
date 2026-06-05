'use client';

import { useParams } from 'next/navigation';
import { EmployeeFormPrintView } from '../../../../../components/people/EmployeeFormPrintView';

export default function Page() {
  const params = useParams();
  const id = String((params as any)?.id || '');
  return <EmployeeFormPrintView assignmentId={id} />;
}

