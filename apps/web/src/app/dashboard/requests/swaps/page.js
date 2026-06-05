"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ShiftSwapsPage;
const react_1 = require("react");
const api_1 = __importDefault(require("../../../../lib/api"));
const business_context_1 = require("../../../../context/business-context");
const types_1 = require("@unitedlinkgroup/types");
const sonner_1 = require("sonner");
const date_fns_1 = require("date-fns");
const framer_motion_1 = require("framer-motion");
const SideModal_1 = require("@/components/SideModal");
const lucide_react_1 = require("lucide-react");
function safeDateTimeLabel(isoLike) {
    if (!isoLike)
        return '';
    const d = (() => {
        try {
            return (0, date_fns_1.parseISO)(isoLike);
        }
        catch {
            return new Date(isoLike);
        }
    })();
    if (!(0, date_fns_1.isValid)(d))
        return '';
    return (0, date_fns_1.format)(d, 'EEE, MMM d • h:mm a');
}
function statusPill(status) {
    if (status === 'APPROVED')
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (status === 'REJECTED')
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    if (status === 'CANCELLED')
        return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
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
function shiftLabel(s) {
    var _a;
    if (!s)
        return '';
    const emp = s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : s.employeeId ? s.employeeId : 'Unassigned';
    const loc = ((_a = s.location) === null || _a === void 0 ? void 0 : _a.name) || 'No location';
    return `${safeDateTimeLabel(s.startTime)} → ${safeDateTimeLabel(s.endTime)} • ${loc} • ${emp}`;
}
function ShiftSwapsPage() {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const businessId = (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id) || null;
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [refreshing, setRefreshing] = (0, react_1.useState)(false);
    const [role, setRole] = (0, react_1.useState)(null);
    const [employeeId, setEmployeeId] = (0, react_1.useState)(null);
    const [swaps, setSwaps] = (0, react_1.useState)([]);
    const [myShifts, setMyShifts] = (0, react_1.useState)([]);
    const [peerShifts, setPeerShifts] = (0, react_1.useState)([]);
    const [allShifts, setAllShifts] = (0, react_1.useState)([]);
    const [query, setQuery] = (0, react_1.useState)('');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('ALL');
    const isAdmin = role === types_1.UserRole.BUSINESS_ADMIN || role === types_1.UserRole.SUPER_ADMIN;
    const isManager = role === types_1.UserRole.MANAGER;
    const canApprove = isAdmin || isManager;
    const viewAll = isAdmin || isManager;
    const [createOpen, setCreateOpen] = (0, react_1.useState)(false);
    const [draftOfferedShiftId, setDraftOfferedShiftId] = (0, react_1.useState)('');
    const [draftRequestedShiftId, setDraftRequestedShiftId] = (0, react_1.useState)('');
    const [draftMessage, setDraftMessage] = (0, react_1.useState)('');
    const [approveModal, setApproveModal] = (0, react_1.useState)({
        open: false,
        id: null,
        isLoading: false,
    });
    const [rejectModal, setRejectModal] = (0, react_1.useState)({
        open: false,
        id: null,
        reason: '',
        isLoading: false,
    });
    const dateStart = (0, react_1.useMemo)(() => new Date(), []);
    const dateEnd = (0, react_1.useMemo)(() => (0, date_fns_1.addDays)(new Date(), 30), []);
    const load = async (opts) => {
        var _a, _b, _c, _d;
        const silent = !!(opts === null || opts === void 0 ? void 0 : opts.silent);
        if (!silent)
            setLoading(true);
        try {
            const profileRes = await api_1.default.get('/auth/profile');
            const r = ((_a = profileRes.data) === null || _a === void 0 ? void 0 : _a.role) || null;
            const eid = ((_b = profileRes.data) === null || _b === void 0 ? void 0 : _b.employeeId) || null;
            setRole(r);
            setEmployeeId(eid);
            const viewAllLocal = r === types_1.UserRole.BUSINESS_ADMIN || r === types_1.UserRole.SUPER_ADMIN || r === types_1.UserRole.MANAGER;
            const status = statusFilter === 'ALL' ? undefined : statusFilter;
            const swapsRes = await api_1.default.get(viewAllLocal ? '/swaps' : '/swaps/my', { params: status ? { status } : undefined });
            setSwaps(Array.isArray(swapsRes.data) ? swapsRes.data : []);
            if (r === types_1.UserRole.EMPLOYEE) {
                const [mineRes, peersRes] = await Promise.all([
                    api_1.default.get('/scheduling/my', { params: { start: dateStart.toISOString(), end: dateEnd.toISOString() } }),
                    api_1.default.get('/scheduling/my-peers', { params: { start: dateStart.toISOString(), end: dateEnd.toISOString() } }),
                ]);
                const mine = Array.isArray(mineRes.data) ? mineRes.data : [];
                const peers = Array.isArray(peersRes.data) ? peersRes.data : [];
                setMyShifts(mine.filter((s) => s.status === 'PUBLISHED'));
                setPeerShifts(peers.filter((s) => s.status === 'PUBLISHED' && s.employeeId));
                setAllShifts([]);
            }
            else if (businessId) {
                const res = await api_1.default.get('/scheduling/shifts', {
                    params: {
                        businessId,
                        start: dateStart.toISOString(),
                        end: dateEnd.toISOString(),
                        employeeId: '',
                    },
                });
                const list = Array.isArray(res.data) ? res.data : [];
                const publishedAssigned = list.filter((s) => s.status === 'PUBLISHED' && s.employeeId);
                setAllShifts(publishedAssigned);
                setMyShifts([]);
                setPeerShifts([]);
            }
        }
        catch (e) {
            sonner_1.toast.error(((_d = (_c = e === null || e === void 0 ? void 0 : e.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || 'Failed to load shift swaps');
        }
        finally {
            if (!silent)
                setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        load();
    }, []);
    (0, react_1.useEffect)(() => {
        if (!viewAll)
            return;
        load({ silent: true });
    }, [statusFilter]);
    const filtered = (0, react_1.useMemo)(() => {
        const q = query.trim().toLowerCase();
        const list = swaps;
        if (!q)
            return list;
        return list.filter((s) => {
            const offered = shiftLabel(s.offeredShift).toLowerCase();
            const requested = shiftLabel(s.requestedShift).toLowerCase();
            const msg = (s.message || '').toLowerCase();
            const status = (s.status || '').toLowerCase();
            return offered.includes(q) || requested.includes(q) || msg.includes(q) || status.includes(q);
        });
    }, [swaps, query]);
    const stats = (0, react_1.useMemo)(() => {
        const pending = filtered.filter((s) => s.status === 'PENDING').length;
        const approved = filtered.filter((s) => s.status === 'APPROVED').length;
        const rejected = filtered.filter((s) => s.status === 'REJECTED').length;
        return { pending, approved, rejected };
    }, [filtered]);
    const offeredOptions = (0, react_1.useMemo)(() => {
        if (role === types_1.UserRole.EMPLOYEE)
            return myShifts;
        return allShifts;
    }, [role, myShifts, allShifts]);
    const requestedOptions = (0, react_1.useMemo)(() => {
        if (role === types_1.UserRole.EMPLOYEE)
            return peerShifts;
        return allShifts;
    }, [role, peerShifts, allShifts]);
    const openCreate = () => {
        setDraftOfferedShiftId('');
        setDraftRequestedShiftId('');
        setDraftMessage('');
        setCreateOpen(true);
    };
    const submitCreate = async () => {
        var _a, _b;
        if (!draftOfferedShiftId) {
            sonner_1.toast.error('Select your shift to offer');
            return;
        }
        if (!draftRequestedShiftId) {
            sonner_1.toast.error('Select the shift you want');
            return;
        }
        try {
            await api_1.default.post('/swaps', {
                offeredShiftId: draftOfferedShiftId,
                requestedShiftId: draftRequestedShiftId,
                message: draftMessage || undefined,
            });
            sonner_1.toast.success('Swap request submitted');
            setCreateOpen(false);
            await load({ silent: true });
        }
        catch (e) {
            sonner_1.toast.error(((_b = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to create swap request');
        }
    };
    const cancelSwap = async (id) => {
        var _a, _b;
        try {
            await api_1.default.put(`/swaps/${id}/cancel`);
            sonner_1.toast.success('Cancelled');
            await load({ silent: true });
        }
        catch (e) {
            sonner_1.toast.error(((_b = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to cancel');
        }
    };
    const approveSwap = (id) => setApproveModal({ open: true, id, isLoading: false });
    const rejectSwap = (id) => setRejectModal({ open: true, id, reason: '', isLoading: false });
    const doApprove = async () => {
        var _a, _b;
        if (!approveModal.id)
            return;
        setApproveModal((p) => ({ ...p, isLoading: true }));
        try {
            await api_1.default.put(`/swaps/${approveModal.id}/approve`);
            sonner_1.toast.success('Approved and shifts swapped');
            setApproveModal({ open: false, id: null, isLoading: false });
            await load({ silent: true });
        }
        catch (e) {
            sonner_1.toast.error(((_b = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to approve');
            setApproveModal((p) => ({ ...p, isLoading: false }));
        }
    };
    const doReject = async () => {
        var _a, _b;
        if (!rejectModal.id)
            return;
        setRejectModal((p) => ({ ...p, isLoading: true }));
        try {
            await api_1.default.put(`/swaps/${rejectModal.id}/reject`, { rejectionReason: rejectModal.reason || undefined });
            sonner_1.toast.success('Rejected');
            setRejectModal({ open: false, id: null, reason: '', isLoading: false });
            await load({ silent: true });
        }
        catch (e) {
            sonner_1.toast.error(((_b = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to reject');
            setRejectModal((p) => ({ ...p, isLoading: false }));
        }
    };
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
    if (loading) {
        return (<div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"/>
      </div>);
    }
    if (role === types_1.UserRole.SUPER_ADMIN && !businessId) {
        return (<div className="p-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="text-lg font-bold text-gray-900 dark:text-white">Select a business context</div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Shift swaps are scoped to a business. Select a business from the dashboard first.
          </div>
        </div>
      </div>);
    }
    return (<div className="p-8 space-y-8 bg-gray-50/50 dark:bg-slate-900/50 min-h-screen">
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
          <button type="button" onClick={refresh} disabled={refreshing} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700/40 disabled:opacity-60">
            <lucide_react_1.RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}/>
            Refresh
          </button>
          <button type="button" onClick={openCreate} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2">
            <lucide_react_1.Plus className="w-4 h-4"/>
            New swap
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Pending" value={`${stats.pending}`} icon={lucide_react_1.Clock} accent="bg-amber-500"/>
        <StatCard title="Approved" value={`${stats.approved}`} icon={lucide_react_1.CheckCircle} accent="bg-emerald-500"/>
        <StatCard title="Rejected" value={`${stats.rejected}`} icon={lucide_react_1.XCircle} accent="bg-rose-500"/>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200/60 dark:border-slate-700/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <lucide_react_1.ArrowLeftRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400"/>
            <div className="font-bold text-gray-900 dark:text-white">Swap requests</div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {viewAll && (<div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 px-3 py-2">
                <lucide_react_1.Filter className="w-4 h-4 text-gray-500 dark:text-gray-400"/>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none">
                  <option value="ALL">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>)}
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 px-3 py-2">
              <lucide_react_1.Search className="w-4 h-4 text-gray-500 dark:text-gray-400"/>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search swaps…" className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none w-64 max-w-full"/>
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
              {filtered.length === 0 ? (<tr>
                  <td className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400" colSpan={5}>
                    No shift swap requests found.
                  </td>
                </tr>) : (filtered.map((s) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            const isPending = s.status === 'PENDING';
            const canCancel = isPending && !canApprove && employeeId && s.requesterEmployeeId === employeeId;
            return (<tr key={s.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-900/40">
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{safeDateTimeLabel((_a = s.offeredShift) === null || _a === void 0 ? void 0 : _a.startTime)}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <lucide_react_1.Calendar className="w-3.5 h-3.5"/>
                            {safeDateTimeLabel((_b = s.offeredShift) === null || _b === void 0 ? void 0 : _b.endTime)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <lucide_react_1.MapPin className="w-3.5 h-3.5"/>
                            {((_d = (_c = s.offeredShift) === null || _c === void 0 ? void 0 : _c.location) === null || _d === void 0 ? void 0 : _d.name) || 'No location'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <lucide_react_1.User className="w-3.5 h-3.5"/>
                            {((_e = s.offeredShift) === null || _e === void 0 ? void 0 : _e.employee) ? `${s.offeredShift.employee.firstName} ${s.offeredShift.employee.lastName}` : 'Unassigned'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{safeDateTimeLabel((_f = s.requestedShift) === null || _f === void 0 ? void 0 : _f.startTime)}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <lucide_react_1.Calendar className="w-3.5 h-3.5"/>
                            {safeDateTimeLabel((_g = s.requestedShift) === null || _g === void 0 ? void 0 : _g.endTime)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <lucide_react_1.MapPin className="w-3.5 h-3.5"/>
                            {((_j = (_h = s.requestedShift) === null || _h === void 0 ? void 0 : _h.location) === null || _j === void 0 ? void 0 : _j.name) || 'No location'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <lucide_react_1.User className="w-3.5 h-3.5"/>
                            {((_k = s.requestedShift) === null || _k === void 0 ? void 0 : _k.employee) ? `${s.requestedShift.employee.firstName} ${s.requestedShift.employee.lastName}` : 'Unassigned'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusPill(s.status)}`}>{s.status}</span>
                        {s.status === 'REJECTED' && s.rejectionReason && (<div className="mt-1 text-xs text-rose-600 dark:text-rose-300">{s.rejectionReason}</div>)}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-[320px] truncate">{s.message || '—'}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {canApprove && isPending && (<>
                              <button type="button" onClick={() => approveSwap(s.id)} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
                                Approve
                              </button>
                              <button type="button" onClick={() => rejectSwap(s.id)} className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold">
                                Reject
                              </button>
                            </>)}
                          {canCancel && (<button type="button" onClick={() => cancelSwap(s.id)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/40">
                              Cancel
                            </button>)}
                        </div>
                      </td>
                    </tr>);
        }))}
            </tbody>
          </table>
        </div>
      </div>

      <SideModal_1.SideModal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New shift swap request" widthClassName="w-full max-w-2xl">
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-4 text-sm text-gray-600 dark:text-gray-300">
            Select the shift you&apos;re offering and the shift you want to swap with. Only published, assigned shifts are shown for the next 30 days.
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Offered shift</label>
            <select value={draftOfferedShiftId} onChange={(e) => setDraftOfferedShiftId(e.target.value)} className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm">
              <option value="">Select shift…</option>
              {offeredOptions.map((s) => (<option key={s.id} value={s.id}>
                  {shiftLabel(s)}
                </option>))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Requested shift</label>
            <select value={draftRequestedShiftId} onChange={(e) => setDraftRequestedShiftId(e.target.value)} className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm">
              <option value="">Select shift…</option>
              {requestedOptions
            .filter((s) => s.id !== draftOfferedShiftId)
            .map((s) => (<option key={s.id} value={s.id}>
                    {shiftLabel(s)}
                  </option>))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Message (optional)</label>
            <textarea value={draftMessage} onChange={(e) => setDraftMessage(e.target.value)} rows={4} className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm" placeholder="Add context (e.g., I can cover your shift if you take mine)…"/>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-semibold">
              Cancel
            </button>
            <button type="button" onClick={submitCreate} className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
              Submit request
            </button>
          </div>
        </div>
      </SideModal_1.SideModal>

      <SideModal_1.SideModal isOpen={approveModal.open} onClose={() => setApproveModal({ open: false, id: null, isLoading: false })} title="Approve swap request" widthClassName="w-full max-w-md">
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Approving will immediately swap the assigned employees for the two shifts.
          </div>
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => setApproveModal({ open: false, id: null, isLoading: false })} className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-semibold" disabled={approveModal.isLoading}>
              Cancel
            </button>
            <button type="button" onClick={doApprove} className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60" disabled={approveModal.isLoading}>
              {approveModal.isLoading ? 'Approving…' : 'Approve'}
            </button>
          </div>
        </div>
      </SideModal_1.SideModal>

      <SideModal_1.SideModal isOpen={rejectModal.open} onClose={() => setRejectModal({ open: false, id: null, reason: '', isLoading: false })} title="Reject swap request" widthClassName="w-full max-w-md">
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">Add an optional rejection reason.</div>
          <textarea value={rejectModal.reason} onChange={(e) => setRejectModal((p) => ({ ...p, reason: e.target.value }))} rows={4} className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-4 py-3 text-sm" placeholder="Reason…"/>
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => setRejectModal({ open: false, id: null, reason: '', isLoading: false })} className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-semibold" disabled={rejectModal.isLoading}>
              Cancel
            </button>
            <button type="button" onClick={doReject} className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-60" disabled={rejectModal.isLoading}>
              {rejectModal.isLoading ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        </div>
      </SideModal_1.SideModal>
    </div>);
}
