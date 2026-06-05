'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../../../lib/api';
import { useBusiness } from '../../../../context/business-context';
import { UserRole } from '@unitedlinkgroup/types';
import { toast } from 'sonner';
import { format, isValid, parseISO } from 'date-fns';
import { SideModal } from '@/components/SideModal';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  CalendarCheck,
  ArrowLeftRight,
  CreditCard,
  User,
  Clock,
  Building2,
  MapPin,
  Mail,
  FileText,
} from 'lucide-react';

type ApprovalType = 'LEAVE' | 'SWAP' | 'LOAN' | 'CALLOUT';

type LeaveRequest = {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  isAllDay?: boolean | null;
  startTime?: string | null;
  endTime?: string | null;
  totalHours?: number | null;
  reason?: string | null;
  status: string;
  createdAt?: string;
  employee?: { id: string; firstName: string; lastName: string; email: string; badgeNumber?: string | null } | null;
  leaveType?: { id: string; name: string; isPaid?: boolean | null } | null;
};

type Swap = {
  id: string;
  businessId: string;
  status: string;
  createdAt: string;
  message?: string | null;
  requesterEmployee?: { id: string; firstName: string; lastName: string; email: string } | null;
  offeredShift?: { startTime: string; endTime: string; employee?: any; location?: any } | null;
  requestedShift?: { startTime: string; endTime: string; employee?: any; location?: any } | null;
};

type Loan = {
  id: string;
  amount: number;
  balance: number;
  termMonths: number;
  perPayPeriodDeduction: number;
  reason?: string | null;
  status: string;
  createdAt: string;
  employee?: { id: string; firstName: string; lastName: string; email: string; badgeNumber?: string | null } | null;
};

type Callout = {
  id: string;
  businessId: string;
  status: string;
  createdAt: string;
  reasonCode: string;
  reasonNote?: string | null;
  type: string;
  noticeAt: string;
  rejectionReason?: string | null;
  absentEmployee?: { id: string; firstName: string; lastName: string; email?: string | null } | null;
  shift?: { id: string; startTime: string; endTime?: string | null; location?: { name?: string | null } | null } | null;
};

type ApprovalItem = {
  type: ApprovalType;
  id: string;
  status: string;
  createdAt: string;
  title: string;
  subtitle: string;
  personLabel: string;
  email?: string;
  raw: LeaveRequest | Swap | Loan | Callout;
};

function safeDateLabel(isoLike: string | null | undefined, fmt = 'MMM d, yyyy') {
  if (!isoLike) return '';
  const d = (() => {
    try {
      return parseISO(isoLike);
    } catch {
      return new Date(isoLike);
    }
  })();
  if (!isValid(d)) return '';
  return format(d, fmt);
}

function money(n: number) {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return `$${v.toFixed(2)}`;
}

function typeBadge(type: ApprovalType) {
  if (type === 'LEAVE') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
  if (type === 'SWAP') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  if (type === 'CALLOUT') return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
  return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
}

function statusBadge(status: string) {
  const s = String(status || '').toUpperCase();
  if (s === 'APPROVED') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (s === 'REJECTED') return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
  if (s === 'CANCELLED') return 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
}

function typeIcon(type: ApprovalType) {
  if (type === 'LEAVE') return CalendarCheck;
  if (type === 'SWAP') return ArrowLeftRight;
  if (type === 'CALLOUT') return XCircle;
  return CreditCard;
}

