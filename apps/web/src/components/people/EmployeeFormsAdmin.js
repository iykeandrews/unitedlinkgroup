"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeFormsAdmin = EmployeeFormsAdmin;
const react_1 = require("react");
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
const api_1 = __importDefault(require("../../lib/api"));
const business_context_1 = require("../../context/business-context");
const Modal_1 = require("../Modal");
const ConfirmModal_1 = require("../ConfirmModal");
const dynamic_1 = __importDefault(require("next/dynamic"));
require("react-quill-new/dist/quill.snow.css");
const ReactQuill = (0, dynamic_1.default)(async () => {
    const { default: RQ } = await Promise.resolve().then(() => __importStar(require('react-quill-new')));
    const ForwardedReactQuill = ({ forwardedRef, ...props }) => <RQ ref={forwardedRef} {...props}/>;
    ForwardedReactQuill.displayName = 'ForwardedReactQuill';
    return ForwardedReactQuill;
}, { ssr: false });
function safeParseFields(value) {
    if (!value)
        return [];
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed))
            return [];
        return parsed
            .map((f) => ({
            id: String((f === null || f === void 0 ? void 0 : f.id) || crypto.randomUUID()),
            label: String((f === null || f === void 0 ? void 0 : f.label) || ''),
            type: String((f === null || f === void 0 ? void 0 : f.type) || 'text'),
            required: !!(f === null || f === void 0 ? void 0 : f.required),
        }))
            .filter((f) => !!f.label);
    }
    catch {
        return [];
    }
}
function EmployeeFormsAdmin({ type }) {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [profileRole, setProfileRole] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [templates, setTemplates] = (0, react_1.useState)([]);
    const [employees, setEmployees] = (0, react_1.useState)([]);
    const [q, setQ] = (0, react_1.useState)('');
    const [status, setStatus] = (0, react_1.useState)('ALL');
    const [editor, setEditor] = (0, react_1.useState)({
        open: false,
        saving: false,
        title: '',
        description: '',
        status: 'ACTIVE',
        version: '',
        body: '',
        fileUrl: '',
        acknowledgementRequired: type === 'SOP',
        requiresSignature: true,
        fields: [],
    });
    const [assignModal, setAssignModal] = (0, react_1.useState)({
        open: false,
        templateId: undefined,
        assignAll: true,
        employeeId: 'unassigned',
        dueAt: '',
        saving: false,
    });
    const [submissionsModal, setSubmissionsModal] = (0, react_1.useState)({
        open: false,
        templateId: undefined,
        loading: false,
        rows: [],
    });
    const [deleteConfirm, setDeleteConfirm] = (0, react_1.useState)({
        isOpen: false,
        id: undefined,
        isLoading: false,
    });
    (0, react_1.useEffect)(() => {
        const loadProfile = async () => {
            try {
                const res = await api_1.default.get('/auth/profile');
                setProfileRole(res.data.role);
            }
            catch {
                setProfileRole(null);
            }
        };
        loadProfile();
    }, []);
    const fetchData = (0, react_1.useCallback)(async () => {
        var _a, _b;
        if (!profileRole)
            return;
        if (profileRole === 'SUPER_ADMIN' && !selectedBusiness) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const params = { type };
            if (q.trim())
                params.q = q.trim();
            if (status !== 'ALL')
                params.status = status;
            const [tRes, eRes] = await Promise.allSettled([
                api_1.default.get('/employee-forms/templates', { params }),
                api_1.default.get('/employees', { params: { status: 'ACTIVE' } }),
            ]);
            if (tRes.status === 'fulfilled')
                setTemplates(tRes.value.data || []);
            else
                throw tRes.reason;
            if (eRes.status === 'fulfilled')
                setEmployees(eRes.value.data || []);
        }
        catch (error) {
            const msg = ((_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to load templates';
            sonner_1.toast.error(msg);
        }
        finally {
            setLoading(false);
        }
    }, [profileRole, q, selectedBusiness, status, type]);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [fetchData]);
    const canManage = profileRole === 'SUPER_ADMIN' || profileRole === 'BUSINESS_ADMIN' || profileRole === 'MANAGER';
    const quillModules = (0, react_1.useMemo)(() => ({
        toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ align: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
            ['blockquote', 'code-block'],
            ['link'],
            ['clean'],
        ],
    }), []);
    const quillFormats = (0, react_1.useMemo)(() => [
        'header',
        'bold',
        'italic',
        'underline',
        'strike',
        'color',
        'background',
        'align',
        'list',
        'indent',
        'blockquote',
        'code-block',
        'link',
    ], []);
    const stats = (0, react_1.useMemo)(() => {
        const total = templates.length;
        const active = templates.filter(t => t.status === 'ACTIVE').length;
        const draft = templates.filter(t => t.status === 'DRAFT').length;
        const archived = templates.filter(t => t.status === 'ARCHIVED').length;
        return { total, active, draft, archived };
    }, [templates]);
    const openCreate = () => {
        setEditor({
            open: true,
            saving: false,
            title: '',
            description: '',
            status: 'ACTIVE',
            version: '',
            body: '',
            fileUrl: '',
            acknowledgementRequired: type === 'SOP',
            requiresSignature: true,
            fields: [],
        });
    };
    const openEdit = (t) => {
        setEditor({
            open: true,
            saving: false,
            id: t.id,
            title: t.title,
            description: t.description || '',
            status: t.status,
            version: t.version || '',
            body: t.body || '',
            fileUrl: t.fileUrl || '',
            acknowledgementRequired: !!t.acknowledgementRequired,
            requiresSignature: !!t.requiresSignature,
            fields: safeParseFields(t.fields),
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
            const isSop = type === 'SOP';
            const normalizedBody = (editor.body || '').replace(/\s/g, '');
            const body = !normalizedBody || normalizedBody === '<p><br></p>'
                ? null
                : editor.body;
            const payload = {
                type,
                title: editor.title.trim(),
                description: editor.description.trim() ? editor.description.trim() : null,
                status: editor.status,
                version: editor.version.trim() ? editor.version.trim() : null,
                body,
                fields: isSop ? JSON.stringify([]) : JSON.stringify(editor.fields || []),
                fileUrl: editor.fileUrl.trim() ? editor.fileUrl.trim() : null,
                acknowledgementRequired: isSop ? true : !!editor.acknowledgementRequired,
                requiresSignature: true,
            };
            if (editor.id) {
                await api_1.default.patch(`/employee-forms/templates/${editor.id}`, payload);
                sonner_1.toast.success('Template updated');
            }
            else {
                await api_1.default.post('/employee-forms/templates', payload);
                sonner_1.toast.success('Template created');
            }
            setEditor(prev => ({ ...prev, open: false }));
            fetchData();
        }
        catch (error) {
            const msg = ((_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to save template';
            sonner_1.toast.error(msg);
            setEditor(prev => ({ ...prev, saving: false }));
        }
    };
    const openAssign = (templateId) => {
        setAssignModal({
            open: true,
            templateId,
            assignAll: true,
            employeeId: 'unassigned',
            dueAt: '',
            saving: false,
        });
    };
    const assign = async () => {
        var _a, _b, _c, _d, _e, _f;
        if (!assignModal.templateId)
            return;
        setAssignModal(prev => ({ ...prev, saving: true }));
        try {
            const payload = {};
            if (assignModal.assignAll) {
                payload.assignAll = 'true';
            }
            else {
                if (!assignModal.employeeId || assignModal.employeeId === 'unassigned') {
                    sonner_1.toast.error('Select an employee or choose assign all');
                    setAssignModal(prev => ({ ...prev, saving: false }));
                    return;
                }
                payload.employeeIds = [assignModal.employeeId];
            }
            if (assignModal.dueAt)
                payload.dueAt = new Date(assignModal.dueAt).toISOString();
            const res = await api_1.default.post(`/employee-forms/templates/${assignModal.templateId}/assign`, payload);
            const assigned = (_b = (_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0 ? void 0 : _a.assigned) !== null && _b !== void 0 ? _b : 0;
            const failed = (_d = (_c = res === null || res === void 0 ? void 0 : res.data) === null || _c === void 0 ? void 0 : _c.failed) !== null && _d !== void 0 ? _d : 0;
            sonner_1.toast.success(`Assigned ${assigned}${failed ? `, ${failed} failed` : ''}`);
            setAssignModal(prev => ({ ...prev, open: false }));
        }
        catch (error) {
            const msg = ((_f = (_e = error === null || error === void 0 ? void 0 : error.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) || 'Failed to assign';
            sonner_1.toast.error(msg);
            setAssignModal(prev => ({ ...prev, saving: false }));
        }
    };
    const openSubmissions = async (templateId) => {
        setSubmissionsModal({ open: true, templateId, loading: true, rows: [] });
        try {
            const res = await api_1.default.get('/employee-forms/assignments', { params: { templateId } });
            setSubmissionsModal({ open: true, templateId, loading: false, rows: res.data || [] });
        }
        catch {
            setSubmissionsModal({ open: true, templateId, loading: false, rows: [] });
        }
    };
    const confirmArchive = (id) => setDeleteConfirm({ isOpen: true, id, isLoading: false });
    const archive = async () => {
        var _a, _b;
        if (!deleteConfirm.id)
            return;
        setDeleteConfirm(prev => ({ ...prev, isLoading: true }));
        try {
            await api_1.default.delete(`/employee-forms/templates/${deleteConfirm.id}`);
            sonner_1.toast.success('Template archived');
            setDeleteConfirm({ isOpen: false, id: undefined, isLoading: false });
            fetchData();
        }
        catch (error) {
            const msg = ((_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to archive';
            sonner_1.toast.error(msg);
            setDeleteConfirm(prev => ({ ...prev, isLoading: false }));
        }
    };
    if (profileRole === 'SUPER_ADMIN' && !selectedBusiness) {
        return (<div className="py-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="text-lg font-semibold text-slate-900 dark:text-white">Select a business</div>
          <div className="text-slate-500 dark:text-slate-400 mt-1">This feature requires a business context.</div>
        </div>
      </div>);
    }
    return (<div className="py-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {type === 'SOP' ? 'SOP Files' : 'Employment Forms'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {type === 'SOP' ? 'Publish SOPs and collect employee acknowledgements.' : 'Create, assign, and track employee forms and signatures.'}
            </p>
          </div>
          {canManage && (<button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              <lucide_react_1.Plus size={18}/>
              New {type === 'SOP' ? 'SOP' : 'Form'}
            </button>)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total}/>
          <StatCard label="Active" value={stats.active}/>
          <StatCard label="Draft" value={stats.draft}/>
          <StatCard label="Archived" value={stats.archived}/>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="relative w-full md:max-w-md">
                <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"/>
              </div>
              <div className="flex items-center gap-2">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                  <option value="ALL">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <button onClick={() => fetchData()} className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                  Apply
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Template</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Version</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Signature</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Updated</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {loading ? (<tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">Loading…</td>
                  </tr>) : templates.length === 0 ? (<tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">No templates found.</td>
                  </tr>) : (templates.map(t => (<tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 dark:text-white">{t.title}</div>
                        <div className="text-xs text-slate-500 line-clamp-1">{t.description || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${t.status === 'ACTIVE'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : t.status === 'DRAFT'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">{t.version || '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">
                        {t.requiresSignature ? (<span className="inline-flex items-center gap-1.5">
                            <lucide_react_1.FileSignature className="w-4 h-4 text-purple-600 dark:text-purple-300"/>
                            Required
                          </span>) : ('—')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">
                        {(0, date_fns_1.format)(new Date(t.updatedAt), 'd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canManage && (<div className="flex items-center justify-end gap-2">
                            <button onClick={() => openSubmissions(t.id)} className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                              View
                            </button>
                            <button onClick={() => openAssign(t.id)} className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-2">
                              <lucide_react_1.UserPlus className="w-4 h-4"/>
                              Assign
                            </button>
                            <button onClick={() => openEdit(t)} className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                              Edit
                            </button>
                            <button onClick={() => confirmArchive(t.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600" title="Archive">
                              <lucide_react_1.Trash2 className="w-4 h-4"/>
                            </button>
                          </div>)}
                      </td>
                    </tr>)))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal_1.Modal isOpen={editor.open} onClose={() => setEditor(prev => ({ ...prev, open: false }))} title={editor.id ? (type === 'SOP' ? 'Edit SOP' : 'Edit form') : (type === 'SOP' ? 'New SOP' : 'New form')} maxWidth="max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Title</label>
            <input value={editor.title} onChange={(e) => setEditor(prev => ({ ...prev, title: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"/>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Description</label>
            <textarea value={editor.description} onChange={(e) => setEditor(prev => ({ ...prev, description: e.target.value }))} rows={3} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"/>
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

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              {type === 'SOP' ? 'SOP file URL (optional)' : 'File URL (optional)'}
            </label>
            <input value={editor.fileUrl} onChange={(e) => setEditor(prev => ({ ...prev, fileUrl: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" placeholder="https://…"/>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Body</label>
            <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
              <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                {type === 'SOP' ? 'SOP Document Editor' : 'Form Body Editor'}
              </div>
              <div className="p-3">
                <ReactQuill theme="snow" value={editor.body} onChange={(value) => setEditor(prev => ({ ...prev, body: value }))} modules={quillModules} formats={quillFormats}/>
              </div>
            </div>
          </div>

          {type === 'EMPLOYMENT_FORM' && (<div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Form fields</div>
                <button type="button" onClick={() => setEditor(prev => ({ ...prev, fields: [...prev.fields, { id: crypto.randomUUID(), label: 'New field', type: 'text', required: true }] }))} className="px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                  Add field
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {editor.fields.length === 0 ? (<div className="text-sm text-slate-500">No fields yet.</div>) : (editor.fields.map((f, idx) => (<div key={f.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900/40">
                      <div className="md:col-span-6">
                        <input value={f.label} onChange={(e) => setEditor(prev => {
                    const copy = [...prev.fields];
                    copy[idx] = { ...copy[idx], label: e.target.value };
                    return { ...prev, fields: copy };
                })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" placeholder="Label"/>
                      </div>
                      <div className="md:col-span-3">
                        <select value={f.type} onChange={(e) => setEditor(prev => {
                    const copy = [...prev.fields];
                    copy[idx] = { ...copy[idx], type: e.target.value };
                    return { ...prev, fields: copy };
                })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                          <option value="text">Text</option>
                          <option value="textarea">Textarea</option>
                          <option value="date">Date</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                      </div>
                      <div className="md:col-span-2 flex items-center gap-2">
                        <input type="checkbox" checked={f.required} onChange={(e) => setEditor(prev => {
                    const copy = [...prev.fields];
                    copy[idx] = { ...copy[idx], required: e.target.checked };
                    return { ...prev, fields: copy };
                })} className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"/>
                        <div className="text-sm text-slate-700 dark:text-slate-200">Required</div>
                      </div>
                      <div className="md:col-span-1 flex items-center justify-end">
                        <button type="button" onClick={() => setEditor(prev => ({ ...prev, fields: prev.fields.filter(x => x.id !== f.id) }))} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600" title="Remove">
                          <lucide_react_1.Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </div>)))}
              </div>
            </div>)}

          <div className="md:col-span-2 flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={true} onChange={(e) => setEditor(prev => ({ ...prev, requiresSignature: e.target.checked }))} disabled={true} className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 disabled:opacity-60"/>
              Require signature
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={type === 'SOP' ? true : editor.acknowledgementRequired} onChange={(e) => setEditor(prev => ({ ...prev, acknowledgementRequired: e.target.checked }))} disabled={type === 'SOP'} className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 disabled:opacity-60"/>
              Acknowledgement required
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button type="button" onClick={() => setEditor(prev => ({ ...prev, open: false }))} className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white">
            Cancel
          </button>
          <Modal_1.ModalActionButton kind="submit" onClick={() => save()} disabled={editor.saving}>
            {editor.saving ? 'Saving…' : editor.id ? 'Save changes' : 'Create'}
          </Modal_1.ModalActionButton>
        </div>
      </Modal_1.Modal>

      <Modal_1.Modal isOpen={assignModal.open} onClose={() => setAssignModal(prev => ({ ...prev, open: false }))} title="Assign to employees" maxWidth="max-w-xl">
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={assignModal.assignAll} onChange={(e) => setAssignModal(prev => ({ ...prev, assignAll: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"/>
            Assign to all active employees
          </label>

          {!assignModal.assignAll && (<div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Employee</div>
              <select value={assignModal.employeeId} onChange={(e) => setAssignModal(prev => ({ ...prev, employeeId: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                <option value="unassigned">Select employee</option>
                {employees
                .filter(e => e.status === 'ACTIVE')
                .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''))
                .map(e => (<option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName}
                    </option>))}
              </select>
            </div>)}

          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Due date (optional)</div>
            <input type="date" value={assignModal.dueAt} onChange={(e) => setAssignModal(prev => ({ ...prev, dueAt: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <button type="button" onClick={() => setAssignModal(prev => ({ ...prev, open: false }))} className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white">
            Cancel
          </button>
          <Modal_1.ModalActionButton kind="submit" onClick={() => assign()} disabled={assignModal.saving}>
            {assignModal.saving ? 'Assigning…' : 'Assign'}
          </Modal_1.ModalActionButton>
        </div>
      </Modal_1.Modal>

      <Modal_1.Modal isOpen={submissionsModal.open} onClose={() => setSubmissionsModal(prev => ({ ...prev, open: false }))} title="Assignments" maxWidth="max-w-4xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Submitted</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Signature</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {submissionsModal.loading ? (<tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td>
                </tr>) : submissionsModal.rows.length === 0 ? (<tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No assignments found.</td>
                </tr>) : (submissionsModal.rows.map(r => {
            const due = r.dueAt ? new Date(r.dueAt) : null;
            const overdue = r.status !== 'SUBMITTED' && due && (0, date_fns_1.isBefore)(due, new Date());
            return (<tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                        {r.employee.firstName} {r.employee.lastName}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${r.status === 'SUBMITTED'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {due ? (<span className={`${overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-700 dark:text-slate-200'}`}>
                            {(0, date_fns_1.format)(due, 'd MMM yyyy')}
                          </span>) : (<span className="text-slate-500">—</span>)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                        {r.submittedAt ? (0, date_fns_1.format)(new Date(r.submittedAt), 'd MMM yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                        {r.signatureName || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === 'SUBMITTED' && (<a href={`/dashboard/forms/${r.id}/print`} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 inline-flex items-center gap-2">
                            <lucide_react_1.CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-300"/>
                            View PDF
                          </a>)}
                      </td>
                    </tr>);
        }))}
            </tbody>
          </table>
        </div>
      </Modal_1.Modal>

      <ConfirmModal_1.ConfirmModal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, id: undefined, isLoading: false })} onConfirm={archive} title="Archive template" message="Archive this template? Existing employee assignments remain accessible." confirmText="Archive" cancelText="Cancel" variant="danger" isLoading={deleteConfirm.isLoading}/>
    </div>);
}
function StatCard({ label, value, danger }) {
    return (<div className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between ${danger ? 'ring-1 ring-red-200 dark:ring-red-900/40' : ''}`}>
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</div>
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${danger ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-200'}`}>
        <lucide_react_1.CheckCircle2 className="w-4 h-4"/>
      </div>
    </div>);
}
