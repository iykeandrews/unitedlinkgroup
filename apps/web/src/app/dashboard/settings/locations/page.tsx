'use client';

import Link from 'next/link';
import { useBusiness } from '../../../../context/business-context';

export default function LocationsSettingsPage() {
  const { selectedBusiness } = useBusiness();

  if (!selectedBusiness) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500">Please select a business to manage locations.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Locations</h1>
      <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your branches and sites.</p>

      <div className="mt-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <p className="text-slate-600 dark:text-slate-300">
          Manage site details, billing PINs, officer categories and shift configurations in Location Management.
        </p>
        <Link href="/dashboard/security/sites" className="mt-4 inline-block rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white">Open location management</Link>
      </div>
    </div>
  );
}

