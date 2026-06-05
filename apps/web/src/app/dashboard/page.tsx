'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { useBusiness } from '../../context/business-context';
import { ExpiringQualificationsModal } from '../../components/ExpiringQualificationsModal';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';
import { StatsCards } from '../../components/dashboard/StatsCards';
import { NewsFeed } from '../../components/dashboard/NewsFeed';
import { SidebarWidgets } from '../../components/dashboard/SidebarWidgets';
import { DashboardAlerts } from '../../components/dashboard/DashboardAlerts';
import { formatDateLong } from '../../lib/localization';
import { Modal } from '../../components/Modal';
import { UserRole } from '@unitedlinkgroup/types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Calendar, Clock, ClipboardCheck, Zap, ArrowRight, MapPin, Play, Square, Building2, Users, AlertTriangle, Activity, RefreshCw, Globe, Settings, DollarSign, MessageSquare, FileText, Trash2, Ban, CheckCircle2, Store } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  activeEmployees: number;
  nextPayroll: {
    payDate: string;
    periodEnd: string;
  } | null;
  pendingRequests: number;
  scheduledToday: number;
  onShiftNow: number;
}

type EmployeeDashboardData = {
  now: string;
  employee: { id: string; firstName: string; lastName: string; role: string; businessId: string };
  timeTracking: {
    activeTimesheet: null | { id: string; startTime: string; endTime: string | null; locationId: string | null };
    activeBreak: null | { id: string; startTime: string; endTime: string | null; type: string; timesheetId: string };
  };
  schedule: {
    today: Array<{ id: string; startTime: string; endTime: string; locationId: string | null; locationName: string | null }>;
    currentShift: null | { id: string; startTime: string; endTime: string; locationId: string | null; locationName: string | null };
    nextShift: null | { id: string; startTime: string; endTime: string; locationId: string | null; locationName: string | null };
    canClockIn: boolean;
  };
  metrics: {
    punctuality: { onTimeRate: number; onTime: number; late: number; missed: number; avgLateMinutes: number };
    reports: { incidentCount: number; patrolCount: number; total: number };
    streakOnTimeDays: number;
  };
  charts: {
    punctualityDaily: Array<{ date: string; lateMinutes: number | null; status: 'ON_TIME' | 'LATE' | 'MISSED' }>;
    reportsWeekly: Array<{ week: string; count: number; incidentCount: number; patrolCount: number }>;
  };
  activity: Array<{ id: string; kind: string; title: string; createdAt: string }>;
};

type SuperadminDashboardData = {
  now: string;
  rangeDays: number;
  totals: {
    businessTotal: number;
    businessNew: number;
    employeeTotal: number;
    activeEmployeeTotal: number;
    userTotal: number;
    openIncidents: number;
    activeTimesheets: number;
    pendingLoans: number;
    pendingLeaves: number;
    expiringQualifications: number;
  };
  charts: {
    growth: Array<{
      date: string;
      newBusinesses: number;
      totalBusinesses: number;
      newEmployees: number;
      totalEmployees: number;
    }>;
    modulesTop: Array<{ name: string; value: number }>;
  };
  recentBusinesses: Array<{
    id: string;
    name: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'DELETED';
    industry: string | null;
    businessType: string | null;
    country: string | null;
    modules: string | null;
    createdAt: string;
    owner: { id: string; email: string; firstName: string | null; lastName: string | null };
    _count: { employees: number; locations: number; incidentReports: number };
  }>;
};

type BusinessOverviewData = {
  now: string;
  rangeDays: number;
  kpis: {
    revenueLastTotal: number;
    expensesLastTotal: number;
    outstandingTotal: number;
    overdueTotal: number;
  };
  charts: {
    cashflowWeekly: Array<{ week: string; invoicesTotal: number; paymentsTotal: number }>;
    invoicesByStatus: Array<{ status: string; count: number; total: number }>;
  };
  recent: {
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      status: string;
      total: number;
      dueDate: string;
      updatedAt: string;
      client: { id: string; name: string };
    }>;
    payments: Array<{
      id: string;
      date: string;
      amount: number;
      type: string;
      category: string | null;
      method: string | null;
      status: string;
      payeeName: string | null;
      reference: string | null;
      description: string | null;
    }>;
  };
};

type ChatThreadPreview = {
  id: string;
  type: string;
  displayTitle: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage: null | { text: string | null; createdAt: string; senderName: string };
};

