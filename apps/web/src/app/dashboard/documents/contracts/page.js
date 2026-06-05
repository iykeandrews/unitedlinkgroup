"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ContractsPage;
const react_1 = require("react");
const api_1 = __importDefault(require("@/lib/api"));
const business_context_1 = require("@/context/business-context");
const date_fns_1 = require("date-fns");
const sonner_1 = require("sonner");
const lucide_react_1 = require("lucide-react");
const file_url_1 = require("@/lib/file-url");
const Modal_1 = require("@/components/Modal");
function ContractsPage() {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [refreshing, setRefreshing] = (0, react_1.useState)(false);
    const [contracts, setContracts] = (0, react_1.useState)([]);
    const [employees, setEmployees] = (0, react_1.useState)([]);
    const [clients, setClients] = (0, react_1.useState)([]);
    const [query, setQuery] = (0, react_1.useState)('');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('ALL');
    const [typeFilter, setTypeFilter] = (0, react_1.useState)('ALL');
    const [isModalOpen, setIsModalOpen] = (0, react_1.useState)(false);
    const [editingId, setEditingId] = (0, react_1.useState)(null);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [file, setFile] = (0, react_1.useState)(null);
    const [formData, setFormData] = (0, react_1.useState)({
        title: '',
        type: 'EMPLOYMENT',
        status: 'DRAFT',
        employeeId: '',
        clientId: '',
        counterpartyName: '',
        effectiveDate: (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd'),
        endDate: '',
    });
    const load = async () => {
        var _a, _b;
        setLoading(true);
        try {
            const [contractsRes, employeesRes, clientsRes] = await Promise.all([
                api_1.default.get('/contracts'),
                api_1.default.get('/employees', { params: { status: 'ACTIVE' } }),
                api_1.default.get('/clients', { params: { status: 'ACTIVE' } }),
            ]);
            setContracts(Array.isArray(contractsRes.data) ? contractsRes.data : []);
            setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : []);
            setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
        }
        catch (e) {
            sonner_1.toast.error(((_b = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to load contracts');
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        load();
    }, []);
    const refresh = async () => {
        try {
            setRefreshing(true);
            await load();
            sonner_1.toast.success('Refreshed');
        }
        finally {
            setRefreshing(false);
        }
    };
    const resetForm = () => {
        setEditingId(null);
        setFormData({
            title: '',
            type: 'EMPLOYMENT',
            status: 'DRAFT',
            employeeId: '',
            clientId: '',
            counterpartyName: '',
            effectiveDate: (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd'),
            endDate: '',
        });
        setFile(null);
    };
    const openAdd = () => {
        resetForm();
        setIsModalOpen(true);
    };
    const openEdit = (c) => {
        setEditingId(c.id);
        setFormData({
            title: c.title || '',
            type: c.type || 'EMPLOYMENT',
            status: c.status || 'DRAFT',
            employeeId: c.employeeId || '',
            clientId: c.clientId || '',
            counterpartyName: c.counterpartyName || '',
            effectiveDate: c.effectiveDate ? c.effectiveDate.slice(0, 10) : (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd'),
            endDate: c.endDate ? c.endDate.slice(0, 10) : '',
        });
        setFile(null);
        setIsModalOpen(true);
    };
    const uploadFile = async (f) => {
        var _a;
        const body = new FormData();
        body.append('file', f);
        const res = await api_1.default.post('/uploads', body, { headers: { 'Content-Type': 'multipart/form-data' } });
        return (_a = res.data) === null || _a === void 0 ? void 0 : _a.url;
    };
    const saveContract = async () => {
        var _a, _b, _c;
        const title = formData.title.trim();
        if (!title) {
            sonner_1.toast.error('Title is required');
            return;
        }
        try {
            setSaving(true);
            let fileUrl = undefined;
            if (file) {
                fileUrl = await uploadFile(file);
            }
            const payload = {
                title,
                type: formData.type,
                status: formData.status,
                employeeId: formData.employeeId || undefined,
                clientId: formData.clientId || undefined,
                counterpartyName: ((_a = formData.counterpartyName) === null || _a === void 0 ? void 0 : _a.trim()) || undefined,
                effectiveDate: formData.effectiveDate ? new Date(formData.effectiveDate).toISOString() : undefined,
                endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
                ...(fileUrl ? { fileUrl } : {}),
            };
            if (editingId) {
                await api_1.default.patch(`/contracts/${editingId}`, payload);
                sonner_1.toast.success('Contract updated');
            }
            else {
                await api_1.default.post('/contracts', payload);
                sonner_1.toast.success('Contract added');
            }
            setIsModalOpen(false);
            resetForm();
            await load();
        }
        catch (e) {
            sonner_1.toast.error(((_c = (_b = e === null || e === void 0 ? void 0 : e.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || 'Failed to save contract');
        }
        finally {
            setSaving(false);
        }
    };
    const deleteContract = async (id) => {
        var _a, _b;
        try {
            await api_1.default.delete(`/contracts/${id}`);
            sonner_1.toast.success('Contract removed');
            await load();
        }
        catch (e) {
            sonner_1.toast.error(((_b = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to remove contract');
        }
    };
    const filtered = (0, react_1.useMemo)(() => {
        const q = query.trim().toLowerCase();
        return contracts.filter((c) => {
            const matchesSearch = c.title.toLowerCase().includes(q) ||
                (c.employee ? `${c.employee.firstName} ${c.employee.lastName}`.toLowerCase().includes(q) : false) ||
                (c.client ? c.client.name.toLowerCase().includes(q) : false) ||
                (c.counterpartyName || '').toLowerCase().includes(q);
            const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
            const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [contracts, query, statusFilter, typeFilter]);
    const stats = (0, react_1.useMemo)(() => {
        const total = contracts.length;
        const active = contracts.filter((c) => c.status === 'ACTIVE').length;
        const expired = contracts.filter((c) => c.status === 'EXPIRED').length;
        const draft = contracts.filter((c) => c.status === 'DRAFT').length;
        return { total, active, expired, draft };
    }, [contracts]);
    if (loading) {
        return (<div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"/>
      </div>);
    }
    return (<div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-gray-500 mt-1">Manage employment, client and legal contracts, attach documents, and track statuses.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            <lucide_react_1.Plus className="w-4 h-4"/>
            New Contract
          </button>
          <button onClick={refresh} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-60">
            <lucide_react_1.RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}/>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total" value={`${stats.total}`}/>
        <StatCard title="Active" value={`${stats.active}`}/>
        <StatCard title="Draft" value={`${stats.draft}`}/>
        <StatCard title="Expired" value={`${stats.expired}`}/>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/>
          <input type="text" placeholder="Search contracts, employees, clients..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={query} onChange={(e) => setQuery(e.target.value)}/>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="TERMINATED">Terminated</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="ALL">All Types</option>
            <option value="EMPLOYMENT">Employment</option>
            <option value="CLIENT">Client</option>
            <option value="NDA">NDA</option>
            <option value="MSA">MSA</option>
            <option value="SOW">SOW</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Parties</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (<tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No contracts found matching your filters.
                  </td>
                </tr>) : (filtered.map((c) => (<tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{c.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {c.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.status === 'ACTIVE'
                ? 'bg-green-100 text-green-800 border-green-200'
                : c.status === 'EXPIRED'
                    ? 'bg-red-100 text-red-800 border-red-200'
                    : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs text-gray-700">
                        {c.employee && (<div className="flex items-center gap-1">
                            <lucide_react_1.User className="w-3.5 h-3.5 text-gray-400"/>
                            {c.employee.firstName} {c.employee.lastName}
                          </div>)}
                        {c.client && (<div className="flex items-center gap-1">
                            <lucide_react_1.Building2 className="w-3.5 h-3.5 text-gray-400"/>
                            {c.client.name}
                          </div>)}
                        {c.counterpartyName && <div className="text-gray-500">{c.counterpartyName}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-700">
                        <div>Effective: {c.effectiveDate ? new Date(c.effectiveDate).toLocaleDateString() : '—'}</div>
                        <div>End: {c.endDate ? new Date(c.endDate).toLocaleDateString() : '—'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {c.fileUrl && (<a href={(0, file_url_1.resolveFileUrl)(c.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 transition-colors" title="View Document">
                            <lucide_react_1.FileText className="w-4 h-4"/>
                          </a>)}
                        <button type="button" onClick={() => openEdit(c)} className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-sm font-medium transition-colors">
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteContract(c.id)} className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-sm font-medium transition-colors">
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>)))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal_1.Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingId ? 'Update contract' : 'Add contract'} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Employment Agreement"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={formData.type} onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="EMPLOYMENT">Employment</option>
                <option value="CLIENT">Client</option>
                <option value="NDA">NDA</option>
                <option value="MSA">MSA</option>
                <option value="SOW">SOW</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <select value={formData.employeeId} onChange={(e) => setFormData((p) => ({ ...p, employeeId: e.target.value, clientId: '' }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">None</option>
                {employees.map((emp) => (<option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} {emp.email ? `— ${emp.email}` : ''}
                  </option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select value={formData.clientId} onChange={(e) => setFormData((p) => ({ ...p, clientId: e.target.value, employeeId: '' }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">None</option>
                {clients.map((cl) => (<option key={cl.id} value={cl.id}>
                    {cl.name}
                  </option>))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Counterparty Name</label>
              <input value={formData.counterpartyName} onChange={(e) => setFormData((p) => ({ ...p, counterpartyName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
              <input type="date" value={formData.effectiveDate} onChange={(e) => setFormData((p) => ({ ...p, effectiveDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={formData.endDate} onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Document</label>
              <div className="flex items-center gap-3">
                <input type="file" onChange={(e) => { var _a; return setFile(((_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]) || null); }} className="block w-full text-sm text-gray-700"/>
                <lucide_react_1.Upload className="w-4 h-4 text-gray-400"/>
              </div>
              <div className="text-xs text-gray-500 mt-1">Upload a PDF or image of the contract.</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={() => {
            setIsModalOpen(false);
            resetForm();
        }} className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" disabled={saving} onClick={saveContract} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal_1.Modal>
    </div>);
}
const StatCard = ({ title, value }) => (<div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
    <div className="text-xs font-semibold text-gray-500">{title}</div>
    <div className="mt-2 text-lg font-bold text-gray-900">{value}</div>
  </div>);
