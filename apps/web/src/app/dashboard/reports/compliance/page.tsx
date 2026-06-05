'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useBusiness } from '@/context/business-context';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Calendar, ShieldCheck, AlertTriangle, FileWarning, RefreshCw, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Qualification = { id: string; status: string; expiryDate?: string | null };
type CompanyCertification = { id: string; status: string; expiryDate?: string | null };
type Timesheet = { id: string; employeeId: string; startTime: string; endTime?: string | null; breaks?: Array<{ startTime: string; endTime?: string | null }> };
type IncidentAnalytics = {
  trend: Array<{ date: string; count: number }>;
  bySeverity: Array<{ severity: string; count: number }>;
};

export default function ComplianceReportPage() {
  const { selectedBusiness } = useBusiness();
  const businessId = selectedBusiness?.id || null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState(() => format(addDays(new Date(), -30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const [profile, setProfile] = useState<{ email?: string; role?: string } | null>(null);

  const [employeeQualifications, setEmployeeQualifications] = useState<Qualification[]>([]);
  const [expiringQualifications, setExpiringQualifications] = useState<Qualification[]>([]);
  const [companyCerts, setCompanyCerts] = useState<CompanyCertification[]>([]);

  const [attendance, setAttendance] = useState<Timesheet[]>([]);
  const [incident, setIncident] = useState<IncidentAnalytics | null>(null);

  const load = async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    if (!silent) setLoading(true);
    try {
      const [profileRes, empQualAllRes, empQualExpRes, companyRes, attRes, incRes] = await Promise.all([
        api.get('/auth/profile').catch(() => ({ data: null })),
        api.get('/employees/qualifications/all').catch(() => ({ data: [] })),
        api.get('/employees/qualifications/expiring').catch(() => ({ data: [] })),
        api.get('/company-certifications').catch(() => ({ data: [] })),
        api.get('/reports/attendance', { params: { startDate, endDate } }),
        api.get('/incident-reports/analytics', { params: { period: 'monthly' } }).catch(() => ({ data: null })),
      ]);
      setProfile(profileRes.data || null);
      setEmployeeQualifications(Array.isArray(empQualAllRes.data) ? empQualAllRes.data : []);
      setExpiringQualifications(Array.isArray(empQualExpRes.data) ? empQualExpRes.data : []);
      setCompanyCerts(Array.isArray(companyRes.data) ? companyRes.data : []);
      setAttendance(Array.isArray(attRes.data) ? attRes.data : []);
      setIncident(incRes.data || null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load compliance data');
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

  const certStats = useMemo(() => {
    const now = new Date();
    const empTotal = employeeQualifications.length;
    let empExpired = 0;
    let empExpiringSoon = 0;
    for (const q of employeeQualifications) {
      if (q.status === 'EXPIRED') empExpired += 1;
      else if (q.expiryDate) {
        const days = Math.ceil((new Date(q.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 0 && days <= 90) empExpiringSoon += 1;
      }
    }
    const compTotal = companyCerts.length;
    let compExpired = 0;
    let compExpiringSoon = 0;
    for (const c of companyCerts) {
      if (c.status === 'EXPIRED') compExpired += 1;
      else if (c.expiryDate) {
        const days = Math.ceil((new Date(c.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 0 && days <= 90) compExpiringSoon += 1;
      }
    }
    return { empTotal, empExpired, empExpiringSoon, compTotal, compExpired, compExpiringSoon };
  }, [employeeQualifications, companyCerts]);

  const breakCompliance = useMemo(() => {
    const total = attendance.length;
    let withBreaks = 0;
    let longShiftsWithoutBreak = 0;
    for (const ts of attendance) {
      const breaks = (ts.breaks || []).filter((b) => !!b.endTime);
      if (breaks.length > 0) withBreaks += 1;
      if (ts.endTime) {
        const hours = (new Date(ts.endTime).getTime() - new Date(ts.startTime).getTime()) / (1000 * 60 * 60);
        if (hours >= 12 && breaks.length === 0) longShiftsWithoutBreak += 1;
      }
    }
    const rate = total ? Math.round(((withBreaks / total) * 100) * 10) / 10 : 0;
    return { total, withBreaks, rate, longShiftsWithoutBreak };
  }, [attendance]);

  const incidentSeverity = useMemo(() => {
    const arr = incident?.bySeverity || [];
    const total = arr.reduce((sum, r) => sum + (r.count || 0), 0);
    return { arr, total };
  }, [incident]);

  const exportPDF = () => {
    const doc = new jsPDF();
    const bizName = selectedBusiness?.name || 'Business';
    const generatedAt = new Date().toLocaleString();
    doc.setFontSize(16);
    doc.text(`${bizName} — Compliance Report`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Range: ${startDate} to ${endDate}`, 14, 28);
    doc.text(`Generated at: ${generatedAt}`, 14, 33);
    if (profile?.email) doc.text(`Generated by: ${profile.email}`, 14, 38);
    doc.text(
      `Employee certs: total ${certStats.empTotal}, expired ${certStats.empExpired}, expiring(90d) ${certStats.empExpiringSoon}`,
      14,
      45
    );
    doc.text(
      `Company certs: total ${certStats.compTotal}, expired ${certStats.compExpired}, expiring(90d) ${certStats.compExpiringSoon}`,
      14,
      50
    );
    doc.text(`Break compliance: ${breakCompliance.rate}% with breaks; long shifts w/o break: ${breakCompliance.longShiftsWithoutBreak}`, 14, 55);
    autoTable(doc, {
      head: [['Date', 'Incidents']],
      body: (incident?.trend || []).map((d) => [d.date, String(d.count)]),
      startY: 62,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    });
    autoTable(doc, {
      head: [['Severity', 'Count']],
      body: (incident?.bySeverity || []).map((r) => [r.severity, String(r.count)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [239, 68, 68], textColor: 255 },
    });
    doc.save(`compliance_${startDate}_${endDate}.pdf`);
  };

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
            Compliance Report
          </h1>
          <div className="mt-1 text-gray-500 dark:text-gray-400">
            Certifications, incidents, and attendance compliance across the selected date range.
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Employee certs expiring(90d)" value={`${certStats.empExpiringSoon}`} icon={ShieldCheck} accent="bg-indigo-500" />
        <StatCard title="Company certs expiring(90d)" value={`${certStats.compExpiringSoon}`} icon={ShieldCheck} accent="bg-sky-500" />
        <StatCard title="Break compliance" value={`${breakCompliance.rate}%`} icon={FileWarning} accent="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="font-bold text-gray-900 dark:text-white mb-2">Incident trend</div>
          <svg width="100%" height="180">
            {(incident?.trend || []).map((d, i, arr) => {
              const x = (i / Math.max(1, arr.length - 1)) * 600;
              const y = 160 - Math.min(160, d.count * 4);
              const next = arr[i + 1];
              const x2 = next ? ((i + 1) / Math.max(1, arr.length - 1)) * 600 : x;
              const y2 = next ? 160 - Math.min(160, next.count * 4) : y;
              return (
                <g key={d.date}>
                  {next && <line x1={x} y1={y} x2={x2} y2={y2} stroke="#ef4444" strokeWidth="2" />}
                  <circle cx={x} cy={y} r="3" fill="#ef4444" />
                </g>
              );
            })}
          </svg>
          <div className="text-xs text-gray-500 dark:text-gray-400">Incidents per period</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="font-bold text-gray-900 dark:text-white mb-2">Incidents by severity</div>
          <svg width="180" height="180" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="#fee2e2" />
            {(() => {
              const total = incidentSeverity.total || 1;
              let current = 0;
              return (incidentSeverity.arr || []).map((seg, idx) => {
                const angle = ((seg.count || 0) / total) * Math.PI * 2;
                const x1 = 18 + 16 * Math.cos(current);
                const y1 = 18 + 16 * Math.sin(current);
                const x2 = 18 + 16 * Math.cos(current + angle);
                const y2 = 18 + 16 * Math.sin(current + angle);
                const largeArcFlag = angle > Math.PI ? 1 : 0;
                const d = `M 18 18 L ${x1} ${y1} A 16 16 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                current += angle;
                const colors = ['#ef4444', '#f59e0b', '#fde047', '#22c55e', '#60a5fa', '#a78bfa'];
                return <path key={idx} d={d} fill={colors[idx % colors.length]} stroke="#fff" strokeWidth="0.5" />;
              });
            })()}
          </svg>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {(incidentSeverity.arr || []).map((r) => `${r.severity}:${r.count}`).join(' • ')}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
        <div className="font-bold text-gray-900 dark:text-white mb-2">Audit metadata</div>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <div>Business: {selectedBusiness?.name || 'N/A'}</div>
          <div>Date range: {startOfDay(new Date(startDate)).toISOString().slice(0, 10)} – {endOfDay(new Date(endDate)).toISOString().slice(0, 10)}</div>
          <div>Generated at: {new Date().toLocaleString()}</div>
          <div>Generated by: {profile?.email || 'N/A'}</div>
          <div>Data sources: /employees/qualifications/all, /employees/qualifications/expiring, /company-certifications, /reports/attendance, /incident-reports/analytics</div>
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

