'use client';

import Link from 'next/link';
import { useBusiness } from '../../../../context/business-context';

export default function RolesSettingsPage() {
  const { selectedBusiness } = useBusiness();

  if (!selectedBusiness) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500">Please select a business to manage roles.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roles & Permissions</h1>
      <p className="text-slate-500 dark:text-slate-400 mt-2">Manage system roles and their access.</p>

      <div className="mt-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <p className="text-slate-600 dark:text-slate-300">
          Visit the dedicated roles page under People to assign and manage permissions.
        </p>
        <Link 
          href="/dashboard/people/roles" 
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go to Roles Management
        </Link>
      </div>
    </div>
  );
}