const StatCard = ({ title, value, icon: Icon, accent }: { title: string; value: string; icon: any; accent: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden"
  >
    <div className={`absolute -right-10 -top-10 w-28 h-28 rounded-full opacity-10 blur-2xl ${accent}`} />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</div>
        <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</div>
      </div>
      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200">
        <Icon className="w-6 h-6" />
      </div>
    </div>
  </motion.div>
);

export default function ApprovalsPage() {
  const { selectedBusiness } = useBusiness();
  const businessId = selectedBusiness?.id || null;

  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ApprovalItem[]>([]);

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ApprovalType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'ALL'>('PENDING');

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [active, setActive] = useState<ApprovalItem | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isSuperAdmin = role === UserRole.SUPER_ADMIN;
  const isAdmin = role === UserRole.BUSINESS_ADMIN || role === UserRole.SUPER_ADMIN;
  const isManager = role === UserRole.MANAGER;
  const canView = isAdmin || isManager;

  const canApprove = (it: ApprovalItem) => {
    if (it.type === 'SWAP') return isAdmin || isManager;
    if (it.type === 'LEAVE') return isAdmin;
    if (it.type === 'CALLOUT') return isAdmin;
    return isAdmin;
  };

  const normalize = (payload: { leave: LeaveRequest[]; swaps: Swap[]; loans: Loan[]; callouts: Callout[] }): ApprovalItem[] => {
    const out: ApprovalItem[] = [];
    for (const r of payload.leave) {
      const employee = r.employee ? `${r.employee.firstName} ${r.employee.lastName}`.trim() : r.employeeId;
      const range = `${safeDateLabel(r.startDate)} → ${safeDateLabel(r.endDate)}`.trim();
      const type = r.leaveType?.name || 'Leave';
      const hours = typeof r.totalHours === 'number' ? `${Math.round(r.totalHours * 100) / 100}h` : '';
      out.push({
        type: 'LEAVE',
        id: r.id,
        status: r.status,
        createdAt: r.createdAt || '',
        title: `${type}${hours ? ` • ${hours}` : ''}`,
        subtitle: range,
        personLabel: employee,
        email: r.employee?.email,
        raw: r,
      });
    }
    for (const s of payload.swaps) {
      const requester = s.requesterEmployee ? `${s.requesterEmployee.firstName} ${s.requesterEmployee.lastName}`.trim() : 'Shift Swap';
      const offeredLoc = (s.offeredShift as any)?.location?.name || 'No location';
      const offered = (s.offeredShift as any)?.startTime ? `${safeDateLabel((s.offeredShift as any).startTime, 'MMM d • h:mm a')} → ${safeDateLabel((s.offeredShift as any).endTime, 'h:mm a')}` : '';
      out.push({
        type: 'SWAP',
        id: s.id,
        status: s.status,
        createdAt: s.createdAt,
        title: 'Shift Swap Request',
        subtitle: offered ? `${offered} • ${offeredLoc}` : offeredLoc,
        personLabel: requester,
        email: s.requesterEmployee?.email,
        raw: s,
      });
    }
    for (const l of payload.loans) {
      const employee = l.employee ? `${l.employee.firstName} ${l.employee.lastName}`.trim() : 'Loan';
      out.push({
        type: 'LOAN',
        id: l.id,
        status: l.status,
        createdAt: l.createdAt,
        title: `Loan • ${money(l.amount)}`,
        subtitle: `Term: ${l.termMonths} mo • Deduction: ${money(l.perPayPeriodDeduction)}`,
        personLabel: employee,
        email: l.employee?.email,
        raw: l,
      });
    }
    for (const c of payload.callouts) {
      const employee = c.absentEmployee ? `${c.absentEmployee.firstName} ${c.absentEmployee.lastName}`.trim() : 'Employee';
      const loc = c.shift?.location?.name || 'Unassigned location';
      const when = c.shift?.startTime ? `${safeDateLabel(c.shift.startTime, 'MMM d • h:mm a')}${c.shift?.endTime ? ` → ${safeDateLabel(c.shift.endTime, 'h:mm a')}` : ''}` : '';
      out.push({
        type: 'CALLOUT',
        id: c.id,
        status: c.status,
        createdAt: c.createdAt,
        title: `Call-out • ${String(c.type || '').toUpperCase()}`,
        subtitle: [when, loc].filter(Boolean).join(' • '),
        personLabel: employee,
        email: c.absentEmployee?.email || undefined,
        raw: c,
      });
    }
    return out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  };

  const load = async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    if (!silent) setLoading(true);
    try {
      const profileRes = await api.get('/auth/profile');
      const r = profileRes.data?.role || null;
      setRole(r);

      if (!businessId && r === UserRole.SUPER_ADMIN) {
        setItems([]);
        return;
      }

      const status = statusFilter === 'PENDING' ? 'PENDING' : undefined;
      const safeGet = async <T,>(fn: () => Promise<{ data: T }>, fallback: T) => {
        try {
          const res = await fn();
          return res.data;
        } catch {
          return fallback;
        }
      };

      const [leave, swaps, loans, callouts] = await Promise.all([
        safeGet(() => api.get('/leave/requests', { params: status ? { status } : undefined }), [] as LeaveRequest[]),
        safeGet(() => api.get('/swaps', { params: status ? { status } : undefined }), [] as Swap[]),
        safeGet(() => api.get('/loans'), [] as Loan[]),
        safeGet(() => api.get('/scheduling/callouts/pending'), [] as Callout[]),
      ]);

      const loansFiltered = status ? (loans as Loan[]).filter((x) => String(x.status).toUpperCase() === status) : (loans as Loan[]);
      const calloutsFiltered = status ? (callouts as Callout[]).filter((x) => String(x.status).toUpperCase() === status) : (callouts as Callout[]);
      setItems(normalize({ leave: leave as LeaveRequest[], swaps: swaps as Swap[], loans: loansFiltered, callouts: calloutsFiltered }));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load approvals');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    load({ silent: true });
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (typeFilter !== 'ALL' && it.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && String(it.status).toUpperCase() !== 'PENDING') return false;
      if (!q) return true;
      const hay = `${it.type} ${it.title} ${it.subtitle} ${it.personLabel} ${it.email || ''} ${it.status}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const pending = items.filter((x) => String(x.status).toUpperCase() === 'PENDING');
    const leave = pending.filter((x) => x.type === 'LEAVE').length;
    const swaps = pending.filter((x) => x.type === 'SWAP').length;
    const loans = pending.filter((x) => x.type === 'LOAN').length;
    const callouts = pending.filter((x) => x.type === 'CALLOUT').length;
    const total = pending.length;
    return { total, leave, swaps, loans, callouts };
  }, [items]);

  const openDetails = (it: ApprovalItem) => {
    setActive(it);
    setDetailsOpen(true);
  };

  const startReject = (it: ApprovalItem) => {
    setActive(it);
    setRejectReason('');
    setRejectOpen(true);
  };

  const doApprove = async (it: ApprovalItem) => {
    if (!canApprove(it)) return;
    setActionLoading(true);
    try {
      if (it.type === 'LEAVE') {
        await api.put(`/leave/requests/${it.id}/status`, { status: 'APPROVED' });
      } else if (it.type === 'SWAP') {
        await api.put(`/swaps/${it.id}/approve`);
      } else if (it.type === 'CALLOUT') {
        await api.post(`/scheduling/callouts/${it.id}/approve`);
      } else {
        await api.patch(`/loans/${it.id}/approve`);
      }
      toast.success('Approved');
      setDetailsOpen(false);
      setRejectOpen(false);
      setActive(null);
      await load({ silent: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const doReject = async () => {
    if (!active) return;
    if (!canApprove(active)) return;
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    setActionLoading(true);
    try {
      if (active.type === 'LEAVE') {
        await api.put(`/leave/requests/${active.id}/status`, { status: 'REJECTED', rejectionReason: rejectReason.trim() });
      } else if (active.type === 'SWAP') {
        await api.put(`/swaps/${active.id}/reject`, { rejectionReason: rejectReason.trim() });
      } else if (active.type === 'CALLOUT') {
        await api.post(`/scheduling/callouts/${active.id}/reject`, { reason: rejectReason.trim() });
      } else {
        await api.patch(`/loans/${active.id}/reject`, { reason: rejectReason.trim() });
      }
      toast.success('Rejected');
      setDetailsOpen(false);
      setRejectOpen(false);
      setActive(null);
      await load({ silent: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const renderDetails = (it: ApprovalItem) => {
    const Icon = typeIcon(it.type);
    const created = safeDateLabel(it.createdAt, 'MMM d, yyyy • h:mm a');
    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${typeBadge(it.type)}`}>{it.type}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(it.status)}`}>{String(it.status).toUpperCase()}</span>
            </div>
            <div className="mt-3 text-xl font-bold text-slate-900 dark:text-white">{it.title}</div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{it.subtitle}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200">
            <Icon className="w-6 h-6" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              <User className="w-4 h-4" />
              Requester
            </div>
            <div className="mt-2 font-semibold text-slate-900 dark:text-white">{it.personLabel}</div>
            {it.email ? (
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {it.email}
              </div>
            ) : null}
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              <Clock className="w-4 h-4" />
              Submitted
            </div>
            <div className="mt-2 font-semibold text-slate-900 dark:text-white">{created || '—'}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <FileText className="w-4 h-4" />
            Details
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {it.type === 'LEAVE' ? (
              <LeaveDetails request={it.raw as LeaveRequest} />
            ) : it.type === 'SWAP' ? (
              <SwapDetails swap={it.raw as Swap} />
            ) : it.type === 'CALLOUT' ? (
              <CalloutDetails callout={it.raw as Callout} />
            ) : (
              <LoanDetails loan={it.raw as Loan} />
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={!canApprove(it) || actionLoading || String(it.status).toUpperCase() !== 'PENDING'}
            onClick={() => doApprove(it)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-semibold"
          >
            <CheckCircle className="w-5 h-5" />
            Approve
          </button>
          <button
            type="button"
            disabled={!canApprove(it) || actionLoading || String(it.status).toUpperCase() !== 'PENDING'}
            onClick={() => startReject(it)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:hover:bg-rose-600 text-white font-semibold"
          >
            <XCircle className="w-5 h-5" />
            Reject
          </button>
        </div>

        {!canApprove(it) ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            You can view this request, but you don’t have permission to approve/reject it.
          </div>
        ) : null}
      </div>
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load({ silent: true });
      toast.success('Updated');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading approval queue…</div>;
  }

  if (!canView) {
    return <div className="p-8 text-center text-slate-500">You do not have permission to view approvals.</div>;
  }

  if (!businessId && isSuperAdmin) {
    return <div className="p-8 text-center text-slate-500">Select a business to view its approval queue.</div>;
  }

  return (
    <div className="max-w-[1600px] mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">Requests</div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Approval Queue</h1>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review pending leave, shift swap, and loan requests in one place.
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending Total" value={String(stats.total)} icon={Clock} accent="bg-amber-500" />
        <StatCard title="Leave Requests" value={String(stats.leave)} icon={CalendarCheck} accent="bg-indigo-500" />
        <StatCard title="Shift Swaps" value={String(stats.swaps)} icon={ArrowLeftRight} accent="bg-amber-500" />
        <StatCard title="Loan Requests" value={String(stats.loans)} icon={CreditCard} accent="bg-emerald-500" />
        <StatCard title="Call-Outs" value={String(stats.callouts)} icon={XCircle} accent="bg-rose-500" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search approvals…"
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="pl-10 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="ALL">All types</option>
                  <option value="LEAVE">Leave</option>
                  <option value="SWAP">Shift swap</option>
                  <option value="LOAN">Loan</option>
                  <option value="CALLOUT">Call-out</option>
                </select>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="PENDING">Pending only</option>
                <option value="ALL">All statuses</option>
              </select>
            </div>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} results</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
          <div className="col-span-2">Type</div>
          <div className="col-span-3">Requester</div>
          <div className="col-span-5">Summary</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No approvals found.</div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filtered.map((it) => {
              const Icon = typeIcon(it.type);
              const pending = String(it.status).toUpperCase() === 'PENDING';
              return (
                <button
                  key={`${it.type}-${it.id}`}
                  type="button"
                  onClick={() => openDetails(it)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    <div className="lg:col-span-2 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900/40 flex items-center justify-center text-slate-700 dark:text-slate-200">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeBadge(it.type)}`}>{it.type}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(it.status)}`}>{String(it.status).toUpperCase()}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{safeDateLabel(it.createdAt, 'MMM d • h:mm a')}</div>
                      </div>
                    </div>

                    <div className="lg:col-span-3 min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">{it.personLabel}</div>
                      {it.email ? <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{it.email}</div> : null}
                    </div>

                    <div className="lg:col-span-5 min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">{it.title}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{it.subtitle}</div>
                    </div>

                    <div className="lg:col-span-2 flex gap-2 lg:justify-end">
                      <button
                        type="button"
                        disabled={!pending || !canApprove(it) || actionLoading}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          doApprove(it);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={!pending || !canApprove(it) || actionLoading}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          startReject(it);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-semibold"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <SideModal
        isOpen={detailsOpen && !!active}
        onClose={() => {
          setDetailsOpen(false);
          setActive(null);
        }}
        title={active ? `Approval • ${active.type}` : 'Approval'}
        widthClassName="w-full max-w-2xl"
      >
        {active ? renderDetails(active) : null}
      </SideModal>

      <SideModal
        isOpen={rejectOpen && !!active}
        onClose={() => {
          setRejectOpen(false);
          setRejectReason('');
        }}
        title="Reject Request"
        widthClassName="w-full max-w-xl"
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-600 dark:text-slate-300">Provide a reason for rejection. This will be saved and visible to the requester.</div>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Reason…"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => doReject()}
              disabled={actionLoading || !active || !canApprove(active)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold"
            >
              <XCircle className="w-5 h-5" />
              Reject
            </button>
            <button
              type="button"
              onClick={() => setRejectOpen(false)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </SideModal>
    </div>
  );
}

function LeaveDetails({ request }: { request: LeaveRequest }) {
  const employee = request.employee ? `${request.employee.firstName} ${request.employee.lastName}`.trim() : request.employeeId;
  const leaveType = request.leaveType?.name || request.leaveTypeId;
  const range = `${safeDateLabel(request.startDate)} → ${safeDateLabel(request.endDate)}`;
  const hours = typeof request.totalHours === 'number' ? `${Math.round(request.totalHours * 100) / 100}h` : '—';
  const timeLabel =
    request.isAllDay === false && request.startTime && request.endTime ? `${request.startTime} → ${request.endTime}` : 'All day';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">Employee</div>
        <div className="font-semibold text-slate-900 dark:text-white">{employee}</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">Leave type</div>
        <div className="font-semibold text-slate-900 dark:text-white">{leaveType}</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">Dates</div>
        <div className="font-semibold text-slate-900 dark:text-white">{range}</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">Time</div>
        <div className="font-semibold text-slate-900 dark:text-white">{timeLabel}</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">Requested hours</div>
        <div className="font-semibold text-slate-900 dark:text-white">{hours}</div>
      </div>
      {request.reason ? (
        <div className="pt-2">
          <div className="text-slate-600 dark:text-slate-300">Reason</div>
          <div className="mt-1 text-slate-900 dark:text-white whitespace-pre-wrap">{request.reason}</div>
        </div>
      ) : null}
    </div>
  );
}

function SwapDetails({ swap }: { swap: Swap }) {
  const offeredLoc = (swap.offeredShift as any)?.location?.name || 'No location';
  const requestedLoc = (swap.requestedShift as any)?.location?.name || 'No location';
  const offeredEmp = (swap.offeredShift as any)?.employee
    ? `${(swap.offeredShift as any).employee.firstName} ${(swap.offeredShift as any).employee.lastName}`.trim()
    : 'Unassigned';
  const requestedEmp = (swap.requestedShift as any)?.employee
    ? `${(swap.requestedShift as any).employee.firstName} ${(swap.requestedShift as any).employee.lastName}`.trim()
    : 'Unassigned';
  const offeredTime = (swap.offeredShift as any)?.startTime
    ? `${safeDateLabel((swap.offeredShift as any).startTime, 'MMM d, yyyy • h:mm a')} → ${safeDateLabel((swap.offeredShift as any).endTime, 'h:mm a')}`
    : '—';
  const requestedTime = (swap.requestedShift as any)?.startTime
    ? `${safeDateLabel((swap.requestedShift as any).startTime, 'MMM d, yyyy • h:mm a')} → ${safeDateLabel((swap.requestedShift as any).endTime, 'h:mm a')}`
    : '—';
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
            <Building2 className="w-4 h-4" />
            Offered shift
          </div>
          <div className="mt-2 font-semibold text-slate-900 dark:text-white">{offeredTime}</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {offeredLoc}
          </div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <User className="w-4 h-4" />
            {offeredEmp}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
            <Building2 className="w-4 h-4" />
            Requested shift
          </div>
          <div className="mt-2 font-semibold text-slate-900 dark:text-white">{requestedTime}</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {requestedLoc}
          </div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <User className="w-4 h-4" />
            {requestedEmp}
          </div>
        </div>
      </div>
      {swap.message ? (
        <div>
          <div className="text-slate-600 dark:text-slate-300">Message</div>
          <div className="mt-1 text-slate-900 dark:text-white whitespace-pre-wrap">{swap.message}</div>
        </div>
      ) : null}
    </div>
  );
}

function CalloutDetails({ callout }: { callout: Callout }) {
  const employee = callout.absentEmployee
    ? `${callout.absentEmployee.firstName} ${callout.absentEmployee.lastName}`.trim()
    : 'Employee';
  const shiftTime = callout.shift?.startTime
    ? `${safeDateLabel(callout.shift.startTime, 'MMM d, yyyy • h:mm a')}${callout.shift?.endTime ? ` → ${safeDateLabel(callout.shift.endTime, 'h:mm a')}` : ''}`
    : '—';
  const location = callout.shift?.location?.name || 'No location assigned';
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">Employee</div>
        <div className="font-semibold text-slate-900 dark:text-white">{employee}</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">Shift</div>
        <div className="font-semibold text-slate-900 dark:text-white text-right">{shiftTime}</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">Location</div>
        <div className="font-semibold text-slate-900 dark:text-white">{location}</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">Call-out type</div>
        <div className="font-semibold text-slate-900 dark:text-white">{String(callout.type || '').replace(/_/g, ' ')}</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">Reason code</div>
        <div className="font-semibold text-slate-900 dark:text-white">{String(callout.reasonCode || '').replace(/_/g, ' ')}</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">Submitted</div>
        <div className="font-semibold text-slate-900 dark:text-white">{safeDateLabel(callout.createdAt, 'MMM d, yyyy • h:mm a')}</div>
      </div>
      {callout.reasonNote ? (
        <div className="pt-2">
          <div className="text-slate-600 dark:text-slate-300">Note</div>
          <div className="mt-1 text-slate-900 dark:text-white whitespace-pre-wrap">{callout.reasonNote}</div>
        </div>
      ) : null}
    </div>
  );
}

function LoanDetails({ loan }: { loan: Loan }) {
  const employee = loan.employee ? `${loan.employee.firstName} ${loan.employee.lastName}`.trim() : '—';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">Employee</div>
        <div className="font-semibold text-slate-900 dark:text-white">{employee}</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">Amount</div>
        <div className="font-semibold text-slate-900 dark:text-white">{money(loan.amount)}</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">Balance</div>
        <div className="font-semibold text-slate-900 dark:text-white">{money(loan.balance)}</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">Term</div>
        <div className="font-semibold text-slate-900 dark:text-white">{loan.termMonths} months</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">Per pay period</div>
        <div className="font-semibold text-slate-900 dark:text-white">{money(loan.perPayPeriodDeduction)}</div>
      </div>
      {loan.reason ? (
        <div className="pt-2">
          <div className="text-slate-600 dark:text-slate-300">Reason</div>
          <div className="mt-1 text-slate-900 dark:text-white whitespace-pre-wrap">{loan.reason}</div>
        </div>
      ) : null}
    </div>
  );
}
