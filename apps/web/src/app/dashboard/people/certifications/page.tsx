'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  Download, 
  Award, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  FileText,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  Upload
} from 'lucide-react';
import api from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { UserRole } from '@unitedlinkgroup/types';
import { Modal } from '@/components/Modal';
import { resolveFileUrl } from '@/lib/file-url';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email?: string;
}

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
  employee?: Employee;
}

interface CompanyCertification {
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

export default function CertificationsPage() {
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyCertifications, setCompanyCertifications] = useState<CompanyCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Qualification | 'employeeName'; direction: 'asc' | 'desc' }>({ key: 'expiryDate', direction: 'asc' });
  const [userRole, setUserRole] = useState<string | null>(null);
  const isEmployee = userRole === UserRole.EMPLOYEE;
  const canManageAll = userRole === UserRole.SUPER_ADMIN;
  const [scope, setScope] = useState<'EMPLOYEES' | 'COMPANY'>('EMPLOYEES');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    type: 'CERTIFICATION',
    issuingOrganization: '',
    credentialId: '',
    issueDate: '',
    expiryDate: '',
  });

  useEffect(() => {
    fetchQualifications();
  }, []);

  const fetchQualifications = async () => {
    try {
      setLoading(true);
      const profileRes = await api.get('/auth/profile');
      const role = profileRes.data?.role || null;
      setUserRole(role);

      const endpoint = role === UserRole.EMPLOYEE ? '/employees/me/qualifications' : '/employees/qualifications/all';
      const response = await api.get(endpoint);
      setQualifications(response.data || []);

      if (role === UserRole.SUPER_ADMIN) {
        try {
          const empRes = await api.get('/employees', { params: { status: 'ACTIVE' } });
          setEmployees(empRes.data || []);
        } catch (e) {
          setEmployees([]);
        }
        try {
          const companyRes = await api.get('/company-certifications');
          setCompanyCertifications(companyRes.data || []);
        } catch (e) {
          setCompanyCertifications([]);
        }
      } else {
        setEmployees([]);
        setCompanyCertifications([]);
      }
    } catch (error) {
      console.error('Failed to fetch qualifications', error);
      toast.error('Failed to load certifications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string, expiryDate?: string) => {
    if (status === 'EXPIRED') return 'bg-red-100 text-red-800 border-red-200';
    
    if (expiryDate) {
      const daysUntilExpiry = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 0) return 'bg-red-100 text-red-800 border-red-200';
      if (daysUntilExpiry <= 30) return 'bg-orange-100 text-orange-800 border-orange-200';
      if (daysUntilExpiry <= 90) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getStatusText = (status: string, expiryDate?: string) => {
    if (status === 'EXPIRED') return 'Expired';
    
    if (expiryDate) {
      const daysUntilExpiry = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 0) return 'Expired';
      if (daysUntilExpiry <= 30) return `Expiring in ${daysUntilExpiry} days`;
      if (daysUntilExpiry <= 90) return `Expiring in ${Math.ceil(daysUntilExpiry / 30)} months`;
    }
    
    return 'Active';
  };

  const handleSort = (key: keyof Qualification | 'employeeName') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredQualifications = qualifications.filter(qual => {
    const q = searchQuery.toLowerCase();
    const employeeName = qual.employee ? `${qual.employee.firstName} ${qual.employee.lastName}`.toLowerCase() : '';
    const matchesSearch = employeeName.includes(q) || 
                          qual.name.toLowerCase().includes(q) ||
                          (qual.credentialId || '').toLowerCase().includes(q);
    
    const matchesStatus = statusFilter === 'ALL' || qual.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || qual.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredCompanyCertifications = companyCertifications.filter((qual) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      qual.name.toLowerCase().includes(q) ||
      (qual.credentialId || '').toLowerCase().includes(q) ||
      (qual.issuingOrganization || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || qual.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || qual.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const sortedQualifications = [...filteredQualifications].sort((a, b) => {
    if (sortConfig.key === 'employeeName') {
      const nameA = a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : '';
      const nameB = b.employee ? `${b.employee.firstName} ${b.employee.lastName}` : '';
      return sortConfig.direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    }

    const valA = a[sortConfig.key];
    const valB = b[sortConfig.key];

    if (!valA && !valB) return 0;
    if (!valA) return 1;
    if (!valB) return -1;

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const sortedCompanyCertifications = [...filteredCompanyCertifications].sort((a, b) => {
    const key = sortConfig.key as any;
    const dir = sortConfig.direction;
    const valA = (a as any)[key];
    const valB = (b as any)[key];
    if (!valA && !valB) return 0;
    if (!valA) return 1;
    if (!valB) return -1;
    if (valA < valB) return dir === 'asc' ? -1 : 1;
    if (valA > valB) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  const stats = {
    total: (scope === 'COMPANY' ? companyCertifications : qualifications).length,
    active: (scope === 'COMPANY' ? companyCertifications : qualifications).filter((q: any) => q.status === 'ACTIVE').length,
    expiringSoon: (scope === 'COMPANY' ? companyCertifications : qualifications).filter((q: any) => {
      if (!q.expiryDate || q.status !== 'ACTIVE') return false;
      const days = Math.ceil((new Date(q.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 90;
    }).length,
    expired: (scope === 'COMPANY' ? companyCertifications : qualifications).filter((q: any) => {
      if (q.status === 'EXPIRED') return true;
      if (!q.expiryDate) return false;
      return new Date(q.expiryDate) < new Date();
    }).length
  };

  const handleExport = () => {
    if (isEmployee) return;
    const doc = new jsPDF();
    
    // Get business details
    let businessDetails = {
      name: 'United Link Group',
      address: '',
      phone: '',
      email: ''
    };

    if (typeof window !== 'undefined') {
      const storedBusiness = localStorage.getItem('selectedBusiness');
      if (storedBusiness) {
        try {
          const parsed = JSON.parse(storedBusiness);
          businessDetails = {
            name: parsed.name || 'United Link Group',
            address: parsed.address || '',
            phone: parsed.phone || '',
            email: parsed.email || ''
          };
        } catch (e) {
          console.error('Error parsing business details', e);
        }
      }
    }

    let yPos = 20;

    // Add Business Header
    doc.setFontSize(22);
    doc.setTextColor(33, 37, 41);
    doc.text(businessDetails.name, 14, yPos);
    yPos += 8;

    // Add Business Details (Address, Phone, Email)
    doc.setFontSize(10);
    doc.setTextColor(108, 117, 125);
    
    if (businessDetails.address) {
      doc.text(businessDetails.address, 14, yPos);
      yPos += 5;
    }
    
    const contactInfo = [
      businessDetails.phone && `Phone: ${businessDetails.phone}`,
      businessDetails.email && `Email: ${businessDetails.email}`
    ].filter(Boolean).join(' | ');

    if (contactInfo) {
      doc.text(contactInfo, 14, yPos);
      yPos += 10;
    } else {
        yPos += 5;
    }

    // Add Report Title
    doc.setFontSize(16);
    doc.setTextColor(33, 37, 41);
    doc.text('Certifications & Licenses Report', 14, yPos);
    yPos += 8;

    // Add Date
    doc.setFontSize(10);
    doc.setTextColor(108, 117, 125);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, yPos);
    yPos += 10;

    // Add Stats Summary
    doc.setFontSize(11);
    doc.setTextColor(33, 37, 41);
    doc.text(`Total: ${stats.total} | Active: ${stats.active} | Expiring Soon: ${stats.expiringSoon} | Expired: ${stats.expired}`, 14, yPos);

    const tableColumn = ["Employee", "Qualification", "Type", "Expiry Date", "Status"];
    const tableRows = sortedQualifications
      .filter((qual) => !!qual.employee)
      .map((qual) => [
        `${qual.employee!.firstName} ${qual.employee!.lastName}`,
        qual.name,
        qual.type,
        qual.expiryDate ? new Date(qual.expiryDate).toLocaleDateString() : 'No Expiry',
        getStatusText(qual.status, qual.expiryDate),
      ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: yPos + 10,
      theme: 'grid',
      headStyles: { 
        fillColor: [59, 130, 246], // Blue-500
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak'
      },
      alternateRowStyles: { 
        fillColor: [249, 250, 251] // Gray-50
      },
      columnStyles: {
        0: { fontStyle: 'bold' }, // Employee name bold
        4: { fontStyle: 'italic' } // Status italic
      }
    });

    doc.save(`certifications-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const resetForm = () => {
    setEditingId(null);
    setEditingEmployeeId(null);
    setFormData({
      employeeId: '',
      name: '',
      type: 'CERTIFICATION',
      issuingOrganization: '',
      credentialId: '',
      issueDate: '',
      expiryDate: '',
    });
    setFile(null);
  };

  const openAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (q: Qualification) => {
    setEditingId(q.id);
    setEditingEmployeeId(q.employee?.id || null);
    setFormData({
      employeeId: q.employee?.id || '',
      name: q.name || '',
      type: q.type || 'CERTIFICATION',
      issuingOrganization: q.issuingOrganization || '',
      credentialId: q.credentialId || '',
      issueDate: q.issueDate ? new Date(q.issueDate).toISOString().slice(0, 10) : '',
      expiryDate: q.expiryDate ? new Date(q.expiryDate).toISOString().slice(0, 10) : '',
    });
    setFile(null);
    setIsModalOpen(true);
  };

  const openEditCompany = (q: CompanyCertification) => {
    setEditingId(q.id);
    setEditingEmployeeId(null);
    setFormData({
      employeeId: '',
      name: q.name || '',
      type: q.type || 'CERTIFICATION',
      issuingOrganization: q.issuingOrganization || '',
      credentialId: q.credentialId || '',
      issueDate: q.issueDate ? new Date(q.issueDate).toISOString().slice(0, 10) : '',
      expiryDate: q.expiryDate ? new Date(q.expiryDate).toISOString().slice(0, 10) : '',
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

  const saveQualification = async () => {
    if (canManageAll && scope === 'EMPLOYEES' && !formData.employeeId) {
      toast.error('Select an employee');
      return;
    }
    const name = formData.name.trim();
    if (!name) {
      toast.error('Name is required');
      return;
    }
    try {
      setSaving(true);
      let fileUrl: string | undefined = undefined;
      if (file) {
        fileUrl = await uploadFile(file);
      }

      const payload: any = {
        name,
        type: formData.type,
        issuingOrganization: formData.issuingOrganization.trim() || undefined,
        credentialId: formData.credentialId.trim() || undefined,
        issueDate: formData.issueDate ? new Date(formData.issueDate).toISOString() : undefined,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : undefined,
        ...(fileUrl ? { fileUrl } : {}),
      };

      if (isEmployee) {
        if (editingId) {
          await api.patch(`/employees/me/qualifications/${editingId}`, payload);
          toast.success('Certification updated');
        } else {
          await api.post('/employees/me/qualifications', payload);
          toast.success('Certification added');
        }
      } else if (canManageAll) {
        if (scope === 'COMPANY') {
          if (editingId) {
            await api.patch(`/company-certifications/${editingId}`, payload);
            toast.success('Company certification updated');
          } else {
            await api.post('/company-certifications', payload);
            toast.success('Company certification added');
          }
        } else {
          const targetEmployeeId = formData.employeeId;
          if (editingId) {
            await api.patch(`/employees/${targetEmployeeId}/qualifications/${editingId}`, payload);
            toast.success('Certification updated');
          } else {
            await api.post(`/employees/${targetEmployeeId}/qualifications`, payload);
            toast.success('Certification added');
          }
        }
      }

      setIsModalOpen(false);
      resetForm();
      await fetchQualifications();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save certification');
    } finally {
      setSaving(false);
    }
  };

  const deleteQualification = async (id: string) => {
    try {
      if (isEmployee) {
        await api.delete(`/employees/me/qualifications/${id}`);
        toast.success('Certification removed');
        await fetchQualifications();
        return;
      }
      if (canManageAll) {
        if (scope === 'COMPANY') {
          await api.delete(`/company-certifications/${id}`);
          toast.success('Company certification removed');
          await fetchQualifications();
        } else {
          const q = qualifications.find((x) => x.id === id);
          const targetEmployeeId = q?.employee?.id || editingEmployeeId || formData.employeeId;
          if (!targetEmployeeId) {
            toast.error('Employee context missing for this certification');
            return;
          }
          await api.delete(`/employees/${targetEmployeeId}/qualifications/${id}`);
          toast.success('Certification removed');
          await fetchQualifications();
        }
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to remove certification');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEmployee ? 'My Certifications & Licenses' : 'Certifications & Licenses'}</h1>
          <p className="text-gray-500 mt-1">
            {isEmployee ? 'Upload and keep your certifications up to date' : 'Manage and track employee qualifications across your organization'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEmployee || canManageAll ? (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {scope === 'COMPANY' ? 'Add Company Certificate' : 'Add Certificate'}
            </button>
          ) : (
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          )}
        </div>
      </div>

      {canManageAll && (
        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 inline-flex gap-2">
          <button
            type="button"
            onClick={() => setScope('EMPLOYEES')}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${scope === 'EMPLOYEES' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Employee Certifications
          </button>
          <button
            type="button"
            onClick={() => setScope('COMPANY')}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${scope === 'COMPANY' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Company Certifications
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm font-medium">Total Qualifications</span>
            <Award className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm font-medium">Active</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm font-medium">Expiring Soon (90d)</span>
            <AlertCircle className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.expiringSoon}</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm font-medium">Expired</span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.expired}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search employees, certifications, or IDs..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <select 
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="PENDING">Pending</option>
          </select>
          
          <select 
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="CERTIFICATION">Certification</option>
            <option value="LICENSE">License</option>
            <option value="EDUCATION">Education</option>
            <option value="TRAINING">Training</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                {!isEmployee && scope === 'EMPLOYEES' && (
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('employeeName')}>
                    <div className="flex items-center gap-2">
                      Employee
                      {sortConfig.key === 'employeeName' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                )}
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">
                    Qualification
                    {sortConfig.key === 'name' && (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('type')}>
                  <div className="flex items-center gap-2">
                    Type
                    {sortConfig.key === 'type' && (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('expiryDate')}>
                  <div className="flex items-center gap-2">
                    Expiry Date
                    {sortConfig.key === 'expiryDate' && (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-2">
                    Status
                    {sortConfig.key === 'status' && (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={isEmployee || scope === 'COMPANY' ? 5 : 6} className="px-6 py-8 text-center text-gray-500">
                    Loading qualifications...
                  </td>
                </tr>
              ) : (scope === 'COMPANY' ? sortedCompanyCertifications.length === 0 : sortedQualifications.length === 0) ? (
                <tr>
                  <td colSpan={isEmployee || scope === 'COMPANY' ? 5 : 6} className="px-6 py-8 text-center text-gray-500">
                    No qualifications found matching your filters.
                  </td>
                </tr>
              ) : (
                (scope === 'COMPANY' ? (sortedCompanyCertifications as any[]) : (sortedQualifications as any[])).map((qual: any) => (
                  <tr key={qual.id} className="hover:bg-gray-50 transition-colors">
                    {!isEmployee && scope === 'EMPLOYEES' && qual.employee && (
                      <td className="px-6 py-4">
                        <Link 
                          href={`/dashboard/people?employeeId=${qual.employee.id}&tab=Qualifications&qualificationId=${qual.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs group-hover:bg-blue-200 transition-colors">
                            {qual.employee.firstName[0]}{qual.employee.lastName[0]}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{qual.employee.firstName} {qual.employee.lastName}</div>
                            <div className="text-xs text-gray-500">{qual.employee.role}</div>
                          </div>
                        </Link>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{qual.name}</div>
                      {qual.issuingOrganization && (
                        <div className="text-xs text-gray-500">{qual.issuingOrganization}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {qual.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {qual.expiryDate ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{new Date(qual.expiryDate).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">No Expiry</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(qual.status, qual.expiryDate)}`}>
                        {getStatusText(qual.status, qual.expiryDate)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {qual.fileUrl && (
                          <a 
                            href={resolveFileUrl(qual.fileUrl)}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                            title="View Document"
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                        )}
                        {isEmployee ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(qual)}
                              className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteQualification(qual.id)}
                              className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          </>
                        ) : canManageAll ? (
                          <>
                            <button
                              type="button"
                              onClick={() => (scope === 'COMPANY' ? openEditCompany(qual) : openEdit(qual))}
                              className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteQualification(qual.id)}
                              className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          </>
                        ) : (
                          qual.employee && (
                            <Link
                              href={`/dashboard/people?employeeId=${qual.employee.id}&tab=Qualifications&qualificationId=${qual.id}`}
                              className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-sm font-medium transition-colors"
                            >
                              View
                            </Link>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination could go here */}
        {!loading && sortedQualifications.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
            <span>Showing {sortedQualifications.length} qualifications</span>
            {/* Simple placeholder for now */}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingId ? 'Update certification' : 'Add certification'} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {canManageAll && scope === 'EMPLOYEES' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => setFormData((p) => ({ ...p, employeeId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select employee…</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}{emp.email ? ` — ${emp.email}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., First Aid / Security License"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CERTIFICATION">Certification</option>
                <option value="LICENSE">License</option>
                <option value="EDUCATION">Education</option>
                <option value="TRAINING">Training</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credential ID</label>
              <input
                value={formData.credentialId}
                onChange={(e) => setFormData((p) => ({ ...p, credentialId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Organization</label>
              <input
                value={formData.issuingOrganization}
                onChange={(e) => setFormData((p) => ({ ...p, issuingOrganization: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData((p) => ({ ...p, issueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData((p) => ({ ...p, expiryDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Document</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700"
                />
                <Upload className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-xs text-gray-500 mt-1">Upload a PDF or image of your certification.</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={saveQualification}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
