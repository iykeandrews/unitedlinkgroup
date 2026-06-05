'use client';

import { PosProvider } from '../../../../context/pos-context';
import { PosLayout } from '../../../../components/fashion/pos/PosLayout';
import { BusinessProvider } from '../../../../context/business-context';

export default function FashionPOSPage() {
  return (
    <BusinessProvider>
      <PosProvider>
        <PosLayout />
      </PosProvider>
    </BusinessProvider>
  );
}
