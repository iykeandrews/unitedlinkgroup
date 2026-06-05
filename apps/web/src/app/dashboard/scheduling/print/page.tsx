'use client';

import dynamic from 'next/dynamic';

const SchedulePrintView = dynamic(() => import('../../../../components/scheduling/SchedulePrintView'), { ssr: false });

export default function Page() {
  return <SchedulePrintView />;
}

