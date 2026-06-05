import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Plus, FileText, Download, Trash2, Edit2, X, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';
import { useBusiness } from '../context/business-context';
import { formatDate } from '../lib/localization';
import { resolveFileUrl } from '../lib/file-url';

interface Qualification {
  id: string;
  name: string;
  type: string;
  issuingOrganization?: string;
  credentialId?: string;
  issueDate?: string;
  expiryDate?: string;
  fileUrl?: string;
  status: string;
}

export interface EmployeeQualificationsTabRef {
  openAddModal: () => void;
}

interface EmployeeQualificationsTabProps {
  employeeId: string;
  highlightId?: string;
  hideHeader?: boolean;
  className?: string;
}

export const EmployeeQualificationsTab = forwardRef<EmployeeQualificationsTabRef, EmployeeQualificationsTabProps>(({ employeeId, highlightId, hideHeader, className }, ref) => {
  const { selectedBusiness } = useBusiness();
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'CERTIFICATION',
    issuingOrganization: '',
    credentialId: '',
    issueDate: '',
    expiryDate: '',
    fileUrl: '',
    status: 'ACTIVE'
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showBanner, setShowBanner] = useState(true);

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      type: 'CERTIFICATION',
      issuingOrganization: '',
      credentialId: '',
      issueDate: '',
      expiryDate: '',
      fileUrl: '',
      status: 'ACTIVE'
    });
    setUploading(false);
    setUploadProgress(0);
  };

  useImperativeHandle(ref, () => ({
    openAddModal: () => {
      resetForm();
      setIsModalOpen(true);
    }
  }));

  const fetchQualifications = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/employees/${employeeId}/qualifications`);
      setQualifications(res.data);
    } catch (error) {
      console.error('Failed to fetch qualifications', error);
      toast.error('Failed to load qualifications');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchQualifications();
  }, [fetchQualifications]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit');
      e.target.value = ''; // Reset input
      return;
    }

    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    setUploadProgress(1);
    api
      .post('/uploads', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          const total = evt.total || file.size;
          if (!total) return;
          const pct = Math.max(1, Math.min(99, Math.round((evt.loaded / total) * 100)));
          setUploadProgress(pct);
        },
      })
      .then((res) => {
        const url = res.data?.url as string;
        if (!url) throw new Error('Upload failed');
        setFormData((prev) => ({ ...prev, fileUrl: url }));
        toast.success('File uploaded successfully');
      })
      .catch((error: any) => {
        toast.error(error?.response?.data?.message || error?.message || 'Upload failed');
        setFormData((prev) => ({ ...prev, fileUrl: '' }));
      })
      .finally(() => {
        setUploading(false);
        setUploadProgress(0);
        e.target.value = '';
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...formData };
      
      // Handle Date fields - convert to ISO string if present
      if (payload.issueDate) {
        payload.issueDate = new Date(payload.issueDate).toISOString();
      } else {
        delete payload.issueDate;
      }

      if (payload.expiryDate) {
        payload.expiryDate = new Date(payload.expiryDate).toISOString();
      } else {
        delete payload.expiryDate;
      }

      // Remove empty optional fields
      if (!payload.issuingOrganization) delete payload.issuingOrganization;
      if (!payload.credentialId) delete payload.credentialId;
      if (!payload.fileUrl) delete payload.fileUrl;

      if (editingId) {
        await api.patch(`/employees/${employeeId}/qualifications/${editingId}`, payload);
        toast.success('Qualification updated');
      } else {
        await api.post(`/employees/${employeeId}/qualifications`, payload);
        toast.success('Qualification added');
      }
      setIsModalOpen(false);
      resetForm();
      fetchQualifications();
    } catch (error) {
      console.error('Save failed', error);
      toast.error('Failed to save qualification');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this qualification?')) return;
    try {
      await api.delete(`/employees/${employeeId}/qualifications/${id}`);
      toast.success('Qualification deleted');
      fetchQualifications();
    } catch (error) {
      console.error('Delete failed', error);
      toast.error('Failed to delete qualification');
    }
  };

  const openEdit = (qual: Qualification) => {
    setEditingId(qual.id);
    setFormData({
      name: qual.name,
      type: qual.type,
      issuingOrganization: qual.issuingOrganization || '',
      credentialId: qual.credentialId || '',
      issueDate: qual.issueDate ? new Date(qual.issueDate).toISOString().split('T')[0] : '',
      expiryDate: qual.expiryDate ? new Date(qual.expiryDate).toISOString().split('T')[0] : '',
      fileUrl: qual.fileUrl || '',
      status: qual.status
    });
    setIsModalOpen(true);
  };

  const expiringCount = qualifications.filter(q => {
    if (q.status === 'EXPIRED') return true;
    if (!q.expiryDate || q.status !== 'ACTIVE') return false;
    const days = Math.ceil((new Date(q.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days <= 90;
  }).length;

  return (
    <div className={className ?? "p-6"}>
      {expiringCount > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-red-900">Action Required</h4>
            <p className="text-sm text-red-700 mt-1">
              There are {expiringCount} qualification(s) that have expired or are expiring soon. Please review and update them.
            </p>
          </div>
        </div>
      )}

      {!hideHeader && (
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium">Qualifications & Certifications</h3>
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add Qualification
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading qualifications...</div>
      ) : qualifications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-sm font-medium text-gray-900">No qualifications yet</h3>
          <p className="mt-1 text-sm text-gray-500">Add certifications, licenses, or education records.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {qualifications.map(qual => {
            const daysUntilExpiry = qual.expiryDate ? Math.ceil((new Date(qual.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 999;
            const isExpired = daysUntilExpiry < 0;
            const isExpiringSoon = daysUntilExpiry <= 30 && !isExpired;
            
            return (
              <div 
                key={qual.id} 
                id={`qualification-${qual.id}`}
                className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300 ${highlightId === qual.id ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">{qual.name}</h4>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      qual.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 
                      qual.status === 'EXPIRED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      {qual.type} • {qual.status}
                    </span>
                    {qual.expiryDate && qual.status === 'ACTIVE' && (
                      (() => {
                        const days = Math.ceil((new Date(qual.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        if (days <= 30) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center gap-1"><AlertCircle size={10} /> Expiring Soon ({days} days)</span>;
                        if (days <= 60) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">Expiring in 2 months</span>;
                        if (days <= 90) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">Expiring in 3 months</span>;
                        return null;
                      })()
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(qual)} className="p-1 text-gray-500 hover:text-blue-600 rounded">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(qual.id)} className="p-1 text-gray-500 hover:text-red-600 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-1 text-sm text-gray-600 mt-3">
                {qual.issuingOrganization && (
                  <div className="flex justify-between">
                    <span>Issuer:</span>
                    <span className="font-medium">{qual.issuingOrganization}</span>
                  </div>
                )}
                {qual.credentialId && (
                  <div className="flex justify-between">
                    <span>ID:</span>
                    <span className="font-medium">{qual.credentialId}</span>
                  </div>
                )}
                {qual.expiryDate && (
                  <div className="flex justify-between">
                    <span>Expires:</span>
                    <span className={`font-medium ${new Date(qual.expiryDate) < new Date() ? 'text-red-600' : ''}`}>
                      {formatDate(qual.expiryDate, selectedBusiness?.country)}
                    </span>
                  </div>
                )}
              </div>

              {qual.fileUrl && (
                <div className="mt-4 pt-3 border-t">
                  <a 
                    href={resolveFileUrl(qual.fileUrl)}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                  >
                    <Download size={16} />
                    View Document
                  </a>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">{editingId ? 'Edit' : 'Add'} Qualification</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qualification Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Security Guard License"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="CERTIFICATION">Certification</option>
                    <option value="LICENSE">License</option>
                    <option value="EDUCATION">Education</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="REVOKED">Revoked</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Organization</label>
                <input
                  type="text"
                  value={formData.issuingOrganization}
                  onChange={e => setFormData({...formData, issuingOrganization: e.target.value})}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credential ID</label>
                <input
                  type="text"
                  value={formData.credentialId}
                  onChange={e => setFormData({...formData, credentialId: e.target.value})}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={e => setFormData({...formData, issueDate: e.target.value})}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {uploading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                  )}
                </div>
                {formData.fileUrl && !uploading && (
                  <div className="mt-1 flex items-center justify-between p-2 bg-green-50 rounded border border-green-100">
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <FileText size={12} /> Document attached
                    </p>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, fileUrl: '' }))}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {editingId ? 'Update' : 'Save'} Qualification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

EmployeeQualificationsTab.displayName = 'EmployeeQualificationsTab';
