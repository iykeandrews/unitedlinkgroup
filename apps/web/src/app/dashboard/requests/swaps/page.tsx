'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '../../../../lib/api';
import { useBusiness } from '../../../../context/business-context';
import { UserRole } from '@unitedlinkgroup/types';
import { toast } from 'sonner';
import { format, isValid, parseISO, addDays } from 'date-fns';
import { motion } from 'framer-motion';
import { SideModal } from '@/components/SideModal';
import { RefreshCw, Plus, Search, Filter, ArrowLeftRight, Clock, CheckCircle, XCircle, Calendar, MapPin, User } from 'lucide-react';

type SwapStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

type Shift = {
  id: string;
  businessId: string;
  employeeId?: string | null;
  startTime: string;
  endTime: string;
  status?: string;
  employee?: { id: string; firstName: string; lastName: string; email: string } | null;
  location?: { id: string; name: string } | null;
};

type Swap = {
  id: string;
  businessId: string;
  requesterEmployeeId: string;
  offeredShiftId: string;
  requestedShiftId: string;
  offeredEmployeeId: string;
  requestedEmployeeId: string;
  message?: string | null;
  status: SwapStatus;
  rejectionReason?: string | null;
  createdAt: string;
  offeredShift?: Shift | null;
  requestedShift?: Shift | null;
  requesterEmployee?: { id: string; firstName: string; lastName: string; email: string } | null;
};

function safeDateTimeLabel(isoLike: string | null | undefined) {
  if (!isoLike) return '';
  const d = (() => {
    try {
      return parseISO(isoLike);
    } catch {
      return new Date(isoLike);
    }
  })();
  if (!isValid(d)) return '';
  return format(d, 'EEE, MMM d • h:mm a');
}

