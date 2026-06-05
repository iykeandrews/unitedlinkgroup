"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TimeTrackingPage;
const react_1 = require("react");
const api_1 = __importDefault(require("../../../lib/api"));
const lucide_react_1 = require("lucide-react");
const date_fns_1 = require("date-fns");
const business_context_1 = require("../../../context/business-context");
const localization_1 = require("../../../lib/localization");
const jspdf_1 = require("jspdf");
const jspdf_autotable_1 = __importDefault(require("jspdf-autotable"));
const sonner_1 = require("sonner");
const TimesheetDetailsModal_1 = require("../../../components/time-tracking/TimesheetDetailsModal");
function TimeTrackingPage() {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [timesheets, setTimesheets] = (0, react_1.useState)([]);
    const [employees, setEmployees] = (0, react_1.useState)([]);
    const [locations, setLocations] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    // Modal State
    const [selectedTimesheet, setSelectedTimesheet] = (0, react_1.useState)(null);
    const [isModalOpen, setIsModalOpen] = (0, react_1.useState)(false);
    // State
    const [startDate, setStartDate] = (0, react_1.useState)(() => (0, date_fns_1.startOfWeek)(new Date(), { weekStartsOn: 1 }));
    const [endDate, setEndDate] = (0, react_1.useState)(() => (0, date_fns_1.endOfWeek)(new Date(), { weekStartsOn: 1 }));
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [selectedEmployeeId, setSelectedEmployeeId] = (0, react_1.useState)(null);
    const [selectedLocationId, setSelectedLocationId] = (0, react_1.useState)('all');
    const [activeTab, setActiveTab] = (0, react_1.useState)('all');
    const [roleTab, setRoleTab] = (0, react_1.useState)('W2');
    const [expandedEmployees, setExpandedEmployees] = (0, react_1.useState)({});
    // New State for Features
    const [groupBy, setGroupBy] = (0, react_1.useState)('employee');
    const [selectedTimesheetIds, setSelectedTimesheetIds] = (0, react_1.useState)(new Set());
    const [isViewOptionsOpen, setIsViewOptionsOpen] = (0, react_1.useState)(false);
    const [isAddOptionsOpen, setIsAddOptionsOpen] = (0, react_1.useState)(false);
    const fileInputRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [startDate, endDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id, roleTab]);
    const fetchData = async () => {
        try {
            setLoading(true);
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            const [timesheetsRes, employeesRes, locationsRes] = await Promise.all([
                api_1.default.get('/time-tracking/timesheets', {
                    params: {
                        start: start.toISOString(),
                        end: end.toISOString(),
                        workerType: roleTab
                    },
                    headers: (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id) ? { 'x-business-id': selectedBusiness.id } : {}
                }),
                api_1.default.get('/employees', {
                    headers: (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id) ? { 'x-business-id': selectedBusiness.id } : {}
                }),
                api_1.default.get('/locations', {
                    headers: (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id) ? { 'x-business-id': selectedBusiness.id } : {}
                })
            ]);
            setTimesheets(timesheetsRes.data);
            setEmployees(employeesRes.data);
            setLocations(locationsRes.data);
            // Initialize all employees as expanded
            const initialExpanded = {};
            employeesRes.data.forEach((e) => {
                initialExpanded[e.id] = true;
            });
            setExpandedEmployees(initialExpanded);
        }
        catch (error) {
            console.error('Failed to fetch data', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handlePrevWeek = () => {
        setStartDate(d => (0, date_fns_1.subWeeks)(d, 1));
        setEndDate(d => (0, date_fns_1.subWeeks)(d, 1));
    };
    const handleNextWeek = () => {
        setStartDate(d => (0, date_fns_1.addWeeks)(d, 1));
        setEndDate(d => (0, date_fns_1.addWeeks)(d, 1));
    };
    const toggleEmployeeExpand = (empId) => {
        setExpandedEmployees(prev => ({
            ...prev,
            [empId]: !prev[empId]
        }));
    };
    const toggleTimesheetSelection = (id) => {
        const newSet = new Set(selectedTimesheetIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        }
        else {
            newSet.add(id);
        }
        setSelectedTimesheetIds(newSet);
    };
    const handleSelectAll = (ids) => {
        if (ids.every(id => selectedTimesheetIds.has(id))) {
            // Deselect all
            const newSet = new Set(selectedTimesheetIds);
            ids.forEach(id => newSet.delete(id));
            setSelectedTimesheetIds(newSet);
        }
        else {
            // Select all
            const newSet = new Set(selectedTimesheetIds);
            ids.forEach(id => newSet.add(id));
            setSelectedTimesheetIds(newSet);
        }
    };
    const handleExportPDF = (targetTimesheets, action = 'download') => {
        const doc = new jspdf_1.jsPDF();
        const tableData = targetTimesheets.map(t => [
            t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : 'Unknown',
            (0, date_fns_1.format)((0, date_fns_1.parseISO)(t.startTime), 'MMM d, yyyy'),
            (0, date_fns_1.format)((0, date_fns_1.parseISO)(t.startTime), 'HH:mm'),
            t.endTime ? (0, date_fns_1.format)((0, date_fns_1.parseISO)(t.endTime), 'HH:mm') : '-',
            t.breaks.length > 0 ? `${t.breaks.length} breaks` : 'None',
            getDurationHours(t.startTime, t.endTime, t.breaks).toFixed(2) + 'h',
            t.status
        ]);
        (0, jspdf_autotable_1.default)(doc, {
            head: [['Employee', 'Date', 'Start', 'End', 'Breaks', 'Duration', 'Status']],
            body: tableData,
        });
        if (action === 'download') {
            doc.save('timesheets.pdf');
        }
        else {
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        }
    };
    const handleFileUpload = async (event) => {
        var _a;
        const file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file)
            return;
        const formData = new FormData();
        formData.append('file', file);
        if (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id) {
            formData.append('businessId', selectedBusiness.id);
        }
        try {
            setLoading(true);
            await api_1.default.post('/time-tracking/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            sonner_1.toast.success('Timesheets imported successfully');
            fetchData();
        }
        catch (error) {
            console.error('Import failed', error);
            sonner_1.toast.error('Failed to import timesheets');
        }
        finally {
            setLoading(false);
            // Reset file input
            if (fileInputRef.current)
                fileInputRef.current.value = '';
        }
    };
    // Calculations
    const getDurationHours = (start, end, breaks = []) => {
        if (!start)
            return 0;
        const startDate = (0, date_fns_1.parseISO)(start);
        const endDate = end ? (0, date_fns_1.parseISO)(end) : new Date();
        let totalMinutes = (0, date_fns_1.differenceInMinutes)(endDate, startDate);
        // Subtract breaks
        breaks.forEach(b => {
            if (b.startTime) {
                const breakStart = (0, date_fns_1.parseISO)(b.startTime);
                const breakEnd = b.endTime ? (0, date_fns_1.parseISO)(b.endTime) : new Date();
                totalMinutes -= (0, date_fns_1.differenceInMinutes)(breakEnd, breakStart);
            }
        });
        return Math.max(0, totalMinutes / 60);
    };
    const getPay = (hours, rate = 0) => {
        return hours * rate;
    };
    // Process Data
    const filteredEmployees = employees.filter(emp => `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()));
    const employeeStats = (0, react_1.useMemo)(() => {
        const stats = {};
        employees.forEach(emp => {
            const empTimesheets = timesheets.filter(t => t.employeeId === emp.id);
            // Filter stats based on date range (already filtered by API) and location if needed
            let filtered = empTimesheets;
            if (selectedLocationId !== 'all') {
                filtered = filtered.filter(t => { var _a; return ((_a = t.location) === null || _a === void 0 ? void 0 : _a.id) === selectedLocationId; });
            }
            const count = filtered.length;
            let hours = 0;
            let pay = 0;
            filtered.forEach(t => {
                const h = getDurationHours(t.startTime, t.endTime, t.breaks);
                hours += h;
                pay += getPay(h, emp.hourlyRate);
            });
            stats[emp.id] = { count, hours, pay };
        });
        return stats;
    }, [timesheets, employees, selectedLocationId]);
    const groupedTimesheets = (0, react_1.useMemo)(() => {
        let filtered = timesheets;
        // Tab Filter
        if (activeTab === 'pending')
            filtered = filtered.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
        if (activeTab === 'approved')
            filtered = filtered.filter(t => t.status === 'APPROVED');
        if (activeTab === 'discarded')
            filtered = filtered.filter(t => t.status === 'DISCARDED' || t.status === 'REJECTED');
        // Location Filter
        if (selectedLocationId !== 'all') {
            filtered = filtered.filter(t => { var _a; return ((_a = t.location) === null || _a === void 0 ? void 0 : _a.id) === selectedLocationId; });
        }
        // Employee Filter
        if (selectedEmployeeId) {
            filtered = filtered.filter(t => t.employeeId === selectedEmployeeId);
        }
        // Grouping Logic
        const groups = [];
        if (groupBy === 'employee') {
            // Group by Employee
            const sortedEmployees = [...filteredEmployees].sort((a, b) => a.firstName.localeCompare(b.firstName));
            sortedEmployees.forEach(emp => {
                const empTimesheets = filtered.filter(t => t.employeeId === emp.id);
                if (empTimesheets.length > 0) {
                    const stats = {
                        count: empTimesheets.length,
                        hours: empTimesheets.reduce((acc, t) => acc + getDurationHours(t.startTime, t.endTime, t.breaks), 0),
                        pay: empTimesheets.reduce((acc, t) => acc + getPay(getDurationHours(t.startTime, t.endTime, t.breaks), emp.hourlyRate), 0)
                    };
                    groups.push({
                        id: emp.id,
                        title: emp.firstName,
                        subtitle: `(${emp.firstName} ${emp.lastName})`,
                        employee: emp,
                        timesheets: empTimesheets,
                        stats
                    });
                }
            });
        }
        else {
            // Group by Date
            const dateMap = new Map();
            filtered.forEach(t => {
                var _a;
                const dateKey = (0, date_fns_1.format)((0, date_fns_1.parseISO)(t.startTime), 'yyyy-MM-dd');
                if (!dateMap.has(dateKey))
                    dateMap.set(dateKey, []);
                (_a = dateMap.get(dateKey)) === null || _a === void 0 ? void 0 : _a.push(t);
            });
            // Sort dates (newest first)
            const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));
            sortedDates.forEach(dateStr => {
                const dateTimesheets = dateMap.get(dateStr) || [];
                // Sort timesheets within date by time
                dateTimesheets.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
                const displayDate = (0, date_fns_1.format)((0, date_fns_1.parseISO)(dateStr), 'EEE, MMM d, yyyy');
                const stats = {
                    count: dateTimesheets.length,
                    hours: dateTimesheets.reduce((acc, t) => acc + getDurationHours(t.startTime, t.endTime, t.breaks), 0),
                    pay: dateTimesheets.reduce((acc, t) => {
                        const emp = employees.find(e => e.id === t.employeeId);
                        return acc + getPay(getDurationHours(t.startTime, t.endTime, t.breaks), emp === null || emp === void 0 ? void 0 : emp.hourlyRate);
                    }, 0)
                };
                groups.push({
                    id: dateStr,
                    title: displayDate,
                    timesheets: dateTimesheets,
                    stats
                });
            });
        }
        return groups;
    }, [timesheets, filteredEmployees, activeTab, selectedLocationId, selectedEmployeeId, groupBy, employees]);
    const totalStats = (0, react_1.useMemo)(() => {
        return groupedTimesheets.reduce((acc, group) => {
            return {
                count: acc.count + group.stats.count,
                hours: acc.hours + group.stats.hours,
                pay: acc.pay + group.stats.pay
            };
        }, { count: 0, hours: 0, pay: 0 });
    }, [groupedTimesheets]);
    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED':
                return (<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <lucide_react_1.Zap className="w-3 h-3 fill-current"/>
                      Approved
                  </span>);
            case 'IN_PROGRESS':
                return (<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      <lucide_react_1.Clock className="w-3 h-3"/>
                      Clocked In
                  </span>);
            case 'PENDING':
                return (<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                      <lucide_react_1.AlertCircle className="w-3 h-3"/>
                      Pending Approval
                  </span>);
            case 'REJECTED':
            case 'DISCARDED':
                return (<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      <lucide_react_1.XCircle className="w-3 h-3"/>
                      Discarded
                  </span>);
            default:
                return null;
        }
    };
    if (loading && employees.length === 0)
        return <div className="p-8 flex items-center justify-center h-screen">Loading...</div>;
    return (<div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-slate-900">
      
      {/* Role Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4">
        <button onClick={() => setRoleTab('W2')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${roleTab === 'W2'
            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}>
          W-2 Payroll Hours
        </button>
        <button onClick={() => setRoleTab('CONTRACTOR_1099')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${roleTab === 'CONTRACTOR_1099'
            ? 'border-orange-500 text-orange-600 dark:text-orange-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}>
          1099 Contractor Hours
        </button>
        
        {/* Tooltip / Help Info */}
        <div className="flex items-center ml-4">
            <div className="group relative flex items-center">
                <div className="cursor-help text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
                    <lucide_react_1.AlertCircle className="w-4 h-4"/>
                </div>
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                    Hours are completely separate. W-2 hours affect payroll taxes, while 1099 hours are for contractor payments only.
                </div>
            </div>
        </div>
      </div>

      {/* Top Toolbar - Global Filters */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
              {/* Location Selector */}
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                  </div>
                  <select className="appearance-none bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 text-purple-700 dark:text-purple-300 pl-8 pr-8 py-1.5 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer min-w-[160px]" value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}>
                      <option value="all">All Locations</option>
                      {locations.map(loc => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
                  </select>
                  <lucide_react_1.ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-purple-700 dark:text-purple-300 pointer-events-none"/>
              </div>

              {/* Date Navigation */}
              <div className="flex items-center bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-md p-0.5">
                  <button onClick={handlePrevWeek} className="p-1 hover:bg-white dark:hover:bg-purple-900/50 rounded text-purple-700 dark:text-purple-300">
                      <lucide_react_1.ChevronLeft className="w-4 h-4"/>
                  </button>
                  <span className="px-3 text-sm font-medium text-purple-700 dark:text-purple-300 min-w-[180px] text-center">
                      {(0, date_fns_1.format)(startDate, 'EEE d MMM')} - {(0, date_fns_1.format)(endDate, 'EEE d MMM')}
                  </span>
                  <button onClick={handleNextWeek} className="p-1 hover:bg-white dark:hover:bg-purple-900/50 rounded text-purple-700 dark:text-purple-300">
                      <lucide_react_1.ChevronRight className="w-4 h-4"/>
                  </button>
              </div>

              {/* Refresh Button */}
              <button onClick={fetchData} className="p-1.5 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors" title="Refresh Data">
                  <lucide_react_1.RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/>
              </button>

              {/* Group By */}
              <div className="relative hidden lg:block">
                  <div className="relative group">
                    <button className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-md text-sm font-medium">
                        Group by: {groupBy === 'employee' ? 'Team Member' : 'Date'}
                        <lucide_react_1.ChevronDown className="w-4 h-4"/>
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-50 hidden group-hover:block">
                        <button onClick={() => setGroupBy('employee')} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">Team Member</button>
                        <button onClick={() => setGroupBy('date')} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">Date</button>
                    </div>
                  </div>
              </div>

              {/* View Options */}
              <div className="relative hidden lg:block">
                  <div className="relative">
                    <button onClick={() => setIsViewOptionsOpen(!isViewOptionsOpen)} className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-md text-sm font-medium">
                        View options
                        <lucide_react_1.ChevronDown className="w-4 h-4"/>
                    </button>
                    {isViewOptionsOpen && (<div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-50">
                            <button onClick={() => { handleExportPDF(timesheets); setIsViewOptionsOpen(false); }} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                                <lucide_react_1.FileText className="w-4 h-4"/> Export Timesheet as PDF
                            </button>
                            <button onClick={() => { handleExportPDF(timesheets, 'print'); setIsViewOptionsOpen(false); }} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                                <lucide_react_1.Printer className="w-4 h-4"/> Print Timesheet
                            </button>
                            <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                            <button onClick={() => {
                const selected = timesheets.filter(t => selectedTimesheetIds.has(t.id));
                if (selected.length === 0)
                    return sonner_1.toast.error('No timesheets selected');
                handleExportPDF(selected, 'print');
                setIsViewOptionsOpen(false);
            }} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                                <lucide_react_1.Printer className="w-4 h-4"/> Print Selected Timesheet
                            </button>
                            <button onClick={() => {
                const selected = timesheets.filter(t => selectedTimesheetIds.has(t.id));
                if (selected.length === 0)
                    return sonner_1.toast.error('No timesheets selected');
                handleExportPDF(selected, 'download');
                setIsViewOptionsOpen(false);
            }} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                                <lucide_react_1.FileText className="w-4 h-4"/> Export Selected Timesheet
                            </button>
                        </div>)}
                  </div>
              </div>
          </div>

          {/* Add Button */}
          <div>
              <div className="relative">
                <button onClick={() => setIsAddOptionsOpen(!isAddOptionsOpen)} className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-purple-100 transition-colors">
                    Add
                    <lucide_react_1.ChevronDown className="w-4 h-4"/>
                </button>
                {isAddOptionsOpen && (<div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-50">
                        <button className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                            <lucide_react_1.Clock className="w-4 h-4"/> Add Time Entry
                        </button>
                        <button onClick={() => { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                            <lucide_react_1.Upload className="w-4 h-4"/> Import from Excel
                        </button>
                    </div>)}
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload}/>
              </div>
          </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar - Left */}
        <div className="w-80 flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-0">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex gap-2">
                <div className="relative flex-1">
                    <lucide_react_1.Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400"/>
                    <input type="text" placeholder="Search" className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                </div>
                <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500">
                    <lucide_react_1.Filter className="w-4 h-4"/>
                </button>
            </div>

            {/* Employee List */}
            <div className="flex-1 overflow-y-auto">
                {filteredEmployees.map(emp => {
            const stats = employeeStats[emp.id];
            // Simple logic to determine if this employee has data in current view
            const hasData = stats && stats.count > 0;
            const isSelected = selectedEmployeeId === emp.id;
            return (<div key={emp.id} onClick={() => setSelectedEmployeeId(isSelected ? null : emp.id)} className={`flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${isSelected
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-l-purple-600'
                    : hasData
                        ? 'bg-slate-50/50 dark:bg-slate-800/30'
                        : ''}`}>
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 border-2 border-white dark:border-slate-800 flex items-center justify-center flex-shrink-0 relative">
                                <span className="text-sm font-bold text-green-700 dark:text-green-400">
                                    {emp.firstName[0]}{emp.lastName[0]}
                                </span>
                                {hasData && (<div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full flex items-center justify-center">
                                        <lucide_react_1.Check className="w-2 h-2 text-white"/>
                                    </div>)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                                    {emp.firstName} <span className="text-slate-500 font-normal">({emp.firstName} {emp.lastName})</span>
                                    {timesheets.some(t => t.employeeId === emp.id && t.status === 'IN_PROGRESS') && (<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                            Active
                                        </span>)}
                                </div>
                                {stats && (<div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {stats.count} | {stats.hours.toFixed(1)}h · {(0, localization_1.formatCurrency)(stats.pay, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                                    </div>)}
                            </div>
                        </div>);
        })}
                {filteredEmployees.length === 0 && (<div className="p-6 text-center text-sm text-slate-500">
                        No employees found.
                    </div>)}
            </div>
        </div>

        {/* Main Content - Right */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 min-w-0">
            {/* Tabs */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 pt-4 flex-shrink-0">
                <div className="flex gap-8">
                    {[
            { id: 'all', label: 'All', count: timesheets.length },
            { id: 'pending', label: 'Pending', count: timesheets.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length },
            { id: 'approved', label: 'Approved', count: timesheets.filter(t => t.status === 'APPROVED').length },
            { id: 'discarded', label: 'Discarded', count: timesheets.filter(t => t.status === 'DISCARDED' || t.status === 'REJECTED').length },
        ].map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab.id
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                            {tab.label}
                            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                {tab.count}
                            </span>
                        </button>))}
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    {/* Summary Row */}
                    <div className="flex items-center gap-4 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <input type="checkbox" className="rounded border-slate-300 text-purple-600 focus:ring-purple-500" checked={groupedTimesheets.length > 0 && groupedTimesheets.every(g => g.timesheets.every(t => selectedTimesheetIds.has(t.id)))} onChange={() => {
            const allIds = groupedTimesheets.flatMap(g => g.timesheets.map(t => t.id));
            handleSelectAll(allIds);
        }}/>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                            All timesheets <span className="text-slate-500 dark:text-slate-400 font-normal ml-1">
                                {totalStats.count} timesheet{totalStats.count !== 1 ? 's' : ''} · {totalStats.hours.toFixed(1)}h · {(0, localization_1.formatCurrency)(totalStats.pay, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                            </span>
                        </div>
                    </div>

                    {/* Grouped Rows */}
                    {groupedTimesheets.length === 0 ? (<div className="p-8 text-center text-slate-500 dark:text-slate-400">
                            No timesheets found for this view.
                        </div>) : (groupedTimesheets.map(group => {
            const isExpanded = expandedEmployees[group.id];
            const allSelected = group.timesheets.length > 0 && group.timesheets.every(t => selectedTimesheetIds.has(t.id));
            const someSelected = group.timesheets.some(t => selectedTimesheetIds.has(t.id));
            return (<div key={group.id} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                                {/* Group Header */}
                                <div className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer group" onClick={() => toggleEmployeeExpand(group.id)}>
                                    <input type="checkbox" className="rounded border-slate-300 text-purple-600 focus:ring-purple-500" checked={allSelected} ref={input => { if (input)
                input.indeterminate = someSelected && !allSelected; }} onClick={(e) => e.stopPropagation()} onChange={() => handleSelectAll(group.timesheets.map(t => t.id))}/>
                                    
                                    {groupBy === 'employee' && group.employee ? (<>
                                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                                {group.employee.firstName[0]}{group.employee.lastName[0]}
                                            </div>
                                            <div className="text-sm font-bold text-slate-900 dark:text-white flex-1">
                                                {group.employee.firstName} <span className="text-slate-500 font-normal">({group.employee.firstName} {group.employee.lastName})</span>
                                                <span className="text-slate-500 dark:text-slate-400 font-normal ml-2">
                                                    {group.stats.count} timesheet{group.stats.count !== 1 ? 's' : ''} · {group.stats.hours.toFixed(1)}h · {(0, localization_1.formatCurrency)(group.stats.pay, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                                                </span>
                                            </div>
                                        </>) : (<div className="text-sm font-bold text-slate-900 dark:text-white flex-1">
                                            {group.title}
                                            <span className="text-slate-500 dark:text-slate-400 font-normal ml-2">
                                                {group.stats.count} timesheet{group.stats.count !== 1 ? 's' : ''} · {group.stats.hours.toFixed(1)}h · {(0, localization_1.formatCurrency)(group.stats.pay, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                                            </span>
                                        </div>)}

                                    <lucide_react_1.ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                                </div>

                                {/* Timesheets List */}
                                {isExpanded && (<div className="bg-slate-50 dark:bg-slate-900/20">
                                        {group.timesheets.map(timesheet => {
                        var _a, _b, _c;
                        const hours = getDurationHours(timesheet.startTime, timesheet.endTime, timesheet.breaks);
                        const pay = getPay(hours, (((_a = timesheet.employee) === null || _a === void 0 ? void 0 : _a.hourlyRate) || ((_b = group.employee) === null || _b === void 0 ? void 0 : _b.hourlyRate)));
                        // Break duration
                        let breakMinutes = 0;
                        timesheet.breaks.forEach(b => {
                            if (b.startTime && b.endTime) {
                                breakMinutes += (0, date_fns_1.differenceInMinutes)((0, date_fns_1.parseISO)(b.endTime), (0, date_fns_1.parseISO)(b.startTime));
                            }
                        });
                        return (<div key={timesheet.id} className="flex items-center gap-4 p-4 pl-14 border-t border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                                                    <input type="checkbox" className="rounded border-slate-300 text-purple-600 focus:ring-purple-500" checked={selectedTimesheetIds.has(timesheet.id)} onChange={() => toggleTimesheetSelection(timesheet.id)}/>
                                                    
                                                    <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                                        {/* Date / Employee Name */}
                                                        <div className="col-span-3 text-sm font-medium text-slate-900 dark:text-white">
                                                            {groupBy === 'date' ? (<span className="flex items-center gap-2">
                                                                    {timesheet.employee && (<span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                                            {timesheet.employee.firstName[0]}{timesheet.employee.lastName[0]}
                                                                        </span>)}
                                                                    <span>{timesheet.employee ? `${timesheet.employee.firstName} ${timesheet.employee.lastName}` : 'Unknown'}</span>
                                                                    
                                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${roleTab === 'W2'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
                                    : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800'}`}>
                                                                        {roleTab === 'W2' ? 'W-2' : '1099'}
                                                                    </span>
                                                                </span>) : ((0, date_fns_1.format)((0, date_fns_1.parseISO)(timesheet.startTime), 'EEE d MMM'))}
                                                        </div>

                                                        {/* Status */}
                                                        <div className="col-span-2">
                                                            {getStatusBadge(timesheet.status)}
                                                        </div>

                                                        {/* Time Range */}
                                                        <div className="col-span-2 text-sm text-slate-600 dark:text-slate-300">
                                                            {(0, date_fns_1.format)((0, date_fns_1.parseISO)(timesheet.startTime), 'h:mm a')} – {timesheet.endTime ? (0, date_fns_1.format)((0, date_fns_1.parseISO)(timesheet.endTime), 'h:mm a') : 'Now'}
                                                        </div>

                                                        {/* Breaks */}
                                                        <div className="col-span-1 flex items-center gap-1 text-sm text-slate-500">
                                                            <lucide_react_1.Coffee className="w-3 h-3"/>
                                                            {breakMinutes}m
                                                        </div>

                                                        {/* Hours */}
                                                        <div className="col-span-1 flex items-center gap-1 text-sm text-slate-500">
                                                            <lucide_react_1.Clock className="w-3 h-3"/>
                                                            {hours.toFixed(1)}h
                                                        </div>

                                                        {/* Type/Location */}
                                                        <div className="col-span-2 text-sm text-slate-500 truncate">
                                                             {((_c = timesheet.location) === null || _c === void 0 ? void 0 : _c.name) || 'Regular Shift'}
                                                        </div>

                                                        {/* Pay */}
                                                        <div className="col-span-1 text-sm font-medium text-slate-900 dark:text-white text-right">
                                                            {(0, localization_1.formatCurrency)(pay, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Actions */}
                                                    <div className="flex justify-end">
                                                        <button onClick={() => {
                                setSelectedTimesheet(timesheet);
                                setIsModalOpen(true);
                            }} className="text-slate-400 hover:text-purple-600">
                                                            <lucide_react_1.MoreHorizontal className="w-4 h-4"/>
                                                        </button>
                                                    </div>
                                                </div>);
                    })}
                                    </div>)}
                            </div>);
        }))}
                </div>
            </div>
        </div>
      </div>
      
      <TimesheetDetailsModal_1.TimesheetDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} timesheet={selectedTimesheet} locations={locations} onUpdate={fetchData} currencyCode={selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode}/>
    </div>);
}
