"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AttendanceReportsPage;
const react_1 = require("react");
const api_1 = __importDefault(require("../../../../lib/api"));
const business_context_1 = require("../../../../context/business-context");
const lucide_react_1 = require("lucide-react");
const date_fns_1 = require("date-fns");
const recharts_1 = require("recharts");
const sonner_1 = require("sonner");
const jspdf_1 = __importDefault(require("jspdf"));
const jspdf_autotable_1 = __importDefault(require("jspdf-autotable"));
const image_utils_1 = require("../../../../utils/image-utils");
function AttendanceReportsPage() {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    // Date State
    const [startDate, setStartDate] = (0, react_1.useState)((0, date_fns_1.startOfMonth)(new Date()));
    const [endDate, setEndDate] = (0, react_1.useState)((0, date_fns_1.endOfMonth)(new Date()));
    const [timesheets, setTimesheets] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [selectedLocation, setSelectedLocation] = (0, react_1.useState)('all');
    const [expandedEmployee, setExpandedEmployee] = (0, react_1.useState)(null);
    const getDurationHours = (start, end, breaks = []) => {
        if (!start)
            return { hours: 0, breakMinutes: 0 };
        const startDate = (0, date_fns_1.parseISO)(start);
        const endDate = end ? (0, date_fns_1.parseISO)(end) : new Date();
        let totalMinutes = (0, date_fns_1.differenceInMinutes)(endDate, startDate);
        // Subtract breaks
        let breakMinutes = 0;
        if (breaks && breaks.length > 0) {
            breaks.forEach(b => {
                if (b.startTime) {
                    const breakStart = (0, date_fns_1.parseISO)(b.startTime);
                    const breakEnd = b.endTime ? (0, date_fns_1.parseISO)(b.endTime) : new Date();
                    const dur = (0, date_fns_1.differenceInMinutes)(breakEnd, breakStart);
                    breakMinutes += dur;
                    totalMinutes -= dur;
                }
            });
        }
        return {
            hours: Math.max(0, totalMinutes / 60),
            breakMinutes
        };
    };
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [startDate, endDate]);
    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api_1.default.get('/reports/attendance', {
                params: {
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
    const processedData = (0, react_1.useMemo)(() => {
        const employees = {};
        const daysInInterval = (0, date_fns_1.eachDayOfInterval)({ start: startDate, end: endDate });
        // Group by employee
        timesheets.forEach(ts => {
            var _a, _b;
            // Filter by location if selected
            if (selectedLocation !== 'all' && ((_a = ts.location) === null || _a === void 0 ? void 0 : _a.id) !== selectedLocation) {
                return;
            }
            const empId = ts.employee.id;
            if (!employees[empId]) {
                employees[empId] = {
                    id: empId,
                    name: `${ts.employee.firstName} ${ts.employee.lastName}`,
                    role: ts.employee.role.replace(/_/g, ' '),
                    totalHours: 0,
                    daysPresent: 0,
                    lateArrivals: 0,
                    overtimeHours: 0,
                    chartData: daysInInterval.map(d => ({
                        day: (0, date_fns_1.format)(d, 'd'),
                        date: d,
                        hours: 0,
                        status: 'ABSENT'
                    })),
                    dailyRecords: []
                };
            }
            if (ts.endTime) {
                const start = new Date(ts.startTime);
                const { hours, breakMinutes } = getDurationHours(ts.startTime, ts.endTime, ts.breaks);
                employees[empId].totalHours += hours;
                // Check for Late Arrival (Assume 9:00 AM start for demo purposes)
                if (start.getHours() > 9 || (start.getHours() === 9 && start.getMinutes() > 0)) {
                    // employees[empId].lateArrivals++; 
                }
                // Daily Chart Data
                const dayIndex = daysInInterval.findIndex(d => (0, date_fns_1.isSameDay)(d, start));
                if (dayIndex >= 0) {
                    const existing = employees[empId].chartData[dayIndex].hours;
                    employees[empId].chartData[dayIndex].hours = existing + hours;
                    employees[empId].chartData[dayIndex].status = 'PRESENT';
                    // Overtime calc per day
                    if (employees[empId].chartData[dayIndex].hours > 8) {
                        employees[empId].overtimeHours += (employees[empId].chartData[dayIndex].hours - 8);
                    }
                }
                // Daily Record
                employees[empId].dailyRecords.push({
                    date: start,
                    startTime: ts.startTime,
                    endTime: ts.endTime,
                    duration: hours,
                    breakDuration: breakMinutes,
                    location: (_b = ts.location) === null || _b === void 0 ? void 0 : _b.name
                });
            }
        });
        // Count days present and sort records
        Object.values(employees).forEach(emp => {
            emp.daysPresent = emp.chartData.filter(d => d.hours > 0).length;
            emp.dailyRecords.sort((a, b) => a.date.getTime() - b.date.getTime());
        });
        return Object.values(employees).sort((a, b) => a.name.localeCompare(b.name));
    }, [timesheets, startDate, endDate, selectedLocation]);
    const uniqueLocations = (0, react_1.useMemo)(() => {
        const locs = new Map();
        timesheets.forEach(t => {
            if (t.location) {
                locs.set(t.location.id, t.location.name);
            }
        });
        return Array.from(locs.entries()).map(([id, name]) => ({ id, name }));
    }, [timesheets]);
    const filteredData = processedData.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase()));
    const totalWorkedHours = processedData.reduce((acc, curr) => acc + curr.totalHours, 0);
    const avgAttendance = processedData.length ? (processedData.reduce((acc, curr) => acc + curr.daysPresent, 0) / processedData.length).toFixed(1) : 0;
    const exportPDF = async () => {
        var _a;
        try {
            const doc = new jspdf_1.default();
            // Add Logo
            if (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.logoUrl) {
                try {
                    const logoData = await (0, image_utils_1.getBase64ImageFromURL)(selectedBusiness.logoUrl);
                    if (logoData) {
                        doc.addImage(logoData, 'PNG', 14, 10, 20, 20);
                    }
                }
                catch (e) {
                    console.warn('Failed to load logo', e);
                }
            }
            // Business Header
            doc.setFontSize(20);
            doc.text('Attendance Report', 14, 40);
            doc.setFontSize(10);
            doc.text((selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.name) || 'Business Name', 14, 46);
            doc.text(`Period: ${(0, date_fns_1.format)(startDate, 'MMM d, yyyy')} - ${(0, date_fns_1.format)(endDate, 'MMM d, yyyy')}`, 14, 51);
            if (selectedLocation !== 'all') {
                const locName = ((_a = uniqueLocations.find(l => l.id === selectedLocation)) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Location';
                doc.text(`Location: ${locName}`, 14, 56);
            }
            const tableData = filteredData.map(emp => [
                emp.name,
                emp.role,
                emp.daysPresent,
                emp.totalHours.toFixed(2),
                emp.overtimeHours.toFixed(2)
            ]);
            (0, jspdf_autotable_1.default)(doc, {
                startY: 65,
                head: [['Employee', 'Role', 'Days Present', 'Total Hours', 'Overtime (Hrs)']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42] }, // Slate-900
                alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate-50
            });
            // Summary Section
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(12);
            doc.text('Summary', 14, finalY);
            doc.setFontSize(10);
            doc.text(`Total Hours: ${totalWorkedHours.toFixed(2)}`, 14, finalY + 6);
            doc.text(`Active Employees: ${processedData.length}`, 14, finalY + 11);
            doc.text(`Avg Attendance Days: ${avgAttendance}`, 14, finalY + 16);
            doc.save(`Attendance_Report_${(0, date_fns_1.format)(startDate, 'yyyy_MM_dd')}_${(0, date_fns_1.format)(endDate, 'yyyy_MM_dd')}.pdf`);
            sonner_1.toast.success('Report exported successfully');
        }
        catch (error) {
            console.error('Export failed', error);
            sonner_1.toast.error('Failed to export PDF');
        }
    };
    const exportCSV = () => {
        try {
            const headers = ['Employee Name', 'Role', 'Date', 'Start Time', 'End Time', 'Duration (Hours)', 'Break Duration (Mins)', 'Location'];
            const rows = [];
            filteredData.forEach(emp => {
                emp.dailyRecords.forEach(record => {
                    rows.push([
                        `"${emp.name}"`,
                        `"${emp.role}"`,
                        `"${(0, date_fns_1.format)(record.date, 'yyyy-MM-dd')}"`,
                        `"${(0, date_fns_1.format)((0, date_fns_1.parseISO)(record.startTime), 'HH:mm')}"`,
                        record.endTime ? `"${(0, date_fns_1.format)((0, date_fns_1.parseISO)(record.endTime), 'HH:mm')}"` : '""',
                        `"${record.duration.toFixed(2)}"`,
                        `"${record.breakDuration}"`,
                        `"${record.location || ''}"`
                    ].join(','));
                });
            });
            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Attendance_Report_${(0, date_fns_1.format)(startDate, 'yyyy_MM_dd')}_to_${(0, date_fns_1.format)(endDate, 'yyyy_MM_dd')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            sonner_1.toast.success('CSV exported successfully');
        }
        catch (error) {
            console.error('CSV export failed', error);
            sonner_1.toast.error('Failed to export CSV');
        }
    };
    return (<div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Report</h1>
          <p className="text-muted-foreground">
            Overview of employee attendance, hours, and performance.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           {/* Date Range Picker */}
           <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
             <input type="date" value={(0, date_fns_1.format)(startDate, 'yyyy-MM-dd')} onChange={(e) => {
            const d = new Date(e.target.value);
            if ((0, date_fns_1.isValid)(d))
                setStartDate(d);
        }} className="border-none text-sm focus:ring-0 p-2 text-slate-700 outline-none"/>
             <span className="text-slate-400">-</span>
             <input type="date" value={(0, date_fns_1.format)(endDate, 'yyyy-MM-dd')} onChange={(e) => {
            const d = new Date(e.target.value);
            if ((0, date_fns_1.isValid)(d))
                setEndDate(d);
        }} className="border-none text-sm focus:ring-0 p-2 text-slate-700 outline-none"/>
           </div>

           <div className="flex items-center gap-2">
             <button onClick={exportCSV} className="flex items-center gap-2 bg-white text-slate-700 border px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
               <lucide_react_1.FileSpreadsheet className="w-4 h-4"/>
               <span className="hidden md:inline">CSV</span>
             </button>
             <button onClick={exportPDF} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
               <lucide_react_1.Download className="w-4 h-4"/>
               <span className="hidden md:inline">PDF</span>
             </button>
           </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Total Hours</h3>
            <lucide_react_1.Clock className="w-4 h-4 text-blue-500"/>
          </div>
          <p className="text-2xl font-bold">{totalWorkedHours.toFixed(1)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Active Employees</h3>
            <lucide_react_1.User className="w-4 h-4 text-green-500"/>
          </div>
          <p className="text-2xl font-bold">{processedData.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Avg. Days Present</h3>
            <lucide_react_1.Calendar className="w-4 h-4 text-purple-500"/>
          </div>
          <p className="text-2xl font-bold">{avgAttendance}</p>
          <p className="text-xs text-slate-500 mt-1">in selected period</p>
        </div>
         <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Completion Rate</h3>
            <lucide_react_1.CheckCircle className="w-4 h-4 text-orange-500"/>
          </div>
          <p className="text-2xl font-bold">--%</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 w-full md:max-w-sm">
          <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <input type="text" placeholder="Search employees..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-48">
             <lucide_react_1.Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
             <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="w-full pl-9 pr-8 py-2 border rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
               <option value="all">All Locations</option>
               {uniqueLocations.map(loc => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
             </select>
             <lucide_react_1.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"/>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="space-y-4">
        {loading ? (<div className="text-center py-12 text-slate-500">Loading attendance data...</div>) : filteredData.length === 0 ? (<div className="text-center py-12 text-slate-500">No attendance records found for this period.</div>) : (filteredData.map(emp => (<div key={emp.id} className="bg-white rounded-xl border shadow-sm overflow-hidden transition-all">
              <div className="p-4 flex flex-col md:flex-row items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpandedEmployee(expandedEmployee === emp.id ? null : emp.id)}>
                {/* Avatar / Initials */}
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
                  {emp.name.charAt(0)}
                </div>
                
                {/* Info */}
                <div className="flex-1 text-center md:text-left">
                  <h3 className="font-semibold text-slate-900">{emp.name}</h3>
                  <p className="text-sm text-slate-500">{emp.role}</p>
                </div>

                {/* Mini Stats */}
                <div className="flex items-center gap-8 text-sm">
                  <div className="text-center">
                    <p className="text-slate-500">Hours</p>
                    <p className="font-semibold">{emp.totalHours.toFixed(1)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">Present</p>
                    <p className="font-semibold">{emp.daysPresent} Days</p>
                  </div>
                  <div className="text-center hidden md:block">
                     <p className="text-slate-500">Overtime</p>
                     <p className={`font-semibold ${emp.overtimeHours > 0 ? 'text-amber-600' : ''}`}>
                       {emp.overtimeHours.toFixed(1)}
                     </p>
                  </div>
                </div>

                <div className="shrink-0">
                   {expandedEmployee === emp.id ? <lucide_react_1.ChevronUp className="w-5 h-5 text-slate-400"/> : <lucide_react_1.ChevronDown className="w-5 h-5 text-slate-400"/>}
                </div>
              </div>

              {/* Expanded Content: Chart & Table */}
              {expandedEmployee === emp.id && (<div className="p-6 border-t bg-slate-50/50">
                  {/* Chart */}
                  <div className="mb-8">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Daily Activity</h4>
                    <div className="h-[250px] w-full bg-white p-4 rounded-lg border border-slate-200">
                      <recharts_1.ResponsiveContainer width="100%" height="100%">
                        <recharts_1.BarChart data={emp.chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                          <recharts_1.CartesianGrid strokeDasharray="3 3" vertical={false}/>
                          <recharts_1.XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}/>
                          <recharts_1.YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}/>
                          <recharts_1.Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f1f5f9' }}/>
                          <recharts_1.Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                            {emp.chartData.map((entry, index) => (<recharts_1.Cell key={`cell-${index}`} fill={entry.hours > 8 ? '#f59e0b' : '#3b82f6'}/>))}
                          </recharts_1.Bar>
                        </recharts_1.BarChart>
                      </recharts_1.ResponsiveContainer>
                    </div>
                  </div>

                  {/* Detailed Table */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Detailed Records</h4>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Location</th>
                            <th className="px-4 py-3">Start Time</th>
                            <th className="px-4 py-3">End Time</th>
                            <th className="px-4 py-3 text-right">Break (min)</th>
                            <th className="px-4 py-3 text-right">Duration (hr)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {emp.dailyRecords.length === 0 ? (<tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No records found.</td>
                            </tr>) : (emp.dailyRecords.map((record, idx) => (<tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-slate-900">{(0, date_fns_1.format)(record.date, 'MMM d, yyyy')}</td>
                                <td className="px-4 py-3 text-slate-600">{record.location || '-'}</td>
                                <td className="px-4 py-3 text-slate-600 font-mono">{(0, date_fns_1.format)((0, date_fns_1.parseISO)(record.startTime), 'HH:mm')}</td>
                                <td className="px-4 py-3 text-slate-600 font-mono">
                                  {record.endTime ? (0, date_fns_1.format)((0, date_fns_1.parseISO)(record.endTime), 'HH:mm') : '-'}
                                </td>
                                <td className="px-4 py-3 text-slate-600 text-right">{record.breakDuration}</td>
                                <td className="px-4 py-3 text-slate-900 font-medium text-right">{record.duration.toFixed(2)}</td>
                              </tr>)))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>)}
            </div>)))}
      </div>
    </div>);
}
