import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ModalActionButton } from '../Modal';
import api from '../../lib/api';
import { AlertTriangle, Calendar, Clock, MapPin, Shield, Upload, Users } from 'lucide-react';
import { toast } from 'sonner';
import { UserRole } from '@unitedlinkgroup/types';

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

type LocationOption = { id: string; name: string };
type EmployeeOption = { id: string; firstName: string; lastName: string; badgeNumber?: string | null; role?: string; status?: string; defaultLocationId?: string | null };

type PersonForm = { role: 'SUSPECT' | 'VICTIM' | 'WITNESS' | 'OTHER'; name: string; contactInfo: string };

const INCIDENT_TYPES = [
  { value: 'THEFT', label: 'Theft' },
  { value: 'SUSPICIOUS_ACTIVITY', label: 'Suspicious Activity' },
  { value: 'UNAUTHORIZED_ACCESS', label: 'Unauthorized Access' },
  { value: 'ASSAULT', label: 'Assault' },
  { value: 'VANDALISM', label: 'Vandalism' },
  { value: 'FIRE', label: 'Fire' },
  { value: 'MEDICAL_EMERGENCY', label: 'Medical Emergency' },
  { value: 'EQUIPMENT_DAMAGE', label: 'Equipment Damage' },
  { value: 'TRESPASSING', label: 'Trespassing' },
  { value: 'OTHER', label: 'Other' },
] as const;

const SEVERITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
] as const;

const STATUSES = [
  { value: 'REPORTED', label: 'Reported' },
  { value: 'UNDER_INVESTIGATION', label: 'Under Investigation' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'RESOLVED', label: 'Resolved' },
] as const;

const SHIFTS = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'NIGHT', label: 'Night' },
] as const;

const RESPONSE_ACTIONS = [
  { value: 'VERBAL_WARNING', label: 'Verbal Warning' },
  { value: 'SUSPECT_ESCORTED_OUT', label: 'Suspect Escorted Out' },
  { value: 'ARREST_MADE', label: 'Arrest Made' },
  { value: 'POLICE_NOTIFIED', label: 'Police Notified' },
  { value: 'MEDICAL_ASSISTANCE_PROVIDED', label: 'Medical Assistance Provided' },
  { value: 'AREA_SECURED', label: 'Area Secured' },
  { value: 'INVESTIGATION_STARTED', label: 'Investigation Started' },
] as const;

const EVIDENCE_TYPES = [
  { value: 'PHOTO', label: 'Photo' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'AUDIO', label: 'Audio Recording' },
  { value: 'NONE', label: 'None' },
] as const;

