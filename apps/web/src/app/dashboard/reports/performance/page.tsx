'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useBusiness } from '@/context/business-context';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { SideModal } from '@/components/SideModal';
import { Calendar, Clock, TrendingUp, AlertTriangle, Users, DollarSign, Download, RefreshCw, Filter, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Employee = { id: string; firstName: string; lastName: string; email?: string; role?: string };
type Location = { id: string; name: string };
type Shift = { id: string; employeeId?: string | null; startTime: string; endTime?: string | null; location?: Location | null };
type Timesheet = { id: string; employeeId: string; startTime: string; endTime?: string | null; location?: Location | null; breaks?: Array<{ startTime: string; endTime?: string | null }>; employee?: { id: string; firstName: string; lastName: string; hourlyRate?: number; salary?: number } };

function safeDateTime(ts?: string | null) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function hoursBetween(a: Date, b: Date) {
  return Math.max(0, (b.getTime() - a.getTime()) / (1000 * 60 * 60));
}

export default function PerformanceReportPage() {
  const { selectedBusiness } = useBusiness();
  const businessId = selectedBusiness?.id || null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState(() => format(addDays(new Date(), -14), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const [attendance, setAttendance] = useState<Timesheet[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [reliability, setReliability] = useState<any | null>(null);
  const [laborCost, setLaborCost] = useState<{ totalHours: number; estimatedCost: number; timesheetCount: number } | null>(null);
  const [expiringQualCount, setExpiringQualCount] = useState<number>(0);

  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [profile, setProfile] = useState<{ email?: string; role?: string } | null>(null);

  const load = async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    if (!silent) setLoading(true);
    try {
      const [attRes, lcRes, qualRes, profRes, relRes] = await Promise.all([
        api.get('/reports/attendance', { params: { startDate, endDate } }),
        api.get('/reports/labor-cost', { params: { startDate, endDate } }),
        api.get('/employees/qualifications/expiring').catch(() => ({ data: [] })),
        api.get('/auth/profile').catch(() => ({ data: null })),
        api.get('/reports/reliability', { params: { startDate, endDate } }).catch(() => ({ data: null })),
      ]);
      setAttendance(Array.isArray(attRes.data) ? (attRes.data as Timesheet[]) : []);
      setLaborCost(lcRes.data || null);
      setExpiringQualCount(Array.isArray(qualRes.data) ? qualRes.data.length : 0);
      setProfile(profRes.data || null);
      setReliability(relRes.data || null);
      if (businessId) {
        const shiftRes = await api.get('/scheduling/shifts', {
          params: {
            businessId,
            start: new Date(startDate).toISOString(),
            end: new Date(endDate).toISOString(),
          },
        });
        setShifts(Array.isArray(shiftRes.data) ? (shiftRes.data as Shift[]) : []);
      } else {
        setShifts([]);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load performance data');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = async () => {
    try {
      setRefreshing(true);
      await load({ silent: true });
      toast.success('Refreshed');
    } finally {
      setRefreshing(false);
    }
  };

  const perEmployeeStats = useMemo(() => {
    // Map scheduled shifts by employee and day
    const byEmpDateShift = new Map<string, Shift[]>();
    for (const s of shifts) {
      if (!s.employeeId) continue;
      const key = `${s.employeeId}:${new Date(s.startTime).toISOString().slice(0, 10)}`;
      const list = byEmpDateShift.get(key) || [];
      list.push(s);
      byEmpDateShift.set(key, list);
    }

    const stats: Record<string, { employeeId: string; totalHours: number; timesheetCount: number; onTime: number; late: number; missed: number; avgLateMinutes: number }> = {};

    // Calculate attendance metrics
    for (const ts of attendance) {
      const empId = ts.employeeId;
      const start = new Date(ts.startTime);
      const end = ts.endTime ? new Date(ts.endTime) : null;
      const dayKey = start.toISOString().slice(0, 10);
      const shiftKey = `${empId}:${dayKey}`;
      const scheduled = (byEmpDateShift.get(shiftKey) || []).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] || null;

      if (!stats[empId]) stats[empId] = { employeeId: empId, totalHours: 0, timesheetCount: 0, onTime: 0, late: 0, missed: 0, avgLateMinutes: 0 };
      const st = stats[empId];
      st.timesheetCount += 1;
      if (end) st.totalHours += hoursBetween(start, end);

      if (scheduled) {
        const schedStart = new Date(scheduled.startTime);
        const deltaMin = Math.round((start.getTime() - schedStart.getTime()) / (1000 * 60));
        if (deltaMin <= 5) st.onTime += 1;
        else {
          st.late += 1;
          // running average
          const totalLateMin = st.avgLateMinutes * (st.late - 1) + deltaMin;
          st.avgLateMinutes = Math.round((totalLateMin / st.late) * 10) / 10;
        }
      } else {
        // no scheduled shift found — skip on-time/late classification
      }
    }

    // Missed = scheduled shifts with no timesheet
    for (const s of shifts) {
      if (!s.employeeId) continue;
      const empId = s.employeeId;
      const dayKey = new Date(s.startTime).toISOString().slice(0, 10);
      const tsHit = attendance.find((t) => t.employeeId === empId && t.startTime.slice(0, 10) === dayKey);
      if (!stats[empId]) stats[empId] = { employeeId: empId, totalHours: 0, timesheetCount: 0, onTime: 0, late: 0, missed: 0, avgLateMinutes: 0 };
      if (!tsHit) stats[empId].missed += 1;
    }

    return stats;
  }, [attendance, shifts]);

  const overall = useMemo(() => {
    const vals = Object.values(perEmployeeStats);
    let totalHours = 0;
    let timesheetCount = 0;
    let onTime = 0;
    let late = 0;
    let missed = 0;
    let lateSum = 0;
    let lateCount = 0;
    for (const v of vals) {
      totalHours += v.totalHours;
      timesheetCount += v.timesheetCount;
      onTime += v.onTime;
      late += v.late;
      missed += v.missed;
      lateSum += v.avgLateMinutes * v.late;
      lateCount += v.late;
    }
    const avgLateMinutes = lateCount ? Math.round((lateSum / lateCount) * 10) / 10 : 0;
    const punctualityRate = (onTime + late + missed) ? Math.round(((onTime / (onTime + late + missed)) * 100) * 10) / 10 : 0;
    return { totalHours: Math.round(totalHours * 100) / 100, timesheetCount, onTime, late, missed, avgLateMinutes, punctualityRate };
  }, [perEmployeeStats]);

  const latenessSeries = useMemo(() => {
    // simple daily lateness minutes based on comparing first ts start vs first shift start
    const dayMap = new Map<string, number>();
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    const days: Date[] = [];
    const cursor = new Date(start);
    while (cursor.getTime() <= end.getTime()) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    for (const d of days) {
      const key = d.toISOString().slice(0, 10);
      const tsDay = attendance.filter((t) => t.startTime.slice(0, 10) === key);
      const shDay = shifts.filter((s) => new Date(s.startTime).toISOString().slice(0, 10) === key);
      let totalLate = 0;
      for (const s of shDay) {
        if (!s.employeeId) continue;
        const schedStart = new Date(s.startTime);
        const ts = tsDay.find((t) => t.employeeId === s.employeeId);
        if (!ts) continue;
        const tsStart = new Date(ts.startTime);
        const deltaMin = Math.round((tsStart.getTime() - schedStart.getTime()) / (1000 * 60));
        if (deltaMin > 0) totalLate += deltaMin;
      }
      dayMap.set(key, totalLate);
    }
    return Array.from(dayMap.entries()).map(([date, lateMinutes]) => ({ date, lateMinutes }));
  }, [attendance, shifts, startDate, endDate]);

  const dailyPunctuality = useMemo(() => {
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    const days: Date[] = [];
    const cursor = new Date(start);
    while (cursor.getTime() <= end.getTime()) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days.map((d) => {
      const key = d.toISOString().slice(0, 10);
      const shDay = shifts.filter((s) => new Date(s.startTime).toISOString().slice(0, 10) === key);
      let onTime = 0;
      let late = 0;
      let missed = 0;
      for (const s of shDay) {
        if (!s.employeeId) continue;
        const schedStart = new Date(s.startTime);
        const ts = attendance.find((t) => t.employeeId === s.employeeId && t.startTime.slice(0, 10) === key);
        if (!ts) {
          missed += 1;
        } else {
          const tsStart = new Date(ts.startTime);
          const deltaMin = Math.round((tsStart.getTime() - schedStart.getTime()) / (1000 * 60));
          if (deltaMin <= 5) onTime += 1;
          else late += 1;
        }
      }
      const denom = onTime + late + missed;
      const rate = denom ? Math.round(((onTime / denom) * 100) * 10) / 10 : 0;
      return { date: key, onTime, late, missed, rate };
    });
  }, [attendance, shifts, startDate, endDate]);

  const pieOnTime = overall.onTime;
  const pieLate = overall.late;
  const pieMissed = overall.missed;
  const pieTotal = Math.max(1, pieOnTime + pieLate + pieMissed);
  const pieAngles = {
    onTime: (pieOnTime / pieTotal) * Math.PI * 2,
    late: (pieLate / pieTotal) * Math.PI * 2,
    missed: (pieMissed / pieTotal) * Math.PI * 2,
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const bizName = selectedBusiness?.name || 'Business';
    const generatedAt = new Date().toLocaleString();
    doc.setFontSize(16);
    doc.text(`${bizName} — Performance Report`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Range: ${startDate} to ${endDate}`, 14, 28);
    doc.text(`Generated at: ${generatedAt}`, 14, 33);
    if (profile?.email) doc.text(`Generated by: ${profile.email}`, 14, 38);
    doc.text(`Punctuality: ${overall.punctualityRate}% | Avg Late: ${overall.avgLateMinutes}m | Total Hours: ${overall.totalHours.toFixed(2)}h`, 14, 45);
    autoTable(doc, {
      head: [['Date', 'Late Minutes']],
      body: latenessSeries.map((d) => [d.date, String(d.lateMinutes)]),
      startY: 52,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    });
    autoTable(doc, {
      head: [['Employee ID', 'On-time %', 'Hours', 'Late', 'Missed', 'Avg Late']],
      body: Object.values(perEmployeeStats)
        .map((v) => ({
          employeeId: v.employeeId,
          onTimeRate: (v.onTime + v.late + v.missed) ? Math.round(((v.onTime / (v.onTime + v.late + v.missed)) * 100) * 10) / 10 : 0,
          hours: Math.round(v.totalHours * 100) / 100,
          late: v.late,
          missed: v.missed,
          avgLate: v.avgLateMinutes,
        }))
        .sort((a, b) => b.onTimeRate - a.onTimeRate)
        .slice(0, 20)
        .map((r) => [r.employeeId, `${r.onTimeRate}%`, `${r.hours}h`, String(r.late), String(r.missed), `${r.avgLate}m`]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    });
    doc.save(`performance_${startDate}_${endDate}.pdf`);
  };

  const exportCSV = () => {
    const lines: string[] = [];
    lines.push(`Business,${selectedBusiness?.name || ''}`);
    lines.push(`Range,${startDate} to ${endDate}`);
    lines.push(`Generated,${new Date().toISOString()}`);
    lines.push('');
    lines.push('Daily Lateness');
    lines.push('Date,Late Minutes');
    for (const d of latenessSeries) lines.push(`${d.date},${d.lateMinutes}`);
    lines.push('');
    lines.push('Top Employees');
    lines.push('Employee ID,On-time %,Total Hours,Late,Missed,Avg Late');
    for (const e of Object.values(perEmployeeStats)
      .map((v) => ({
        employeeId: v.employeeId,
        onTimeRate: (v.onTime + v.late + v.missed) ? Math.round(((v.onTime / (v.onTime + v.late + v.missed)) * 100) * 10) / 10 : 0,
        hours: Math.round(v.totalHours * 100) / 100,
        late: v.late,
        missed: v.missed,
        avgLate: v.avgLateMinutes,
      }))
      .sort((a, b) => b.onTimeRate - a.onTimeRate)
      .slice(0, 50)) {
      lines.push(`${e.employeeId},${e.onTimeRate},${e.hours},${e.late},${e.missed},${e.avgLate}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const topEmployees = useMemo(() => {
    const arr = Object.values(perEmployeeStats)
      .map((v) => ({
        employeeId: v.employeeId,
        onTimeRate: (v.onTime + v.late + v.missed) ? Math.round(((v.onTime / (v.onTime + v.late + v.missed)) * 100) * 10) / 10 : 0,
        totalHours: Math.round(v.totalHours * 100) / 100,
        late: v.late,
        missed: v.missed,
        avgLateMinutes: v.avgLateMinutes,
      }))
      .sort((a, b) => b.onTimeRate - a.onTimeRate)
      .slice(0, 10);
    return arr;
  }, [perEmployeeStats]);

  const reliabilityRows = useMemo(() => {
    return Array.isArray(reliability?.officers) ? reliability.officers : [];
  }, [reliability]);

  const reliabilityTotals = useMemo(() => {
    const rows = reliabilityRows;
    return rows.reduce(
      (acc: any, r: any) => {
        acc.callouts += Number(r?.totals?.callouts || 0);
        acc.covered += Number(r?.totals?.coveredForOthers || 0);
        return acc;
      },
      { callouts: 0, covered: 0 }
    );
  }, [reliabilityRows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-gray-50/50 dark:bg-slate-900/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            Performance Report
          </h1>
          <div className="mt-1 text-gray-500 dark:text-gray-400">
            Attendance, punctuality, hours and labor cost across the selected date range.
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none" />
            <span className="text-gray-400">–</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none" />
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700/40 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={exportPDF}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700/40"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Punctuality" value={`${overall.punctualityRate}%`} icon={TrendingUp} accent="bg-indigo-500" />
        <StatCard title="Avg Late Minutes" value={`${overall.avgLateMinutes}m`} icon={Clock} accent="bg-amber-500" />
        <StatCard title="Total Hours" value={`${overall.totalHours.toFixed(2)}h`} icon={Users} accent="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard label="On-time" value={`${overall.onTime}`} />
        <KpiCard label="Late" value={`${overall.late}`} />
        <KpiCard label="Missed" value={`${overall.missed}`} />
        <KpiCard label="Timesheets" value={`${overall.timesheetCount}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-gray-900 dark:text-white">Daily lateness (minutes)</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Sum of minutes late per day</div>
          </div>
          <div className="h-48 flex items-end gap-2">
            {latenessSeries.map((d) => {
              const height = Math.min(180, d.lateMinutes * 2);
              return (
                <div key={d.date} className="flex flex-col items-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(d.date), 'MM/dd')}</div>
                  <div className="w-6 bg-amber-400/60 dark:bg-amber-600/60 rounded-t" style={{ height }} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-gray-900 dark:text-white">Labor cost</div>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          {laborCost ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Estimated cost</span>
                <span className="font-bold text-gray-900 dark:text-white">${Math.round(laborCost.estimatedCost * 100) / 100}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Total hours</span>
                <span className="font-bold text-gray-900 dark:text-white">{Math.round(laborCost.totalHours * 100) / 100}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Timesheets</span>
                <span className="font-bold text-gray-900 dark:text-white">{laborCost.timesheetCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Expiring qualifications</span>
                <span className="font-bold text-gray-900 dark:text-white">{expiringQualCount}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">No labor data</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="font-bold text-gray-900 dark:text-white mb-2">Punctuality trend</div>
          <svg width="100%" height="180">
            {dailyPunctuality.map((d, i) => {
              const x = (i / Math.max(1, dailyPunctuality.length - 1)) * 600;
              const y = 160 - (d.rate / 100) * 160;
              const next = dailyPunctuality[i + 1];
              const x2 = next ? ((i + 1) / Math.max(1, dailyPunctuality.length - 1)) * 600 : x;
              const y2 = next ? 160 - (next.rate / 100) * 160 : y;
              return (
                <g key={d.date}>
                  {next && <line x1={x} y1={y} x2={x2} y2={y2} stroke="#6366f1" strokeWidth="2" />}
                  <circle cx={x} cy={y} r="3" fill="#6366f1" />
                </g>
              );
            })}
          </svg>
          <div className="text-xs text-gray-500 dark:text-gray-400">On-time % per day</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="font-bold text-gray-900 dark:text-white mb-2">On-time / Late / Missed</div>
          <svg width="180" height="180" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="#eef2ff" />
            {(() => {
              const start = 0;
              const segments = [
                { angle: pieAngles.onTime, color: '#22c55e' },
                { angle: pieAngles.late, color: '#f59e0b' },
                { angle: pieAngles.missed, color: '#ef4444' },
              ];
              let current = start;
              return segments.map((seg, idx) => {
                const x1 = 18 + 16 * Math.cos(current);
                const y1 = 18 + 16 * Math.sin(current);
                const x2 = 18 + 16 * Math.cos(current + seg.angle);
                const y2 = 18 + 16 * Math.sin(current + seg.angle);
                const largeArcFlag = seg.angle > Math.PI ? 1 : 0;
                const d = `M 18 18 L ${x1} ${y1} A 16 16 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                current += seg.angle;
                return <path key={idx} d={d} fill={seg.color} stroke="#fff" strokeWidth="0.5" />;
              });
            })()}
          </svg>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">On-time: {overall.onTime} • Late: {overall.late} • Missed: {overall.missed}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-gray-900 dark:text-white">Top 10 employees (punctuality)</div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 px-3 py-2">
              <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search employee ID…"
                className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none w-64 max-w-full"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <th className="px-5 py-3">Employee ID</th>
                <th className="px-5 py-3">On-time rate</th>
                <th className="px-5 py-3">Total hours</th>
                <th className="px-5 py-3">Late</th>
                <th className="px-5 py-3">Missed</th>
                <th className="px-5 py-3">Avg late</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60 dark:divide-slate-700/60">
              {topEmployees
                .filter((e) => (query ? e.employeeId.includes(query.trim()) : true))
                .map((e) => (
                  <tr key={e.employeeId} className="hover:bg-gray-50/70 dark:hover:bg-slate-900/40">
                    <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">{e.employeeId}</td>
                    <td className="px-5 py-4">{e.onTimeRate}%</td>
                    <td className="px-5 py-4">{e.totalHours}h</td>
                    <td className="px-5 py-4">{e.late}</td>
                    <td className="px-5 py-4">{e.missed}</td>
                    <td className="px-5 py-4">{e.avgLateMinutes}m</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {reliability && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-bold text-gray-900 dark:text-white">Reliability & Coverage</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Call-outs, no-shows, shift coverage, and transparent scoring</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <KpiCard label="Coverage fill rate" value={`${reliability?.insights?.coverageEfficiency?.fillRate ?? 0}%`} />
            <KpiCard label="Avg fill time" value={`${reliability?.insights?.coverageEfficiency?.avgResponseMinutes ?? 0}m`} />
            <KpiCard label="Total call-outs" value={`${reliabilityTotals.callouts}`} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-5 py-3">Officer</th>
                  <th className="px-5 py-3">Score</th>
                  <th className="px-5 py-3">Call-outs</th>
                  <th className="px-5 py-3">Unexcused</th>
                  <th className="px-5 py-3">Late</th>
                  <th className="px-5 py-3">No-shows</th>
                  <th className="px-5 py-3">Covered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/60 dark:divide-slate-700/60">
                {reliabilityRows.slice(0, 10).map((r: any) => (
                  <tr key={r.employeeId} className="hover:bg-gray-50/70 dark:hover:bg-slate-900/40">
                    <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">{r.name || r.employeeId}</td>
                    <td className="px-5 py-4">{r?.scoring?.reliabilityScore ?? 0}</td>
                    <td className="px-5 py-4">{r?.totals?.callouts ?? 0}</td>
                    <td className="px-5 py-4">{r?.totals?.unexcused ?? 0}</td>
                    <td className="px-5 py-4">{r?.totals?.lateCallouts ?? 0}</td>
                    <td className="px-5 py-4">{r?.totals?.noShows ?? 0}</td>
                    <td className="px-5 py-4">{r?.totals?.coveredForOthers ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
        <div className="font-bold text-gray-900 dark:text-white mb-2">Audit metadata</div>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <div>Business: {selectedBusiness?.name || 'N/A'}</div>
          <div>Date range: {startDate} – {endDate}</div>
          <div>Generated at: {new Date().toLocaleString()}</div>
          <div>Generated by: {profile?.email || 'N/A'}</div>
          <div>Data sources: /reports/attendance, /reports/labor-cost, /reports/reliability, /employees/qualifications/expiring, /scheduling/shifts</div>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ title, value, icon: Icon, accent }: { title: string; value: string; icon: any; accent: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden"
  >
    <div className={`absolute -right-10 -top-10 w-28 h-28 rounded-full opacity-10 blur-2xl ${accent}`} />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</div>
        <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</div>
      </div>
      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200">
        <Icon className="w-6 h-6" />
      </div>
    </div>
  </motion.div>
);

const KpiCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</div>
    <div className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{value}</div>
  </div>
);
