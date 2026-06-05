'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useBusiness } from '@/context/business-context';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { resolveFileUrl } from '@/lib/file-url';
import { Plus, RefreshCw, Search, Filter, FileText, Upload, ShieldCheck, AlertCircle, Calendar, User, Download } from 'lucide-react';

type Employee = { id: string; firstName: string; lastName: string; email?: string };

type ComplianceDocument = {
  id: string;
  businessId: string;
  title: string;
  category: string;
  status: string;
  version?: string | null;
  effectiveDate?: string | null;
  reviewDate?: string | null;
  ownerEmployeeId?: string | null;
  acknowledgementRequired?: boolean;
  tags?: string | null;
  fileUrl?: string | null;
  ownerEmployee?: Employee | null;
};

export default function ComplianceDocumentsPage() {
  const { selectedBusiness } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [docs, setDocs] = useState<ComplianceDocument[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profile, setProfile] = useState<{ role?: string; email?: string } | null>(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [ownerFilter, setOwnerFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'POLICY',
    status: 'ACTIVE',
    version: '',
    effectiveDate: format(new Date(), 'yyyy-MM-dd'),
    reviewDate: '',
    ownerEmployeeId: '',
    acknowledgementRequired: false,
    tags: '',
  });

  const canEdit = profile?.role === 'SUPER_ADMIN' || profile?.role === 'BUSINESS_ADMIN';

  const load = async () => {
    setLoading(true);
    try {
      const [profileRes, docsRes, employeesRes] = await Promise.all([
        api.get('/auth/profile').catch(() => ({ data: null })),
        api.get('/compliance-documents'),
        api.get('/employees', { params: { status: 'ACTIVE' } }).catch(() => ({ data: [] })),
      ]);
      setProfile(profileRes.data || null);
      setDocs(Array.isArray(docsRes.data) ? docsRes.data : []);
      setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load compliance documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = async () => {
    try {
      setRefreshing(true);
      await load();
      toast.success('Refreshed');
    } finally {
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: '',
      category: 'POLICY',
      status: 'ACTIVE',
      version: '',
      effectiveDate: format(new Date(), 'yyyy-MM-dd'),
      reviewDate: '',
      ownerEmployeeId: '',
      acknowledgementRequired: false,
      tags: '',
    });
    setFile(null);
  };

  const openAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (d: ComplianceDocument) => {
    setEditingId(d.id);
    setFormData({
      title: d.title || '',
      category: d.category || 'POLICY',
      status: d.status || 'ACTIVE',
      version: d.version || '',
      effectiveDate: d.effectiveDate ? d.effectiveDate.slice(0, 10) : format(new Date(), 'yyyy-MM-dd'),
      reviewDate: d.reviewDate ? d.reviewDate.slice(0, 10) : '',
      ownerEmployeeId: d.ownerEmployeeId || '',
      acknowledgementRequired: !!d.acknowledgementRequired,
      tags: d.tags || '',
    });
    setFile(null);
    setIsModalOpen(true);
  };

  const uploadFile = async (f: File) => {
    const body = new FormData();
    body.append('file', f);
    const res = await api.post('/uploads', body, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data?.url as string;
  };

  const saveDoc = async () => {
    const title = formData.title.trim();
    if (!title) {
      toast.error('Title is required');
      return;
    }
    try {
      setSaving(true);
      let fileUrl: string | undefined;
      if (file) fileUrl = await uploadFile(file);
      const payload: any = {
        title,
        category: formData.category,
        status: formData.status,
        version: formData.version.trim() || undefined,
        effectiveDate: formData.effectiveDate ? new Date(formData.effectiveDate).toISOString() : undefined,
        reviewDate: formData.reviewDate ? new Date(formData.reviewDate).toISOString() : undefined,
        ownerEmployeeId: formData.ownerEmployeeId || undefined,
        acknowledgementRequired: !!formData.acknowledgementRequired,
        tags: formData.tags.trim() || undefined,
        ...(fileUrl ? { fileUrl } : {}),
      };
      if (editingId) {
        await api.patch(`/compliance-documents/${editingId}`, payload);
        toast.success('Document updated');
      } else {
        await api.post('/compliance-documents', payload);
        toast.success('Document created');
      }
      setIsModalOpen(false);
      resetForm();
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const deleteDoc = async (id: string) => {
    try {
      await api.delete(`/compliance-documents/${id}`);
      toast.success('Document removed');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to remove document');
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => {
      const matchesSearch =
        d.title.toLowerCase().includes(q) ||
        (d.tags || '').toLowerCase().includes(q) ||
        (d.ownerEmployee ? `${d.ownerEmployee.firstName} ${d.ownerEmployee.lastName}`.toLowerCase().includes(q) : false);
      const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
      const matchesCategory = categoryFilter === 'ALL' || d.category === categoryFilter;
      const matchesOwner = ownerFilter === 'ALL' || d.ownerEmployeeId === ownerFilter;
      return matchesSearch && matchesStatus && matchesCategory && matchesOwner;
    });
  }, [docs, query, statusFilter, categoryFilter, ownerFilter]);

  const stats = useMemo(() => {
    const total = docs.length;
    const active = docs.filter((d) => d.status === 'ACTIVE').length;
    const draft = docs.filter((d) => d.status === 'DRAFT').length;
    const archived = docs.filter((d) => d.status === 'ARCHIVED').length;
    const dueSoon = docs.filter((d) => {
      if (!d.reviewDate) return false;
      const days = Math.ceil((new Date(d.reviewDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 30;
    }).length;
    return { total, active, draft, archived, dueSoon };
  }, [docs]);

  const exportCSV = () => {
    const rows = filtered.map((d) => ({
      title: d.title,
      category: d.category,
      status: d.status,
      version: d.version || '',
      effectiveDate: d.effectiveDate || '',
      reviewDate: d.reviewDate || '',
      owner: d.ownerEmployee ? `${d.ownerEmployee.firstName} ${d.ownerEmployee.lastName}` : '',
      acknowledgementRequired: d.acknowledgementRequired ? 'YES' : 'NO',
      tags: d.tags || '',
      fileUrl: d.fileUrl || '',
    }));
    const headers = Object.keys(rows[0] || { title: '' });
    const escape = (v: any) => {
      const s = String(v ?? '');
      if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.split('"').join('""')}"`;
      return s;
    };
    const csv = [headers.map(escape).join(',')].concat(rows.map((r) => headers.map((h) => escape((r as any)[h])).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance_documents_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Documents</h1>
          <p className="text-gray-500 mt-1">Central library for policies, SOPs, training and compliance documentation.</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Document
            </button>
          )}
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total" value={`${stats.total}`} icon={ShieldCheck} />
        <StatCard title="Active" value={`${stats.active}`} icon={ShieldCheck} />
        <StatCard title="Draft" value={`${stats.draft}`} icon={FileText} />
        <StatCard title="Archived" value={`${stats.archived}`} icon={FileText} />
        <StatCard title="Review Due (30d)" value={`${stats.dueSoon}`} icon={AlertCircle} />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search title, tags, owner..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">All Categories</option>
            <option value="POLICY">Policy</option>
            <option value="SOP">SOP</option>
            <option value="TRAINING">Training</option>
            <option value="OSHA">OSHA</option>
            <option value="HR">HR</option>
            <option value="SECURITY">Security</option>
            <option value="OTHER">Other</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
            <option value="ALL">All Owners</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Review</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No documents found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{d.title}</div>
                      <div className="text-xs text-gray-500">{d.version ? `v${d.version}` : ''}{d.acknowledgementRequired ? (d.version ? ' • Acknowledgement required' : 'Acknowledgement required') : ''}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{d.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        d.status === 'ACTIVE' ? 'bg-green-100 text-green-800 border-green-200' : d.status === 'DRAFT' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>{d.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      {d.ownerEmployee ? (
                        <div className="flex items-center gap-1 text-xs text-gray-700">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {d.ownerEmployee.firstName} {d.ownerEmployee.lastName}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {d.reviewDate ? (
                        <div className="flex items-center gap-1 text-xs text-gray-700">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(d.reviewDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-600">{d.tags || '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {d.fileUrl && (
                          <a href={resolveFileUrl(d.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 transition-colors" title="View Document">
                            <FileText className="w-4 h-4" />
                          </a>
                        )}
                        {canEdit && (
                          <>
                            <button type="button" onClick={() => openEdit(d)} className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-sm font-medium transition-colors">
                              Edit
                            </button>
                            <button type="button" onClick={() => deleteDoc(d.id)} className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-sm font-medium transition-colors">
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingId ? 'Update compliance document' : 'Add compliance document'} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Use of Force Policy" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={formData.category} onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
              <input value={formData.version} onChange={(e) => setFormData((p) => ({ ...p, version: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
              <select value={formData.ownerEmployeeId} onChange={(e) => setFormData((p) => ({ ...p, ownerEmployeeId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">None</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} {emp.email ? `— ${emp.email}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
              <input type="date" value={formData.effectiveDate} onChange={(e) => setFormData((p) => ({ ...p, effectiveDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Date</label>
              <input type="date" value={formData.reviewDate} onChange={(e) => setFormData((p) => ({ ...p, reviewDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input value={formData.tags} onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional (comma-separated)" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Acknowledgement required</label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={formData.acknowledgementRequired} onChange={(e) => setFormData((p) => ({ ...p, acknowledgementRequired: e.target.checked }))} />
                Employees must acknowledge this document
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Document</label>
              <div className="flex items-center gap-3">
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-700" />
                <Upload className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-xs text-gray-500 mt-1">Upload a PDF or image. Existing file is kept unless you upload a new one.</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" disabled={saving} onClick={saveDoc} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string; icon: any }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
    <div className="flex items-center justify-between">
      <span className="text-gray-500 text-sm font-medium">{title}</span>
      <Icon className="w-5 h-5 text-blue-500" />
    </div>
    <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
  </div>
);

