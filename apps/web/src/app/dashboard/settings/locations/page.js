"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LocationsSettingsPage;
const business_context_1 = require("../../../../context/business-context");
function LocationsSettingsPage() {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    if (!selectedBusiness) {
        return (<div className="flex items-center justify-center h-96">
        <p className="text-slate-500">Please select a business to manage locations.</p>
      </div>);
    }
    return (<div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Locations</h1>
      <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your branches and sites.</p>

      <div className="mt-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <p className="text-slate-600 dark:text-slate-300">
          Location management setup is coming soon. In the meantime, use the Business Profile page to maintain basic details.
        </p>
      </div>
    </div>);
}
