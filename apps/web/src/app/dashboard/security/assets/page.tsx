'use client';

import React from 'react';
import AssetList from '@/components/assets/AssetList';

export default function AssetsPage() {
  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Equipment & Assets</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage security gear, vehicles, and other assets.
            </p>
        </div>
      </div>

      <AssetList />
    </div>
  );
}