export default function DashboardPage() {
  const { selectedBusiness } = useBusiness();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [expiringSites, setExpiringSites] = useState<any[]>([]);
  const [expiringQualifications, setExpiringQualifications] = useState<any[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [showExpiringQualBanner, setShowExpiringQualBanner] = useState(true);
  const [isExpiringQualModalOpen, setIsExpiringQualModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [employeeDash, setEmployeeDash] = useState<EmployeeDashboardData | null>(null);
  const [employeeDashLoading, setEmployeeDashLoading] = useState(false);
  const [clocking, setClocking] = useState(false);
  const [superDash, setSuperDash] = useState<SuperadminDashboardData | null>(null);
  const [superDashLoading, setSuperDashLoading] = useState(false);
  const [superDays, setSuperDays] = useState(30);
  const [businessOverview, setBusinessOverview] = useState<BusinessOverviewData | null>(null);
  const [businessOverviewLoading, setBusinessOverviewLoading] = useState(false);
  const [chatThreads, setChatThreads] = useState<ChatThreadPreview[]>([]);
  const [chatThreadsLoading, setChatThreadsLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileRes = await api.get('/auth/profile');
        setProfile(profileRes.data);
        setCurrentDate(new Date());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const role = profile?.role || null;
    if (!role) return;
    if (role === UserRole.EMPLOYEE) return;
    if (role === UserRole.SUPER_ADMIN && !selectedBusiness?.id) return;

    let cancelled = false;
    const loadBusinessDashboard = async () => {
      try {
        const [statsRes, locationsRes, qualRes] = await Promise.all([
          api.get('/reports/dashboard-stats').catch(() => ({ data: null })),
          api.get('/locations').catch(() => ({ data: [] })),
          api.get('/employees/qualifications/expiring').catch(() => ({ data: [] })),
        ]);

        if (cancelled) return;

        if (statsRes.data) setStats(statsRes.data);
        if (qualRes.data) setExpiringQualifications(qualRes.data);

        if (locationsRes.data) {
          const now = new Date();
          const expiring = locationsRes.data
            .filter((loc: any) => {
              if (!loc.endDate) return false;
              const end = new Date(loc.endDate);
              const diffTime = end.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays <= 30 && diffDays >= -30;
            })
            .map((loc: any) => {
              const end = new Date(loc.endDate);
              const diffTime = end.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return { ...loc, daysRemaining: diffDays };
            });
          setExpiringSites(expiring);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadBusinessDashboard();
    return () => {
      cancelled = true;
    };
  }, [profile?.role, selectedBusiness?.id]);

  useEffect(() => {
    const role = profile?.role || null;
    if (role !== UserRole.EMPLOYEE) return;
    let cancelled = false;
    const load = async () => {
      try {
        setEmployeeDashLoading(true);
        const res = await api.get('/reports/employee-dashboard', { params: { days: 30 } });
        if (cancelled) return;
        setEmployeeDash(res.data || null);
      } catch {
        if (cancelled) return;
        setEmployeeDash(null);
      } finally {
        if (!cancelled) setEmployeeDashLoading(false);
      }
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [profile?.role]);

  useEffect(() => {
    const role = profile?.role || null;
    if (!role) return;
    if (role === UserRole.EMPLOYEE) return;
    if (!selectedBusiness?.id) return;
    let cancelled = false;

    const load = async () => {
      try {
        setBusinessOverviewLoading(true);
        setChatThreadsLoading(true);
        const [overviewRes, threadsRes] = await Promise.all([
          api.get('/reports/business-overview', { params: { days: 30 } }),
          api.get('/chats/threads'),
        ]);
        if (cancelled) return;
        setBusinessOverview(overviewRes.data || null);
        setChatThreads((threadsRes.data || []).slice(0, 8));
      } catch {
        if (cancelled) return;
        setBusinessOverview(null);
        setChatThreads([]);
      } finally {
        if (!cancelled) {
          setBusinessOverviewLoading(false);
          setChatThreadsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [profile?.role, selectedBusiness?.id]);

  useEffect(() => {
    const role = profile?.role || null;
    if (role !== UserRole.SUPER_ADMIN) return;
    if (selectedBusiness?.id) return;
    let cancelled = false;
    const load = async () => {
      try {
        setSuperDashLoading(true);
        const res = await api.get('/reports/superadmin-dashboard', { params: { days: superDays } });
        if (cancelled) return;
        setSuperDash(res.data || null);
      } catch (e: any) {
        if (cancelled) return;
        setSuperDash(null);
      } finally {
        if (!cancelled) setSuperDashLoading(false);
      }
    };
    load();
    const id = window.setInterval(load, 90_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [profile?.role, superDays, selectedBusiness?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const formattedDate = formatDateLong(currentDate, selectedBusiness?.country);

  const hasModule = (module: string) => {
    if (!selectedBusiness?.modules) return false;
    return selectedBusiness.modules.split(',').includes(module);
  };

  if (profile?.role === UserRole.EMPLOYEE) {
    return (
      <EmployeeDashboard
        loading={employeeDashLoading}
        data={employeeDash}
        onRefresh={async () => {
          try {
            setEmployeeDashLoading(true);
            const res = await api.get('/reports/employee-dashboard', { params: { days: 30 } });
            setEmployeeDash(res.data || null);
          } finally {
            setEmployeeDashLoading(false);
          }
        }}
        onClockIn={async () => {
          if (!employeeDash?.schedule?.canClockIn) return;
          if (clocking) return;
          try {
            setClocking(true);
            const locId = employeeDash?.schedule?.currentShift?.locationId || null;
            await api.post('/time-tracking/clock-in', { locationId: locId || undefined });
            const res = await api.get('/reports/employee-dashboard', { params: { days: 30 } });
            setEmployeeDash(res.data || null);
            toast.success('Clocked in');
          } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to clock in');
          } finally {
            setClocking(false);
          }
        }}
        onClockOut={async () => {
          if (!employeeDash?.timeTracking?.activeTimesheet) return;
          if (clocking) return;
          try {
            setClocking(true);
            await api.post('/time-tracking/clock-out', {});
            const res = await api.get('/reports/employee-dashboard', { params: { days: 30 } });
            setEmployeeDash(res.data || null);
            toast.success('Clocked out');
          } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to clock out');
          } finally {
            setClocking(false);
          }
        }}
      />
    );
  }

  if (profile?.role === UserRole.SUPER_ADMIN) {
    if (!selectedBusiness?.id) {
      return (
        <SuperAdminDashboard
          loading={superDashLoading}
          data={superDash}
          days={superDays}
          setDays={setSuperDays}
          onRefresh={async () => {
            try {
              setSuperDashLoading(true);
              const res = await api.get('/reports/superadmin-dashboard', { params: { days: superDays } });
              setSuperDash(res.data || null);
            } finally {
              setSuperDashLoading(false);
            }
          }}
        />
      );
    }
  }

  if (selectedBusiness?.id && profile?.role !== UserRole.EMPLOYEE) {
    return (
      <BusinessContextDashboard
        profile={profile}
        stats={stats}
        businessOverview={businessOverview}
        businessOverviewLoading={businessOverviewLoading}
        chatThreads={chatThreads}
        chatThreadsLoading={chatThreadsLoading}
      />
    );
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {profile?.role === UserRole.SUPER_ADMIN && selectedBusiness?.id && (
        <SuperAdminBusinessContextBar businessName={selectedBusiness?.name} />
      )}
      <DashboardHeader 
        profile={profile} 
        formattedDate={formattedDate} 
        hasModule={hasModule} 
        businessName={selectedBusiness?.name}
      />

      <DashboardAlerts 
        expiringQualifications={expiringQualifications}
        expiringSites={expiringSites}
        showExpiringQualBanner={showExpiringQualBanner}
        setShowExpiringQualBanner={setShowExpiringQualBanner}
        setIsExpiringQualModalOpen={setIsExpiringQualModalOpen}
        dismissedAlerts={dismissedAlerts}
        setDismissedAlerts={setDismissedAlerts}
        profile={profile}
      />

      <StatsCards 
        stats={stats} 
        hasModule={hasModule} 
        userProfile={profile}
        country={selectedBusiness?.country}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <NewsFeed userProfile={profile} />
          
          {/* We can add the charts component here later if needed, 
              or integrate existing charts into a new component */}
        </div>

        {/* Right Sidebar */}
        <SidebarWidgets 
          expiringQualifications={expiringQualifications}
          stats={stats}
          hasModule={hasModule}
        />
      </div>

      <ExpiringQualificationsModal 
        isOpen={isExpiringQualModalOpen}
        onClose={() => setIsExpiringQualModalOpen(false)}
        qualifications={expiringQualifications}
      />
    </div>
  );
}

function BusinessContextDashboard({
  profile,
  stats,
  businessOverview,
  businessOverviewLoading,
  chatThreads,
  chatThreadsLoading,
}: {
  profile: any;
  stats: DashboardStats | null;
  businessOverview: BusinessOverviewData | null;
  businessOverviewLoading: boolean;
  chatThreads: ChatThreadPreview[];
  chatThreadsLoading: boolean;
}) {
  const { selectedBusiness } = useBusiness();
  const country = selectedBusiness?.country;
  const currencyCode = selectedBusiness?.currencyCode || 'USD';
  const hasModule = useMemo(() => {
    const set = new Set((selectedBusiness?.modules || '').split(',').map((x) => x.trim()).filter(Boolean));
    return (moduleId: string) => set.has(moduleId);
  }, [selectedBusiness?.modules]);

  const money = (value: number | null | undefined) => {
    const v = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }).format(v);
    } catch {
      return `${v.toFixed(2)} ${currencyCode}`;
    }
  };

  const cashflowWeekly = useMemo(() => {
    return (businessOverview?.charts?.cashflowWeekly || []).slice(-12).map((x) => ({ ...x, label: x.week.slice(5) }));
  }, [businessOverview?.charts?.cashflowWeekly]);

  const invoicesByStatus = useMemo(() => {
    const src = businessOverview?.charts?.invoicesByStatus || [];
    const colors: Record<string, string> = {
      PAID: '#22c55e',
      SENT: '#6366f1',
      OVERDUE: '#ef4444',
      DRAFT: '#94a3b8',
      VOID: '#64748b',
    };
    return src.slice(0, 6).map((x) => ({ ...x, color: colors[x.status] || '#8b5cf6' }));
  }, [businessOverview?.charts?.invoicesByStatus]);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {profile?.role === UserRole.SUPER_ADMIN && <SuperAdminBusinessContextBar businessName={selectedBusiness?.name} />}
      <DashboardHeader
        profile={profile}
        formattedDate={formatDateLong(new Date(), country)}
        hasModule={hasModule}
        businessName={selectedBusiness?.name}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active employees</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats?.activeEmployees ?? 0}</div>
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">On shift now: {stats?.onShiftNow ?? 0}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Scheduled today</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats?.scheduledToday ?? 0}</div>
                <Calendar className="w-5 h-5 text-slate-400" />
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pending requests: {stats?.pendingRequests ?? 0}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Outstanding invoices</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{money(businessOverview?.kpis?.outstandingTotal)}</div>
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Overdue: {money(businessOverview?.kpis?.overdueTotal)}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">30-day finance</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{money(businessOverview?.kpis?.revenueLastTotal)}</div>
                <DollarSign className="w-5 h-5 text-slate-400" />
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Expenses: {money(businessOverview?.kpis?.expensesLastTotal)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">Cashflow</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Invoices vs expenses (weekly)</div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard/finance/invoices"
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Invoices
                  </Link>
                  <Link
                    href="/dashboard/finance/payments"
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Payments
                  </Link>
                </div>
              </div>
              <div className="mt-4 h-72">
                {businessOverviewLoading ? (
                  <div className="h-full w-full rounded-xl bg-slate-100 dark:bg-slate-900/40 animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                    <BarChart data={cashflowWeekly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="rgba(100,116,139,0.6)" />
                      <YAxis tick={{ fontSize: 12 }} stroke="rgba(100,116,139,0.6)" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="invoicesTotal" name="Invoices" fill="#6366f1" radius={[10, 10, 0, 0]} />
                      <Bar dataKey="paymentsTotal" name="Expenses" fill="#f59e0b" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">Invoice mix</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">By status</div>
                </div>
              </div>
              <div className="mt-4 h-72">
                {businessOverviewLoading ? (
                  <div className="h-full w-full rounded-xl bg-slate-100 dark:bg-slate-900/40 animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                    <PieChart>
                      <Pie data={invoicesByStatus} dataKey="total" nameKey="status" innerRadius={54} outerRadius={84} paddingAngle={2}>
                        {invoicesByStatus.map((x) => (
                          <Cell key={x.status} fill={x.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
              <div className="p-5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">Recent invoices</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Latest billing activity</div>
                </div>
                <Link href="/dashboard/finance/invoices" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2">
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold">Invoice</th>
                      <th className="text-left px-5 py-3 font-semibold">Client</th>
                      <th className="text-right px-5 py-3 font-semibold">Total</th>
                      <th className="text-right px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {(businessOverview?.recent?.invoices || []).slice(0, 6).map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{inv.invoiceNumber}</td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{inv.client?.name || '—'}</td>
                        <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{money(inv.total)}</td>
                        <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-300">{inv.status}</td>
                      </tr>
                    ))}
                    {!businessOverviewLoading && (businessOverview?.recent?.invoices || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                          No invoices yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
              <div className="p-5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">Recent expenses</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Latest payments recorded</div>
                </div>
                <Link href="/dashboard/finance/payments" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2">
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold">Payee</th>
                      <th className="text-left px-5 py-3 font-semibold">Type</th>
                      <th className="text-right px-5 py-3 font-semibold">Amount</th>
                      <th className="text-right px-5 py-3 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {(businessOverview?.recent?.payments || []).slice(0, 6).map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{p.payeeName || p.reference || '—'}</td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{p.type}</td>
                        <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{money(p.amount)}</td>
                        <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400">{new Date(p.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {!businessOverviewLoading && (businessOverview?.recent?.payments || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                          No payments yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">Chats</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Recent conversations</div>
              </div>
              <Link href="/dashboard/communications/chats" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2">
                Open <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {chatThreadsLoading ? (
                <div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-900/40 animate-pulse" />
              ) : chatThreads.length === 0 ? (
                <div className="py-8 text-sm text-slate-500 dark:text-slate-400">No chat threads.</div>
              ) : (
                chatThreads.slice(0, 6).map((t) => (
                  <Link
                    key={t.id}
                    href={`/dashboard/communications/chats?threadId=${encodeURIComponent(t.id)}`}
                    className="block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-slate-400" />
                          {t.displayTitle || 'Chat'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {t.lastMessage?.text ? `${t.lastMessage.senderName}: ${t.lastMessage.text}` : 'No messages yet'}
                        </div>
                      </div>
                      {t.unreadCount > 0 ? (
                        <div className="text-xs font-bold bg-indigo-600 text-white rounded-full px-2 py-1 whitespace-nowrap">
                          {t.unreadCount}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 whitespace-nowrap">{new Date(t.updatedAt).toLocaleDateString()}</div>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuperAdminDashboard({
  loading,
  data,
  days,
  setDays,
  onRefresh,
}: {
  loading: boolean;
  data: SuperadminDashboardData | null;
  days: number;
  setDays: (d: number) => void;
  onRefresh: () => Promise<void>;
}) {
  const router = useRouter();
  const { setSelectedBusiness } = useBusiness();
  const chartsReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [businessesModalOpen, setBusinessesModalOpen] = useState(false);
  const [businessSearch, setBusinessSearch] = useState('');
  const [manageSearch, setManageSearch] = useState('');
  const [managedBusinesses, setManagedBusinesses] = useState<any[]>([]);
  const [managedBusinessesLoading, setManagedBusinessesLoading] = useState(false);
  const [businessActionModal, setBusinessActionModal] = useState<{
    isOpen: boolean;
    kind: 'deactivate' | 'activate' | 'delete';
    business: any | null;
    confirmText: string;
    saving: boolean;
  }>({ isOpen: false, kind: 'deactivate', business: null, confirmText: '', saving: false });

  const totals = data?.totals;
  const growth = useMemo(() => (data?.charts?.growth || []).slice(-Math.min(days, 90)).map((d) => ({ ...d, date: d.date.slice(5) })), [data?.charts?.growth, days]);

  const modulePie = useMemo(() => {
    const arr = data?.charts?.modulesTop || [];
    const colors = ['#6366f1', '#8b5cf6', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6', '#a855f7', '#64748b'];
    return arr.map((m, i) => ({ ...m, color: colors[i % colors.length] }));
  }, [data?.charts?.modulesTop]);

  const recent = data?.recentBusinesses || [];
  const filteredBusinesses = useMemo(() => {
    const q = businessSearch.trim().toLowerCase();
    if (!q) return recent;
    return recent.filter((b) => {
      const hay = `${b.name || ''} ${b.owner?.email || ''} ${b.country || ''} ${b.industry || ''} ${b.businessType || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [recent, businessSearch]);
  const selectedBusinessObj = useMemo(() => {
    if (!selectedBusinessId) return null;
    return recent.find((b) => b.id === selectedBusinessId) || null;
  }, [recent, selectedBusinessId]);

  const loadManagedBusinesses = useCallback(async () => {
    try {
      setManagedBusinessesLoading(true);
      const res = await api.get('/businesses');
      setManagedBusinesses(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setManagedBusinesses([]);
      toast.error(e?.response?.data?.message || 'Failed to load businesses');
    } finally {
      setManagedBusinessesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadManagedBusinesses();
  }, [loadManagedBusinesses]);

  const filteredManagedBusinesses = useMemo(() => {
    const q = manageSearch.trim().toLowerCase();
    const list = (managedBusinesses || []).filter((b) => b?.status !== 'DELETED');
    if (!q) return list;
    return list.filter((b) => {
      const hay = `${b.name || ''} ${b.owner?.email || ''} ${b.country || ''} ${b.industry || ''} ${b.businessType || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [manageSearch, managedBusinesses]);

  const statusPill = (status?: string) => {
    const s = (status || 'ACTIVE').toUpperCase();
    if (s === 'INACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <Ban className="w-3.5 h-3.5" />
          Inactive
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Active
      </span>
    );
  };

  const openBusinessAction = (business: any, kind: 'deactivate' | 'activate' | 'delete') => {
    setBusinessActionModal({
      isOpen: true,
      kind,
      business,
      confirmText: '',
      saving: false,
    });
  };

  const runBusinessAction = async () => {
    const business = businessActionModal.business;
    if (!business?.id) return;

    if (businessActionModal.kind === 'delete') {
      const expected = (business.name || '').trim().toLowerCase();
      if (!expected || businessActionModal.confirmText.trim().toLowerCase() !== expected) {
        toast.error('Type the business name to confirm deletion');
        return;
      }
    }

    try {
      setBusinessActionModal((prev) => ({ ...prev, saving: true }));
      if (businessActionModal.kind === 'deactivate') {
        await api.patch(`/businesses/${business.id}/deactivate`);
        toast.success('Business deactivated');
      } else if (businessActionModal.kind === 'activate') {
        await api.patch(`/businesses/${business.id}/activate`);
        toast.success('Business activated');
      } else {
        await api.delete(`/businesses/${business.id}`);
        toast.success('Business deleted');
      }
      setBusinessActionModal({ isOpen: false, kind: 'deactivate', business: null, confirmText: '', saving: false });
      if (selectedBusinessId === business.id) setSelectedBusinessId(null);
      await Promise.all([onRefresh(), loadManagedBusinesses()]);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update business');
      setBusinessActionModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const setContextAndGo = (business: any, href: string) => {
    try {
      localStorage.setItem('superadminBusinessContext', '1');
    } catch {}
    setSelectedBusiness(business);
    router.push(href);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Super Admin Overview
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Platform Dashboard</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Global KPIs, growth, and operational signals</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10))}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 180 days</option>
            </select>
            <button
              type="button"
              onClick={onRefresh}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setBusinessesModalOpen(true)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              Businesses
            </button>
            <Link
              href="/dashboard/settings/preferences"
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              System preferences
            </Link>
            <Link
              href="/dashboard/add-business"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              Add business
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Businesses</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{totals?.businessTotal ?? 0}</div>
            <Building2 className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">New: {totals?.businessNew ?? 0} ({days}d)</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Employees</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{totals?.employeeTotal ?? 0}</div>
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Active: {totals?.activeEmployeeTotal ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active shifts</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{totals?.activeTimesheets ?? 0}</div>
            <Activity className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Clocked in now</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Open incidents</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{totals?.openIncidents ?? 0}</div>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Not closed</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending approvals</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{(totals?.pendingLoans ?? 0) + (totals?.pendingLeaves ?? 0)}</div>
            <ClipboardCheck className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Loans: {totals?.pendingLoans ?? 0} • Leave: {totals?.pendingLeaves ?? 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">Growth</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Businesses and employees over time</div>
            </div>
          </div>
          <div className="mt-4 h-72">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                <LineChart data={growth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="rgba(100,116,139,0.6)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="rgba(100,116,139,0.6)" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="newBusinesses" name="New businesses" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="newEmployees" name="New employees" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full rounded-xl bg-slate-100 dark:bg-slate-900/40 animate-pulse" />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">Module adoption</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Top enabled modules</div>
          </div>
          <div className="mt-4 h-72">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                <PieChart>
                  <Pie data={modulePie} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={2}>
                    {modulePie.map((m) => (
                      <Cell key={m.name} fill={m.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full rounded-xl bg-slate-100 dark:bg-slate-900/40 animate-pulse" />
            )}
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">Expiring qualifications: {totals?.expiringQualifications ?? 0}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">Business management</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Deactivate or delete businesses from the platform</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={manageSearch}
              onChange={(e) => setManageSearch(e.target.value)}
              placeholder="Search name, owner email, country..."
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 min-w-[260px]"
            />
            <button
              type="button"
              onClick={loadManagedBusinesses}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Business</th>
                  <th className="text-left px-5 py-3 font-semibold">Owner</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-right px-5 py-3 font-semibold">Created</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                {managedBusinessesLoading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : filteredManagedBusinesses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                      No businesses found.
                    </td>
                  </tr>
                ) : (
                  filteredManagedBusinesses.slice(0, 50).map((b) => {
                    const inactive = (b?.status || 'ACTIVE').toUpperCase() === 'INACTIVE';
                    return (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{b.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[520px]">
                            {b.industry || b.businessType || '—'}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-200">{b.owner?.email || '—'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {[b.owner?.firstName, b.owner?.lastName].filter(Boolean).join(' ') || '—'}
                          </div>
                        </td>
                        <td className="px-5 py-3">{statusPill(b.status)}</td>
                        <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setBusinessesModalOpen(false);
                                setContextAndGo(b, '/dashboard');
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200"
                            >
                              Open
                            </button>
                            {inactive ? (
                              <button
                                type="button"
                                onClick={() => openBusinessAction(b, 'activate')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                              >
                                Activate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openBusinessAction(b, 'deactivate')}
                                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                              >
                                Deactivate
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openBusinessAction(b, 'delete')}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        isOpen={businessActionModal.isOpen}
        onClose={() => setBusinessActionModal({ isOpen: false, kind: 'deactivate', business: null, confirmText: '', saving: false })}
        title={
          businessActionModal.kind === 'delete'
            ? 'Delete business'
            : businessActionModal.kind === 'deactivate'
              ? 'Deactivate business'
              : 'Activate business'
        }
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-700 dark:text-slate-200">
            <div className="font-semibold">{businessActionModal.business?.name || 'Business'}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{businessActionModal.business?.owner?.email || ''}</div>
          </div>

          {businessActionModal.kind === 'delete' ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-800 dark:text-red-200">
                This will delete the business from the platform dashboard and remove access.
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-200">
                Type <span className="font-bold">{businessActionModal.business?.name}</span> to confirm.
              </div>
              <input
                value={businessActionModal.confirmText}
                onChange={(e) => setBusinessActionModal((prev) => ({ ...prev, confirmText: e.target.value }))}
                placeholder="Business name"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200"
              />
            </div>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {businessActionModal.kind === 'deactivate'
                ? 'Users will no longer be able to use this business in the system.'
                : 'Users will be able to use this business again.'}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setBusinessActionModal({ isOpen: false, kind: 'deactivate', business: null, confirmText: '', saving: false })}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200"
              disabled={businessActionModal.saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={runBusinessAction}
              disabled={businessActionModal.saving}
              className={
                businessActionModal.kind === 'delete'
                  ? 'px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold'
                  : businessActionModal.kind === 'deactivate'
                    ? 'px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold'
                    : 'px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold'
              }
            >
              {businessActionModal.saving ? 'Working…' : businessActionModal.kind === 'delete' ? 'Delete' : businessActionModal.kind === 'deactivate' ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={businessesModalOpen} onClose={() => setBusinessesModalOpen(false)} title="Businesses" maxWidth="max-w-6xl">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Select a business to set context, then use modules as normal.
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={businessSearch}
                onChange={(e) => setBusinessSearch(e.target.value)}
                placeholder="Search name, owner email, country..."
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 min-w-[260px]"
              />
              <Link
                href="/dashboard/add-business"
                onClick={() => setBusinessesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                Add business
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold">Business</th>
                    <th className="text-left px-5 py-3 font-semibold">Owner</th>
                    <th className="text-left px-5 py-3 font-semibold">Country</th>
                    <th className="text-right px-5 py-3 font-semibold">Employees</th>
                    <th className="text-right px-5 py-3 font-semibold">Sites</th>
                    <th className="text-right px-5 py-3 font-semibold">Incidents</th>
                    <th className="text-right px-5 py-3 font-semibold">Created</th>
                    <th className="text-right px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                        Loading…
                      </td>
                    </tr>
                  ) : filteredBusinesses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                        No businesses found.
                      </td>
                    </tr>
                  ) : (
                    filteredBusinesses.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-5 py-3">
                          <button type="button" onClick={() => setSelectedBusinessId(b.id)} className="text-left">
                            <div className="font-semibold text-slate-900 dark:text-white">{b.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[420px]">
                              {b.industry || b.businessType || '—'}
                            </div>
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-200">{b.owner?.email || '—'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {[b.owner?.firstName, b.owner?.lastName].filter(Boolean).join(' ') || '—'}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{b.country || '—'}</td>
                        <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{b._count?.employees ?? 0}</td>
                        <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{b._count?.locations ?? 0}</td>
                        <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{b._count?.incidentReports ?? 0}</td>
                        <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setBusinessesModalOpen(false);
                                setContextAndGo(b, '/dashboard');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBusinessesModalOpen(false);
                                setContextAndGo(b, '/dashboard/security/incidents');
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200"
                            >
                              Incidents
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBusinessesModalOpen(false);
                                setContextAndGo(b, '/dashboard/people');
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200"
                            >
                              People
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!selectedBusinessObj}
        onClose={() => setSelectedBusinessId(null)}
        title={selectedBusinessObj?.name || 'Business'}
        maxWidth="max-w-3xl"
      >
        {selectedBusinessObj && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Employees</div>
                <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{selectedBusinessObj._count.employees}</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sites</div>
                <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{selectedBusinessObj._count.locations}</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Incidents</div>
                <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{selectedBusinessObj._count.incidentReports}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Modules</div>
              <div className="mt-2 text-sm text-slate-800 dark:text-slate-200">
                {(selectedBusinessObj.modules || '').split(',').map((x) => x.trim()).filter(Boolean).join(', ') || 'None'}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedBusiness(selectedBusinessObj as any);
                  toast.success('Business context set');
                  try {
                    localStorage.setItem('superadminBusinessContext', '1');
                  } catch {}
                  setSelectedBusinessId(null);
                  setBusinessesModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold"
              >
                Set context
              </button>
              <button
                type="button"
                onClick={() => setContextAndGo(selectedBusinessObj, '/dashboard/security/incidents')}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Open incidents
              </button>
              <button
                type="button"
                onClick={() => setContextAndGo(selectedBusinessObj, '/dashboard/settings')}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Settings
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SuperAdminBusinessContextBar({ businessName }: { businessName?: string }) {
  const router = useRouter();
  const { setSelectedBusiness } = useBusiness();
  return (
    <div className="rounded-2xl border border-indigo-200/60 dark:border-indigo-700/30 bg-indigo-50/60 dark:bg-indigo-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="text-sm text-indigo-900 dark:text-indigo-200">
        <span className="font-bold">Business context:</span> {businessName || 'Selected business'}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => {
            setSelectedBusiness(null);
            try {
              localStorage.removeItem('selectedBusiness');
              localStorage.removeItem('superadminBusinessContext');
            } catch {}
            router.push('/dashboard');
          }}
          className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 text-sm font-semibold text-indigo-700 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
        >
          Back to platform
        </button>
        <Link
          href="/dashboard/settings"
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold"
        >
          Business settings
        </Link>
        <Link
          href="/dashboard/vendors"
          className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 text-sm font-semibold text-indigo-700 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center gap-2"
        >
          <Store className="w-4 h-4" />
          Vendors
        </Link>
      </div>
    </div>
  );
}

function EmployeeDashboard({
  loading,
  data,
  onRefresh,
  onClockIn,
  onClockOut,
}: {
  loading: boolean;
  data: EmployeeDashboardData | null;
  onRefresh: () => Promise<void>;
  onClockIn: () => Promise<void>;
  onClockOut: () => Promise<void>;
}) {
  const name = data?.employee ? `${data.employee.firstName} ${data.employee.lastName}`.trim() : 'Employee';
  const now = data?.now ? new Date(data.now) : new Date();
  const active = !!data?.timeTracking?.activeTimesheet;
  const currentShift = data?.schedule?.currentShift || null;
  const nextShift = data?.schedule?.nextShift || null;
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null);
  const chartsReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const punctualityPie = useMemo(() => {
    const p = data?.metrics?.punctuality;
    if (!p) return [];
    return [
      { name: 'On time', value: p.onTime, color: '#6366f1' },
      { name: 'Late', value: p.late, color: '#f59e0b' },
      { name: 'Missed', value: p.missed, color: '#ef4444' },
    ].filter((x) => x.value > 0);
  }, [data?.metrics?.punctuality]);

  const punctualityTrend = useMemo(() => {
    const arr = data?.charts?.punctualityDaily || [];
    return arr.slice(-14).map((p) => ({
      date: p.date.slice(5),
      lateMinutes: p.lateMinutes == null ? 0 : p.lateMinutes,
      missed: p.status === 'MISSED' ? 1 : 0,
      onTime: p.status === 'ON_TIME' ? 1 : 0,
    }));
  }, [data?.charts?.punctualityDaily]);

  const reportsWeekly = useMemo(() => {
    return (data?.charts?.reportsWeekly || []).slice(-10).map((r) => ({
      week: r.week,
      label: r.week.slice(5),
      count: r.count,
      incidentCount: r.incidentCount,
      patrolCount: r.patrolCount,
    }));
  }, [data?.charts?.reportsWeekly]);

  const canClockIn = !!data?.schedule?.canClockIn && !active;
  const canClockOut = active;

  const weekStart = (key: string) => new Date(`${key}T00:00:00.000Z`);
  const weekEndExclusive = (key: string) => new Date(weekStart(key).getTime() + 7 * 24 * 60 * 60 * 1000);

  const selectedWeek = useMemo(() => {
    if (!selectedWeekKey) return null;
    return reportsWeekly.find((r) => r.week === selectedWeekKey) || null;
  }, [reportsWeekly, selectedWeekKey]);

  const weekActivity = useMemo(() => {
    if (!selectedWeekKey) return [];
    const start = weekStart(selectedWeekKey).getTime();
    const end = weekEndExclusive(selectedWeekKey).getTime();
    return (data?.activity || [])
      .filter((a) => {
        const t = new Date(a.createdAt).getTime();
        return t >= start && t < end;
      })
      .slice(0, 20);
  }, [data?.activity, selectedWeekKey]);

  const openReports = (weekKey?: string | null) => {
    const fallback = reportsWeekly.length ? reportsWeekly[reportsWeekly.length - 1].week : null;
    setSelectedWeekKey(weekKey || selectedWeekKey || fallback);
    setReportsModalOpen(true);
  };

  const activityHref = (a: { kind: string }) => {
    if (a.kind === 'INCIDENT') return '/dashboard/security/incidents';
    if (a.kind === 'PATROL') return '/dashboard/security/patrols';
    return '/dashboard/security/incidents';
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="rounded-3xl border border-indigo-200/40 dark:border-indigo-700/30 bg-gradient-to-br from-white via-indigo-50/60 to-purple-50/60 dark:from-slate-950 dark:via-indigo-950/30 dark:to-purple-950/20 p-6 shadow-sm overflow-hidden relative">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-400/20 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-400/20 blur-3xl rounded-full" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 tracking-wider uppercase flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Employee Command Center
            </div>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white truncate">
              Welcome back, {name}
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2 flex-wrap">
              <Clock className="w-4 h-4 text-gray-400" />
              {now.toLocaleString()}
              {currentShift?.locationName ? (
                <>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{currentShift.locationName}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={onRefresh}
              className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-white dark:hover:bg-slate-900 transition-colors"
            >
              Refresh
            </button>
            <Link
              href="/dashboard/scheduling"
              className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-white dark:hover:bg-slate-900 transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              My schedule
              <ArrowRight className="w-4 h-4 opacity-60" />
            </Link>

            <button
              type="button"
              disabled={!canClockIn || loading}
              onClick={onClockIn}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 transition-colors ${
                canClockIn
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4" />
              Clock in
            </button>
            <button
              type="button"
              disabled={!canClockOut || loading}
              onClick={onClockOut}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 transition-colors ${
                canClockOut
                  ? 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800'
                  : 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              <Square className="w-4 h-4" />
              Clock out
            </button>
          </div>
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          <div className="rounded-2xl border border-gray-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 p-5">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Punctuality (30 days)</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {data?.metrics?.punctuality?.onTimeRate ?? 0}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                Avg late: {data?.metrics?.punctuality?.avgLateMinutes ?? 0}m
              </div>
            </div>
            <div className="mt-3 h-28">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={112}>
                  <LineChart data={punctualityTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="rgba(100,116,139,0.6)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="rgba(100,116,139,0.6)" />
                    <Tooltip />
                    <Line type="monotone" dataKey="lateMinutes" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full rounded-xl bg-gray-100 dark:bg-slate-800/60 animate-pulse" />
              )}
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => openReports(null)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              openReports(null);
            }}
            className="rounded-2xl border border-purple-200/70 dark:border-purple-700/40 bg-white/70 dark:bg-slate-900/60 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="absolute -top-16 -right-16 w-44 h-44 bg-purple-500/20 blur-3xl rounded-full" />
            <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-indigo-500/20 blur-3xl rounded-full" />

            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Report submissions (weekly)</div>
                <div className="mt-2 flex items-end gap-3">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{data?.metrics?.reports?.total ?? 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Incidents: {data?.metrics?.reports?.incidentCount ?? 0} • Patrol: {data?.metrics?.reports?.patrolCount ?? 0}
                  </div>
                </div>
              </div>
              <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-500/15 border border-purple-200/60 dark:border-purple-500/20 px-2 py-1 rounded-full whitespace-nowrap">
                Click to review
              </div>
            </div>

            <div className="relative mt-3 h-28">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={112}>
                  <BarChart data={reportsWeekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="rgba(100,116,139,0.6)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="rgba(100,116,139,0.6)" allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="incidentCount"
                      name="Incidents"
                      stackId="a"
                      fill="#8b5cf6"
                      radius={[8, 8, 0, 0]}
                      onClick={(d: any) => {
                        const wk = d?.payload?.week;
                        if (!wk) return;
                        openReports(wk);
                      }}
                    />
                    <Bar
                      dataKey="patrolCount"
                      name="Patrol"
                      stackId="a"
                      fill="#6366f1"
                      radius={[8, 8, 0, 0]}
                      onClick={(d: any) => {
                        const wk = d?.payload?.week;
                        if (!wk) return;
                        openReports(wk);
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full rounded-xl bg-gray-100 dark:bg-slate-800/60 animate-pulse" />
              )}
            </div>

            <div className="relative mt-3 flex items-center gap-2 flex-wrap">
              <Link
                href="/dashboard/security/incidents"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-white dark:hover:bg-slate-900 transition-colors"
              >
                View incidents
              </Link>
              <Link
                href="/dashboard/security/patrols"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-white dark:hover:bg-slate-900 transition-colors"
              >
                View patrol logs
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 p-5">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Consistency</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{data?.metrics?.streakOnTimeDays ?? 0}d</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 text-right">On-time streak</div>
            </div>
            <div className="mt-3 h-28">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={112}>
                  <PieChart>
                    <Pie data={punctualityPie} dataKey="value" nameKey="name" innerRadius={34} outerRadius={52} paddingAngle={2}>
                      {punctualityPie.map((e) => (
                        <Cell key={e.name} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full rounded-xl bg-gray-100 dark:bg-slate-800/60 animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-bold text-gray-900 dark:text-white">Today</div>
              <Link href="/dashboard/time" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2">
                Time & attendance <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Current shift</div>
                <div className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
                  {currentShift ? `${new Date(currentShift.startTime).toLocaleTimeString()} – ${new Date(currentShift.endTime).toLocaleTimeString()}` : 'No active shift'}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">{currentShift?.locationName || ' '}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Next shift</div>
                <div className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
                  {nextShift ? `${new Date(nextShift.startTime).toLocaleTimeString()} – ${new Date(nextShift.endTime).toLocaleTimeString()}` : 'No upcoming shift today'}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">{nextShift?.locationName || ' '}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-bold text-gray-900 dark:text-white">Recent activity</div>
              <Link href="/dashboard/security/incidents" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2">
                Reports <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="mt-4 divide-y divide-gray-200/60 dark:divide-slate-700/60">
              {(data?.activity || []).length === 0 ? (
                <div className="py-8 text-sm text-gray-500 dark:text-gray-400">No recent activity.</div>
              ) : (
                (data?.activity || []).slice(0, 8).map((a) => (
                  <Link
                    key={`${a.kind}_${a.id}`}
                    href={activityHref(a)}
                    className="py-3 flex items-start justify-between gap-3 hover:bg-gray-50/70 dark:hover:bg-slate-800/30 rounded-xl px-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{a.kind}</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{a.title || 'Update'}</div>
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <div className="text-lg font-bold text-gray-900 dark:text-white">Quick actions</div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <Link
                href="/dashboard/communications/chats"
                className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">Chats</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Team updates</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
              <Link
                href="/dashboard/communications/notifications"
                className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">Notifications</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Your inbox</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
              <Link
                href="/dashboard/requests/loans"
                className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-indigo-500" /> Loan request
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Request a loan and track status</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading dashboard…</div>
      ) : null}

      <Modal isOpen={reportsModalOpen} onClose={() => setReportsModalOpen(false)} title="Reports overview" maxWidth="max-w-4xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {selectedWeek ? (
                <>
                  Week of <span className="font-semibold text-gray-900 dark:text-white">{selectedWeek.week}</span> •{' '}
                  <span className="font-semibold">{selectedWeek.count}</span> total (
                  <span className="font-semibold">{selectedWeek.incidentCount}</span> incidents,{' '}
                  <span className="font-semibold">{selectedWeek.patrolCount}</span> patrol logs)
                </>
              ) : (
                'Select a week from the chart'
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/dashboard/security/incidents"
                onClick={() => setReportsModalOpen(false)}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
              >
                New / View incidents
              </Link>
              <Link
                href="/dashboard/security/patrols"
                onClick={() => setReportsModalOpen(false)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                View patrol logs
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Weekly trend</div>
            <div className="h-56">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={224}>
                  <BarChart data={reportsWeekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="rgba(100,116,139,0.6)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="rgba(100,116,139,0.6)" allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="incidentCount"
                      name="Incidents"
                      stackId="a"
                      fill="#8b5cf6"
                      radius={[10, 10, 0, 0]}
                      onClick={(d: any) => {
                        const wk = d?.payload?.week;
                        if (!wk) return;
                        setSelectedWeekKey(wk);
                      }}
                    />
                    <Bar
                      dataKey="patrolCount"
                      name="Patrol"
                      stackId="a"
                      fill="#6366f1"
                      radius={[10, 10, 0, 0]}
                      onClick={(d: any) => {
                        const wk = d?.payload?.week;
                        if (!wk) return;
                        setSelectedWeekKey(wk);
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full rounded-xl bg-gray-100 dark:bg-slate-800/60 animate-pulse" />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Items (from your recent activity)</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWeekKey(reportsWeekly.length ? reportsWeekly[reportsWeekly.length - 1].week : null)}
                  className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-gray-200"
                >
                  Latest week
                </button>
              </div>
            </div>
            <div className="mt-3 divide-y divide-gray-200/60 dark:divide-slate-700/60">
              {weekActivity.length === 0 ? (
                <div className="py-8 text-sm text-gray-500 dark:text-gray-400">No items captured for this week.</div>
              ) : (
                weekActivity.map((a) => (
                  <Link
                    key={`${a.kind}_${a.id}`}
                    href={activityHref(a)}
                    onClick={() => setReportsModalOpen(false)}
                    className="py-3 flex items-start justify-between gap-3 hover:bg-gray-50/70 dark:hover:bg-slate-800/30 rounded-xl px-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{a.kind}</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{a.title || 'Update'}</div>
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
