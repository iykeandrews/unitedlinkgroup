"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardAlerts = DashboardAlerts;
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
function DashboardAlerts({ expiringQualifications, expiringSites, showExpiringQualBanner, setShowExpiringQualBanner, setIsExpiringQualModalOpen, dismissedAlerts, setDismissedAlerts, profile }) {
    const router = (0, navigation_1.useRouter)();
    const hasExpiringQuals = expiringQualifications.length > 0 && showExpiringQualBanner;
    const hasExpiringSites = expiringSites.length > 0 && ((profile === null || profile === void 0 ? void 0 : profile.role) === 'BUSINESS_ADMIN' || (profile === null || profile === void 0 ? void 0 : profile.role) === 'SUPER_ADMIN');
    if (!hasExpiringQuals && !hasExpiringSites)
        return null;
    return (<div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Expiring Qualifications Banner */}
      {hasExpiringQuals && (<div className="relative overflow-hidden rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-800 shadow-sm">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
          <div className="p-4 pl-5 flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg shrink-0">
                <lucide_react_1.AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400"/>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                   Action Required: Expiring Qualifications
                   <span className="text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
                     {expiringQualifications.length} Items
                   </span>
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                  {(profile === null || profile === void 0 ? void 0 : profile.role) === 'EMPLOYEE'
                ? `You have qualification(s) that have expired or are expiring soon.`
                : `There are employee qualification(s) that have expired or are expiring soon.`}
                </p>
                <button onClick={() => setIsExpiringQualModalOpen(true)} className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1 group">
                  View Details
                  <lucide_react_1.ExternalLink className="w-3 h-3 transition-transform group-hover:translate-x-0.5"/>
                </button>
              </div>
            </div>
            <button onClick={() => setShowExpiringQualBanner(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
              <lucide_react_1.X size={16}/>
            </button>
          </div>
        </div>)}

      {/* Expiring Sites Alerts */}
      {hasExpiringSites && expiringSites
            .filter(site => !dismissedAlerts.includes(site.id))
            .map((site) => {
            const isUrgent = site.daysRemaining <= 14;
            return (<div key={site.id} className={`relative overflow-hidden rounded-xl border shadow-sm ${isUrgent
                    ? 'border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-800'
                    : 'border-amber-200 dark:border-amber-900/50 bg-white dark:bg-slate-800'}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isUrgent ? 'bg-red-500' : 'bg-amber-500'}`}></div>
            <div className="p-4 pl-5 flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className={`p-2 rounded-lg shrink-0 ${isUrgent ? 'bg-red-100 dark:bg-red-900/20' : 'bg-amber-100 dark:bg-amber-900/20'}`}>
                  <lucide_react_1.AlertCircle className={`h-5 w-5 ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}/>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {isUrgent ? 'Urgent: Contract Expiring Soon' : 'Contract Expiration Reminder'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                    The site <strong className="font-medium text-gray-900 dark:text-white">{site.name}</strong> is scheduled to end on {new Date(site.endDate).toLocaleDateString()} ({site.daysRemaining} days remaining).
                  </p>
                  <button onClick={() => router.push(`/dashboard/security/sites/${site.id}`)} className={`mt-2 px-3 py-1.5 text-xs font-medium rounded-lg inline-flex items-center gap-1 transition-colors ${isUrgent
                    ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40'}`}>
                    View Site
                    <lucide_react_1.ExternalLink className="w-3 h-3"/>
                  </button>
                </div>
              </div>
              <button onClick={() => setDismissedAlerts(prev => [...prev, site.id])} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
                <lucide_react_1.X size={16}/>
              </button>
            </div>
          </div>);
        })}
    </div>);
}
