'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '../../../../lib/api';
import { useBusiness } from '../../../../context/business-context';
import { 
  Calendar as CalendarIcon, 
  Download, 
  Filter, 
  Search, 
  User, 
  Clock, 
  AlertTriangle, 
  ChevronDown,
  ChevronUp,
  FileSpreadsheet
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  differenceInMinutes, 
  parseISO,
  isValid
} from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getBase64ImageFromURL } from '../../../../utils/image-utils';

interface Break {
  id: string;
  startTime: string;
  endTime?: string | null;
  type: string;
}

interface Timesheet {
  id: string;
  startTime: string;
  endTime?: string;
  status: string;
  breaks: Break[];
  location?: { id: string; name: string };
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    businessId: string;
  };
}

interface CalloutRecord {
  id: string;
  type: string;
  reasonCode: string;
  reasonNote?: string | null;
  noticeAt: string;
  status: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    businessId: string;
  } | null;
  shift?: {
    id: string;
    startTime: string;
    endTime?: string | null;
    location?: { id: string; name: string } | null;
  } | null;
}

interface EmployeeStats {
  id: string;
  name: string;
  role: string;
  totalHours: number;
  daysPresent: number;
  lateArrivals: number;
  overtimeHours: number;
  chartData: { day: string; hours: number; status: string }[];
  dailyRecords: {
    date: Date;
    startTime: string;
    endTime?: string;
    duration: number;
    breakDuration: number;
    location?: string;
  }[];
}

