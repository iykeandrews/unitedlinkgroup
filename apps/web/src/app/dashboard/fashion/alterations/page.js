"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FashionAlterationsPage;
const lucide_react_1 = require("lucide-react");
function FashionAlterationsPage() {
    return (<div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
          <lucide_react_1.Scissors className="w-6 h-6"/>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Alterations & Repairs</h1>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <lucide_react_1.Scissors className="w-8 h-8 text-slate-400"/>
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Alterations Module</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Track customer alteration requests, tailoring schedules, and repair status. This module is currently under development.
        </p>
      </div>
    </div>);
}
