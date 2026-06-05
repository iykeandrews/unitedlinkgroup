'use client';

import React from 'react';
import IncidentList from '@/components/incidents/IncidentList';

export default function IncidentsPage() {
  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Incident Reports</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
            Log and track security incidents, accidents, and other events.
            </p>
        </div>
      </div>

      <IncidentList />
    </div>
  );
}
