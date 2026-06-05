'use client';

import { InventoryProvider } from '../../../context/inventory-context';

export default function FashionDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <InventoryProvider>
      {children}
    </InventoryProvider>
  );
}
