'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Award,
  BadgeCheck,
  CalendarClock,
  FileBadge,
  IdCard,
  LockKeyhole,
  MapPin,
  Pencil,
  Save,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import api from '../../lib/api';
import { resolveFileUrl } from '../../lib/file-url';

type EmployeeMe = {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  pronouns?: string | null;
  role: string;
  customRole?: { id: string; name: string } | null;
  status?: string | null;
  officialEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  dateOfBirth?: string | null;
  hireDate?: string | null;
  payrollId?: string | null;
  workPeriod?: string | null;
  hoursPerPeriod?: number | null;
  daysPerPeriod?: number | null;
  profileImageUrl?: string | null;
};

type Qualification = {
  id: string;
  name: string;
  type: string;
  issuingOrganization?: string | null;
  credentialId?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  fileUrl?: string | null;
  status: string;
};

type QualificationForm = {
  name: string;
  type: string;
  issuingOrganization: string;
  credentialId: string;
  issueDate: string;
  expiryDate: string;
  fileUrl: string;
};

type Tab = 'Personal' | 'Employment' | 'Qualifications' | 'Security';

type ProfileForm = {
  preferredName: string;
  pronouns: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  dateOfBirth: string;
};

const emptyForm: ProfileForm = {
  preferredName: '',
  pronouns: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  dateOfBirth: '',
};

const emptyQualificationForm: QualificationForm = {
  name: '',
  type: 'CERTIFICATION',
  issuingOrganization: '',
  credentialId: '',
  issueDate: '',
  expiryDate: '',
  fileUrl: '',
};

function roleLabel(role?: string | null, customRoleName?: string | null) {
  const custom = String(customRoleName || '').trim();
  if (custom) return custom;
  const raw = String(role || '').trim().toUpperCase();
  if (raw === 'BUSINESS_ADMIN') return 'Business Admin';
  if (raw === 'SUPER_ADMIN') return 'Administrator';
  if (raw === 'MANAGER') return 'Manager';
  if (raw === 'EMPLOYEE') return 'Employee';
  return raw ? raw.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : 'Employee';
}

function inputDateValue(value?: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}

function displayDate(value?: string | null) {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return 'Not set';
  return parsed.toLocaleDateString();
}

