'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../../../lib/api';
import { useBusiness } from '../../../../context/business-context';
import { UserRole } from '@unitedlinkgroup/types';
import { toast } from 'sonner';
import { format, isValid, parseISO } from 'date-fns';
import { SideModal } from '@/components/SideModal';
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  User,
  RefreshCw,
  FileText,
  ShieldCheck,
} from 'lucide-react';

type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

type LeaveType = {
  id: string;
  name: string;
  isPaid?: boolean;
  requiresApproval?: boolean;
  allowNegativeBalance?: boolean;
  color?: string | null;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  badgeNumber?: string | null;
  status?: string;
};

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
  actualHours?: number | null;
  resumedAt?: string | null;
  resumedReason?: string | null;
  refundedHours?: number | null;
  cancelledAt?: string | null;
  cancelledReason?: string | null;
  reason?: string | null;
  status: LeaveStatus;
  rejectionReason?: string | null;
  createdAt?: string;
  employee?: Employee;
  leaveType?: LeaveType;
};

type LeaveBalance = {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  balanceHours: number;
  takenHours: number;
  leaveType: LeaveType;
};

function safeDateLabel(isoLike: string | null | undefined) {
  if (!isoLike) return '';
  const d = (() => {
    try {
      return parseISO(isoLike);
    } catch {
      return new Date(isoLike);
    }
  })();
  if (!isValid(d)) return '';
  return format(d, 'MMM d, yyyy');
}

function formatHours(n: number | null | undefined) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  const rounded = Math.round(n * 100) / 100;
  return `${rounded}h`;
}

