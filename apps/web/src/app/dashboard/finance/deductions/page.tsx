'use client';

import dynamic from 'next/dynamic';

const DeductionsPage = dynamic(() => import('../../../../components/deductions/DeductionsPage'), { ssr: false });

export default function Page() {
  return <DeductionsPage />;
}

