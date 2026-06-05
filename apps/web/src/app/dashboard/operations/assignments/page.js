"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AssignmentsPage;
const react_1 = require("react");
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
const api_1 = __importDefault(require("../../../../lib/api"));
const business_context_1 = require("../../../../context/business-context");
const Modal_1 = require("../../../../components/Modal");
const ConfirmModal_1 = require("../../../../components/ConfirmModal");
function formatDateTimeForInput(value) {
    if (!value)
        return '';
    const d = new Date(value);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function AssignmentsPage() {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [userRole, setUserRole] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [assignments, setAssignments] = (0, react_1.useState)([]);
    const [employees, setEmployees] = (0, react_1.useState)([]);
    const [locations, setLocations] = (0, react_1.useState)([]);
    const [q, setQ] = (0, react_1.useState)('');
    const [status, setStatus] = (0, react_1.useState)('ALL');
    const [priority, setPriority] = (0, react_1.useState)('ALL');
    const [assigneeId, setAssigneeId] = (0, react_1.useState)('all');
    const [locationId, setLocationId] = (0, react_1.useState)('all');
    const [editor, setEditor] = (0, react_1.useState)({
        open: false,
        saving: false,
        title: '',
        description: '',
        status: 'OPEN',
        priority: 'MEDIUM',
        assigneeId: 'unassigned',
        locationId: 'unassigned',
        startAt: '',
        dueAt: '',
    });
    const [deleteConfirm, setDeleteConfirm] = (0, react_1.useState)({
        isOpen: false,
        id: undefined,
        isLoading: false,
    });
    (0, react_1.useEffect)(() => {
        const fetchProfile = async () => {
            try {
                const res = await api_1.default.get('/auth/profile');
                setUserRole(res.data.role);
            }
            catch {
                setUserRole(null);
            }
        };
        fetchProfile();
    }, []);
    const fetchData = (0, react_1.useCallback)(async () => {
        var _a, _b;
        setLoading(true);
        try {
            const params = {};
            if (q.trim())
                params.q = q.trim();
            if (status !== 'ALL')
                params.status = status;
            if (priority !== 'ALL')
                params.priority = priority;
            if (assigneeId !== 'all')
                params.assigneeId = assigneeId === 'unassigned' ? '' : assigneeId;
            if (locationId !== 'all')
                params.locationId = locationId === 'unassigned' ? '' : locationId;
            const [assignRes, empRes, locRes] = await Promise.allSettled([
                api_1.default.get('/assignments', { params }),
                api_1.default.get('/employees', { params: { status: 'ACTIVE' } }),
                api_1.default.get('/locations', { params: { status: 'ACTIVE' } }),
            ]);
            if (assignRes.status === 'fulfilled')
                setAssignments(assignRes.value.data || []);
            else
                throw assignRes.reason;
            if (empRes.status === 'fulfilled')
                setEmployees(empRes.value.data || []);
            if (locRes.status === 'fulfilled')
                setLocations(locRes.value.data || []);
        }
        catch (error) {
            const msg = ((_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to load assignments';
            sonner_1.toast.error(msg);
        }
        finally {
            setLoading(false);
        }
    }, [assigneeId, locationId, priority, q, status]);
    (0, react_1.useEffect)(() => {
        if (!userRole)
            return;
        if (userRole === 'SUPER_ADMIN' && !selectedBusiness) {
            setLoading(false);
            return;
        }
        fetchData();
    }, [fetchData, selectedBusiness, userRole]);
    const stats = (0, react_1.useMemo)(() => {
        const now = new Date();
        const open = assignments.filter(a => a.status === 'OPEN').length;
        const inProgress = assignments.filter(a => a.status === 'IN_PROGRESS').length;
        const completed = assignments.filter(a => a.status === 'COMPLETED').length;
        const overdue = assignments.filter(a => a.status !== 'COMPLETED' && a.dueAt && (0, date_fns_1.isBefore)(new Date(a.dueAt), now)).length;
        const dueToday = assignments.filter(a => a.status !== 'COMPLETED' && a.dueAt && (0, date_fns_1.isSameDay)(new Date(a.dueAt), now)).length;
        return { open, inProgress, completed, overdue, dueToday, total: assignments.length };
    }, [assignments]);
    const statusBadge = (s) => {
        if (s === 'COMPLETED')
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        if (s === 'IN_PROGRESS')
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        if (s === 'CANCELLED')
            return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    };
    const priorityBadge = (p) => {
        if (p === 'URGENT')
            return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        if (p === 'HIGH')
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
        if (p === 'LOW')
            return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    };
    const openCreate = () => {
        setEditor({
            open: true,
            saving: false,
            title: '',
            description: '',
            status: 'OPEN',
            priority: 'MEDIUM',
            assigneeId: 'unassigned',
            locationId: 'unassigned',
            startAt: '',
            dueAt: '',
        });
    };
    const openEdit = (a) => {
        setEditor({
            open: true,
            saving: false,
            id: a.id,
            title: a.title,
            description: a.description || '',
            status: a.status,
            priority: a.priority,
            assigneeId: a.assigneeId || 'unassigned',
            locationId: a.locationId || 'unassigned',
            startAt: formatDateTimeForInput(a.startAt),
            dueAt: formatDateTimeForInput(a.dueAt),
        });
    };
    const save = async () => {
        var _a, _b;
        if (!editor.title.trim()) {
            sonner_1.toast.error('Title is required');
            return;
        }
        setEditor(prev => ({ ...prev, saving: true }));
        try {
            const payload = {
                title: editor.title.trim(),
                description: editor.description.trim() ? editor.description.trim() : null,
                status: editor.status,
                priority: editor.priority,
                assigneeId: editor.assigneeId === 'unassigned' ? null : editor.assigneeId,
                locationId: editor.locationId === 'unassigned' ? null : editor.locationId,
                startAt: editor.startAt ? new Date(editor.startAt).toISOString() : null,
                dueAt: editor.dueAt ? new Date(editor.dueAt).toISOString() : null,
            };
            if (editor.id) {
                await api_1.default.patch(`/assignments/${editor.id}`, payload);
                sonner_1.toast.success('Assignment updated');
            }
            else {
                await api_1.default.post('/assignments', payload);
                sonner_1.toast.success('Assignment created');
            }
            setEditor(prev => ({ ...prev, open: false }));
            fetchData();
        }
        catch (error) {
            const msg = ((_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to save assignment';
            sonner_1.toast.error(msg);
            setEditor(prev => ({ ...prev, saving: false }));
        }
    };
    const setQuickStatus = async (a, next) => {
        var _a, _b;
        try {
            await api_1.default.patch(`/assignments/${a.id}`, { status: next });
            sonner_1.toast.success('Updated');
            fetchData();
        }
        catch (error) {
            const msg = ((_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to update assignment';
            sonner_1.toast.error(msg);
        }
    };
    const confirmDelete = (id) => setDeleteConfirm({ isOpen: true, id, isLoading: false });
    const performDelete = async () => {
        var _a, _b;
        if (!deleteConfirm.id)
            return;
        setDeleteConfirm(prev => ({ ...prev, isLoading: true }));
        try {
            await api_1.default.delete(`/assignments/${deleteConfirm.id}`);
            sonner_1.toast.success('Assignment deleted');
            setDeleteConfirm({ isOpen: false, id: undefined, isLoading: false });
            fetchData();
        }
        catch (error) {
            const msg = ((_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to delete assignment';
            sonner_1.toast.error(msg);
            setDeleteConfirm(prev => ({ ...prev, isLoading: false }));
        }
    };
    const exportCsv = () => {
        const rows = [
            ['Title', 'Status', 'Priority', 'Assignee', 'Site', 'Client', 'Start', 'Due', 'Created'],
            ...assignments.map(a => {
                var _a, _b, _c;
                const assignee = a.assignee ? `${a.assignee.firstName} ${a.assignee.lastName}` : '';
                const site = ((_a = a.location) === null || _a === void 0 ? void 0 : _a.name) || '';
                const client = ((_c = (_b = a.location) === null || _b === void 0 ? void 0 : _b.client) === null || _c === void 0 ? void 0 : _c.name) || '';
                const startAt = a.startAt ? new Date(a.startAt).toISOString() : '';
                const dueAt = a.dueAt ? new Date(a.dueAt).toISOString() : '';
                return [
                    a.title,
                    a.status,
                    a.priority,
                    assignee,
                    site,
                    client,
                    startAt,
                    dueAt,
                    new Date(a.createdAt).toISOString(),
                ];
            }),
        ];
        const csv = rows
            .map(r => r.map(v => `"${String(v !== null && v !== void 0 ? v : '').replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'assignments.csv';
        a.click();
        URL.revokeObjectURL(url);
    };
    if (userRole === 'SUPER_ADMIN' && !selectedBusiness) {
        return (<div className="py-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="text-lg font-semibold text-slate-900 dark:text-white">Select a business</div>
          <div className="text-slate-500 dark:text-slate-400 mt-1">Assignments require a business context.</div>
        </div>
      </div>);
    }
    return (<div className="py-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Assignments</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Track operational tasks across sites, assignees, and due dates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors">
              <lucide_react_1.Download size={18}/>
              Export CSV
            </button>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              <lucide_react_1.Plus size={18}/>
              New assignment
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Open" value={stats.open} icon={<lucide_react_1.AlertCircle className="w-4 h-4"/>}/>
          <StatCard label="In progress" value={stats.inProgress} icon={<lucide_react_1.Calendar className="w-4 h-4"/>}/>
          <StatCard label="Due today" value={stats.dueToday} icon={<lucide_react_1.Calendar className="w-4 h-4"/>}/>
          <StatCard label="Overdue" value={stats.overdue} icon={<lucide_react_1.AlertCircle className="w-4 h-4"/>} danger/>
          <StatCard label="Completed" value={stats.completed} icon={<lucide_react_1.CheckCircle2 className="w-4 h-4"/>}/>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="relative w-full md:max-w-md">
                <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assignments…" className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"/>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => fetchData()} className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                  Apply
                </button>
                <button onClick={() => {
            setQ('');
            setStatus('ALL');
            setPriority('ALL');
            setAssigneeId('all');
            setLocationId('all');
            setTimeout(() => fetchData(), 0);
        }} className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                  Reset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                <option value="ALL">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                <option value="ALL">All priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                <option value="all">All assignees</option>
                <option value="unassigned">Unassigned</option>
                {employees.map(e => (<option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>))}
              </select>
              <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                <option value="all">All sites</option>
                <option value="unassigned">No site</option>
                {locations.map(l => {
            var _a;
            return (<option key={l.id} value={l.id}>{((_a = l.client) === null || _a === void 0 ? void 0 : _a.name) ? `${l.client.name} — ` : ''}{l.name}</option>);
        })}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Site</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assignee</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {loading ? (<tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500">Loading assignments…</td>
                  </tr>) : assignments.length === 0 ? (<tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500">No assignments found.</td>
                  </tr>) : (assignments.map((a) => {
            var _a, _b, _c;
            const due = a.dueAt ? new Date(a.dueAt) : null;
            const overdue = a.status !== 'COMPLETED' && due && (0, date_fns_1.isBefore)(due, new Date());
            return (<tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => openEdit(a)}>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900 dark:text-white">{a.title}</div>
                          <div className="text-xs text-slate-500 line-clamp-1">{a.description || '—'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">
                          {((_b = (_a = a.location) === null || _a === void 0 ? void 0 : _a.client) === null || _b === void 0 ? void 0 : _b.name) ? (<div className="flex flex-col">
                              <span className="font-medium">{a.location.client.name}</span>
                              <span className="text-xs text-slate-500">{a.location.name}</span>
                            </div>) : (((_c = a.location) === null || _c === void 0 ? void 0 : _c.name) || '—')}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">
                          {a.assignee ? `${a.assignee.firstName} ${a.assignee.lastName}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {due ? (<span className={`${overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-700 dark:text-slate-200'}`}>
                              {(0, date_fns_1.format)(due, 'd MMM yyyy, HH:mm')}
                            </span>) : (<span className="text-slate-500">—</span>)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${priorityBadge(a.priority)}`}>
                            {a.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(a.status)}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {a.status !== 'IN_PROGRESS' && a.status !== 'COMPLETED' && (<button onClick={() => setQuickStatus(a, 'IN_PROGRESS')} className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                                Start
                              </button>)}
                            {a.status !== 'COMPLETED' && (<button onClick={() => setQuickStatus(a, 'COMPLETED')} className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-green-600 hover:bg-green-700 text-white">
                                Complete
                              </button>)}
                            <button onClick={() => confirmDelete(a.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600" title="Delete">
                              <lucide_react_1.Trash2 className="w-4 h-4"/>
                            </button>
                          </div>
                        </td>
                      </tr>);
        }))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal_1.Modal isOpen={editor.open} onClose={() => setEditor(prev => ({ ...prev, open: false }))} title={editor.id ? 'Edit assignment' : 'New assignment'} maxWidth="max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Title</label>
            <input value={editor.title} onChange={(e) => setEditor(prev => ({ ...prev, title: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g. Patrol check, Site inspection, Client request follow-up"/>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Description</label>
            <textarea value={editor.description} onChange={(e) => setEditor(prev => ({ ...prev, description: e.target.value }))} rows={4} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Add key details, instructions, and expected outcome."/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Status</label>
            <select value={editor.status} onChange={(e) => setEditor(prev => ({ ...prev, status: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Priority</label>
            <select value={editor.priority} onChange={(e) => setEditor(prev => ({ ...prev, priority: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Assignee</label>
            <select value={editor.assigneeId} onChange={(e) => setEditor(prev => ({ ...prev, assigneeId: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
              <option value="unassigned">Unassigned</option>
              {employees.map(e => (<option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Site</label>
            <select value={editor.locationId} onChange={(e) => setEditor(prev => ({ ...prev, locationId: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
              <option value="unassigned">No site</option>
              {locations.map(l => {
            var _a;
            return (<option key={l.id} value={l.id}>{((_a = l.client) === null || _a === void 0 ? void 0 : _a.name) ? `${l.client.name} — ` : ''}{l.name}</option>);
        })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Start</label>
            <input type="datetime-local" value={editor.startAt} onChange={(e) => setEditor(prev => ({ ...prev, startAt: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Due</label>
            <input type="datetime-local" value={editor.dueAt} onChange={(e) => setEditor(prev => ({ ...prev, dueAt: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button type="button" onClick={() => {
            setEditor(prev => ({ ...prev, open: false }));
        }} className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white">
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <Modal_1.ModalActionButton kind="submit" onClick={() => save()} disabled={editor.saving}>
              {editor.saving ? 'Saving…' : editor.id ? 'Save changes' : 'Create'}
            </Modal_1.ModalActionButton>
          </div>
        </div>
      </Modal_1.Modal>

      <ConfirmModal_1.ConfirmModal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, id: undefined, isLoading: false })} onConfirm={performDelete} title="Delete assignment" message="Delete this assignment? This action cannot be undone." confirmText="Delete" cancelText="Cancel" variant="danger" isLoading={deleteConfirm.isLoading}/>
    </div>);
}
function StatCard({ label, value, icon, danger }) {
    return (<div className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between ${danger ? 'ring-1 ring-red-200 dark:ring-red-900/40' : ''}`}>
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</div>
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${danger ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-200'}`}>
        {icon}
      </div>
    </div>);
}
