"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SitesPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
const api_1 = __importDefault(require("../../../../lib/api"));
function SitesPage() {
    const router = (0, navigation_1.useRouter)();
    const [sites, setSites] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [isFilterOpen, setIsFilterOpen] = (0, react_1.useState)(false);
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('ALL');
    (0, react_1.useEffect)(() => {
        fetchSites();
    }, []);
    const fetchSites = async () => {
        try {
            const res = await api_1.default.get('/locations');
            setSites(res.data);
        }
        catch (error) {
            console.error('Failed to fetch sites', error);
        }
        finally {
            setLoading(false);
        }
    };
    const filteredSites = sites.filter(site => {
        var _a, _b;
        const matchesSearch = site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ((_a = site.code) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchQuery.toLowerCase())) ||
            ((_b = site.client) === null || _b === void 0 ? void 0 : _b.name.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = statusFilter === 'ALL' || site.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    const handleExport = () => {
        const headers = ['Name', 'Code', 'Client', 'Address', 'Status', 'Service Pins'];
        const csvContent = [
            headers.join(','),
            ...filteredSites.map(s => {
                var _a, _b;
                return [
                    `"${s.name}"`,
                    `"${s.code || ''}"`,
                    `"${((_a = s.client) === null || _a === void 0 ? void 0 : _a.name) || ''}"`,
                    `"${s.address}"`,
                    `"${s.status}"`,
                    `"${((_b = s.servicePins) === null || _b === void 0 ? void 0 : _b.length) || 0}"`
                ].join(',');
            })
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'sites.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    return (<div className="py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Security Sites</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage service locations and posts.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors">
            <lucide_react_1.Download size={20}/>
            Export CSV
            </button>
            <button onClick={() => router.push('/dashboard/security/sites/new')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <lucide_react_1.Plus size={20}/>
            Add Site
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Search Bar & Filters */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
              <input type="text" placeholder="Search sites, codes, or clients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${isFilterOpen
            ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              <lucide_react_1.Filter size={20}/>
              Filters
            </button>
          </div>

          {/* Filter Panel */}
          {isFilterOpen && (<div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-800">
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                
                {/* Clear Filters */}
                {(statusFilter !== 'ALL') && (<button onClick={() => setStatusFilter('ALL')} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 mt-6">
                    <lucide_react_1.X size={16}/>
                    Clear Filters
                  </button>)}
              </div>
            </div>)}
        </div>

        {/* Sites List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Site Name / Code</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Pins</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (<tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading sites...</td>
                </tr>) : filteredSites.length === 0 ? (<tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No sites found.</td>
                </tr>) : (filteredSites.map((site) => {
            var _a;
            return (<tr key={site.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors" onClick={() => router.push(`/dashboard/security/sites/${site.id}`)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
                          <lucide_react_1.MapPin size={20}/>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{site.name}</p>
                          <p className="text-xs text-slate-500">{site.code || 'No Code'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {site.client ? (<div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                           <lucide_react_1.Building size={14} className="text-slate-400"/>
                           {site.client.name}
                        </div>) : (<span className="text-sm text-slate-400">-</span>)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1 max-w-xs" title={site.address}>
                        {site.address}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                       <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                         <lucide_react_1.Navigation size={12}/>
                         {((_a = site.servicePins) === null || _a === void 0 ? void 0 : _a.length) || 0} Pins
                       </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${site.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {site.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/security/sites/${site.id}`);
                }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Edit Site">
                        <lucide_react_1.Edit size={20}/>
                      </button>
                    </td>
                  </tr>);
        }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
}
