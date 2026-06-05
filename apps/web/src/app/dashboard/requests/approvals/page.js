"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ApprovalsPage;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const api_1 = __importDefault(require("../../../../lib/api"));
const business_context_1 = require("../../../../context/business-context");
const types_1 = require("@unitedlinkgroup/types");
const sonner_1 = require("sonner");
const date_fns_1 = require("date-fns");
const SideModal_1 = require("@/components/SideModal");
const lucide_react_1 = require("lucide-react");
function safeDateLabel(isoLike, fmt = 'MMM d, yyyy') {
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
    return (0, date_fns_1.format)(d, fmt);
}
function money(n) {
    const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
    return `$${v.toFixed(2)}`;
}
function typeBadge(type) {
    if (type === 'LEAVE')
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
    if (type === 'SWAP')
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    if (type === 'CALLOUT')
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
}
function statusBadge(status) {
    const s = String(status || '').toUpperCase();
    if (s === 'APPROVED')
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (s === 'REJECTED')
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
    if (s === 'CANCELLED')
        return 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
}
function typeIcon(type) {
    if (type === 'LEAVE')
        return lucide_react_1.CalendarCheck;
    if (type === 'SWAP')
        return lucide_react_1.ArrowLeftRight;
    if (type === 'CALLOUT')
        return lucide_react_1.XCircle;
    return lucide_react_1.CreditCard;
}
const StatCard = ({ title, value, icon: Icon, accent }) => (<framer_motion_1.motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
    <div className={`absolute -right-10 -top-10 w-28 h-28 rounded-full opacity-10 blur-2xl ${accent}`}/>
    <div className="flex items-start justify-between relative z-10">
      <div>
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</div>
        <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</div>
      </div>
      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200">
        <Icon className="w-6 h-6"/>
      </div>
    </div>
  </framer_motion_1.motion.div>);
