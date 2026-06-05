'use client';

import dynamic from 'next/dynamic';

const SchedulingPage = dynamic(
  () => import('../../../components/scheduling/SchedulingPage'),
  { ssr: false }
);

export default function Page() {
  return <SchedulingPage />;
}
