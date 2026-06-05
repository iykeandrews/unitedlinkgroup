"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FashionModelsPage;
const lucide_react_1 = require("lucide-react");
function FashionModelsPage() {
    return (<div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
          <lucide_react_1.Users className="w-6 h-6"/>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Models & Talent</h1>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <lucide_react_1.Users className="w-8 h-8 text-slate-400"/>
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Models & Talent Module</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Manage model bookings, casting calls, and talent portfolios. This module is currently under development.
        </p>
      </div>
    </div>);
}