export default function IncidentModal({ isOpen, onClose, onSuccess, initialData }: IncidentModalProps) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [profile, setProfile] = useState<{ role?: string; employeeId?: string } | null>(null);
  const [meEmployee, setMeEmployee] = useState<EmployeeOption | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [gps, setGps] = useState<{ geoLat?: number; geoLng?: number }>({});
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const [form, setForm] = useState(() => {
    const now = new Date();
    const incidentDate = now.toISOString().slice(0, 10);
    const incidentTime = now.toTimeString().slice(0, 5);
    return {
      reportingOfficerEmployeeId: '',
      assignedSupervisorId: '',
      locationId: '',
      buildingArea: 'Main Entrance',
      buildingAreaOther: '',
      shift: 'MORNING',
      incidentDate,
      incidentTime,
      type: 'SUSPICIOUS_ACTIVITY',
      severity: 'LOW',
      status: 'REPORTED',
      responseAction: 'INVESTIGATION_STARTED',
      witnessPresent: false,
      lawEnforcementInvolved: false,
      evidenceCollected: ['NONE'] as string[],
      title: '',
      narrative: '',
      persons: [{ role: 'WITNESS', name: '', contactInfo: '' }] as PersonForm[],
    };
  });

  const canSubmitOnBehalf = useMemo(() => {
    const role = profile?.role;
    return role === UserRole.SUPER_ADMIN || role === UserRole.BUSINESS_ADMIN || role === UserRole.MANAGER;
  }, [profile?.role]);

  const officerOptions = useMemo(() => {
    return employees
      .filter((e) => e.status === 'ACTIVE' && (e.role === 'SECURITY_OFFICER' || e.role === 'EMPLOYEE'))
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''));
  }, [employees]);

  const supervisorOptions = useMemo(() => {
    return employees
      .filter((e) => e.status === 'ACTIVE' && (e.role === 'MANAGER' || e.role === 'BUSINESS_ADMIN'))
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''));
  }, [employees]);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      try {
        const [locRes, profileRes] = await Promise.all([api.get('/locations'), api.get('/auth/profile')]);
        setLocations(locRes.data || []);
        setProfile(profileRes.data || null);
      } catch {
        setLocations([]);
        setProfile(null);
      }
    };
    load();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const loadEmployees = async () => {
      if (!canSubmitOnBehalf) return;
      try {
        const res = await api.get('/employees?status=ACTIVE');
        setEmployees(res.data || []);
      } catch {
        setEmployees([]);
      }
    };
    loadEmployees();
  }, [isOpen, canSubmitOnBehalf]);

  useEffect(() => {
    if (!isOpen) return;
    const loadMe = async () => {
      try {
        const res = await api.get('/employees/me');
        setMeEmployee(res.data || null);
      } catch {
        setMeEmployee(null);
      }
    };
    loadMe();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ geoLat: pos.coords.latitude, geoLng: pos.coords.longitude }),
      () => setGps({}),
      { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 }
    );
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (!initialData) {
      setFiles([]);
      setForm((prev) => {
        const locationId = meEmployee?.defaultLocationId ? String(meEmployee.defaultLocationId) : prev.locationId;
        const reportingOfficerEmployeeId = canSubmitOnBehalf ? prev.reportingOfficerEmployeeId : (meEmployee?.id || '');
        return { ...prev, locationId, reportingOfficerEmployeeId };
      });
      return;
    }

    const date = initialData.date ? new Date(initialData.date) : new Date();
    const incidentDate = date.toISOString().slice(0, 10);
    const incidentTime = date.toTimeString().slice(0, 5);
    let evidenceCollected: string[] = ['NONE'];
    try {
      if (typeof initialData.evidenceCollected === 'string') {
        const parsed = JSON.parse(initialData.evidenceCollected);
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) evidenceCollected = parsed;
      }
    } catch {}

    setFiles([]);
    setForm({
      reportingOfficerEmployeeId: initialData.reportingOfficerEmployeeId || '',
      assignedSupervisorId: initialData.assignedSupervisorId || '',
      locationId: initialData.locationId || '',
      buildingArea: initialData.buildingArea || 'Main Entrance',
      buildingAreaOther: '',
      shift: initialData.shift || 'MORNING',
      incidentDate,
      incidentTime,
      type: initialData.type || 'SUSPICIOUS_ACTIVITY',
      severity: initialData.severity || 'LOW',
      status: initialData.status || 'REPORTED',
      responseAction: initialData.responseAction || 'INVESTIGATION_STARTED',
      witnessPresent: Boolean(initialData.witnessPresent),
      lawEnforcementInvolved: Boolean(initialData.lawEnforcementInvolved),
      evidenceCollected,
      title: initialData.title || '',
      narrative: initialData.description || '',
      persons: Array.isArray(initialData.persons) && initialData.persons.length
        ? initialData.persons.map((p: any) => ({ role: p.role || 'OTHER', name: p.name || '', contactInfo: p.contactInfo || '' }))
        : [{ role: 'WITNESS', name: '', contactInfo: '' }],
    });
  }, [isOpen, initialData, meEmployee?.id, meEmployee?.defaultLocationId, canSubmitOnBehalf]);

  const buildingAreaValue = form.buildingArea === 'OTHER' ? form.buildingAreaOther : form.buildingArea;

  const reportingOfficerLabel = useMemo(() => {
    if (canSubmitOnBehalf) {
      const match = officerOptions.find((e) => e.id === form.reportingOfficerEmployeeId);
      if (!match) return '';
      const badge = match.badgeNumber ? `Badge #${match.badgeNumber}` : `ID ${match.id.slice(0, 8)}`;
      return `${match.firstName} ${match.lastName} — ${badge}`;
    }
    if (!meEmployee) return '';
    const badge = meEmployee.badgeNumber ? `Badge #${meEmployee.badgeNumber}` : `ID ${meEmployee.id.slice(0, 8)}`;
    return `${meEmployee.firstName} ${meEmployee.lastName} — ${badge}`;
  }, [canSubmitOnBehalf, officerOptions, form.reportingOfficerEmployeeId, meEmployee]);

  const deviceInfo = useMemo(() => {
    if (typeof navigator === 'undefined') return '';
    return JSON.stringify({
      userAgent: navigator.userAgent || null,
      platform: (navigator as any).platform || null,
      language: navigator.language || null,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    });
  }, []);

  const suggestedTitle = useMemo(() => {
    const typeLabel = INCIDENT_TYPES.find((t) => t.value === form.type)?.label || form.type;
    const locLabel = locations.find((l) => l.id === form.locationId)?.name || 'Unknown Site';
    return `${typeLabel} @ ${locLabel}`;
  }, [form.type, form.locationId, locations]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dt = new Date(`${form.incidentDate}T${form.incidentTime}:00`);
    if (Number.isNaN(dt.getTime())) {
      toast.error('Invalid incident date/time');
      return;
    }

    if (canSubmitOnBehalf && !form.reportingOfficerEmployeeId) {
      toast.error('Select a reporting officer');
      return;
    }

    const payload = {
      title: (form.title || suggestedTitle).trim(),
      type: form.type,
      severity: form.severity,
      status: form.status,
      shift: form.shift,
      buildingArea: buildingAreaValue || undefined,
      locationId: form.locationId || undefined,
      incidentAt: dt.toISOString(),
      responseAction: form.responseAction,
      witnessPresent: form.witnessPresent,
      lawEnforcementInvolved: form.lawEnforcementInvolved,
      evidenceCollected: form.evidenceCollected.includes('NONE') ? ['NONE'] : form.evidenceCollected,
      reportingOfficerEmployeeId: canSubmitOnBehalf ? form.reportingOfficerEmployeeId : undefined,
      assignedSupervisorId: form.assignedSupervisorId || undefined,
      persons: form.persons.filter((p) => p.name.trim().length > 0),
      description: form.narrative,
      deviceInfo,
      ...gps,
    };

    setLoading(true);
    try {
      let incidentId: string;
      if (initialData?.id) {
        const res = await api.patch(`/incident-reports/${initialData.id}`, payload);
        incidentId = res.data?.id || initialData.id;
      } else {
        const res = await api.post('/incident-reports', payload);
        incidentId = res.data?.id;
      }

      if (incidentId && files.length) {
        for (const f of files) {
          const fd = new FormData();
          fd.append('file', f);
          try {
            await api.post(`/incident-reports/${incidentId}/evidence`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          } catch {
            toast.error(`Failed to upload: ${f.name}`);
          }
        }
      }

      toast.success(initialData ? 'Incident report updated' : 'Incident report submitted');
      onSuccess();
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to save incident report';
      toast.error(message);
    } finally {
      setLoading(false);
      setFiles([]);
    }
  };

  const toggleEvidence = (value: string) => {
    setForm((prev) => {
      const next = new Set(prev.evidenceCollected);
      if (value === 'NONE') {
        return { ...prev, evidenceCollected: ['NONE'] };
      }
      next.delete('NONE');
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, evidenceCollected: Array.from(next) };
    });
  };

  const addPerson = () => setForm((prev) => ({ ...prev, persons: [...prev.persons, { role: 'WITNESS', name: '', contactInfo: '' }] }));
  const removePerson = (idx: number) => setForm((prev) => ({ ...prev, persons: prev.persons.filter((_, i) => i !== idx) }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Incident Report' : 'New Incident Report'}
      maxWidth="max-w-6xl"
      className="h-[70vh]"
      bodyClassName="p-0 overflow-hidden"
    >
      <form onSubmit={submit} className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wider text-slate-500">Officer Accountability</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white break-words">{reportingOfficerLabel || '—'}</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-4 w-4" />
                  <span>{new Date().toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Reporting Officer
                  </label>
                  {canSubmitOnBehalf ? (
                    <select
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={form.reportingOfficerEmployeeId}
                      onChange={(e) => setForm((p) => ({ ...p, reportingOfficerEmployeeId: e.target.value }))}
                    >
                      <option value="">Select active officer…</option>
                      {officerOptions.map((o) => {
                        const badge = o.badgeNumber ? `Badge #${o.badgeNumber}` : `ID ${o.id.slice(0, 8)}`;
                        return (
                          <option key={o.id} value={o.id}>
                            {o.firstName} {o.lastName} — {badge}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                      {reportingOfficerLabel || 'Signed in user'}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Supervisor
                  </label>
                  <select
                    className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={form.assignedSupervisorId}
                    onChange={(e) => setForm((p) => ({ ...p, assignedSupervisorId: e.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {supervisorOptions.map((s) => {
                      const badge = s.badgeNumber ? `Badge #${s.badgeNumber}` : `ID ${s.id.slice(0, 8)}`;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} — {badge}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Shield className="h-4 w-4 text-slate-500" />
                Incident Details
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Incident Type</label>
                  <select
                    className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  >
                    {INCIDENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Severity</label>
                  <select
                    className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={form.severity}
                    onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))}
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shift</label>
                  <select
                    className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={form.shift}
                    onChange={(e) => setForm((p) => ({ ...p, shift: e.target.value }))}
                  >
                    {SHIFTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="min-w-0 sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location / Site</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <select
                      className="pl-9 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={form.locationId}
                      onChange={(e) => setForm((p) => ({ ...p, locationId: e.target.value }))}
                    >
                      <option value="">Select site…</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="min-w-0 sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Building / Area</label>
                  <select
                    className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={form.buildingArea}
                    onChange={(e) => setForm((p) => ({ ...p, buildingArea: e.target.value }))}
                  >
                    {['Main Entrance', 'Lobby', 'Loading Dock', 'Parking Garage', 'Perimeter', 'Stairwell', 'Elevator', 'Office Floor', 'Rooftop', 'OTHER'].map((a) => (
                      <option key={a} value={a}>
                        {a === 'OTHER' ? 'Other…' : a}
                      </option>
                    ))}
                  </select>
                  {form.buildingArea === 'OTHER' && (
                    <input
                      type="text"
                      value={form.buildingAreaOther}
                      onChange={(e) => setForm((p) => ({ ...p, buildingAreaOther: e.target.value }))}
                      className="mt-3 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Specify area"
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Incident Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="date"
                      required
                      className="pl-9 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={form.incidentDate}
                      onChange={(e) => setForm((p) => ({ ...p, incidentDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Incident Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="time"
                      required
                      className="pl-9 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={form.incidentTime}
                      onChange={(e) => setForm((p) => ({ ...p, incidentTime: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <AlertTriangle className="h-4 w-4 text-slate-500" />
                Response & Evidence
              </div>
              <div className="mt-5 grid grid-cols-1 gap-5">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Security Response Taken</label>
                  <select
                    className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={form.responseAction}
                    onChange={(e) => setForm((p) => ({ ...p, responseAction: e.target.value }))}
                  >
                    {RESPONSE_ACTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={form.witnessPresent}
                      onChange={(e) => setForm((p) => ({ ...p, witnessPresent: e.target.checked }))}
                    />
                    Witness Present
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={form.lawEnforcementInvolved}
                      onChange={(e) => setForm((p) => ({ ...p, lawEnforcementInvolved: e.target.checked }))}
                    />
                    Law Enforcement
                  </label>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Evidence Collected</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EVIDENCE_TYPES.map((t) => (
                    <button
                      type="button"
                      key={t.value}
                      onClick={() => toggleEvidence(t.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        form.evidenceCollected.includes(t.value)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Evidence Upload</label>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <Upload className="h-4 w-4 text-slate-500" />
                    <span className="break-words">{files.length ? `${files.length} file(s) queued` : 'Add images, videos, documents, or audio'}</span>
                  </div>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Users className="h-4 w-4 text-slate-500" />
                  Persons Involved
                </div>
                <button
                  type="button"
                  onClick={addPerson}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  Add Person
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {form.persons.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4">
                      <select
                        className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={p.role}
                        onChange={(e) => {
                          const role = e.target.value as PersonForm['role'];
                          setForm((prev) => ({
                            ...prev,
                            persons: prev.persons.map((x, i) => (i === idx ? { ...x, role } : x)),
                          }));
                        }}
                      >
                        <option value="SUSPECT">Suspect</option>
                        <option value="VICTIM">Victim</option>
                        <option value="WITNESS">Witness</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-4">
                      <input
                        type="text"
                        className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Name"
                        value={p.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            persons: prev.persons.map((x, i) => (i === idx ? { ...x, name } : x)),
                          }));
                        }}
                      />
                    </div>
                    <div className="md:col-span-4">
                      <input
                        type="text"
                        className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Contact Information"
                        value={p.contactInfo}
                        onChange={(e) => {
                          const contactInfo = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            persons: prev.persons.map((x, i) => (i === idx ? { ...x, contactInfo } : x)),
                          }));
                        }}
                      />
                    </div>
                    <div className="md:col-span-12 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => removePerson(idx)}
                        className="text-xs text-red-600 hover:text-red-700"
                        disabled={form.persons.length <= 1}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Narrative</div>
              <div className="mt-2 text-xs text-slate-500">Incident Narrative / Detailed Description</div>
              <textarea
                required
                rows={16}
                className="mt-3 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3"
                value={form.narrative}
                onChange={(e) => setForm((p) => ({ ...p, narrative: e.target.value }))}
                placeholder="Provide a complete, chronological narrative. Include observations, actions taken, and outcomes."
              />
              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Incident Summary</label>
                <input
                  type="text"
                  className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder={suggestedTitle}
                />
              </div>
              <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                GPS: {typeof gps.geoLat === 'number' && typeof gps.geoLng === 'number' ? `${gps.geoLat.toFixed(6)}, ${gps.geoLng.toFixed(6)}` : 'Unavailable'}
              </div>
            </div>
          </div>
        </div>
        </div>

        <div className="shrink-0 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          <ModalActionButton kind="cancel" onClick={onClose}>
            Cancel
          </ModalActionButton>
          <ModalActionButton kind="submit" type="submit" disabled={loading}>
            {loading ? 'Submitting…' : initialData ? 'Update Report' : 'Submit Report'}
          </ModalActionButton>
        </div>
      </form>
    </Modal>
  );
}
