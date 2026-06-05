"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CompliancePage;
const react_1 = require("react");
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
const api_1 = __importDefault(require("../../../../lib/api"));
const business_context_1 = require("../../../../context/business-context");
const Modal_1 = require("../../../../components/Modal");
const ConfirmModal_1 = require("../../../../components/ConfirmModal");
function formatDateInput(value) {
    if (!value)
        return '';
    const d = new Date(value);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function CompliancePage() {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [userRole, setUserRole] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [documents, setDocuments] = (0, react_1.useState)([]);
    const [employees, setEmployees] = (0, react_1.useState)([]);
    const [search, setSearch] = (0, react_1.useState)('');
    const [status, setStatus] = (0, react_1.useState)('ALL');
    const [category, setCategory] = (0, react_1.useState)('ALL');
    const [ownerEmployeeId, setOwnerEmployeeId] = (0, react_1.useState)('all');
    const [editor, setEditor] = (0, react_1.useState)({
        open: false,
        saving: false,
        title: '',
        category: 'POLICY',
        status: 'ACTIVE',
        version: '',
        effectiveDate: '',
        reviewDate: '',
        ownerEmployeeId: 'unassigned',
        acknowledgementRequired: false,
        tags: '',
        fileUrl: '',
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
            const s = search.trim();
            if (s)
                params.search = s;
            if (status !== 'ALL')
                params.status = status;
            if (category !== 'ALL')
                params.category = category;
            if (ownerEmployeeId !== 'all')
                params.ownerEmployeeId = ownerEmployeeId === 'unassigned' ? '' : ownerEmployeeId;
            const [docsRes, empRes] = await Promise.allSettled([
                api_1.default.get('/compliance-documents', { params: { ...params, businessId: selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id } }),
                api_1.default.get('/employees', { params: { status: 'ACTIVE' } }),
            ]);
            if (docsRes.status === 'fulfilled')
                setDocuments(docsRes.value.data || []);
            else
                throw docsRes.reason;
            if (empRes.status === 'fulfilled')
                setEmployees(empRes.value.data || []);
        }
        catch (error) {
            const msg = ((_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to load compliance documents';
            sonner_1.toast.error(msg);
        }
        finally {
            setLoading(false);
        }
    }, [category, ownerEmployeeId, search, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id, status]);
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
        const soon = (0, date_fns_1.addDays)(now, 30);
        const total = documents.length;
        const draft = documents.filter(d => d.status === 'DRAFT').length;
        const active = documents.filter(d => d.status === 'ACTIVE').length;
        const archived = documents.filter(d => d.status === 'ARCHIVED').length;
        const needsReview = documents.filter(d => d.status !== 'ARCHIVED' && d.reviewDate && (0, date_fns_1.isBefore)(new Date(d.reviewDate), soon)).length;
        return { total, draft, active, archived, needsReview };
    }, [documents]);
    const canManage = userRole === 'SUPER_ADMIN' || userRole === 'BUSINESS_ADMIN';
    const openCreate = () => {
        setEditor({
            open: true,
            saving: false,
            title: '',
            category: 'POLICY',
            status: 'ACTIVE',
            version: '',
            effectiveDate: '',
            reviewDate: '',
            ownerEmployeeId: 'unassigned',
            acknowledgementRequired: false,
            tags: '',
            fileUrl: '',
        });
    };
    const openEdit = (d) => {
        setEditor({
            open: true,
            saving: false,
            id: d.id,
            title: d.title,
            category: d.category,
            status: d.status,
            version: d.version || '',
            effectiveDate: formatDateInput(d.effectiveDate),
            reviewDate: formatDateInput(d.reviewDate),
            ownerEmployeeId: d.ownerEmployeeId || 'unassigned',
            acknowledgementRequired: !!d.acknowledgementRequired,
            tags: d.tags || '',
            fileUrl: d.fileUrl || '',
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
                category: editor.category,
                status: editor.status,
                version: editor.version.trim() || null,
                effectiveDate: editor.effectiveDate ? new Date(editor.effectiveDate).toISOString() : null,
                reviewDate: editor.reviewDate ? new Date(editor.reviewDate).toISOString() : null,
                ownerEmployeeId: editor.ownerEmployeeId === 'unassigned' ? null : editor.ownerEmployeeId,
                acknowledgementRequired: !!editor.acknowledgementRequired,
                tags: editor.tags.trim() || null,
                fileUrl: editor.fileUrl.trim() || null,
            };
            if (editor.id) {
                await api_1.default.patch(`/compliance-documents/${editor.id}`, payload, { params: { businessId: selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id } });
                sonner_1.toast.success('Compliance document updated');
            }
            else {
                await api_1.default.post('/compliance-documents', payload, { params: { businessId: selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id } });
                sonner_1.toast.success('Compliance document created');
            }
            setEditor(prev => ({ ...prev, open: false }));
            fetchData();
        }
        catch (error) {
            const msg = ((_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to save compliance document';
            sonner_1.toast.error(msg);
            setEditor(prev => ({ ...prev, saving: false }));
        }
    };
    const exportCsv = () => {
        const rows = [
            ['Title', 'Category', 'Status', 'Version', 'EffectiveDate', 'ReviewDate', 'Owner', 'AckRequired', 'Tags', 'FileUrl'],
            ...documents.map(d => [
                d.title,
                d.category,
                d.status,
                d.version || '',
                d.effectiveDate ? new Date(d.effectiveDate).toISOString() : '',
                d.reviewDate ? new Date(d.reviewDate).toISOString() : '',
                d.ownerEmployee ? `${d.ownerEmployee.firstName} ${d.ownerEmployee.lastName}` : '',
                d.acknowledgementRequired ? 'YES' : 'NO',
                d.tags || '',
                d.fileUrl || '',
            ]),
        ];
        const csv = rows.map(r => r.map(v => `"${String(v !== null && v !== void 0 ? v : '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'compliance_documents.csv';
        a.click();
        URL.revokeObjectURL(url);
    };
    const confirmDelete = (id) => setDeleteConfirm({ isOpen: true, id, isLoading: false });
    const performDelete = async () => {
        var _a, _b;
        if (!deleteConfirm.id)
            return;
        setDeleteConfirm(prev => ({ ...prev, isLoading: true }));
        try {
            await api_1.default.delete(`/compliance-documents/${deleteConfirm.id}`, { params: { businessId: selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id } });
            sonner_1.toast.success('Compliance document deleted');
            setDeleteConfirm({ isOpen: false, id: undefined, isLoading: false });
            fetchData();
        }
        catch (error) {
            const msg = ((_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to delete compliance document';
            sonner_1.toast.error(msg);
            setDeleteConfirm(prev => ({ ...prev, isLoading: false }));
        }
    };
    const statusPill = (s) => {
        if (s === 'ACTIVE')
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        if (s === 'DRAFT')
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
    };
    const categoryPill = (c) => {
        if (c === 'SECURITY')
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        if (c === 'OSHA')
            return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        if (c === 'TRAINING')
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
        if (c === 'HR')
            return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300';
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
    };
    if (userRole === 'SUPER_ADMIN' && !selectedBusiness) {
        return (<div className="py-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="text-lg font-semibold text-slate-900 dark:text-white">Select a business</div>
          <div className="text-slate-500 dark:text-slate-400 mt-1">Compliance requires a business context.</div>
        </div>
      </div>);
    }
    return (<div className="py-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Compliance</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Manage policies, SOPs, training, and review dates for your operation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors">
              <lucide_react_1.Download size={18}/>
              Export CSV
            </button>
            {canManage && (<button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                <lucide_react_1.Plus size={18}/>
                New document
              </button>)}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Total" value={stats.total} icon={<lucide_react_1.FileText className="w-4 h-4"/>}/>
          <StatCard label="Active" value={stats.active} icon={<lucide_react_1.CheckCircle2 className="w-4 h-4"/>}/>
          <StatCard label="Draft" value={stats.draft} icon={<lucide_react_1.FileText className="w-4 h-4"/>}/>
          <StatCard label="Needs review (30d)" value={stats.needsReview} icon={<lucide_react_1.FileText className="w-4 h-4"/>} danger/>
          <StatCard label="Archived" value={stats.archived} icon={<lucide_react_1.FileText className="w-4 h-4"/>}/>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="relative w-full md:max-w-md">
                <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or tags…" className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"/>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => fetchData()} className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                  Apply
                </button>
                <button onClick={() => {
            setSearch('');
            setStatus('ALL');
            setCategory('ALL');
            setOwnerEmployeeId('all');
            setTimeout(() => fetchData(), 0);
        }} className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                  Reset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                <option value="ALL">All categories</option>
                <option value="POLICY">Policy</option>
                <option value="SOP">SOP</option>
                <option value="TRAINING">Training</option>
                <option value="OSHA">OSHA</option>
                <option value="HR">HR</option>
                <option value="SECURITY">Security</option>
                <option value="OTHER">Other</option>
              </select>
              <select value={ownerEmployeeId} onChange={(e) => setOwnerEmployeeId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                <option value="all">All owners</option>
                <option value="unassigned">No owner</option>
                {employees.map(e => (<option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Document</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Review</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">File</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {loading ? (<tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500">Loading…</td>
                  </tr>) : documents.length === 0 ? (<tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500">No documents found.</td>
                  </tr>) : (documents.map((d) => {
            const reviewDate = d.reviewDate ? new Date(d.reviewDate) : null;
            const reviewSoon = d.status !== 'ARCHIVED' && reviewDate && (0, date_fns_1.isBefore)(reviewDate, (0, date_fns_1.addDays)(new Date(), 30));
            return (<tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => (canManage ? openEdit(d) : null)}>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900 dark:text-white">{d.title}</div>
                          <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1 mt-1">
                            {d.version ? <span>v{d.version}</span> : <span>—</span>}
                            {d.effectiveDate ? <span>Effective {(0, date_fns_1.format)(new Date(d.effectiveDate), 'd MMM yyyy')}</span> : null}
                            {d.acknowledgementRequired ? <span className="font-semibold text-purple-700 dark:text-purple-300">Ack required</span> : null}
                            {d.tags ? <span className="truncate">Tags: {d.tags}</span> : null}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${categoryPill(d.category)}`}>
                            {d.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusPill(d.status)}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">
                          {d.ownerEmployee ? `${d.ownerEmployee.firstName} ${d.ownerEmployee.lastName}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {reviewDate ? (<span className={`${reviewSoon ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-700 dark:text-slate-200'}`}>
                              {(0, date_fns_1.format)(reviewDate, 'd MMM yyyy')}
                            </span>) : (<span className="text-slate-500">—</span>)}
                        </td>
                        <td className="px-6 py-4">
                          {d.fileUrl ? (<button type="button" onClick={(e) => {
                        e.stopPropagation();
                        window.open(d.fileUrl, '_blank', 'noopener,noreferrer');
                    }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm">
                              <lucide_react_1.ExternalLink className="w-4 h-4"/>
                              Open
                            </button>) : (<span className="text-slate-500 text-sm">—</span>)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {canManage && (<div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <button type="button" onClick={() => openEdit(d)} className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                                Edit
                              </button>
                              <button type="button" onClick={() => confirmDelete(d.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600" title="Delete">
                                <lucide_react_1.Trash2 className="w-4 h-4"/>
                              </button>
                            </div>)}
                        </td>
                      </tr>);
        }))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal_1.Modal isOpen={editor.open} onClose={() => setEditor(prev => ({ ...prev, open: false }))} title={editor.id ? 'Edit document' : 'New document'} maxWidth="max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Title</label>
            <input value={editor.title} onChange={(e) => setEditor(prev => ({ ...prev, title: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g. Site access policy, Patrol SOP, Incident reporting training"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Category</label>
            <select value={editor.category} onChange={(e) => setEditor(prev => ({ ...prev, category: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
              <option value="POLICY">Policy</option>
              <option value="SOP">SOP</option>
              <option value="TRAINING">Training</option>
              <option value="OSHA">OSHA</option>
              <option value="HR">HR</option>
              <option value="SECURITY">Security</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Status</label>
            <select value={editor.status} onChange={(e) => setEditor(prev => ({ ...prev, status: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Version</label>
            <input value={editor.version} onChange={(e) => setEditor(prev => ({ ...prev, version: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" placeholder="e.g. 1.0"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Effective date</label>
            <input type="date" value={editor.effectiveDate} onChange={(e) => setEditor(prev => ({ ...prev, effectiveDate: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Review date</label>
            <input type="date" value={editor.reviewDate} onChange={(e) => setEditor(prev => ({ ...prev, reviewDate: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Owner</label>
            <select value={editor.ownerEmployeeId} onChange={(e) => setEditor(prev => ({ ...prev, ownerEmployeeId: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
              <option value="unassigned">No owner</option>
              {employees.map(e => (<option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>))}
            </select>
          </div>

          <div className="flex items-center gap-2 mt-6">
            <input id="ack-required" type="checkbox" checked={editor.acknowledgementRequired} onChange={(e) => setEditor(prev => ({ ...prev, acknowledgementRequired: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"/>
            <label htmlFor="ack-required" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Acknowledgement required
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Tags</label>
            <input value={editor.tags} onChange={(e) => setEditor(prev => ({ ...prev, tags: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" placeholder="e.g. patrol, incident, client-site"/>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">File URL</label>
            <div className="mt-1 flex items-center gap-2">
              <input value={editor.fileUrl} onChange={(e) => setEditor(prev => ({ ...prev, fileUrl: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" placeholder="https://…"/>
              {editor.fileUrl.trim() ? (<button type="button" onClick={() => window.open(editor.fileUrl.trim(), '_blank', 'noopener,noreferrer')} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200" title="Open file">
                  <lucide_react_1.ExternalLink className="w-4 h-4"/>
                </button>) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button type="button" onClick={() => setEditor(prev => ({ ...prev, open: false }))} className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white">
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <Modal_1.ModalActionButton kind="submit" onClick={() => save()} disabled={editor.saving}>
              {editor.saving ? 'Saving…' : editor.id ? 'Save changes' : 'Create'}
            </Modal_1.ModalActionButton>
          </div>
        </div>
      </Modal_1.Modal>

      <ConfirmModal_1.ConfirmModal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, id: undefined, isLoading: false })} onConfirm={performDelete} title="Delete document" message="Delete this compliance document? This action cannot be undone." confirmText="Delete" cancelText="Cancel" variant="danger" isLoading={deleteConfirm.isLoading}/>
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