function statusPill(status: LeaveStatus) {
  if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (status === 'REJECTED') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  if (status === 'CANCELLED') return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
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

export default function LeaveRequestsPage() {
  const { selectedBusiness } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);

  const [statusFilter, setStatusFilter] = useState<'ALL' | LeaveStatus>('ALL');
  const [query, setQuery] = useState('');

  const isAdmin = role === UserRole.BUSINESS_ADMIN || role === UserRole.SUPER_ADMIN;
  const isManager = role === UserRole.MANAGER;
  const canApprove = isAdmin;
  const canViewAll = isAdmin || isManager;
  const canResumeEarly = isAdmin || isManager;

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveRequest | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<{ open: boolean; id: string | null; isLoading: boolean }>({
    open: false,
    id: null,
    isLoading: false,
  });
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string | null; reason: string; isLoading: boolean }>({
    open: false,
    id: null,
    reason: '',
    isLoading: false,
  });
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; request: LeaveRequest | null }>({ open: false, request: null });
  const [resumeDate, setResumeDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [resumeTime, setResumeTime] = useState('09:00');
  const [resumeReason, setResumeReason] = useState('');
  const [resuming, setResuming] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [draftEmployeeId, setDraftEmployeeId] = useState('');
  const [draftLeaveTypeId, setDraftLeaveTypeId] = useState('');
  const [draftStartDate, setDraftStartDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [draftEndDate, setDraftEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [draftIsAllDay, setDraftIsAllDay] = useState(true);
  const [draftStartTime, setDraftStartTime] = useState('09:00');
  const [draftEndTime, setDraftEndTime] = useState('17:00');
  const [draftReason, setDraftReason] = useState('');
  const [draftHours, setDraftHours] = useState<number | null>(null);
  const [hoursLoading, setHoursLoading] = useState(false);
  const calcAbortRef = useRef<AbortController | null>(null);

  const businessId = selectedBusiness?.id || null;

  const resetDraft = (targetEmployeeId?: string | null) => {
    setDraftEmployeeId(targetEmployeeId || employeeId || '');
    setDraftLeaveTypeId(leaveTypes[0]?.id || '');
    setDraftStartDate(format(new Date(), 'yyyy-MM-dd'));
    setDraftEndDate(format(new Date(), 'yyyy-MM-dd'));
    setDraftIsAllDay(true);
    setDraftStartTime('09:00');
    setDraftEndTime('17:00');
    setDraftReason('');
    setDraftHours(null);
  };

  const load = async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    if (!silent) setLoading(true);
    try {
      const profileRes = await api.get('/auth/profile');
      const r = profileRes.data?.role || null;
      const eid = profileRes.data?.employeeId || null;
      setRole(r);
      setEmployeeId(eid);
      const viewAll = r === UserRole.BUSINESS_ADMIN || r === UserRole.SUPER_ADMIN || r === UserRole.MANAGER;

      const effectiveBusinessId = selectedBusiness?.id || profileRes.data?.businessId || null;
      if (!effectiveBusinessId && r === UserRole.SUPER_ADMIN) {
        setLeaveTypes([]);
        setRequests([]);
        setBalances([]);
        setEmployees([]);
        return;
      }

      const [typesRes] = await Promise.all([
        effectiveBusinessId ? api.get(`/leave/types/${effectiveBusinessId}`) : Promise.resolve({ data: [] }),
      ]);
      const types = Array.isArray(typesRes.data) ? (typesRes.data as LeaveType[]) : [];
      setLeaveTypes(types);

      if (viewAll) {
        const status = statusFilter === 'ALL' ? undefined : statusFilter;
        const res = await api.get('/leave/requests', { params: { ...(status ? { status } : {}) } });
        setRequests(Array.isArray(res.data) ? (res.data as LeaveRequest[]) : []);
      } else {
        const [reqRes, balRes] = await Promise.all([api.get('/leave/my-requests'), api.get('/leave/my-balances')]);
        setRequests(Array.isArray(reqRes.data) ? (reqRes.data as LeaveRequest[]) : []);
        setBalances(Array.isArray(balRes.data) ? (balRes.data as LeaveBalance[]) : []);
      }

      if (viewAll) {
        try {
          const empRes = await api.get('/employees', { params: { status: 'ACTIVE' } });
          setEmployees(Array.isArray(empRes.data) ? (empRes.data as Employee[]) : []);
        } catch {
          setEmployees([]);
        }
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load leave requests');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!canViewAll) return;
    load({ silent: true });
  }, [statusFilter]);

  const filteredRequests = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) => {
      const empName = r.employee ? `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase() : '';
      const leaveName = r.leaveType?.name?.toLowerCase() || '';
      const reason = (r.reason || '').toLowerCase();
      return empName.includes(q) || leaveName.includes(q) || reason.includes(q) || r.status.toLowerCase().includes(q);
    });
  }, [requests, query]);

  const stats = useMemo(() => {
    const pending = filteredRequests.filter((r) => r.status === 'PENDING').length;
    const approved = filteredRequests.filter((r) => r.status === 'APPROVED').length;
    const rejected = filteredRequests.filter((r) => r.status === 'REJECTED').length;
    const totalHours = filteredRequests.reduce((sum, r) => sum + (typeof r.totalHours === 'number' ? r.totalHours : 0), 0);
    return { pending, approved, rejected, totalHours };
  }, [filteredRequests]);

  const ensureHours = async () => {
    const eid = draftEmployeeId || employeeId || '';
    if (!eid || !draftStartDate || !draftEndDate) return;
    calcAbortRef.current?.abort();
    const ctrl = new AbortController();
    calcAbortRef.current = ctrl;
    try {
      setHoursLoading(true);
      const res = await api.get('/leave/calculate-hours', {
        params: {
          employeeId: eid,
          startDate: draftStartDate,
          endDate: draftEndDate,
          isAllDay: String(draftIsAllDay),
          ...(draftIsAllDay ? {} : { startTime: draftStartTime, endTime: draftEndTime }),
        },
        signal: ctrl.signal as any,
      });
      const total = res.data?.totalHours;
      setDraftHours(typeof total === 'number' ? total : null);
    } catch {
    } finally {
      setHoursLoading(false);
    }
  };

  useEffect(() => {
    const eid = draftEmployeeId || employeeId || '';
    if (!eid) return;
    if (!createOpen && !editOpen) return;
    if (!draftStartDate || !draftEndDate) return;
    const t = window.setTimeout(() => {
      ensureHours();
    }, 250);
    return () => window.clearTimeout(t);
  }, [draftEmployeeId, employeeId, draftStartDate, draftEndDate, draftIsAllDay, draftStartTime, draftEndTime, createOpen, editOpen]);

  const openCreate = () => {
    resetDraft(canViewAll ? '' : employeeId);
    setCreateOpen(true);
  };

  const openEdit = (r: LeaveRequest) => {
    setEditing(r);
    setDraftEmployeeId(r.employeeId || '');
    setDraftLeaveTypeId(r.leaveTypeId || '');
    setDraftStartDate(r.startDate ? format(new Date(r.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setDraftEndDate(r.endDate ? format(new Date(r.endDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setDraftIsAllDay(r.isAllDay ?? true);
    setDraftStartTime(r.startTime || '09:00');
    setDraftEndTime(r.endTime || '17:00');
    setDraftReason(r.reason || '');
    setDraftHours(typeof r.totalHours === 'number' ? r.totalHours : null);
    setEditOpen(true);
  };

  const openDetails = (r: LeaveRequest) => {
    setDetailsModal({ open: true, request: r });
    setResumeDate(format(new Date(), 'yyyy-MM-dd'));
    setResumeTime('09:00');
    setResumeReason('');
    setCancelReason('');
  };

  const submitCreate = async () => {
    const eid = draftEmployeeId || employeeId || '';
    if (!eid) {
      toast.error('Select an employee');
      return;
    }
    if (!draftLeaveTypeId) {
      toast.error('Select a leave type');
      return;
    }
    if (!draftStartDate || !draftEndDate) {
      toast.error('Select dates');
      return;
    }
    try {
      await api.post('/leave/request', {
        employeeId: eid,
        leaveTypeId: draftLeaveTypeId,
        startDate: draftStartDate,
        endDate: draftEndDate,
        isAllDay: draftIsAllDay,
        ...(draftIsAllDay ? {} : { startTime: draftStartTime, endTime: draftEndTime }),
        reason: draftReason || undefined,
      });
      toast.success('Leave request submitted');
      setCreateOpen(false);
      await load({ silent: true });
      window.dispatchEvent(new Event('leave:updated'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to submit request');
    }
  };

  const submitEdit = async () => {
    if (!editing?.id) return;
    try {
      await api.put(`/leave/requests/${editing.id}`, {
        leaveTypeId: draftLeaveTypeId || undefined,
        startDate: draftStartDate || undefined,
        endDate: draftEndDate || undefined,
        isAllDay: draftIsAllDay,
        ...(draftIsAllDay ? { startTime: undefined, endTime: undefined } : { startTime: draftStartTime, endTime: draftEndTime }),
        reason: draftReason || undefined,
      });
      toast.success('Leave request updated');
      setEditOpen(false);
      setEditing(null);
      await load({ silent: true });
      window.dispatchEvent(new Event('leave:updated'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update request');
    }
  };

  const approve = (id: string) => {
    setConfirmApprove({ open: true, id, isLoading: false });
  };

  const confirmApproveAction = async () => {
    if (!confirmApprove.id) return;
    setConfirmApprove((p) => ({ ...p, isLoading: true }));
    try {
      await api.put(`/leave/requests/${confirmApprove.id}/status`, { status: 'APPROVED' });
      toast.success('Approved');
      setConfirmApprove({ open: false, id: null, isLoading: false });
      await load({ silent: true });
      window.dispatchEvent(new Event('leave:updated'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to approve');
      setConfirmApprove((p) => ({ ...p, isLoading: false }));
    }
  };

  const openReject = (id: string) => {
    setRejectModal({ open: true, id, reason: '', isLoading: false });
  };

  const confirmRejectAction = async () => {
    if (!rejectModal.id) return;
    setRejectModal((p) => ({ ...p, isLoading: true }));
    try {
      await api.put(`/leave/requests/${rejectModal.id}/status`, { status: 'REJECTED', rejectionReason: rejectModal.reason || undefined });
      toast.success('Rejected');
      setRejectModal({ open: false, id: null, reason: '', isLoading: false });
      await load({ silent: true });
      window.dispatchEvent(new Event('leave:updated'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to reject');
      setRejectModal((p) => ({ ...p, isLoading: false }));
    }
  };

  const submitResumeEarly = async () => {
    const r = detailsModal.request;
    if (!r?.id) return;
    if (!resumeReason.trim()) {
      toast.error('Reason is required');
      return;
    }
    const resumedAtIso = new Date(`${resumeDate}T${resumeTime}:00`).toISOString();
    setResuming(true);
    try {
      await api.put(`/leave/requests/${r.id}/resume`, {
        resumedAt: resumedAtIso,
        resumedTime: resumeTime,
        resumedReason: resumeReason.trim(),
      });
      toast.success('Leave updated');
      setDetailsModal({ open: false, request: null });
      await load({ silent: true });
      window.dispatchEvent(new Event('leave:updated'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update leave');
    } finally {
      setResuming(false);
    }
  };

  const submitCancelLeave = async () => {
    const r = detailsModal.request;
    if (!r?.id) return;
    if (!cancelReason.trim()) {
      toast.error('Reason is required');
      return;
    }
    setCancelling(true);
    try {
      await api.put(`/leave/requests/${r.id}/cancel`, { reason: cancelReason.trim() });
      toast.success('Leave cancelled');
      setDetailsModal({ open: false, request: null });
      await load({ silent: true });
      window.dispatchEvent(new Event('leave:updated'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to cancel leave');
    } finally {
      setCancelling(false);
    }
  };

  const refresh = async () => {
    try {
      setRefreshing(true);
      await load({ silent: true });
      toast.success('Refreshed');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (role === UserRole.SUPER_ADMIN && !businessId) {
    return (
      <div className="p-8 space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">Select a business context</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Leave requests are scoped to a business. Select a business from the dashboard first.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-gray-50/50 dark:bg-slate-900/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            Leave Center
          </h1>
          <div className="mt-1 text-gray-500 dark:text-gray-400">
            {canViewAll ? 'Review, approve and manage leave requests' : 'Request time off and track approvals'}
          </div>
        </div>
        <div className="flex items-center gap-3">
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
            onClick={openCreate}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New request
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Pending" value={`${stats.pending}`} icon={Clock} accent="bg-amber-500" />
        <StatCard title="Approved" value={`${stats.approved}`} icon={CheckCircle} accent="bg-emerald-500" />
        <StatCard title="Rejected" value={`${stats.rejected}`} icon={XCircle} accent="bg-rose-500" />
        <StatCard title="Total hours" value={formatHours(stats.totalHours)} icon={CalendarCheck} accent="bg-indigo-500" />
      </div>

      {!canViewAll && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div className="font-bold text-gray-900 dark:text-white">My leave balances</div>
            </div>
          </div>
          <div className="p-5">
            {balances.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">No balances found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {balances.map((b) => (
                  <div key={b.id} className="rounded-2xl border border-gray-200 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-900/40">
                    <div className="font-semibold text-gray-900 dark:text-white">{b.leaveType?.name || 'Leave'}</div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <div className="text-gray-500 dark:text-gray-400">Available</div>
                      <div className="font-bold text-gray-900 dark:text-white">{formatHours(b.balanceHours)}</div>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <div className="text-gray-500 dark:text-gray-400">Taken</div>
                      <div className="font-semibold text-gray-700 dark:text-gray-200">{formatHours(b.takenHours)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200/60 dark:border-slate-700/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div className="font-bold text-gray-900 dark:text-white">{canViewAll ? 'Leave requests' : 'My requests'}</div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {canViewAll && (
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 px-3 py-2">
                <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none"
                >
                  <option value="ALL">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 px-3 py-2">
              <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search requests…"
                className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none w-64 max-w-full"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {canViewAll && <th className="px-5 py-3">Employee</th>}
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Dates</th>
                <th className="px-5 py-3">Hours</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60 dark:divide-slate-700/60">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400" colSpan={canViewAll ? 7 : 6}>
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => {
                  const canEdit = r.status === 'PENDING' && (!canViewAll || isAdmin || isManager);
                  const dates = `${safeDateLabel(r.startDate)} → ${safeDateLabel(r.endDate)}`;
                  const displayedHours = typeof r.actualHours === 'number' ? r.actualHours : r.totalHours;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-slate-900/40 cursor-pointer"
                      onClick={() => openDetails(r)}
                    >
                      {canViewAll && (
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                              {(r.employee?.firstName?.[0] || 'U').toUpperCase()}
                              {(r.employee?.lastName?.[0] || '').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.employee?.email || ''}</div>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{r.leaveType?.name || 'Leave'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{r.isAllDay ? 'All day' : `${r.startTime || ''} - ${r.endTime || ''}`}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{dates}</td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatHours(displayedHours)}</div>
                        {typeof r.refundedHours === 'number' && r.refundedHours > 0 && (
                          <div className="text-xs text-emerald-700 dark:text-emerald-300">Refunded {formatHours(r.refundedHours)}</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusPill(r.status)}`}>{r.status}</span>
                        {r.status === 'REJECTED' && r.rejectionReason && (
                          <div className="mt-1 text-xs text-rose-600 dark:text-rose-300">{r.rejectionReason}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-[320px] truncate">{r.reason || '—'}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(r);
                              }}
                              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                            >
                              Edit
                            </button>
                          )}
                          {canApprove && r.status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  approve(r.id);
                                }}
                                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openReject(r.id);
                                }}
                                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold"
                              >
                                Reject
                              </button>
                            </>
                          )}
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

      <SideModal
        isOpen={detailsModal.open}
        onClose={() => setDetailsModal({ open: false, request: null })}
        title="Leave details"
        widthClassName="w-full max-w-2xl"
      >
        {detailsModal.request ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {detailsModal.request.leaveType?.name || 'Leave'}
                  </div>
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {safeDateLabel(detailsModal.request.startDate)} → {safeDateLabel(detailsModal.request.endDate)}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {detailsModal.request.isAllDay ? 'All day' : `${detailsModal.request.startTime || ''} - ${detailsModal.request.endTime || ''}`}
                  </div>
                </div>
                <div className="shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusPill(detailsModal.request.status)}`}>
                    {detailsModal.request.status}
                  </span>
                </div>
              </div>
            </div>

            {canViewAll && detailsModal.request.employee && (
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Employee</div>
                <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
                  {detailsModal.request.employee.firstName} {detailsModal.request.employee.lastName}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{detailsModal.request.employee.email}</div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Requested</div>
                <div className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{formatHours(detailsModal.request.totalHours)}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Taken</div>
                <div className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                  {formatHours(typeof detailsModal.request.actualHours === 'number' ? detailsModal.request.actualHours : detailsModal.request.totalHours)}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Refunded</div>
                <div className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{formatHours(detailsModal.request.refundedHours)}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
              <div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Reason</div>
                <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{detailsModal.request.reason || '—'}</div>
              </div>
              {detailsModal.request.status === 'REJECTED' && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Rejection reason</div>
                  <div className="mt-1 text-sm text-rose-700 dark:text-rose-300">{detailsModal.request.rejectionReason || '—'}</div>
                </div>
              )}
              {detailsModal.request.resumedAt && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Resumed early</div>
                  <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                    {safeDateLabel(detailsModal.request.resumedAt)} • {detailsModal.request.resumedReason || '—'}
                  </div>
                </div>
              )}
              {detailsModal.request.status === 'CANCELLED' && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Cancellation reason</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{detailsModal.request.cancelledReason || '—'}</div>
                </div>
              )}
            </div>

            {(detailsModal.request.status === 'APPROVED' && canResumeEarly) && (
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4">
                <div className="text-sm font-bold text-gray-900 dark:text-white">Cancel leave</div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Reason</label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
                    placeholder="Why is this leave being cancelled?"
                  />
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={submitCancelLeave}
                    disabled={cancelling}
                    className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {cancelling ? 'Cancelling…' : 'Cancel leave'}
                  </button>
                </div>
              </div>
            )}

            {(detailsModal.request.status === 'APPROVED' && !detailsModal.request.resumedAt && canResumeEarly) && (
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4">
                <div className="text-sm font-bold text-gray-900 dark:text-white">Resume work early</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Resume date</label>
                    <input
                      type="date"
                      value={resumeDate}
                      min={format(new Date(detailsModal.request.startDate), 'yyyy-MM-dd')}
                      max={format(new Date(detailsModal.request.endDate), 'yyyy-MM-dd')}
                      onChange={(e) => setResumeDate(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Resume time</label>
                    <input
                      type="time"
                      value={resumeTime}
                      onChange={(e) => setResumeTime(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Reason</label>
                  <textarea
                    value={resumeReason}
                    onChange={(e) => setResumeReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
                    placeholder="Why are you resuming early?"
                  />
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={submitResumeEarly}
                    disabled={resuming}
                    className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {resuming ? 'Updating…' : 'Update leave'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </SideModal>

      <SideModal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New leave request" widthClassName="w-full max-w-2xl">
        <div className="space-y-5">
          {canViewAll && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Employee</label>
              <select
                value={draftEmployeeId}
                onChange={(e) => setDraftEmployeeId(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
              >
                <option value="">Select employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} — {e.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Leave type</label>
            <select
              value={draftLeaveTypeId}
              onChange={(e) => setDraftLeaveTypeId(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
            >
              {leaveTypes.length === 0 ? <option value="">No leave types found</option> : null}
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Start date</label>
              <input
                type="date"
                value={draftStartDate}
                onChange={(e) => setDraftStartDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">End date</label>
              <input
                type="date"
                value={draftEndDate}
                onChange={(e) => setDraftEndDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <div className="text-sm font-semibold text-gray-900 dark:text-white">All day</div>
            </div>
            <button
              type="button"
              onClick={() => setDraftIsAllDay((v) => !v)}
              className={`w-14 h-8 rounded-full transition-colors ${draftIsAllDay ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-700'}`}
            >
              <span
                className={`block w-6 h-6 bg-white rounded-full transform transition-transform ${
                  draftIsAllDay ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {!draftIsAllDay && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Start time</label>
                <input
                  type="time"
                  value={draftStartTime}
                  onChange={(e) => setDraftStartTime(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">End time</label>
                <input
                  type="time"
                  value={draftEndTime}
                  onChange={(e) => setDraftEndTime(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Estimated hours</div>
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{hoursLoading ? 'Calculating…' : formatHours(draftHours)}</div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Reason (optional)</label>
            <textarea
              value={draftReason}
              onChange={(e) => setDraftReason(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
              placeholder="Add a short note…"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitCreate}
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
            >
              Submit request
            </button>
          </div>
        </div>
      </SideModal>

      <SideModal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit leave request" widthClassName="w-full max-w-2xl">
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-4 text-sm text-gray-600 dark:text-gray-300">
            Only pending requests can be edited.
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Leave type</label>
            <select
              value={draftLeaveTypeId}
              onChange={(e) => setDraftLeaveTypeId(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
            >
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Start date</label>
              <input
                type="date"
                value={draftStartDate}
                onChange={(e) => setDraftStartDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">End date</label>
              <input
                type="date"
                value={draftEndDate}
                onChange={(e) => setDraftEndDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <div className="text-sm font-semibold text-gray-900 dark:text-white">All day</div>
            </div>
            <button
              type="button"
              onClick={() => setDraftIsAllDay((v) => !v)}
              className={`w-14 h-8 rounded-full transition-colors ${draftIsAllDay ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-700'}`}
            >
              <span
                className={`block w-6 h-6 bg-white rounded-full transform transition-transform ${
                  draftIsAllDay ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {!draftIsAllDay && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Start time</label>
                <input
                  type="time"
                  value={draftStartTime}
                  onChange={(e) => setDraftStartTime(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">End time</label>
                <input
                  type="time"
                  value={draftEndTime}
                  onChange={(e) => setDraftEndTime(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Estimated hours</div>
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{hoursLoading ? 'Calculating…' : formatHours(draftHours)}</div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Reason (optional)</label>
            <textarea
              value={draftReason}
              onChange={(e) => setDraftReason(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
              placeholder="Add a short note…"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setEditOpen(false);
                setEditing(null);
              }}
              className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitEdit}
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
            >
              Save changes
            </button>
          </div>
        </div>
      </SideModal>

      <SideModal
        isOpen={confirmApprove.open}
        onClose={() => setConfirmApprove({ open: false, id: null, isLoading: false })}
        title="Approve leave request"
        widthClassName="w-full max-w-md"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Approve this leave request? This will deduct the employee&apos;s balance for paid leave types.
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmApprove({ open: false, id: null, isLoading: false })}
              className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-semibold"
              disabled={confirmApprove.isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmApproveAction}
              className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
              disabled={confirmApprove.isLoading}
            >
              {confirmApprove.isLoading ? 'Approving…' : 'Approve'}
            </button>
          </div>
        </div>
      </SideModal>

      <SideModal
        isOpen={rejectModal.open}
        onClose={() => setRejectModal({ open: false, id: null, reason: '', isLoading: false })}
        title="Reject leave request"
        widthClassName="w-full max-w-md"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">Add an optional rejection reason.</div>
          <textarea
            value={rejectModal.reason}
            onChange={(e) => setRejectModal((p) => ({ ...p, reason: e.target.value }))}
            rows={4}
            className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
            placeholder="Reason…"
          />
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setRejectModal({ open: false, id: null, reason: '', isLoading: false })}
              className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-semibold"
              disabled={rejectModal.isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmRejectAction}
              className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-60"
              disabled={rejectModal.isLoading}
            >
              {rejectModal.isLoading ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        </div>
      </SideModal>
    </div>
  );
}