export default function AttendanceReportsPage() {
  const { selectedBusiness } = useBusiness();
  
  // Date State
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [callouts, setCallouts] = useState<CalloutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  const getDurationHours = (start: string, end?: string | null, breaks: Break[] = []) => {
    if (!start) return { hours: 0, breakMinutes: 0 };
    const startDate = parseISO(start);
    const endDate = end ? parseISO(end) : new Date();
    let totalMinutes = differenceInMinutes(endDate, startDate);

    // Subtract breaks
    let breakMinutes = 0;
    if (breaks && breaks.length > 0) {
      breaks.forEach(b => {
          if (b.startTime) {
              const breakStart = parseISO(b.startTime);
              const breakEnd = b.endTime ? parseISO(b.endTime) : new Date();
              const dur = differenceInMinutes(breakEnd, breakStart);
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

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/attendance', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
      setTimesheets(Array.isArray(res.data?.timesheets) ? res.data.timesheets : []);
      setCallouts(Array.isArray(res.data?.callouts) ? res.data.callouts : []);
    } catch (error) {
      console.error('Failed to fetch attendance data', error);
      toast.error('Failed to load attendance report');
    } finally {
      setLoading(false);
    }
  };

  const processedData = useMemo(() => {
    const employees: Record<string, EmployeeStats> = {};
    const daysInInterval = eachDayOfInterval({ start: startDate, end: endDate });

    // Group by employee
    timesheets.forEach(ts => {
      // Filter by location if selected
      if (selectedLocation !== 'all' && ts.location?.id !== selectedLocation) {
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
            day: format(d, 'd'), 
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
        const dayIndex = daysInInterval.findIndex(d => isSameDay(d, start));
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
          location: ts.location?.name
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

  const uniqueLocations = useMemo(() => {
    const locs = new Map<string, string>();
    timesheets.forEach(t => {
      if (t.location) {
        locs.set(t.location.id, t.location.name);
      }
    });
    return Array.from(locs.entries()).map(([id, name]) => ({ id, name }));
  }, [timesheets]);

  const filteredCallouts = useMemo(() => {
    return callouts.filter((callout) => {
      const locationMatch =
        selectedLocation === 'all' || callout.shift?.location?.id === selectedLocation;
      if (!locationMatch) return false;

      const employeeName = `${callout.employee?.firstName || ''} ${callout.employee?.lastName || ''}`.trim().toLowerCase();
      const role = String(callout.employee?.role || '').replace(/_/g, ' ').toLowerCase();
      const reasonCode = String(callout.reasonCode || '').replace(/_/g, ' ').toLowerCase();
      const reasonNote = String(callout.reasonNote || '').toLowerCase();

      const query = searchTerm.trim().toLowerCase();
      if (!query) return true;

      return (
        employeeName.includes(query) ||
        role.includes(query) ||
        reasonCode.includes(query) ||
        reasonNote.includes(query)
      );
    });
  }, [callouts, searchTerm, selectedLocation]);

  const filteredData = processedData.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalWorkedHours = processedData.reduce((acc, curr) => acc + curr.totalHours, 0);
  const avgAttendance = processedData.length ? (processedData.reduce((acc, curr) => acc + curr.daysPresent, 0) / processedData.length).toFixed(1) : 0;
  const totalCallouts = filteredCallouts.length;

  const exportPDF = async () => {
    try {
      const doc = new jsPDF();
      
      // Add Logo
      if (selectedBusiness?.logoUrl) {
        try {
          const logoData = await getBase64ImageFromURL(selectedBusiness.logoUrl);
          if (logoData) {
            doc.addImage(logoData, 'PNG', 14, 10, 20, 20);
          }
        } catch (e) {
          console.warn('Failed to load logo', e);
        }
      }

      // Business Header
      doc.setFontSize(20);
      doc.text('Attendance Report', 14, 40);
      
      doc.setFontSize(10);
      doc.text(selectedBusiness?.name || 'Business Name', 14, 46);
      doc.text(`Period: ${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`, 14, 51);
      
      if (selectedLocation !== 'all') {
         const locName = uniqueLocations.find(l => l.id === selectedLocation)?.name || 'Unknown Location';
         doc.text(`Location: ${locName}`, 14, 56);
      }

      const tableData = filteredData.map(emp => [
        emp.name,
        emp.role,
        emp.daysPresent,
        emp.totalHours.toFixed(2),
        emp.overtimeHours.toFixed(2)
      ]);

      autoTable(doc, {
        startY: 65,
        head: [['Employee', 'Role', 'Days Present', 'Total Hours', 'Overtime (Hrs)']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] }, // Slate-900
        alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate-50
      });

      // Summary Section
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text('Summary', 14, finalY);
      doc.setFontSize(10);
      doc.text(`Total Hours: ${totalWorkedHours.toFixed(2)}`, 14, finalY + 6);
      doc.text(`Active Employees: ${processedData.length}`, 14, finalY + 11);
      doc.text(`Avg Attendance Days: ${avgAttendance}`, 14, finalY + 16);

      doc.save(`Attendance_Report_${format(startDate, 'yyyy_MM_dd')}_${format(endDate, 'yyyy_MM_dd')}.pdf`);
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export failed', error);
      toast.error('Failed to export PDF');
    }
  };

  const exportCSV = () => {
    try {
      const headers = ['Record Type', 'Employee Name', 'Role', 'Date', 'Start Time', 'End Time', 'Duration (Hours)', 'Break Duration (Mins)', 'Location', 'Reason'];
      const rows: string[] = [];

      filteredData.forEach(emp => {
        emp.dailyRecords.forEach(record => {
          rows.push([
            '"Attendance"',
            `"${emp.name}"`,
            `"${emp.role}"`,
            `"${format(record.date, 'yyyy-MM-dd')}"`,
            `"${format(parseISO(record.startTime), 'HH:mm')}"`,
            record.endTime ? `"${format(parseISO(record.endTime), 'HH:mm')}"` : '""',
            `"${record.duration.toFixed(2)}"`,
            `"${record.breakDuration}"`,
            `"${record.location || ''}"`,
            '""'
          ].join(','));
        });
      });

      filteredCallouts.forEach((callout) => {
        rows.push([
          '"Call-Out"',
          `"${`${callout.employee?.firstName || ''} ${callout.employee?.lastName || ''}`.trim() || 'Employee'}"`,
          `"${String(callout.employee?.role || '').replace(/_/g, ' ')}"`,
          `"${callout.shift?.startTime ? format(parseISO(callout.shift.startTime), 'yyyy-MM-dd') : format(parseISO(callout.noticeAt), 'yyyy-MM-dd')}"`,
          `"${callout.shift?.startTime ? format(parseISO(callout.shift.startTime), 'HH:mm') : ''}"`,
          `"${callout.shift?.endTime ? format(parseISO(callout.shift.endTime), 'HH:mm') : ''}"`,
          '""',
          '""',
          `"${callout.shift?.location?.name || ''}"`,
          `"${String(callout.reasonCode || '').replace(/_/g, ' ')}${callout.reasonNote ? ` - ${String(callout.reasonNote).replace(/"/g, '""')}` : ''}"`
        ].join(','));
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Attendance_Report_${format(startDate, 'yyyy_MM_dd')}_to_${format(endDate, 'yyyy_MM_dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('CSV export failed', error);
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
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
             <input 
               type="date" 
               value={format(startDate, 'yyyy-MM-dd')}
               onChange={(e) => {
                 const d = new Date(e.target.value);
                 if (isValid(d)) setStartDate(d);
               }}
               className="border-none text-sm focus:ring-0 p-2 text-slate-700 outline-none"
             />
             <span className="text-slate-400">-</span>
             <input 
               type="date" 
               value={format(endDate, 'yyyy-MM-dd')}
               onChange={(e) => {
                 const d = new Date(e.target.value);
                 if (isValid(d)) setEndDate(d);
               }}
               className="border-none text-sm focus:ring-0 p-2 text-slate-700 outline-none"
             />
           </div>

           <div className="flex items-center gap-2">
             <button 
               onClick={exportCSV}
               className="flex items-center gap-2 bg-white text-slate-700 border px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
             >
               <FileSpreadsheet className="w-4 h-4" />
               <span className="hidden md:inline">CSV</span>
             </button>
             <button 
               onClick={exportPDF}
               className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
             >
               <Download className="w-4 h-4" />
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
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold">{totalWorkedHours.toFixed(1)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Active Employees</h3>
            <User className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold">{processedData.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Avg. Days Present</h3>
            <CalendarIcon className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold">{avgAttendance}</p>
          <p className="text-xs text-slate-500 mt-1">in selected period</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Call-Outs</h3>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold">{totalCallouts}</p>
          <p className="text-xs text-slate-500 mt-1">in selected period</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Call-Out Report</h3>
            <p className="text-sm text-slate-500">Employees who called out during the selected period and the reasons provided.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
            <AlertTriangle className="w-4 h-4" />
            {totalCallouts} call-outs
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Shift</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading call-out report...</td>
                </tr>
              ) : filteredCallouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No call-outs found for this period.</td>
                </tr>
              ) : (
                filteredCallouts.map((callout) => (
                  <tr key={callout.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900 font-medium">
                      {`${callout.employee?.firstName || ''} ${callout.employee?.lastName || ''}`.trim() || 'Employee'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {String(callout.employee?.role || '').replace(/_/g, ' ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {callout.shift?.startTime ? format(parseISO(callout.shift.startTime), 'MMM d, yyyy HH:mm') : format(parseISO(callout.noticeAt), 'MMM d, yyyy HH:mm')}
                      {callout.shift?.location?.name ? ` • ${callout.shift.location.name}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {String(callout.type || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {String(callout.reasonCode || '').replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-pre-wrap">
                      {callout.reasonNote || 'No additional details'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-48">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <select
               value={selectedLocation}
               onChange={(e) => setSelectedLocation(e.target.value)}
               className="w-full pl-9 pr-8 py-2 border rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
             >
               <option value="all">All Locations</option>
               {uniqueLocations.map(loc => (
                 <option key={loc.id} value={loc.id}>{loc.name}</option>
               ))}
             </select>
             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="space-y-4">
        {loading ? (
           <div className="text-center py-12 text-slate-500">Loading attendance data...</div>
        ) : filteredData.length === 0 ? (
           <div className="text-center py-12 text-slate-500">No attendance records found for this period.</div>
        ) : (
          filteredData.map(emp => (
            <div key={emp.id} className="bg-white rounded-xl border shadow-sm overflow-hidden transition-all">
              <div 
                className="p-4 flex flex-col md:flex-row items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedEmployee(expandedEmployee === emp.id ? null : emp.id)}
              >
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
                   {expandedEmployee === emp.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>

              {/* Expanded Content: Chart & Table */}
              {expandedEmployee === emp.id && (
                <div className="p-6 border-t bg-slate-50/50">
                  {/* Chart */}
                  <div className="mb-8">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Daily Activity</h4>
                    <div className="h-[250px] w-full bg-white p-4 rounded-lg border border-slate-200">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={emp.chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis 
                            dataKey="day" 
                            tick={{ fontSize: 10 }} 
                            tickLine={false} 
                            axisLine={false}
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }} 
                            tickLine={false} 
                            axisLine={false}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#f1f5f9' }}
                          />
                          <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                            {emp.chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.hours > 8 ? '#f59e0b' : '#3b82f6'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
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
                          {emp.dailyRecords.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No records found.</td>
                            </tr>
                          ) : (
                            emp.dailyRecords.map((record, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-slate-900">{format(record.date, 'MMM d, yyyy')}</td>
                                <td className="px-4 py-3 text-slate-600">{record.location || '-'}</td>
                                <td className="px-4 py-3 text-slate-600 font-mono">{format(parseISO(record.startTime), 'HH:mm')}</td>
                                <td className="px-4 py-3 text-slate-600 font-mono">
                                  {record.endTime ? format(parseISO(record.endTime), 'HH:mm') : '-'}
                                </td>
                                <td className="px-4 py-3 text-slate-600 text-right">{record.breakDuration}</td>
                                <td className="px-4 py-3 text-slate-900 font-medium text-right">{record.duration.toFixed(2)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
