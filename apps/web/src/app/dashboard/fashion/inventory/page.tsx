'use client';

import { Shirt } from 'lucide-react';
import InventoryStats from '../../../../components/fashion/inventory/InventoryStats';
import InventoryTable from '../../../../components/fashion/inventory/InventoryTable';

export default function FashionInventoryPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
          <Shirt className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventory & Stock</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage products, stock levels, and adjustments.</p>
        </div>
      </div>
      
      <InventoryStats />
      <InventoryTable />
    </div>
  );
}