function statusPill(status: SwapStatus) {
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

function shiftLabel(s: Shift | null | undefined) {
  if (!s) return '';
  const emp = s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : s.employeeId ? s.employeeId : 'Unassigned';
  const loc = s.location?.name || 'No location';
  return `${safeDateTimeLabel(s.startTime)} → ${safeDateTimeLabel(s.endTime)} • ${loc} • ${emp}`;
}

export default function ShiftSwapsPage() {
  const { selectedBusiness } = useBusiness();
  const businessId = selectedBusiness?.id || null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [peerShifts, setPeerShifts] = useState<Shift[]>([]);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SwapStatus>('ALL');

  const isAdmin = role === UserRole.BUSINESS_ADMIN || role === UserRole.SUPER_ADMIN;
  const isManager = role === UserRole.MANAGER;
  const canApprove = isAdmin || isManager;
  const viewAll = isAdmin || isManager;

  const [createOpen, setCreateOpen] = useState(false);
  const [draftOfferedShiftId, setDraftOfferedShiftId] = useState('');
  const [draftRequestedShiftId, setDraftRequestedShiftId] = useState('');
  const [draftMessage, setDraftMessage] = useState('');

  const [approveModal, setApproveModal] = useState<{ open: boolean; id: string | null; isLoading: boolean }>({
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

  const dateStart = useMemo(() => new Date(), []);
  const dateEnd = useMemo(() => addDays(new Date(), 30), []);

  const load = async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    if (!silent) setLoading(true);
    try {
      const profileRes = await api.get('/auth/profile');
      const r = profileRes.data?.role || null;
      const eid = profileRes.data?.employeeId || null;
      setRole(r);
      setEmployeeId(eid);
      const viewAllLocal = r === UserRole.BUSINESS_ADMIN || r === UserRole.SUPER_ADMIN || r === UserRole.MANAGER;

      const status = statusFilter === 'ALL' ? undefined : statusFilter;
      const swapsRes = await api.get(viewAllLocal ? '/swaps' : '/swaps/my', { params: status ? { status } : undefined });
      setSwaps(Array.isArray(swapsRes.data) ? (swapsRes.data as Swap[]) : []);

      if (r === UserRole.EMPLOYEE) {
        const [mineRes, peersRes] = await Promise.all([
          api.get('/scheduling/my', { params: { start: dateStart.toISOString(), end: dateEnd.toISOString() } }),
          api.get('/scheduling/my-peers', { params: { start: dateStart.toISOString(), end: dateEnd.toISOString() } }),
        ]);
        const mine = Array.isArray(mineRes.data) ? (mineRes.data as Shift[]) : [];
        const peers = Array.isArray(peersRes.data) ? (peersRes.data as Shift[]) : [];
        setMyShifts(mine.filter((s) => s.status === 'PUBLISHED'));
        setPeerShifts(peers.filter((s) => s.status === 'PUBLISHED' && s.employeeId));
        setAllShifts([]);
      } else if (businessId) {
        const res = await api.get('/scheduling/shifts', {
          params: {
            businessId,
            start: dateStart.toISOString(),
            end: dateEnd.toISOString(),
            employeeId: '',
          },
        });
        const list = Array.isArray(res.data) ? (res.data as Shift[]) : [];
        const publishedAssigned = list.filter((s) => s.status === 'PUBLISHED' && s.employeeId);
        setAllShifts(publishedAssigned);
        setMyShifts([]);
        setPeerShifts([]);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load shift swaps');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!viewAll) return;
    load({ silent: true });
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = swaps;
    if (!q) return list;
    return list.filter((s) => {
      const offered = shiftLabel(s.offeredShift).toLowerCase();
      const requested = shiftLabel(s.requestedShift).toLowerCase();
      const msg = (s.message || '').toLowerCase();
      const status = (s.status || '').toLowerCase();
      return offered.includes(q) || requested.includes(q) || msg.includes(q) || status.includes(q);
    });
  }, [swaps, query]);

  const stats = useMemo(() => {
    const pending = filtered.filter((s) => s.status === 'PENDING').length;
    const approved = filtered.filter((s) => s.status === 'APPROVED').length;
    const rejected = filtered.filter((s) => s.status === 'REJECTED').length;
    return { pending, approved, rejected };
  }, [filtered]);

  const offeredOptions = useMemo(() => {
    if (role === UserRole.EMPLOYEE) return myShifts;
    return allShifts;
  }, [role, myShifts, allShifts]);

  const requestedOptions = useMemo(() => {
    if (role === UserRole.EMPLOYEE) return peerShifts;
    return allShifts;
  }, [role, peerShifts, allShifts]);

  const openCreate = () => {
    setDraftOfferedShiftId('');
    setDraftRequestedShiftId('');
    setDraftMessage('');
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!draftOfferedShiftId) {
      toast.error('Select your shift to offer');
      return;
    }
    if (!draftRequestedShiftId) {
      toast.error('Select the shift you want');
      return;
    }
    try {
      await api.post('/swaps', {
        offeredShiftId: draftOfferedShiftId,
        requestedShiftId: draftRequestedShiftId,
        message: draftMessage || undefined,
      });
      toast.success('Swap request submitted');
      setCreateOpen(false);
      await load({ silent: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create swap request');
    }
  };

  const cancelSwap = async (id: string) => {
    try {
      await api.put(`/swaps/${id}/cancel`);
      toast.success('Cancelled');
      await load({ silent: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to cancel');
    }
  };

  const approveSwap = (id: string) => setApproveModal({ open: true, id, isLoading: false });
  const rejectSwap = (id: string) => setRejectModal({ open: true, id, reason: '', isLoading: false });

  const doApprove = async () => {
    if (!approveModal.id) return;
    setApproveModal((p) => ({ ...p, isLoading: true }));
    try {
      await api.put(`/swaps/${approveModal.id}/approve`);
      toast.success('Approved and shifts swapped');
      setApproveModal({ open: false, id: null, isLoading: false });
      await load({ silent: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to approve');
      setApproveModal((p) => ({ ...p, isLoading: false }));
    }
  };

  const doReject = async () => {
    if (!rejectModal.id) return;
    setRejectModal((p) => ({ ...p, isLoading: true }));
    try {
      await api.put(`/swaps/${rejectModal.id}/reject`, { rejectionReason: rejectModal.reason || undefined });
      toast.success('Rejected');
      setRejectModal({ open: false, id: null, reason: '', isLoading: false });
      await load({ silent: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to reject');
      setRejectModal((p) => ({ ...p, isLoading: false }));
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
      <div className="p-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="text-lg font-bold text-gray-900 dark:text-white">Select a business context</div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Shift swaps are scoped to a business. Select a business from the dashboard first.
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
            Shift Swaps
          </h1>
          <div className="mt-1 text-gray-500 dark:text-gray-400">
            {canApprove ? 'Review and approve shift swap requests' : 'Request to swap shifts with colleagues'}
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
            New swap
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Pending" value={`${stats.pending}`} icon={Clock} accent="bg-amber-500" />
        <StatCard title="Approved" value={`${stats.approved}`} icon={CheckCircle} accent="bg-emerald-500" />
        <StatCard title="Rejected" value={`${stats.rejected}`} icon={XCircle} accent="bg-rose-500" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200/60 dark:border-slate-700/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div className="font-bold text-gray-900 dark:text-white">Swap requests</div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {viewAll && (
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
                placeholder="Search swaps…"
                className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none w-64 max-w-full"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <th className="px-5 py-3">Offered shift</th>
                <th className="px-5 py-3">Requested shift</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Message</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60 dark:divide-slate-700/60">
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400" colSpan={5}>
                    No shift swap requests found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const isPending = s.status === 'PENDING';
                  const canCancel = isPending && !canApprove && employeeId && s.requesterEmployeeId === employeeId;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-900/40">
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{safeDateTimeLabel(s.offeredShift?.startTime)}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {safeDateTimeLabel(s.offeredShift?.endTime)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {s.offeredShift?.location?.name || 'No location'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {s.offeredShift?.employee ? `${s.offeredShift.employee.firstName} ${s.offeredShift.employee.lastName}` : 'Unassigned'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{safeDateTimeLabel(s.requestedShift?.startTime)}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {safeDateTimeLabel(s.requestedShift?.endTime)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {s.requestedShift?.location?.name || 'No location'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {s.requestedShift?.employee ? `${s.requestedShift.employee.firstName} ${s.requestedShift.employee.lastName}` : 'Unassigned'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusPill(s.status)}`}>{s.status}</span>
                        {s.status === 'REJECTED' && s.rejectionReason && (
                          <div className="mt-1 text-xs text-rose-600 dark:text-rose-300">{s.rejectionReason}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-[320px] truncate">{s.message || '—'}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {canApprove && isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => approveSwap(s.id)}
                                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => rejectSwap(s.id)}
                                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => cancelSwap(s.id)}
                              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                            >
                              Cancel
                            </button>
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

      <SideModal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New shift swap request" widthClassName="w-full max-w-2xl">
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-4 text-sm text-gray-600 dark:text-gray-300">
            Select the shift you&apos;re offering and the shift you want to swap with. Only published, assigned shifts are shown for the next 30 days.
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Offered shift</label>
            <select
              value={draftOfferedShiftId}
              onChange={(e) => setDraftOfferedShiftId(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
            >
              <option value="">Select shift…</option>
              {offeredOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {shiftLabel(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Requested shift</label>
            <select
              value={draftRequestedShiftId}
              onChange={(e) => setDraftRequestedShiftId(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
            >
              <option value="">Select shift…</option>
              {requestedOptions
                .filter((s) => s.id !== draftOfferedShiftId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {shiftLabel(s)}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Message (optional)</label>
            <textarea
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm"
              placeholder="Add context (e.g., I can cover your shift if you take mine)…"
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

      <SideModal
        isOpen={approveModal.open}
        onClose={() => setApproveModal({ open: false, id: null, isLoading: false })}
        title="Approve swap request"
        widthClassName="w-full max-w-md"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Approving will immediately swap the assigned employees for the two shifts.
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setApproveModal({ open: false, id: null, isLoading: false })}
              className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-semibold"
              disabled={approveModal.isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={doApprove}
              className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
              disabled={approveModal.isLoading}
            >
              {approveModal.isLoading ? 'Approving…' : 'Approve'}
            </button>
          </div>
        </div>
      </SideModal>

      <SideModal
        isOpen={rejectModal.open}
        onClose={() => setRejectModal({ open: false, id: null, reason: '', isLoading: false })}
        title="Reject swap request"
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
              onClick={doReject}
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
