"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsCards = StatsCards;
const lucide_react_1 = require("lucide-react");
const localization_1 = require("../../lib/localization");
function StatsCards({ stats, hasModule, userProfile, country }) {
    var _a;
    const isAdmin = (userProfile === null || userProfile === void 0 ? void 0 : userProfile.role) === 'BUSINESS_ADMIN' || (userProfile === null || userProfile === void 0 ? void 0 : userProfile.role) === 'SUPER_ADMIN';
    // Format payroll date
    const payrollDate = ((_a = stats === null || stats === void 0 ? void 0 : stats.nextPayroll) === null || _a === void 0 ? void 0 : _a.payDate)
        ? (0, localization_1.formatDate)(stats.nextPayroll.payDate, country)
        : 'N/A';
    const cards = [
        ...(isAdmin ? [{
                id: 'payroll',
                module: 'Payroll', // Assuming Payroll module exists, or we can use a generic one
                label: 'Next Payroll',
                value: payrollDate,
                subtext: 'Upcoming pay date',
                icon: lucide_react_1.DollarSign,
                color: 'emerald',
                trend: null,
                trendUp: true
            }] : []),
        {
            id: 'on-shift',
            module: 'Time',
            label: 'On Shift Now',
            value: (stats === null || stats === void 0 ? void 0 : stats.onShiftNow) || 0,
            subtext: 'Active staff members',
            icon: lucide_react_1.Clock,
            color: 'emerald',
            trend: '+12%', // Mock trend
            trendUp: true
        },
        {
            id: 'scheduled',
            module: 'Schedule',
            label: 'Scheduled Today',
            value: (stats === null || stats === void 0 ? void 0 : stats.scheduledToday) || 0,
            subtext: 'Employees scheduled',
            icon: lucide_react_1.Calendar,
            color: 'blue',
            trend: '+5%',
            trendUp: true
        },
        {
            id: 'late',
            module: 'Time',
            label: 'Late / No Show',
            value: 0,
            subtext: 'Requires attention',
            icon: lucide_react_1.AlertCircle,
            color: 'red',
            trend: '0%',
            trendUp: true
        },
        {
            id: 'pending',
            module: 'Leave',
            label: 'Pending Requests',
            value: (stats === null || stats === void 0 ? void 0 : stats.pendingRequests) || 0,
            subtext: 'Leave, Loans & Swaps',
            icon: lucide_react_1.MessageSquare,
            color: 'amber',
            trend: '+2',
            trendUp: false // meaning increased load
        }
    ];
    return (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
            if (!hasModule(card.module))
                return null;
            const Icon = card.icon;
            const colorStylesMap = {
                emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 group-hover:border-emerald-500/50',
                blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-blue-100 dark:border-blue-500/20 group-hover:border-blue-500/50',
                red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border-red-100 dark:border-red-500/20 group-hover:border-red-500/50',
                amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-100 dark:border-amber-500/20 group-hover:border-amber-500/50',
            };
            const iconBgStylesMap = {
                emerald: 'bg-emerald-100 dark:bg-emerald-500/20',
                blue: 'bg-blue-100 dark:bg-blue-500/20',
                red: 'bg-red-100 dark:bg-red-500/20',
                amber: 'bg-amber-100 dark:bg-amber-500/20',
            };
            const colorStyles = colorStylesMap[card.color] || colorStylesMap.blue;
            const iconBgStyles = iconBgStylesMap[card.color] || iconBgStylesMap.blue;
            return (<div key={card.id} className="group relative bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${iconBgStyles} transition-colors`}>
                <Icon className={`w-6 h-6 ${colorStyles.split(' ')[1]}`}/>
              </div>
              {card.trend && (<div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${card.trendUp ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                  {card.trendUp ? <lucide_react_1.ArrowUpRight className="w-3 h-3"/> : <lucide_react_1.ArrowDownRight className="w-3 h-3"/>}
                  {card.trend}
                </div>)}
            </div>
            
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">
                {card.value}
              </div>
              <div className="text-sm font-medium text-gray-500 dark:text-slate-400">
                {card.label}
              </div>
              <div className="text-xs text-gray-400 dark:text-slate-500 mt-2 flex items-center gap-1">
                <lucide_react_1.Activity className="w-3 h-3"/>
                {card.subtext}
              </div>
            </div>

            {/* Decorative gradient blob */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500 ${card.color === 'emerald' ? 'bg-emerald-500' :
                    card.color === 'blue' ? 'bg-blue-500' :
                        card.color === 'red' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
          </div>);
        })}
    </div>);
}