function qualificationStatusMeta(status?: string | null, expiryDate?: string | null) {
  const upper = String(status || '').toUpperCase();
  if (upper === 'EXPIRED') return { label: 'Expired', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20' };
  if (expiryDate) {
    const expiry = new Date(expiryDate);
    const days = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (Number.isFinite(days) && days <= 30) {
      return { label: 'Expiring Soon', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20' };
    }
  }
  return { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20' };
}

export default function EmployeeSelfProfilePage() {
  const [employee, setEmployee] = useState<EmployeeMe | null>(null);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingQualification, setSavingQualification] = useState(false);
  const [deletingQualificationId, setDeletingQualificationId] = useState<string | null>(null);
  const [editingQualificationId, setEditingQualificationId] = useState<string | null>(null);
  const [qualificationForm, setQualificationForm] = useState<QualificationForm>(emptyQualificationForm);
  const [qualificationFile, setQualificationFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Personal');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);

  const designation = useMemo(
    () => roleLabel(employee?.role, employee?.customRole?.name),
    [employee?.customRole?.name, employee?.role]
  );
  const employeeDisplayName = useMemo(() => {
    const preferred = String(employee?.preferredName || '').trim();
    const first = String(employee?.firstName || '').trim();
    const last = String(employee?.lastName || '').trim();
    if (preferred) return `${preferred}${last ? ` ${last}` : ''}`;
    return `${first} ${last}`.trim();
  }, [employee?.firstName, employee?.lastName, employee?.preferredName]);
  const employeeInitials = useMemo(() => {
    const source = employeeDisplayName || `${employee?.firstName || ''} ${employee?.lastName || ''}`;
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'EM';
  }, [employee?.firstName, employee?.lastName, employeeDisplayName]);

  const stats = useMemo(() => {
    const active = qualifications.filter((item) => String(item.status || '').toUpperCase() === 'ACTIVE').length;
    const expiring = qualifications.filter((item) => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      const diff = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 30;
    }).length;
    return {
      total: qualifications.length,
      active,
      expiring,
    };
  }, [qualifications]);

  const loadQualifications = async () => {
    const res = await api.get('/employees/me/qualifications');
    setQualifications(Array.isArray(res.data) ? res.data : []);
  };

  const loadEmployee = async () => {
    try {
      setLoading(true);
      const [employeeRes, qualificationsRes] = await Promise.all([
        api.get('/employees/me'),
        api.get('/employees/me/qualifications'),
      ]);
      const next = employeeRes.data as EmployeeMe;
      setEmployee(next);
      setQualifications(Array.isArray(qualificationsRes.data) ? qualificationsRes.data : []);
      setProfileImageUrl(String(next.profileImageUrl || ''));
      setForm({
        preferredName: String(next.preferredName || ''),
        pronouns: String(next.pronouns || ''),
        phone: String(next.phone || ''),
        address: String(next.address || ''),
        city: String(next.city || ''),
        state: String(next.state || ''),
        zip: String(next.zip || ''),
        country: String(next.country || ''),
        emergencyContactName: String(next.emergencyContactName || ''),
        emergencyContactPhone: String(next.emergencyContactPhone || ''),
        dateOfBirth: inputDateValue(next.dateOfBirth),
      });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load your employee profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployee();
  }, []);

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateQualificationField = (key: keyof QualificationForm, value: string) => {
    setQualificationForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetQualificationForm = () => {
    setEditingQualificationId(null);
    setQualificationForm(emptyQualificationForm);
    setQualificationFile(null);
  };

  const saveProfile = async () => {
    try {
      setSavingProfile(true);
      await api.patch('/employees/me/bio', {
        preferredName: form.preferredName,
        pronouns: form.pronouns,
        phone: form.phone,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        country: form.country,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : null,
      });
      toast.success('Profile updated successfully');
      await loadEmployee();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveProfileImage = async () => {
    try {
      if (!profileImageUrl.trim()) {
        toast.error('Please upload a profile image first');
        return;
      }
      setSavingImage(true);
      await api.patch('/employees/me/profile-image', { url: profileImageUrl });
      toast.success('Profile image updated');
      await loadEmployee();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update profile image');
    } finally {
      setSavingImage(false);
    }
  };

  const uploadProfilePhoto = async (file: File) => {
    try {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setUploadingImage(true);
      const body = new FormData();
      body.append('file', file);
      const res = await api.post('/uploads/images', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = String(res.data?.url || '');
      if (!url) {
        toast.error('Image upload failed');
        return;
      }
      setProfileImageUrl(url);
      toast.success('Image uploaded. Save photo to apply it.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const savePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Current password and new password are required');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    try {
      setSavingPassword(true);
      await api.patch('/employees/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const uploadQualificationFile = async (file: File) => {
    const body = new FormData();
    body.append('file', file);
    const res = await api.post('/uploads', body, { headers: { 'Content-Type': 'multipart/form-data' } });
    return String(res.data?.url || '');
  };

  const saveQualification = async () => {
    const name = qualificationForm.name.trim();
    if (!name) {
      toast.error('Qualification name is required');
      return;
    }

    try {
      setSavingQualification(true);
      let fileUrl = qualificationForm.fileUrl;
      if (qualificationFile) fileUrl = await uploadQualificationFile(qualificationFile);

      const payload: any = {
        name,
        type: qualificationForm.type,
        issuingOrganization: qualificationForm.issuingOrganization.trim() || undefined,
        credentialId: qualificationForm.credentialId.trim() || undefined,
        issueDate: qualificationForm.issueDate ? new Date(qualificationForm.issueDate).toISOString() : undefined,
        expiryDate: qualificationForm.expiryDate ? new Date(qualificationForm.expiryDate).toISOString() : undefined,
        ...(fileUrl ? { fileUrl } : {}),
      };

      if (editingQualificationId) {
        await api.patch(`/employees/me/qualifications/${editingQualificationId}`, payload);
        toast.success('Qualification updated');
      } else {
        await api.post('/employees/me/qualifications', payload);
        toast.success('Qualification added');
      }

      resetQualificationForm();
      await loadQualifications();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save qualification');
    } finally {
      setSavingQualification(false);
    }
  };

  const startEditQualification = (qualification: Qualification) => {
    setEditingQualificationId(qualification.id);
    setQualificationForm({
      name: qualification.name || '',
      type: qualification.type || 'CERTIFICATION',
      issuingOrganization: String(qualification.issuingOrganization || ''),
      credentialId: String(qualification.credentialId || ''),
      issueDate: inputDateValue(qualification.issueDate),
      expiryDate: inputDateValue(qualification.expiryDate),
      fileUrl: String(qualification.fileUrl || ''),
    });
    setQualificationFile(null);
  };

  const removeQualification = async (qualificationId: string) => {
    if (!window.confirm('Delete this qualification?')) return;
    try {
      setDeletingQualificationId(qualificationId);
      await api.delete(`/employees/me/qualifications/${qualificationId}`);
      toast.success('Qualification removed');
      await loadQualifications();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to remove qualification');
    } finally {
      setDeletingQualificationId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-4 border-slate-300 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-[95vw] max-w-[1800px] mx-auto px-3 py-8 md:px-5 xl:px-6 space-y-8">
      <div className="relative overflow-hidden rounded-[30px] border border-cyan-200/50 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.18),_transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(241,245,249,0.92))] shadow-[0_24px_90px_-28px_rgba(37,99,235,0.30)] backdrop-blur-xl dark:border-cyan-500/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.16),_transparent_32%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 dark:opacity-20" />
        <div className="flex flex-col gap-6 px-8 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/60 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700 shadow-sm backdrop-blur-md dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-300">
              <BadgeCheck className="h-4 w-4" />
              Employee Workspace
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-900 dark:text-white md:text-5xl">My Employee Profile</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300 md:text-base">
                Manage your profile, contact details, qualifications, and account security from one professional self-service page.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricCard label="Designation" value={designation} />
            <MetricCard label="Qualifications" value={String(stats.total)} />
            <MetricCard label="Expiring Soon" value={String(stats.expiring)} accent />
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="overflow-x-auto rounded-[24px] border border-cyan-200/40 bg-white/75 px-3 py-3 shadow-[0_18px_55px_-30px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-cyan-500/10 dark:bg-slate-950/80">
          <div className="flex min-w-max items-center gap-2">
            <HorizontalTabButton active={activeTab === 'Personal'} label="Personal Details" onClick={() => setActiveTab('Personal')} />
            <HorizontalTabButton active={activeTab === 'Employment'} label="Employment Info" onClick={() => setActiveTab('Employment')} />
            <HorizontalTabButton active={activeTab === 'Qualifications'} label="Qualifications" onClick={() => setActiveTab('Qualifications')} />
            <HorizontalTabButton active={activeTab === 'Security'} label="Security" onClick={() => setActiveTab('Security')} />
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-cyan-200/40 bg-white/75 shadow-[0_24px_90px_-36px_rgba(15,23,42,0.36)] backdrop-blur-xl dark:border-cyan-500/10 dark:bg-slate-950/90">
          <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="border-r border-cyan-200/40 bg-[linear-gradient(180deg,rgba(248,250,252,0.88),rgba(241,245,249,0.68))] backdrop-blur-xl dark:border-cyan-500/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.76))]">
              <div className="space-y-6 p-6">
              <SectionCard
                title="Profile Photo"
                description="This image is used in chat, people listings, and employee records."
                icon={<UserRound className="h-5 w-5 text-indigo-600" />}
              >
                <div className="mb-5 overflow-hidden rounded-[24px] border border-cyan-200/40 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.88),rgba(239,246,255,0.72))] p-5 shadow-[0_18px_45px_-28px_rgba(6,182,212,0.65)] dark:border-cyan-500/10 dark:bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.88))]">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-cyan-400/30 blur-2xl" />
                      <div className="relative h-36 w-36 overflow-hidden rounded-full border-4 border-white/80 bg-slate-100 shadow-[0_0_0_10px_rgba(34,211,238,0.12),0_22px_50px_-24px_rgba(37,99,235,0.55)] dark:border-slate-900/70 dark:bg-slate-900">
                        {profileImageUrl ? (
                          <img src={resolveFileUrl(profileImageUrl)} alt={employeeDisplayName || 'Employee profile'} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(37,99,235,0.95),rgba(6,182,212,0.88))] text-4xl font-black tracking-[0.08em] text-white">
                            {employeeInitials}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-5">
                      <h3 className="text-xl font-black tracking-[-0.03em] text-slate-900 dark:text-white">{employeeDisplayName || 'Employee Profile'}</h3>
                      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{designation}</p>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {employee?.status || 'ACTIVE'}
                      </div>
                    </div>
                    <div className="mt-5 flex w-full flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => profilePhotoInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/50 bg-white/80 px-4 py-3 text-sm font-semibold text-cyan-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-cyan-500/20 dark:bg-slate-950/70 dark:text-cyan-300"
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingImage ? 'Uploading...' : 'Upload New Picture'}
                      </button>
                      <div className="grid grid-cols-1 gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="rounded-xl bg-white/70 px-3 py-2 dark:bg-slate-950/70">Best result: square headshot with a clean background.</div>
                        <div className="rounded-xl bg-white/70 px-3 py-2 dark:bg-slate-950/70">This photo appears in chat, people listings, and employee records.</div>
                      </div>
                    </div>
                  </div>
                </div>
                <input
                  ref={profilePhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await uploadProfilePhoto(file);
                    e.target.value = '';
                  }}
                />
                <PrimaryButton className="mt-4 w-full justify-center" disabled={savingImage} onClick={saveProfileImage}>
                  <Save className="h-4 w-4" />
                  {savingImage ? 'Saving...' : 'Save Photo'}
                </PrimaryButton>
              </SectionCard>

              <div className="rounded-[24px] border border-cyan-200/40 bg-white/70 p-5 shadow-[0_10px_30px_-20px_rgba(37,99,235,0.35)] backdrop-blur-md dark:border-cyan-500/10 dark:bg-slate-950/75">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Designation" value={designation} />
                  <MetricCard label="Active" value={String(stats.active)} />
                  <MetricCard label="Qualifications" value={String(stats.total)} />
                  <MetricCard label="Expiring" value={String(stats.expiring)} accent />
                </div>
              </div>
              </div>
            </aside>

            <main className="bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_22%),linear-gradient(180deg,rgba(248,250,252,0.72),rgba(255,255,255,0.50))] dark:bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_22%),linear-gradient(180deg,rgba(15,23,42,0.42),rgba(2,6,23,0.18))]">
              <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-8 xl:p-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-3xl font-black tracking-[-0.03em] text-slate-900 dark:text-white">{activeTab}</h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {activeTab === 'Personal' && 'Update your personal details, contact information, and emergency contact records.'}
                    {activeTab === 'Employment' && 'Review your employment information as it appears in the superadmin portal.'}
                    {activeTab === 'Qualifications' && 'Manage licenses, certifications, and supporting documents.'}
                    {activeTab === 'Security' && 'Keep your account protected with password updates and access controls.'}
                  </p>
                </div>
                {activeTab === 'Personal' ? (
                  <PrimaryButton disabled={savingProfile} onClick={saveProfile}>
                    <Save className="h-4 w-4" />
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </PrimaryButton>
                ) : null}
              </div>

              {activeTab === 'Personal' ? (
                <div className="space-y-6">
                  <SectionCard
                    title="Personal Information"
                    description="Update the details used for internal records and communication."
                    icon={<BadgeCheck className="h-5 w-5 text-indigo-600" />}
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <ReadOnlyField label="First name" value={employee?.firstName || ''} />
                      <ReadOnlyField label="Last name" value={employee?.lastName || ''} />
                      <TextField label="Preferred name" value={form.preferredName} onChange={(value) => updateField('preferredName', value)} />
                      <TextField label="Pronouns" value={form.pronouns} onChange={(value) => updateField('pronouns', value)} />
                      <TextField label="Phone" value={form.phone} onChange={(value) => updateField('phone', value)} />
                      <DateField label="Date of birth" value={form.dateOfBirth} onChange={(value) => updateField('dateOfBirth', value)} />
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Address & Emergency Contact"
                    description="Keep your contact and emergency information current."
                    icon={<MapPin className="h-5 w-5 text-indigo-600" />}
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <TextField label="Street address" value={form.address} onChange={(value) => updateField('address', value)} />
                      </div>
                      <TextField label="City" value={form.city} onChange={(value) => updateField('city', value)} />
                      <TextField label="State / Province" value={form.state} onChange={(value) => updateField('state', value)} />
                      <TextField label="Postal / Zip Code" value={form.zip} onChange={(value) => updateField('zip', value)} />
                      <TextField label="Country" value={form.country} onChange={(value) => updateField('country', value)} />
                      <TextField label="Emergency contact name" value={form.emergencyContactName} onChange={(value) => updateField('emergencyContactName', value)} />
                      <TextField label="Emergency contact phone" value={form.emergencyContactPhone} onChange={(value) => updateField('emergencyContactPhone', value)} />
                    </div>
                  </SectionCard>
                </div>
              ) : null}

              {activeTab === 'Employment' ? (
                <div className="space-y-6">
                  <SectionCard
                    title="Employment Snapshot"
                    description="Visible information shared with your organization administrators."
                    icon={<IdCard className="h-5 w-5 text-indigo-600" />}
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <ReadOnlyField label="Official email" value={employee?.officialEmail || 'Not set'} />
                      <ReadOnlyField label="Designation" value={designation} />
                      <ReadOnlyField label="Status" value={employee?.status || 'ACTIVE'} />
                      <ReadOnlyField label="Hire date" value={displayDate(employee?.hireDate)} />
                      <ReadOnlyField label="Payroll ID" value={employee?.payrollId || 'Not set'} />
                      <ReadOnlyField label="Work period" value={employee?.workPeriod || 'Not set'} />
                      <ReadOnlyField label="Hours per period" value={employee?.hoursPerPeriod ? String(employee.hoursPerPeriod) : 'Not set'} />
                      <ReadOnlyField label="Days per period" value={employee?.daysPerPeriod ? String(employee.daysPerPeriod) : 'Not set'} />
                    </div>
                  </SectionCard>
                </div>
              ) : null}

              {activeTab === 'Qualifications' ? (
                <SectionCard
                  title="Qualifications & Certifications"
                  description="Maintain your licenses, certifications, and supporting documents in one place."
                  icon={<Award className="h-5 w-5 text-indigo-600" />}
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-4">
                      {qualifications.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-cyan-200 bg-gradient-to-br from-white to-cyan-50/70 px-6 py-10 text-center text-sm text-slate-500 dark:border-cyan-500/20 dark:bg-slate-950 dark:text-slate-400">
                          No qualifications added yet. Add your certifications, licenses, or education records here.
                        </div>
                      ) : (
                        qualifications.map((qualification) => {
                          const statusMeta = qualificationStatusMeta(qualification.status, qualification.expiryDate);
                          return (
                            <div
                              key={qualification.id}
                              className="rounded-2xl border border-cyan-200/40 bg-white/80 px-5 py-5 shadow-[0_14px_40px_-24px_rgba(37,99,235,0.35)] backdrop-blur-md dark:border-cyan-500/10 dark:bg-slate-950/70"
                            >
                              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{qualification.name}</h3>
                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                                      {statusMeta.label}
                                    </span>
                                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                      {qualification.type}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 gap-3 text-sm text-slate-600 dark:text-slate-400 md:grid-cols-2">
                                    <InfoLine label="Issuer" value={qualification.issuingOrganization || 'Not set'} />
                                    <InfoLine label="Credential ID" value={qualification.credentialId || 'Not set'} />
                                    <InfoLine label="Issue date" value={displayDate(qualification.issueDate)} />
                                    <InfoLine label="Expiry date" value={displayDate(qualification.expiryDate)} />
                                  </div>
                                  {qualification.fileUrl ? (
                                    <a
                                      href={resolveFileUrl(qualification.fileUrl)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                                    >
                                      <FileBadge className="h-4 w-4" />
                                      View attached document
                                    </a>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => startEditQualification(qualification)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeQualification(qualification.id)}
                                    disabled={deletingQualificationId === qualification.id}
                                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    {deletingQualificationId === qualification.id ? 'Removing...' : 'Remove'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="rounded-2xl border border-cyan-200/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.85),rgba(240,249,255,0.65))] p-5 shadow-inner backdrop-blur-md dark:border-cyan-500/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.85),rgba(2,6,23,0.72))]">
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {editingQualificationId ? 'Edit Qualification' : 'Add Qualification'}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Add your certifications, licenses, and educational credentials for compliance tracking.
                          </p>
                        </div>
                        {!editingQualificationId ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
                            <Award className="h-3.5 w-3.5" />
                            New
                          </span>
                        ) : null}
                      </div>
                      <div className="space-y-4">
                        <TextField label="Qualification name" value={qualificationForm.name} onChange={(value) => updateQualificationField('name', value)} />
                        <SelectField
                          label="Type"
                          value={qualificationForm.type}
                          onChange={(value) => updateQualificationField('type', value)}
                          options={['CERTIFICATION', 'LICENSE', 'EDUCATION', 'OTHER']}
                        />
                        <TextField label="Issuing organization" value={qualificationForm.issuingOrganization} onChange={(value) => updateQualificationField('issuingOrganization', value)} />
                        <TextField label="Credential ID" value={qualificationForm.credentialId} onChange={(value) => updateQualificationField('credentialId', value)} />
                        <DateField label="Issue date" value={qualificationForm.issueDate} onChange={(value) => updateQualificationField('issueDate', value)} />
                        <DateField label="Expiry date" value={qualificationForm.expiryDate} onChange={(value) => updateQualificationField('expiryDate', value)} />
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Supporting document</label>
                          <div className="mt-1 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-950">
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={(e) => setQualificationFile(e.target.files?.[0] || null)}
                              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:text-slate-300 dark:file:bg-indigo-500/10 dark:file:text-indigo-300"
                            />
                            {qualificationForm.fileUrl ? (
                              <a
                                href={resolveFileUrl(qualificationForm.fileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                              >
                                <Upload className="h-4 w-4" />
                                Current file
                              </a>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <PrimaryButton disabled={savingQualification} onClick={saveQualification}>
                            <Save className="h-4 w-4" />
                            {savingQualification ? 'Saving...' : editingQualificationId ? 'Update Qualification' : 'Add Qualification'}
                          </PrimaryButton>
                          {editingQualificationId ? (
                            <button
                              type="button"
                              onClick={resetQualificationForm}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                            >
                              Cancel
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              ) : null}

              {activeTab === 'Security' ? (
                <SectionCard
                  title="Password & Access"
                  description="Keep your account secure with a strong password."
                  icon={<LockKeyhole className="h-5 w-5 text-indigo-600" />}
                >
                  <div className="max-w-2xl space-y-4">
                    <TextField label="Current password" value={passwordForm.currentPassword} onChange={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))} type="password" />
                    <TextField label="New password" value={passwordForm.newPassword} onChange={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))} type="password" />
                    <TextField label="Confirm new password" value={passwordForm.confirmPassword} onChange={(value) => setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))} type="password" />
                    <PrimaryButton disabled={savingPassword} onClick={savePassword}>
                      <Save className="h-4 w-4" />
                      {savingPassword ? 'Updating...' : 'Update Password'}
                    </PrimaryButton>
                  </div>
                </SectionCard>
              ) : null}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

function HorizontalTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-2xl border px-5 py-3 text-sm font-semibold whitespace-nowrap transition ${
        active
          ? 'border-cyan-300/60 bg-[linear-gradient(135deg,rgba(37,99,235,0.95),rgba(6,182,212,0.88))] text-white shadow-[0_12px_30px_-18px_rgba(6,182,212,0.85)]'
          : 'border-transparent text-slate-700 hover:border-cyan-200 hover:bg-white/70 dark:text-slate-200 dark:hover:border-cyan-500/20 dark:hover:bg-slate-800/80'
      }`}
    >
      {label}
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-[linear-gradient(135deg,rgba(37,99,235,0.98),rgba(6,182,212,0.92))] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_35px_-20px_rgba(6,182,212,0.85)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

function MetricCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 backdrop-blur-md ${accent ? 'border-amber-200 bg-amber-50/85 dark:border-amber-500/20 dark:bg-amber-500/10' : 'border-cyan-200/40 bg-white/75 dark:border-cyan-500/10 dark:bg-slate-900/80'}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-black tracking-[-0.02em] text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-cyan-200/40 bg-white/78 p-6 shadow-[0_14px_45px_-28px_rgba(15,23,42,0.38)] backdrop-blur-xl dark:border-cyan-500/10 dark:bg-slate-900/78">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-2xl border border-cyan-200/50 bg-cyan-50/80 p-2.5 shadow-sm dark:border-cyan-500/10 dark:bg-cyan-500/10">{icon}</div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-slate-900 dark:text-white shadow-sm outline-none ring-0 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/10"
      />
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <TextField label={label} value={value} onChange={onChange} type="date" />;
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-slate-900 dark:text-white shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/10"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</div>
      <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
        {value}
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <CalendarClock className="mt-0.5 h-4 w-4 text-slate-400" />
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{label}</div>
        <div className="text-sm text-slate-700 dark:text-slate-200">{value}</div>
      </div>
    </div>
  );
}