function ApprovalsPage() {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const businessId = (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id) || null;
    const [role, setRole] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [refreshing, setRefreshing] = (0, react_1.useState)(false);
    const [items, setItems] = (0, react_1.useState)([]);
    const [query, setQuery] = (0, react_1.useState)('');
    const [typeFilter, setTypeFilter] = (0, react_1.useState)('ALL');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('PENDING');
    const [detailsOpen, setDetailsOpen] = (0, react_1.useState)(false);
    const [active, setActive] = (0, react_1.useState)(null);
    const [rejectOpen, setRejectOpen] = (0, react_1.useState)(false);
    const [rejectReason, setRejectReason] = (0, react_1.useState)('');
    const [actionLoading, setActionLoading] = (0, react_1.useState)(false);
    const isSuperAdmin = role === types_1.UserRole.SUPER_ADMIN;
    const isAdmin = role === types_1.UserRole.BUSINESS_ADMIN || role === types_1.UserRole.SUPER_ADMIN;
    const isManager = role === types_1.UserRole.MANAGER;
    const canView = isAdmin || isManager;
    const canApprove = (it) => {
        if (it.type === 'SWAP')
            return isAdmin || isManager;
        if (it.type === 'LEAVE')
            return isAdmin;
        if (it.type === 'CALLOUT')
            return isAdmin;
        return isAdmin;
    };
    const normalize = (payload) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const out = [];
        for (const r of payload.leave) {
            const employee = r.employee ? `${r.employee.firstName} ${r.employee.lastName}`.trim() : r.employeeId;
            const range = `${safeDateLabel(r.startDate)} → ${safeDateLabel(r.endDate)}`.trim();
            const type = ((_a = r.leaveType) === null || _a === void 0 ? void 0 : _a.name) || 'Leave';
            const hours = typeof r.totalHours === 'number' ? `${Math.round(r.totalHours * 100) / 100}h` : '';
            out.push({
                type: 'LEAVE',
                id: r.id,
                status: r.status,
                createdAt: r.createdAt || '',
                title: `${type}${hours ? ` • ${hours}` : ''}`,
                subtitle: range,
                personLabel: employee,
                email: (_b = r.employee) === null || _b === void 0 ? void 0 : _b.email,
                raw: r,
            });
        }
        for (const s of payload.swaps) {
            const requester = s.requesterEmployee ? `${s.requesterEmployee.firstName} ${s.requesterEmployee.lastName}`.trim() : 'Shift Swap';
            const offeredLoc = ((_d = (_c = s.offeredShift) === null || _c === void 0 ? void 0 : _c.location) === null || _d === void 0 ? void 0 : _d.name) || 'No location';
            const offered = ((_e = s.offeredShift) === null || _e === void 0 ? void 0 : _e.startTime) ? `${safeDateLabel(s.offeredShift.startTime, 'MMM d • h:mm a')} → ${safeDateLabel(s.offeredShift.endTime, 'h:mm a')}` : '';
            out.push({
                type: 'SWAP',
                id: s.id,
                status: s.status,
                createdAt: s.createdAt,
                title: 'Shift Swap Request',
                subtitle: offered ? `${offered} • ${offeredLoc}` : offeredLoc,
                personLabel: requester,
                email: (_f = s.requesterEmployee) === null || _f === void 0 ? void 0 : _f.email,
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
                email: (_g = l.employee) === null || _g === void 0 ? void 0 : _g.email,
                raw: l,
            });
        }
        for (const c of payload.callouts) {
            const employee = c.absentEmployee ? `${c.absentEmployee.firstName} ${c.absentEmployee.lastName}`.trim() : 'Employee';
            const loc = ((_j = (_h = c.shift) === null || _h === void 0 ? void 0 : _h.location) === null || _j === void 0 ? void 0 : _j.name) || 'Unassigned location';
            const when = ((_k = c.shift) === null || _k === void 0 ? void 0 : _k.startTime) ? `${safeDateLabel(c.shift.startTime, 'MMM d • h:mm a')}${((_l = c.shift) === null || _l === void 0 ? void 0 : _l.endTime) ? ` → ${safeDateLabel(c.shift.endTime, 'h:mm a')}` : ''}` : '';
            out.push({
                type: 'CALLOUT',
                id: c.id,
                status: c.status,
                createdAt: c.createdAt,
                title: `Call-out • ${String(c.type || '').toUpperCase()}`,
                subtitle: [when, loc].filter(Boolean).join(' • '),
                personLabel: employee,
                email: ((_m = c.absentEmployee) === null || _m === void 0 ? void 0 : _m.email) || undefined,
                raw: c,
            });
        }
        return out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    };
    const load = async (opts) => {
        var _a, _b, _c;
        const silent = !!(opts === null || opts === void 0 ? void 0 : opts.silent);
        if (!silent)
            setLoading(true);
        try {
            const profileRes = await api_1.default.get('/auth/profile');
            const r = ((_a = profileRes.data) === null || _a === void 0 ? void 0 : _a.role) || null;
            setRole(r);
            if (!businessId && r === types_1.UserRole.SUPER_ADMIN) {
                setItems([]);
                return;
            }
            const status = statusFilter === 'PENDING' ? 'PENDING' : undefined;
            const safeGet = async (fn, fallback) => {
                try {
                    const res = await fn();
                    return res.data;
                }
                catch {
                    return fallback;
                }
            };
            const [leave, swaps, loans, callouts] = await Promise.all([
                safeGet(() => api_1.default.get('/leave/requests', { params: status ? { status } : undefined }), []),
                safeGet(() => api_1.default.get('/swaps', { params: status ? { status } : undefined }), []),
                safeGet(() => api_1.default.get('/loans'), []),
                safeGet(() => api_1.default.get('/scheduling/callouts/pending'), []),
            ]);
            const loansFiltered = status ? loans.filter((x) => String(x.status).toUpperCase() === status) : loans;
            const calloutsFiltered = status ? callouts.filter((x) => String(x.status).toUpperCase() === status) : callouts;
            setItems(normalize({ leave: leave, swaps: swaps, loans: loansFiltered, callouts: calloutsFiltered }));
        }
        catch (e) {
            sonner_1.toast.error(((_c = (_b = e === null || e === void 0 ? void 0 : e.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || 'Failed to load approvals');
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
        load({ silent: true });
    }, [statusFilter]);
    const filtered = (0, react_1.useMemo)(() => {
        const q = query.trim().toLowerCase();
        return items.filter((it) => {
            if (typeFilter !== 'ALL' && it.type !== typeFilter)
                return false;
            if (statusFilter !== 'ALL' && String(it.status).toUpperCase() !== 'PENDING')
                return false;
            if (!q)
                return true;
            const hay = `${it.type} ${it.title} ${it.subtitle} ${it.personLabel} ${it.email || ''} ${it.status}`.toLowerCase();
            return hay.includes(q);
        });
    }, [items, query, typeFilter, statusFilter]);
    const stats = (0, react_1.useMemo)(() => {
        const pending = items.filter((x) => String(x.status).toUpperCase() === 'PENDING');
        const leave = pending.filter((x) => x.type === 'LEAVE').length;
        const swaps = pending.filter((x) => x.type === 'SWAP').length;
        const loans = pending.filter((x) => x.type === 'LOAN').length;
        const callouts = pending.filter((x) => x.type === 'CALLOUT').length;
        const total = pending.length;
        return { total, leave, swaps, loans, callouts };
    }, [items]);
    const openDetails = (it) => {
        setActive(it);
        setDetailsOpen(true);
    };
    const startReject = (it) => {
        setActive(it);
        setRejectReason('');
        setRejectOpen(true);
    };
    const doApprove = async (it) => {
        var _a, _b;
        if (!canApprove(it))
            return;
        setActionLoading(true);
        try {
            if (it.type === 'LEAVE') {
                await api_1.default.put(`/leave/requests/${it.id}/status`, { status: 'APPROVED' });
            }
            else if (it.type === 'SWAP') {
                await api_1.default.put(`/swaps/${it.id}/approve`);
            }
            else if (it.type === 'CALLOUT') {
                await api_1.default.post(`/scheduling/callouts/${it.id}/approve`);
            }
            else {
                await api_1.default.patch(`/loans/${it.id}/approve`);
            }
            sonner_1.toast.success('Approved');
            setDetailsOpen(false);
            setRejectOpen(false);
            setActive(null);
            await load({ silent: true });
        }
        catch (e) {
            sonner_1.toast.error(((_b = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Approval failed');
        }
        finally {
            setActionLoading(false);
        }
    };
    const doReject = async () => {
        var _a, _b;
        if (!active)
            return;
        if (!canApprove(active))
            return;
        if (!rejectReason.trim()) {
            sonner_1.toast.error('Rejection reason is required');
            return;
        }
        setActionLoading(true);
        try {
            if (active.type === 'LEAVE') {
                await api_1.default.put(`/leave/requests/${active.id}/status`, { status: 'REJECTED', rejectionReason: rejectReason.trim() });
            }
            else if (active.type === 'SWAP') {
                await api_1.default.put(`/swaps/${active.id}/reject`, { rejectionReason: rejectReason.trim() });
            }
            else if (active.type === 'CALLOUT') {
                await api_1.default.post(`/scheduling/callouts/${active.id}/reject`, { reason: rejectReason.trim() });
            }
            else {
                await api_1.default.patch(`/loans/${active.id}/reject`, { reason: rejectReason.trim() });
            }
            sonner_1.toast.success('Rejected');
            setDetailsOpen(false);
            setRejectOpen(false);
            setActive(null);
            await load({ silent: true });
        }
        catch (e) {
            sonner_1.toast.error(((_b = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Rejection failed');
        }
        finally {
            setActionLoading(false);
        }
    };
    const renderDetails = (it) => {
        const Icon = typeIcon(it.type);
        const created = safeDateLabel(it.createdAt, 'MMM d, yyyy • h:mm a');
        return (<div className="space-y-5">
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
            <Icon className="w-6 h-6"/>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              <lucide_react_1.User className="w-4 h-4"/>
              Requester
            </div>
            <div className="mt-2 font-semibold text-slate-900 dark:text-white">{it.personLabel}</div>
            {it.email ? (<div className="mt-1 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <lucide_react_1.Mail className="w-4 h-4"/>
                {it.email}
              </div>) : null}
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              <lucide_react_1.Clock className="w-4 h-4"/>
              Submitted
            </div>
            <div className="mt-2 font-semibold text-slate-900 dark:text-white">{created || '—'}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <lucide_react_1.FileText className="w-4 h-4"/>
            Details
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {it.type === 'LEAVE' ? (<LeaveDetails request={it.raw}/>) : it.type === 'SWAP' ? (<SwapDetails swap={it.raw}/>) : it.type === 'CALLOUT' ? (<CalloutDetails callout={it.raw}/>) : (<LoanDetails loan={it.raw}/>)}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" disabled={!canApprove(it) || actionLoading || String(it.status).toUpperCase() !== 'PENDING'} onClick={() => doApprove(it)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-semibold">
            <lucide_react_1.CheckCircle className="w-5 h-5"/>
            Approve
          </button>
          <button type="button" disabled={!canApprove(it) || actionLoading || String(it.status).toUpperCase() !== 'PENDING'} onClick={() => startReject(it)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:hover:bg-rose-600 text-white font-semibold">
            <lucide_react_1.XCircle className="w-5 h-5"/>
            Reject
          </button>
        </div>

        {!canApprove(it) ? (<div className="text-sm text-slate-500 dark:text-slate-400">
            You can view this request, but you don’t have permission to approve/reject it.
          </div>) : null}
      </div>);
    };
    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await load({ silent: true });
            sonner_1.toast.success('Updated');
        }
        finally {
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
    return (<div className="max-w-[1600px] mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">Requests</div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Approval Queue</h1>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review pending leave, shift swap, and loan requests in one place.
          </div>
        </div>
        <button type="button" onClick={onRefresh} disabled={refreshing} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
          <lucide_react_1.RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}/>
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending Total" value={String(stats.total)} icon={lucide_react_1.Clock} accent="bg-amber-500"/>
        <StatCard title="Leave Requests" value={String(stats.leave)} icon={lucide_react_1.CalendarCheck} accent="bg-indigo-500"/>
        <StatCard title="Shift Swaps" value={String(stats.swaps)} icon={lucide_react_1.ArrowLeftRight} accent="bg-amber-500"/>
        <StatCard title="Loan Requests" value={String(stats.loans)} icon={lucide_react_1.CreditCard} accent="bg-emerald-500"/>
        <StatCard title="Call-Outs" value={String(stats.callouts)} icon={lucide_react_1.XCircle} accent="bg-rose-500"/>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <lucide_react_1.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search approvals…" className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <lucide_react_1.Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="pl-10 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="ALL">All types</option>
                  <option value="LEAVE">Leave</option>
                  <option value="SWAP">Shift swap</option>
                  <option value="LOAN">Loan</option>
                  <option value="CALLOUT">Call-out</option>
                </select>
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
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

        {filtered.length === 0 ? (<div className="p-10 text-center text-slate-500">No approvals found.</div>) : (<div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filtered.map((it) => {
                const Icon = typeIcon(it.type);
                const pending = String(it.status).toUpperCase() === 'PENDING';
                return (<button key={`${it.type}-${it.id}`} type="button" onClick={() => openDetails(it)} className="w-full text-left px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    <div className="lg:col-span-2 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900/40 flex items-center justify-center text-slate-700 dark:text-slate-200">
                        <Icon className="w-5 h-5"/>
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
                      <button type="button" disabled={!pending || !canApprove(it) || actionLoading} onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        doApprove(it);
                    }} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold">
                        <lucide_react_1.CheckCircle className="w-4 h-4"/>
                        Approve
                      </button>
                      <button type="button" disabled={!pending || !canApprove(it) || actionLoading} onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startReject(it);
                    }} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-semibold">
                        <lucide_react_1.XCircle className="w-4 h-4"/>
                        Reject
                      </button>
                    </div>
                  </div>
                </button>);
            })}
          </div>)}
      </div>

      <SideModal_1.SideModal isOpen={detailsOpen && !!active} onClose={() => {
            setDetailsOpen(false);
            setActive(null);
        }} title={active ? `Approval • ${active.type}` : 'Approval'} widthClassName="w-full max-w-2xl">
        {active ? renderDetails(active) : null}
      </SideModal_1.SideModal>

      <SideModal_1.SideModal isOpen={rejectOpen && !!active} onClose={() => {
            setRejectOpen(false);
            setRejectReason('');
        }} title="Reject Request" widthClassName="w-full max-w-xl">
        <div className="space-y-4">
          <div className="text-sm text-slate-600 dark:text-slate-300">Provide a reason for rejection. This will be saved and visible to the requester.</div>
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Reason…"/>
          <div className="flex gap-3">
            <button type="button" onClick={() => doReject()} disabled={actionLoading || !active || !canApprove(active)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold">
              <lucide_react_1.XCircle className="w-5 h-5"/>
              Reject
            </button>
            <button type="button" onClick={() => setRejectOpen(false)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold">
              Cancel
            </button>
          </div>
        </div>
      </SideModal_1.SideModal>
    </div>);
}
function LeaveDetails({ request }) {
    var _a;
    const employee = request.employee ? `${request.employee.firstName} ${request.employee.lastName}`.trim() : request.employeeId;
    const leaveType = ((_a = request.leaveType) === null || _a === void 0 ? void 0 : _a.name) || request.leaveTypeId;
    const range = `${safeDateLabel(request.startDate)} → ${safeDateLabel(request.endDate)}`;
    const hours = typeof request.totalHours === 'number' ? `${Math.round(request.totalHours * 100) / 100}h` : '—';
    const timeLabel = request.isAllDay === false && request.startTime && request.endTime ? `${request.startTime} → ${request.endTime}` : 'All day';
    return (<div className="space-y-2">
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
      {request.reason ? (<div className="pt-2">
          <div className="text-slate-600 dark:text-slate-300">Reason</div>
          <div className="mt-1 text-slate-900 dark:text-white whitespace-pre-wrap">{request.reason}</div>
        </div>) : null}
    </div>);
}
function SwapDetails({ swap }) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const offeredLoc = ((_b = (_a = swap.offeredShift) === null || _a === void 0 ? void 0 : _a.location) === null || _b === void 0 ? void 0 : _b.name) || 'No location';
    const requestedLoc = ((_d = (_c = swap.requestedShift) === null || _c === void 0 ? void 0 : _c.location) === null || _d === void 0 ? void 0 : _d.name) || 'No location';
    const offeredEmp = ((_e = swap.offeredShift) === null || _e === void 0 ? void 0 : _e.employee)
        ? `${swap.offeredShift.employee.firstName} ${swap.offeredShift.employee.lastName}`.trim()
        : 'Unassigned';
    const requestedEmp = ((_f = swap.requestedShift) === null || _f === void 0 ? void 0 : _f.employee)
        ? `${swap.requestedShift.employee.firstName} ${swap.requestedShift.employee.lastName}`.trim()
        : 'Unassigned';
    const offeredTime = ((_g = swap.offeredShift) === null || _g === void 0 ? void 0 : _g.startTime)
        ? `${safeDateLabel(swap.offeredShift.startTime, 'MMM d, yyyy • h:mm a')} → ${safeDateLabel(swap.offeredShift.endTime, 'h:mm a')}`
        : '—';
    const requestedTime = ((_h = swap.requestedShift) === null || _h === void 0 ? void 0 : _h.startTime)
        ? `${safeDateLabel(swap.requestedShift.startTime, 'MMM d, yyyy • h:mm a')} → ${safeDateLabel(swap.requestedShift.endTime, 'h:mm a')}`
        : '—';
    return (<div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
            <lucide_react_1.Building2 className="w-4 h-4"/>
            Offered shift
          </div>
          <div className="mt-2 font-semibold text-slate-900 dark:text-white">{offeredTime}</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <lucide_react_1.MapPin className="w-4 h-4"/>
            {offeredLoc}
          </div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <lucide_react_1.User className="w-4 h-4"/>
            {offeredEmp}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
            <lucide_react_1.Building2 className="w-4 h-4"/>
            Requested shift
          </div>
          <div className="mt-2 font-semibold text-slate-900 dark:text-white">{requestedTime}</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <lucide_react_1.MapPin className="w-4 h-4"/>
            {requestedLoc}
          </div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <lucide_react_1.User className="w-4 h-4"/>
            {requestedEmp}
          </div>
        </div>
      </div>
      {swap.message ? (<div>
          <div className="text-slate-600 dark:text-slate-300">Message</div>
          <div className="mt-1 text-slate-900 dark:text-white whitespace-pre-wrap">{swap.message}</div>
        </div>) : null}
    </div>);
}
function CalloutDetails({ callout }) {
    var _a, _b, _c, _d;
    const employee = callout.absentEmployee
        ? `${callout.absentEmployee.firstName} ${callout.absentEmployee.lastName}`.trim()
        : 'Employee';
    const shiftTime = ((_a = callout.shift) === null || _a === void 0 ? void 0 : _a.startTime)
        ? `${safeDateLabel(callout.shift.startTime, 'MMM d, yyyy • h:mm a')}${((_b = callout.shift) === null || _b === void 0 ? void 0 : _b.endTime) ? ` → ${safeDateLabel(callout.shift.endTime, 'h:mm a')}` : ''}`
        : '—';
    const location = ((_d = (_c = callout.shift) === null || _c === void 0 ? void 0 : _c.location) === null || _d === void 0 ? void 0 : _d.name) || 'No location assigned';
    return (<div className="space-y-3">
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
      {callout.reasonNote ? (<div className="pt-2">
          <div className="text-slate-600 dark:text-slate-300">Note</div>
          <div className="mt-1 text-slate-900 dark:text-white whitespace-pre-wrap">{callout.reasonNote}</div>
        </div>) : null}
    </div>);
}
function LoanDetails({ loan }) {
    const employee = loan.employee ? `${loan.employee.firstName} ${loan.employee.lastName}`.trim() : '—';
    return (<div className="space-y-2">
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
      {loan.reason ? (<div className="pt-2">
          <div className="text-slate-600 dark:text-slate-300">Reason</div>
          <div className="mt-1 text-slate-900 dark:text-white whitespace-pre-wrap">{loan.reason}</div>
        </div>) : null}
    </div>);
}
