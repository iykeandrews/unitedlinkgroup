'use client';

import dynamic from 'next/dynamic';

const PaymentsPage = dynamic(() => import('../../../../components/payments/PaymentsPage'), { ssr: false });

export default function Page() {
  return <PaymentsPage />;
}

