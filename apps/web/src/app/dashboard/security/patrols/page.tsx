'use client';

import React from 'react';
import PatrolLogList from '@/components/patrol-logs/PatrolLogList';

export default function PatrolsPage() {
  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Patrol Logs</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Real-time feed of all patrol activities across sites.
        </p>
      </div>

      <PatrolLogList />
    </div>
  );
}
