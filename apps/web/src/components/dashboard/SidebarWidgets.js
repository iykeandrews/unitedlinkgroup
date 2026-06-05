"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarWidgets = SidebarWidgets;
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const business_context_1 = require("../../context/business-context");
const localization_1 = require("../../lib/localization");
function SidebarWidgets({ expiringQualifications, stats, hasModule }) {
    const router = (0, navigation_1.useRouter)();
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    return (<div className="space-y-6">
      {/* Expiring Qualifications Widget */}
      {expiringQualifications.length > 0 && (<div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700/50 bg-red-50/50 dark:bg-red-900/10 flex justify-between items-center">
            <h2 className="font-semibold text-red-900 dark:text-red-200 flex items-center gap-2">
              <lucide_react_1.AlertCircle size={18} className="text-red-600 dark:text-red-400"/>
              Expiring Qualifications
            </h2>
            <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800/30">
              {expiringQualifications.length}
            </span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700/50 max-h-80 overflow-y-auto custom-scrollbar">
            {expiringQualifications.map((qual) => {
                const days = Math.ceil((new Date(qual.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isExpired = days < 0;
                return (<div key={qual.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-colors group cursor-pointer" onClick={() => router.push(`/dashboard/people?employee=${qual.employee.id}&tab=qualifications`)}>
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="font-medium text-gray-900 dark:text-white text-sm">{qual.employee.firstName} {qual.employee.lastName}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isExpired
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800/30'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800/30'}`}>
                      {isExpired ? 'Expired' : `${days} Days`}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">{qual.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      Expires: {(0, localization_1.formatDate)(qual.expiryDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}
                    </p>
                    <lucide_react_1.ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors"/>
                  </div>
                </div>);
            })}
          </div>
        </div>)}

      {/* Payroll Widget */}
      {hasModule('Pay') && (<div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-lg shadow-indigo-500/20 overflow-hidden text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-10 -mb-10"></div>
          
          <div className="p-6 relative z-10">
            <div className="flex items-center gap-2 mb-6 text-indigo-100">
              <lucide_react_1.Wallet className="w-5 h-5"/>
              <h2 className="font-semibold">Payroll Status</h2>
            </div>
            
            {(stats === null || stats === void 0 ? void 0 : stats.nextPayroll) ? (<div>
                <p className="text-sm text-indigo-200 font-medium">Next Pay Date</p>
                <p className="text-3xl font-bold mt-1 tracking-tight">
                  {(0, localization_1.formatDate)(stats.nextPayroll.payDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country, { month: 'short', day: 'numeric' })}
                </p>
                
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex justify-between text-sm mb-4">
                    <span className="text-indigo-200">Period Ends</span>
                    <span className="font-medium">{(0, localization_1.formatDate)(stats.nextPayroll.periodEnd, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}</span>
                  </div>
                  <button onClick={() => router.push('/dashboard/payroll')} className="w-full py-2.5 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 font-semibold text-sm transition-colors shadow-sm">
                    Run Payroll
                  </button>
                </div>
              </div>) : (<p className="text-indigo-200">No upcoming payroll</p>)}
          </div>
        </div>)}

      {/* Quick Tasks */}
      <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <lucide_react_1.CheckSquare className="w-5 h-5 text-emerald-500"/>
            <h2 className="font-semibold text-gray-900 dark:text-white">Quick Tasks</h2>
          </div>
          <span className="text-xs font-medium text-gray-400">2 Pending</span>
        </div>
        <div className="p-2">
          <ul className="space-y-1">
            <li className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer group transition-colors">
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"/>
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Approve timesheets</span>
              </div>
              <span className="text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800/30">High</span>
            </li>
            <li className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer group transition-colors">
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"/>
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Review leave requests</span>
              </div>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/30">Med</span>
            </li>
          </ul>
        </div>
      </div>
    </div>);
}
