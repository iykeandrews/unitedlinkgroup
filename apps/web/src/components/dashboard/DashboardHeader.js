"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardHeader = DashboardHeader;
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
function DashboardHeader({ profile, formattedDate, hasModule, businessName }) {
    const router = (0, navigation_1.useRouter)();
    return (<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-slate-400">
          Good morning, {profile === null || profile === void 0 ? void 0 : profile.firstName}!
        </h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1 font-medium">
          {businessName ? `${businessName} • ` : ''}{formattedDate}
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        {hasModule('People') && (<button onClick={() => router.push('/dashboard/people?action=add')} className="group relative px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-500/50 dark:hover:border-indigo-400/50 transition-all duration-300">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              <lucide_react_1.Plus className="w-4 h-4"/>
              <span>Add Employee</span>
            </div>
          </button>)}
        
        {hasModule('Schedule') && (<button onClick={() => router.push('/dashboard/scheduling')} className="group relative px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <div className="flex items-center gap-2 text-sm font-medium relative">
              <lucide_react_1.Plus className="w-4 h-4"/>
              <span>Create Shift</span>
            </div>
          </button>)}
      </div>
    </div>);
}
