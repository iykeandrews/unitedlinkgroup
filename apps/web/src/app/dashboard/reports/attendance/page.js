"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AttendanceReportPage;
const react_1 = require("react");
const business_context_1 = require("../../../../context/business-context");
const api_1 = __importDefault(require("../../../../lib/api"));
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
function AttendanceReportPage() {
    var _a;
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [timesheets, setTimesheets] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    // Date State
    const [startDate, setStartDate] = (0, react_1.useState)((0, date_fns_1.startOfMonth)(new Date()));
    const [endDate, setEndDate] = (0, react_1.useState)((0, date_fns_1.endOfMonth)(new Date()));
    // Filters
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [locationFilter, setLocationFilter] = (0, react_1.useState)('ALL');
    const setDateRange = (range) => {
        const now = new Date();
        switch (range) {
            case 'today':
                setStartDate(now);
                setEndDate(now);
                break;
            case 'week':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                setStartDate(startOfWeek);
                setEndDate(new Date());
                break;
            case 'month':
                setStartDate((0, date_fns_1.startOfMonth)(new Date()));
                setEndDate((0, date_fns_1.endOfMonth)(new Date()));
                break;
            case 'lastMonth':
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                setStartDate((0, date_fns_1.startOfMonth)(lastMonth));
                setEndDate((0, date_fns_1.endOfMonth)(lastMonth));
                break;
        }
    };
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [selectedBusiness, startDate, endDate]);
    const fetchData = async () => {
        if (!selectedBusiness)
            return;
        try {
            setLoading(true);
            const res = await api_1.default.get('/reports/attendance', {
                params: {
                    businessId: selectedBusiness.id,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                }
            });
            setTimesheets(res.data);
        }
        catch (error) {
            console.error('Failed to fetch attendance data', error);
            sonner_1.toast.error('Failed to load attendance report');
        }
        finally {
            setLoading(false);
        }
    };
    const calculateDuration = (start, end) => {
        if (!end)
            return 0;
        return (0, date_fns_1.differenceInMinutes)((0, date_fns_1.parseISO)(end), (0, date_fns_1.parseISO)(start)) / 60;
    };
    const calculateBreakDuration = (breaks) => {
        return breaks.reduce((acc, b) => {
            if (b.endTime) {
                return acc + ((0, date_fns_1.differenceInMinutes)((0, date_fns_1.parseISO)(b.endTime), (0, date_fns_1.parseISO)(b.startTime)) / 60);
            }
            return acc;
        }, 0);
    };
    const [selectedTimesheet, setSelectedTimesheet] = (0, react_1.useState)(null);
    const filteredTimesheets = (0, react_1.useMemo)(() => {
        return timesheets.filter(t => {
            var _a;
            const matchesSearch = `${t.employee.firstName} ${t.employee.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.employee.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesLocation = locationFilter === 'ALL' || ((_a = t.location) === null || _a === void 0 ? void 0 : _a.name) === locationFilter;
            return matchesSearch && matchesLocation;
        });
    }, [timesheets, searchQuery, locationFilter]);
    const stats = (0, react_1.useMemo)(() => {
        return filteredTimesheets.reduce((acc, t) => {
            const duration = calculateDuration(t.startTime, t.endTime);
            const breakTime = calculateBreakDuration(t.breaks);
            const netDuration = Math.max(0, duration - breakTime);
            acc.totalHours += netDuration;
            acc.totalShifts += 1;
            acc.uniqueEmployees.add(t.employee.id);
            return acc;
        }, {
            totalHours: 0,
            totalShifts: 0,
            uniqueEmployees: new Set()
        });
    }, [filteredTimesheets]);
    const exportCSV = () => {
        const headers = ['Date', 'Employee', 'Location', 'Start Time', 'End Time', 'Break (hrs)', 'Total Hours', 'Notes'];
        const rows = filteredTimesheets.map(t => {
            var _a;
            const duration = calculateDuration(t.startTime, t.endTime);
            const breakTime = calculateBreakDuration(t.breaks);
            const netDuration = Math.max(0, duration - breakTime);
            return [
                (0, date_fns_1.format)((0, date_fns_1.parseISO)(t.startTime), 'yyyy-MM-dd'),
                `${t.employee.firstName} ${t.employee.lastName}`,
                ((_a = t.location) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
                (0, date_fns_1.format)((0, date_fns_1.parseISO)(t.startTime), 'HH:mm'),
                t.endTime ? (0, date_fns_1.format)((0, date_fns_1.parseISO)(t.endTime), 'HH:mm') : 'Active',
                breakTime.toFixed(2),
                netDuration.toFixed(2),
                t.employeeNote || ''
            ];
        });
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `attendance_report_${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    const locations = (0, react_1.useMemo)(() => {
        const locs = new Set(timesheets.map(t => { var _a; return (_a = t.location) === null || _a === void 0 ? void 0 : _a.name; }).filter(Boolean));
        return Array.from(locs);
    }, [timesheets]);
    return (<div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance Report</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track employee hours, locations, and shift details
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={exportCSV} className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <lucide_react_1.Download className="w-4 h-4 mr-2"/>
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Hours</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {stats.totalHours.toFixed(1)}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
              <lucide_react_1.Clock size={24}/>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Shifts</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {stats.totalShifts}
              </h3>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
              <lucide_react_1.FileText size={24}/>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Employees</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {stats.uniqueEmployees.size}
              </h3>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
              <lucide_react_1.Users size={24}/>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
            <input type="text" placeholder="Search employees..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"/>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 mb-1">
              <button onClick={() => setDateRange('today')} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600">Today</button>
              <button onClick={() => setDateRange('week')} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600">This Week</button>
              <button onClick={() => setDateRange('month')} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600">This Month</button>
              <button onClick={() => setDateRange('lastMonth')} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600">Last Month</button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input type="date" value={(0, date_fns_1.format)(startDate, 'yyyy-MM-dd')} onChange={(e) => setStartDate(new Date(e.target.value))} className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"/>
                <lucide_react_1.Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
              </div>
              <span className="text-slate-400">-</span>
              <div className="relative">
                <input type="date" value={(0, date_fns_1.format)(endDate, 'yyyy-MM-dd')} onChange={(e) => setEndDate(new Date(e.target.value))} className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"/>
                <lucide_react_1.Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
              </div>
            </div>
          </div>

          <div className="w-48">
            <div className="relative">
              <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="w-full pl-10 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                <option value="ALL">All Locations</option>
                {locations.map(loc => (<option key={loc} value={loc}>{loc}</option>))}
              </select>
              <lucide_react_1.MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
              <lucide_react_1.Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"/>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Date</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Employee</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Location</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Start Time</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">End Time</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Break (hrs)</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Total Hours</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (<tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    Loading attendance data...
                  </td>
                </tr>) : filteredTimesheets.length === 0 ? (<tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    No attendance records found for this period.
                  </td>
                </tr>) : (filteredTimesheets.map((t) => {
            var _a;
            const duration = calculateDuration(t.startTime, t.endTime);
            const breakTime = calculateBreakDuration(t.breaks);
            const netDuration = Math.max(0, duration - breakTime);
            return (<tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {(0, date_fns_1.format)((0, date_fns_1.parseISO)(t.startTime), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-medium mr-3">
                            {t.employee.firstName[0]}{t.employee.lastName[0]}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {t.employee.firstName} {t.employee.lastName}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {t.employee.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {((_a = t.location) === null || _a === void 0 ? void 0 : _a.name) || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {(0, date_fns_1.format)((0, date_fns_1.parseISO)(t.startTime), 'h:mm a')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {t.endTime ? (0, date_fns_1.format)((0, date_fns_1.parseISO)(t.endTime), 'h:mm a') : <span className="text-green-500 font-medium">Active</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {breakTime > 0 ? breakTime.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        {netDuration.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white text-right">
                        <button onClick={() => setSelectedTimesheet(t)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                          View Details
                        </button>
                      </td>
                    </tr>);
        }))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTimesheet && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Shift Details</h3>
              <button onClick={() => setSelectedTimesheet(null)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Employee</label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {selectedTimesheet.employee.firstName} {selectedTimesheet.employee.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Date</label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {(0, date_fns_1.format)((0, date_fns_1.parseISO)(selectedTimesheet.startTime), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Start Time</label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {(0, date_fns_1.format)((0, date_fns_1.parseISO)(selectedTimesheet.startTime), 'h:mm a')}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">End Time</label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {selectedTimesheet.endTime ? (0, date_fns_1.format)((0, date_fns_1.parseISO)(selectedTimesheet.endTime), 'h:mm a') : 'Active'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Location</label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {((_a = selectedTimesheet.location) === null || _a === void 0 ? void 0 : _a.name) || 'N/A'}
                  </p>
                </div>
                 <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Total Duration</label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {((0, date_fns_1.differenceInMinutes)(selectedTimesheet.endTime ? (0, date_fns_1.parseISO)(selectedTimesheet.endTime) : new Date(), (0, date_fns_1.parseISO)(selectedTimesheet.startTime)) / 60).toFixed(2)} hrs
                  </p>
                </div>
              </div>

              {selectedTimesheet.employeeNote && (<div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                   <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1 block">Notes</label>
                   <p className="text-sm text-slate-700 dark:text-slate-300 italic">&quot;{selectedTimesheet.employeeNote}&quot;</p>
                 </div>)}

              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Breaks</h4>
                {selectedTimesheet.breaks.length === 0 ? (<p className="text-sm text-slate-500 dark:text-slate-400">No breaks taken.</p>) : (<div className="bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="px-3 py-2 font-medium">Start</th>
                          <th className="px-3 py-2 font-medium">End</th>
                          <th className="px-3 py-2 font-medium text-right">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {selectedTimesheet.breaks.map((b, i) => (<tr key={i}>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                              {(0, date_fns_1.format)((0, date_fns_1.parseISO)(b.startTime), 'h:mm a')}
                            </td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                               {b.endTime ? (0, date_fns_1.format)((0, date_fns_1.parseISO)(b.endTime), 'h:mm a') : '-'}
                            </td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300 text-right">
                              {b.endTime ? ((0, date_fns_1.differenceInMinutes)((0, date_fns_1.parseISO)(b.endTime), (0, date_fns_1.parseISO)(b.startTime)) / 60).toFixed(2) + 'h' : '-'}
                            </td>
                          </tr>))}
                      </tbody>
                    </table>
                  </div>)}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button onClick={() => setSelectedTimesheet(null)} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>)}
    </div>);
}
