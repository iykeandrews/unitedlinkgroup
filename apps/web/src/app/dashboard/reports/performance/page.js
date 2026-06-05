"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceReportPage;
const react_1 = require("react");
const api_1 = __importDefault(require("@/lib/api"));
const business_context_1 = require("@/context/business-context");
const date_fns_1 = require("date-fns");
const sonner_1 = require("sonner");
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
const jspdf_1 = __importDefault(require("jspdf"));
const jspdf_autotable_1 = __importDefault(require("jspdf-autotable"));
function safeDateTime(ts) {
    if (!ts)
        return '';
    try {
        return new Date(ts).toLocaleString();
    }
    catch {
        return ts;
    }
}
function hoursBetween(a, b) {
    return Math.max(0, (b.getTime() - a.getTime()) / (1000 * 60 * 60));
}
function PerformanceReportPage() {
    var _a, _b, _c, _d, _e, _f;
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const businessId = (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id) || null;
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [refreshing, setRefreshing] = (0, react_1.useState)(false);
    const [startDate, setStartDate] = (0, react_1.useState)(() => (0, date_fns_1.format)((0, date_fns_1.addDays)(new Date(), -14), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = (0, react_1.useState)(() => (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd'));
    const [attendance, setAttendance] = (0, react_1.useState)([]);
    const [shifts, setShifts] = (0, react_1.useState)([]);
    const [reliability, setReliability] = (0, react_1.useState)(null);
    const [laborCost, setLaborCost] = (0, react_1.useState)(null);
    const [expiringQualCount, setExpiringQualCount] = (0, react_1.useState)(0);
    const [query, setQuery] = (0, react_1.useState)('');
    const [filtersOpen, setFiltersOpen] = (0, react_1.useState)(false);
    const [profile, setProfile] = (0, react_1.useState)(null);
    const load = async (opts) => {
        var _a, _b;
        const silent = !!(opts === null || opts === void 0 ? void 0 : opts.silent);
        if (!silent)
            setLoading(true);
        try {
            const [attRes, lcRes, qualRes, profRes, relRes] = await Promise.all([
                api_1.default.get('/reports/attendance', { params: { startDate, endDate } }),
                api_1.default.get('/reports/labor-cost', { params: { startDate, endDate } }),
                api_1.default.get('/employees/qualifications/expiring').catch(() => ({ data: [] })),
                api_1.default.get('/auth/profile').catch(() => ({ data: null })),
                api_1.default.get('/reports/reliability', { params: { startDate, endDate } }).catch(() => ({ data: null })),
            ]);
            setAttendance(Array.isArray(attRes.data) ? attRes.data : []);
            setLaborCost(lcRes.data || null);
            setExpiringQualCount(Array.isArray(qualRes.data) ? qualRes.data.length : 0);
            setProfile(profRes.data || null);
            setReliability(relRes.data || null);
            if (businessId) {
                const shiftRes = await api_1.default.get('/scheduling/shifts', {
                    params: {
                        businessId,
                        start: new Date(startDate).toISOString(),
                        end: new Date(endDate).toISOString(),
                    },
                });
                setShifts(Array.isArray(shiftRes.data) ? shiftRes.data : []);
            }
            else {
                setShifts([]);
            }
        }
        catch (e) {
            sonner_1.toast.error(((_b = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to load performance data');
        }
        finally {
            if (!silent)
                setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        load();
    }, []);
    const refresh = async () => {
        try {
            setRefreshing(true);
            await load({ silent: true });
            sonner_1.toast.success('Refreshed');
        }
        finally {
            setRefreshing(false);
        }
    };
    const perEmployeeStats = (0, react_1.useMemo)(() => {
        // Map scheduled shifts by employee and day
        const byEmpDateShift = new Map();
        for (const s of shifts) {
            if (!s.employeeId)
                continue;
            const key = `${s.employeeId}:${new Date(s.startTime).toISOString().slice(0, 10)}`;
            const list = byEmpDateShift.get(key) || [];
            list.push(s);
            byEmpDateShift.set(key, list);
        }
        const stats = {};
        // Calculate attendance metrics
        for (const ts of attendance) {
            const empId = ts.employeeId;
            const start = new Date(ts.startTime);
            const end = ts.endTime ? new Date(ts.endTime) : null;
            const dayKey = start.toISOString().slice(0, 10);
            const shiftKey = `${empId}:${dayKey}`;
            const scheduled = (byEmpDateShift.get(shiftKey) || []).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] || null;
            if (!stats[empId])
                stats[empId] = { employeeId: empId, totalHours: 0, timesheetCount: 0, onTime: 0, late: 0, missed: 0, avgLateMinutes: 0 };
            const st = stats[empId];
            st.timesheetCount += 1;
            if (end)
                st.totalHours += hoursBetween(start, end);
            if (scheduled) {
                const schedStart = new Date(scheduled.startTime);
                const deltaMin = Math.round((start.getTime() - schedStart.getTime()) / (1000 * 60));
                if (deltaMin <= 5)
                    st.onTime += 1;
                else {
                    st.late += 1;
                    // running average
                    const totalLateMin = st.avgLateMinutes * (st.late - 1) + deltaMin;
                    st.avgLateMinutes = Math.round((totalLateMin / st.late) * 10) / 10;
                }
            }
            else {
                // no scheduled shift found — skip on-time/late classification
            }
        }
        // Missed = scheduled shifts with no timesheet
        for (const s of shifts) {
            if (!s.employeeId)
                continue;
            const empId = s.employeeId;
            const dayKey = new Date(s.startTime).toISOString().slice(0, 10);
            const tsHit = attendance.find((t) => t.employeeId === empId && t.startTime.slice(0, 10) === dayKey);
            if (!stats[empId])
                stats[empId] = { employeeId: empId, totalHours: 0, timesheetCount: 0, onTime: 0, late: 0, missed: 0, avgLateMinutes: 0 };
            if (!tsHit)
                stats[empId].missed += 1;
        }
        return stats;
    }, [attendance, shifts]);
    const overall = (0, react_1.useMemo)(() => {
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
    const latenessSeries = (0, react_1.useMemo)(() => {
        // simple daily lateness minutes based on comparing first ts start vs first shift start
        const dayMap = new Map();
        const start = (0, date_fns_1.startOfDay)(new Date(startDate));
        const end = (0, date_fns_1.endOfDay)(new Date(endDate));
        const days = [];
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
                if (!s.employeeId)
                    continue;
                const schedStart = new Date(s.startTime);
                const ts = tsDay.find((t) => t.employeeId === s.employeeId);
                if (!ts)
                    continue;
                const tsStart = new Date(ts.startTime);
                const deltaMin = Math.round((tsStart.getTime() - schedStart.getTime()) / (1000 * 60));
                if (deltaMin > 0)
                    totalLate += deltaMin;
            }
            dayMap.set(key, totalLate);
        }
        return Array.from(dayMap.entries()).map(([date, lateMinutes]) => ({ date, lateMinutes }));
    }, [attendance, shifts, startDate, endDate]);
    const dailyPunctuality = (0, react_1.useMemo)(() => {
        const start = (0, date_fns_1.startOfDay)(new Date(startDate));
        const end = (0, date_fns_1.endOfDay)(new Date(endDate));
        const days = [];
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
                if (!s.employeeId)
                    continue;
                const schedStart = new Date(s.startTime);
                const ts = attendance.find((t) => t.employeeId === s.employeeId && t.startTime.slice(0, 10) === key);
                if (!ts) {
                    missed += 1;
                }
                else {
                    const tsStart = new Date(ts.startTime);
                    const deltaMin = Math.round((tsStart.getTime() - schedStart.getTime()) / (1000 * 60));
                    if (deltaMin <= 5)
                        onTime += 1;
                    else
                        late += 1;
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
        const doc = new jspdf_1.default();
        const bizName = (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.name) || 'Business';
        const generatedAt = new Date().toLocaleString();
        doc.setFontSize(16);
        doc.text(`${bizName} — Performance Report`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Range: ${startDate} to ${endDate}`, 14, 28);
        doc.text(`Generated at: ${generatedAt}`, 14, 33);
        if (profile === null || profile === void 0 ? void 0 : profile.email)
            doc.text(`Generated by: ${profile.email}`, 14, 38);
        doc.text(`Punctuality: ${overall.punctualityRate}% | Avg Late: ${overall.avgLateMinutes}m | Total Hours: ${overall.totalHours.toFixed(2)}h`, 14, 45);
        (0, jspdf_autotable_1.default)(doc, {
            head: [['Date', 'Late Minutes']],
            body: latenessSeries.map((d) => [d.date, String(d.lateMinutes)]),
            startY: 52,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        });
        (0, jspdf_autotable_1.default)(doc, {
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
        const lines = [];
        lines.push(`Business,${(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.name) || ''}`);
        lines.push(`Range,${startDate} to ${endDate}`);
        lines.push(`Generated,${new Date().toISOString()}`);
        lines.push('');
        lines.push('Daily Lateness');
        lines.push('Date,Late Minutes');
        for (const d of latenessSeries)
            lines.push(`${d.date},${d.lateMinutes}`);
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
    const topEmployees = (0, react_1.useMemo)(() => {
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
    const reliabilityRows = (0, react_1.useMemo)(() => {
        return Array.isArray(reliability === null || reliability === void 0 ? void 0 : reliability.officers) ? reliability.officers : [];
    }, [reliability]);
    const reliabilityTotals = (0, react_1.useMemo)(() => {
        const rows = reliabilityRows;
        return rows.reduce((acc, r) => {
            var _a, _b;
            acc.callouts += Number(((_a = r === null || r === void 0 ? void 0 : r.totals) === null || _a === void 0 ? void 0 : _a.callouts) || 0);
            acc.covered += Number(((_b = r === null || r === void 0 ? void 0 : r.totals) === null || _b === void 0 ? void 0 : _b.coveredForOthers) || 0);
            return acc;
        }, { callouts: 0, covered: 0 });
    }, [reliabilityRows]);
    if (loading) {
        return (<div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"/>
      </div>);
    }
    return (<div className="p-8 space-y-8 bg-gray-50/50 dark:bg-slate-900/50 min-h-screen">
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
            <lucide_react_1.Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400"/>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none"/>
            <span className="text-gray-400">–</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none"/>
          </div>
          <button type="button" onClick={refresh} disabled={refreshing} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700/40 disabled:opacity-60">
            <lucide_react_1.RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}/>
            Refresh
          </button>
          <button type="button" onClick={exportPDF} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2">
            <lucide_react_1.Download className="w-4 h-4"/>
            Export PDF
          </button>
          <button type="button" onClick={exportCSV} className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700/40">
            <lucide_react_1.Download className="w-4 h-4"/>
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Punctuality" value={`${overall.punctualityRate}%`} icon={lucide_react_1.TrendingUp} accent="bg-indigo-500"/>
        <StatCard title="Avg Late Minutes" value={`${overall.avgLateMinutes}m`} icon={lucide_react_1.Clock} accent="bg-amber-500"/>
        <StatCard title="Total Hours" value={`${overall.totalHours.toFixed(2)}h`} icon={lucide_react_1.Users} accent="bg-emerald-500"/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard label="On-time" value={`${overall.onTime}`}/>
        <KpiCard label="Late" value={`${overall.late}`}/>
        <KpiCard label="Missed" value={`${overall.missed}`}/>
        <KpiCard label="Timesheets" value={`${overall.timesheetCount}`}/>
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
            return (<div key={d.date} className="flex flex-col items-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">{(0, date_fns_1.format)(new Date(d.date), 'MM/dd')}</div>
                  <div className="w-6 bg-amber-400/60 dark:bg-amber-600/60 rounded-t" style={{ height }}/>
                </div>);
        })}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-gray-900 dark:text-white">Labor cost</div>
            <lucide_react_1.DollarSign className="w-4 h-4 text-emerald-600"/>
          </div>
          {laborCost ? (<div className="space-y-3 text-sm">
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
            </div>) : (<div className="text-sm text-gray-500 dark:text-gray-400">No labor data</div>)}
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
            return (<g key={d.date}>
                  {next && <line x1={x} y1={y} x2={x2} y2={y2} stroke="#6366f1" strokeWidth="2"/>}
                  <circle cx={x} cy={y} r="3" fill="#6366f1"/>
                </g>);
        })}
          </svg>
          <div className="text-xs text-gray-500 dark:text-gray-400">On-time % per day</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="font-bold text-gray-900 dark:text-white mb-2">On-time / Late / Missed</div>
          <svg width="180" height="180" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="#eef2ff"/>
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
                return <path key={idx} d={d} fill={seg.color} stroke="#fff" strokeWidth="0.5"/>;
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
            <lucide_react_1.Filter className="w-4 h-4 text-gray-500 dark:text-gray-400"/>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 px-3 py-2">
              <lucide_react_1.Search className="w-4 h-4 text-gray-500 dark:text-gray-400"/>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search employee ID…" className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none w-64 max-w-full"/>
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
            .map((e) => (<tr key={e.employeeId} className="hover:bg-gray-50/70 dark:hover:bg-slate-900/40">
                    <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">{e.employeeId}</td>
                    <td className="px-5 py-4">{e.onTimeRate}%</td>
                    <td className="px-5 py-4">{e.totalHours}h</td>
                    <td className="px-5 py-4">{e.late}</td>
                    <td className="px-5 py-4">{e.missed}</td>
                    <td className="px-5 py-4">{e.avgLateMinutes}m</td>
                  </tr>))}
            </tbody>
          </table>
        </div>
      </div>

      {reliability && (<div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-bold text-gray-900 dark:text-white">Reliability & Coverage</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Call-outs, no-shows, shift coverage, and transparent scoring</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <KpiCard label="Coverage fill rate" value={`${(_c = (_b = (_a = reliability === null || reliability === void 0 ? void 0 : reliability.insights) === null || _a === void 0 ? void 0 : _a.coverageEfficiency) === null || _b === void 0 ? void 0 : _b.fillRate) !== null && _c !== void 0 ? _c : 0}%`}/>
            <KpiCard label="Avg fill time" value={`${(_f = (_e = (_d = reliability === null || reliability === void 0 ? void 0 : reliability.insights) === null || _d === void 0 ? void 0 : _d.coverageEfficiency) === null || _e === void 0 ? void 0 : _e.avgResponseMinutes) !== null && _f !== void 0 ? _f : 0}m`}/>
            <KpiCard label="Total call-outs" value={`${reliabilityTotals.callouts}`}/>
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
                {reliabilityRows.slice(0, 10).map((r) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                return (<tr key={r.employeeId} className="hover:bg-gray-50/70 dark:hover:bg-slate-900/40">
                    <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">{r.name || r.employeeId}</td>
                    <td className="px-5 py-4">{(_b = (_a = r === null || r === void 0 ? void 0 : r.scoring) === null || _a === void 0 ? void 0 : _a.reliabilityScore) !== null && _b !== void 0 ? _b : 0}</td>
                    <td className="px-5 py-4">{(_d = (_c = r === null || r === void 0 ? void 0 : r.totals) === null || _c === void 0 ? void 0 : _c.callouts) !== null && _d !== void 0 ? _d : 0}</td>
                    <td className="px-5 py-4">{(_f = (_e = r === null || r === void 0 ? void 0 : r.totals) === null || _e === void 0 ? void 0 : _e.unexcused) !== null && _f !== void 0 ? _f : 0}</td>
                    <td className="px-5 py-4">{(_h = (_g = r === null || r === void 0 ? void 0 : r.totals) === null || _g === void 0 ? void 0 : _g.lateCallouts) !== null && _h !== void 0 ? _h : 0}</td>
                    <td className="px-5 py-4">{(_k = (_j = r === null || r === void 0 ? void 0 : r.totals) === null || _j === void 0 ? void 0 : _j.noShows) !== null && _k !== void 0 ? _k : 0}</td>
                    <td className="px-5 py-4">{(_m = (_l = r === null || r === void 0 ? void 0 : r.totals) === null || _l === void 0 ? void 0 : _l.coveredForOthers) !== null && _m !== void 0 ? _m : 0}</td>
                  </tr>);
            })}
              </tbody>
            </table>
          </div>
        </div>)}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
        <div className="font-bold text-gray-900 dark:text-white mb-2">Audit metadata</div>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <div>Business: {(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.name) || 'N/A'}</div>
          <div>Date range: {startDate} – {endDate}</div>
          <div>Generated at: {new Date().toLocaleString()}</div>
          <div>Generated by: {(profile === null || profile === void 0 ? void 0 : profile.email) || 'N/A'}</div>
          <div>Data sources: /reports/attendance, /reports/labor-cost, /reports/reliability, /employees/qualifications/expiring, /scheduling/shifts</div>
        </div>
      </div>
    </div>);
}
const StatCard = ({ title, value, icon: Icon, accent }) => (<framer_motion_1.motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
    <div className={`absolute -right-10 -top-10 w-28 h-28 rounded-full opacity-10 blur-2xl ${accent}`}/>
    <div className="flex items-start justify-between relative z-10">
      <div>
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</div>
        <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</div>
      </div>
      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200">
        <Icon className="w-6 h-6"/>
      </div>
    </div>
  </framer_motion_1.motion.div>);
const KpiCard = ({ label, value }) => (<div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</div>
    <div className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{value}</div>
  </div>);
