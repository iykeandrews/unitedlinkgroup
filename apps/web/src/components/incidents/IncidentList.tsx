import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Calendar, ChevronLeft, ChevronRight, Download, Filter, MapPin, RefreshCcw, Search, Shield, User } from 'lucide-react';
import api from '../../lib/api';
import IncidentModal from './IncidentModal';
import { toast } from 'sonner';
import { UserRole } from '@unitedlinkgroup/types';
import { AnimatePresence, motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Location = { id: string; name: string };
type UserLite = { id: string; email?: string; firstName?: string | null; lastName?: string | null; role?: string };
type EmployeeLite = { id: string; firstName: string; lastName: string; badgeNumber?: string | null; role?: string; status?: string };
type Evidence = { id: string; kind: string; url: string; filename: string; originalName: string; mimeType?: string | null; sizeBytes?: number | null; createdAt: string };
type Person = { id: string; role: string; name: string; contactInfo?: string | null };
type TimelineEvent = { id: string; eventType: string; createdAt: string; payload?: string | null; actorUser?: UserLite | null };

interface Incident {
  id: string;
  reportNumber?: string | null;
  title: string;
  description: string;
  type: string;
  severity: string;
  status: string;
  date: string;
  incidentAt?: string | null;
  reportedAt?: string | null;
  shift?: string | null;
  buildingArea?: string | null;
  responseAction?: string | null;
  witnessPresent?: boolean;
  lawEnforcementInvolved?: boolean;
  evidenceCollected?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
  locationId?: string | null;
  location?: Location | null;
  submittedBy?: UserLite | null;
  reportingOfficer?: EmployeeLite | null;
  assignedSupervisor?: EmployeeLite | null;
  assignedInvestigator?: EmployeeLite | null;
  evidence?: Evidence[];
  persons?: Person[];
  timeline?: TimelineEvent[];
  createdAt?: string;
  updatedAt?: string;
}

type IncidentListResponse = { items: Incident[]; total: number; page: number; pageSize: number };

type LocationSummaryCard = {
  locationId: string;
  locationName: string;
  locationStatus?: string;
  totalIncidents: number;
  openIncidents: number;
  criticalIncidents: number;
  lastIncidentDate: string | null;
  assignedSecurityTeam: Array<{ id: string; name: string; badgeNumber: string | null }>;
};

type Analytics = {
  trend: Array<{ date: string; count: number }>;
  byType: Array<{ type: string; count: number }>;
  bySeverity: Array<{ severity: string; count: number }>;
  byLocation: Array<{ locationId: string; locationName: string; count: number }>;
  byOfficer: Array<{ employeeId: string; officerName: string; badgeNumber: string | null; count: number }>;
};

const TYPES = [
  'THEFT',
  'SUSPICIOUS_ACTIVITY',
  'UNAUTHORIZED_ACCESS',
  'ASSAULT',
  'VANDALISM',
  'FIRE',
  'MEDICAL_EMERGENCY',
  'EQUIPMENT_DAMAGE',
  'TRESPASSING',
  'OTHER',
] as const;

const SEVERITIES = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const;
const STATUSES = ['REPORTED', 'UNDER_INVESTIGATION', 'ESCALATED', 'RESOLVED'] as const;

const severityPill = (severity: string) => {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'MODERATE':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    default:
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  }
};

const statusPill = (status: string) => {
  switch (status) {
    case 'ESCALATED':
      return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300';
    case 'UNDER_INVESTIGATION':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
    case 'RESOLVED':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200';
  }
};

const fullName = (p?: { firstName?: string | null; lastName?: string | null; email?: string }) => {
  const name = `${p?.firstName || ''} ${p?.lastName || ''}`.trim();
  return name || p?.email || 'Unknown';
};

const employeeName = (e?: { firstName?: string | null; lastName?: string | null; badgeNumber?: string | null; id?: string }) => {
  if (!e) return 'Unassigned';
  const name = `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.id || 'Unknown';
  const badge = e.badgeNumber ? `Badge #${e.badgeNumber}` : e.id ? `ID ${e.id.slice(0, 8)}` : '';
  return badge ? `${name} — ${badge}` : name;
};

const downloadCsv = (rows: Array<Record<string, any>>, filename: string) => {
  const escape = (v: any) => {
    const s = String(v ?? '');
    if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const lines = [headers.map(escape).join(',')].concat(rows.map((r) => headers.map((h) => escape(r[h])).join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function IncidentList() {
  const [profile, setProfile] = useState<{ role?: string; employeeId?: string } | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [employees, setEmployees] = useState<EmployeeLite[]>([]);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [severity, setSeverity] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [reportingOfficerEmployeeId, setReportingOfficerEmployeeId] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<IncidentListResponse>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [locationCards, setLocationCards] = useState<LocationSummaryCard[]>([]);
  const [locationOverviewStatus, setLocationOverviewStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [analyticsOpen, setAnalyticsOpen] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<any>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [assigningInvestigatorId, setAssigningInvestigatorId] = useState('');

  const listAbortRef = useRef<AbortController | null>(null);

  const canManage = useMemo(() => {
    const role = profile?.role;
    return role === UserRole.SUPER_ADMIN || role === UserRole.BUSINESS_ADMIN || role === UserRole.MANAGER;
  }, [profile?.role]);

  const groupedQueue = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; items: Incident[] }>();
    for (const i of data.items) {
      const key = i.locationId || 'UNASSIGNED';
      const label = i.location?.name || 'Unassigned';
      const existing = groups.get(key);
      if (existing) existing.items.push(i);
      else groups.set(key, { key, label, items: [i] });
    }
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [data.items]);

  const loadBase = useCallback(async () => {
    try {
      const [profileRes, locationsRes] = await Promise.all([api.get('/auth/profile'), api.get('/locations')]);
      setProfile(profileRes.data || null);
      setLocations(locationsRes.data || []);
    } catch {
      setProfile(null);
      setLocations([]);
    }
  }, []);

  const loadAdminData = useCallback(async () => {
    if (!canManage) return;
    try {
      const [employeesRes, summaryRes] = await Promise.all([
        api.get('/employees?status=ACTIVE'),
        api.get('/incident-reports/summary/locations', { params: { status: locationOverviewStatus } }),
      ]);
      setEmployees(employeesRes.data || []);
      setLocationCards(summaryRes.data || []);
    } catch {
      setEmployees([]);
      setLocationCards([]);
    }
  }, [canManage, locationOverviewStatus]);

  const loadAnalytics = useCallback(async () => {
    if (!canManage) return;
    try {
      const res = await api.get('/incident-reports/analytics', { params: { period: analyticsPeriod } });
      setAnalytics(res.data || null);
    } catch {
      setAnalytics(null);
    }
  }, [canManage, analyticsPeriod]);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, locationId, type, severity, status, reportingOfficerEmployeeId, from, to]);

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      listAbortRef.current?.abort();
      const controller = new AbortController();
      listAbortRef.current = controller;

      const res = await api.get('/incident-reports', {
        params: {
          page,
          pageSize,
          search: search || undefined,
          locationId: locationId || undefined,
          type: type || undefined,
          severity: severity || undefined,
          status: status || undefined,
          reportingOfficerEmployeeId: reportingOfficerEmployeeId || undefined,
          from: from || undefined,
          to: to || undefined,
        },
        signal: controller.signal as any,
      });
      setData(res.data || { items: [], total: 0, page, pageSize });
    } catch (err: any) {
      if (err?.code !== 'ERR_CANCELED') {
        toast.error('Failed to load incident reports');
      }
      setData({ items: [], total: 0, page, pageSize });
    } finally {
      setLoading(false);
    }
  }, [from, locationId, page, pageSize, reportingOfficerEmployeeId, search, severity, status, to, type]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const fetchDetail = useCallback(async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await api.get(`/incident-reports/${id}`);
      setSelected(res.data || null);
    } catch {
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    fetchDetail(selectedId);
  }, [selectedId, fetchDetail]);

  const openCreate = () => {
    setEditingIncident(null);
    setIsModalOpen(true);
  };

  const openEdit = () => {
    if (!canManage || !selected) {
      toast.error('You do not have permission to edit incidents');
      return;
    }
    setEditingIncident(selected);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIncident(null);
  };

  const refreshAll = async () => {
    await fetchIncidents();
    if (selectedId) await fetchDetail(selectedId);
    if (canManage) {
      await loadAdminData();
      await loadAnalytics();
    }
  };

  const showLocationIncidents = (locId: string) => {
    setSelectedId(null);
    setSelected(null);
    setFiltersOpen(false);
    setSearchInput('');
    setSearch('');
    setType('');
    setSeverity('');
    setStatus('');
    setReportingOfficerEmployeeId('');
    setFrom('');
    setTo('');
    setLocationId(locId);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / (data.pageSize || pageSize || 20)));

  const incidentRowsForCsv = useMemo(() => {
    return data.items.map((i) => ({
      reportNumber: i.reportNumber || i.id,
      title: i.title,
      type: i.type,
      severity: i.severity,
      status: i.status,
      location: i.location?.name || '',
      incidentAt: i.incidentAt || i.date,
      reportingOfficer: employeeName(i.reportingOfficer || undefined),
      submittedBy: fullName(i.submittedBy || undefined),
    }));
  }, [data.items]);

  const exportCsv = () => {
    downloadCsv(incidentRowsForCsv, `incident-reports-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportXlsx = async () => {
    if (!canManage) return;
    try {
      const res = await api.get('/incident-reports/export', {
        params: {
          format: 'xlsx',
          search: search || undefined,
          locationId: locationId || undefined,
          type: type || undefined,
          severity: severity || undefined,
          status: status || undefined,
          reportingOfficerEmployeeId: reportingOfficerEmployeeId || undefined,
          from: from || undefined,
          to: to || undefined,
        },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incident-reports-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export Excel');
    }
  };

  const exportSelectedPdf = async () => {
    if (!canManage) return;
    if (!selected) {
      toast.error('Select an incident to export');
      return;
    }
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();
      const evidenceRefs = (selected.evidence || []).map((e) => e.url).join(' | ');
      const persons = (selected.persons || []).map((p) => `${p.role}: ${p.name}${p.contactInfo ? ` (${p.contactInfo})` : ''}`).join(' | ');

      doc.setFontSize(16);
      doc.text('Incident Report', 14, 18);
      doc.setFontSize(10);
      doc.text(String(selected.reportNumber || selected.id), 14, 24);

      autoTable(doc, {
        startY: 30,
        head: [['Field', 'Value']],
        body: [
          ['Title', selected.title],
          ['Incident Type', selected.type],
          ['Severity', selected.severity],
          ['Status', selected.status],
          ['Location', selected.location?.name || ''],
          ['Incident Date/Time', new Date(selected.incidentAt || selected.date).toLocaleString()],
          ['Reporting Officer', employeeName(selected.reportingOfficer || undefined)],
          ['Submitted By', fullName(selected.submittedBy || undefined)],
          ['Assigned Supervisor', employeeName(selected.assignedSupervisor || undefined)],
          ['Assigned Investigator', employeeName(selected.assignedInvestigator || undefined)],
          ['Response Action', selected.responseAction || ''],
          ['Witness Present', selected.witnessPresent ? 'YES' : 'NO'],
          ['Law Enforcement Involved', selected.lawEnforcementInvolved ? 'YES' : 'NO'],
          ['Persons Involved', persons],
          ['Evidence References', evidenceRefs],
        ],
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 135 } },
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : 120,
        head: [['Incident Narrative']],
        body: [[selected.description || '']],
        styles: { fontSize: 9, cellPadding: 3 },
      });

      doc.save(`incident-${selected.reportNumber || selected.id}.pdf`);
    } catch {
      toast.error('Failed to export PDF');
    }
  };

  const addNote = async () => {
    if (!canManage || !selectedId) return;
    const note = noteDraft.trim();
    if (!note) return;
    try {
      await api.post(`/incident-reports/${selectedId}/notes`, { note });
      setNoteDraft('');
      await fetchDetail(selectedId);
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    }
  };

  const assignInvestigator = async () => {
    if (!canManage || !selectedId || !assigningInvestigatorId) return;
    try {
      await api.post(`/incident-reports/${selectedId}/assign-investigator`, { investigatorEmployeeId: assigningInvestigatorId });
      await fetchDetail(selectedId);
      toast.success('Investigator assigned');
    } catch {
      toast.error('Failed to assign investigator');
    }
  };

  const downloadEvidence = async (e: Evidence) => {
    try {
      const res = await api.get(e.url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: e.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = e.originalName || e.filename || 'evidence';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download evidence');
    }
  };

  const COLORS = ['#2563eb', '#7c3aed', '#06b6d4', '#f97316', '#ef4444', '#10b981', '#eab308'];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">Security Command Center</div>
          <div className="mt-1 flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Incident Reports</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40 flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>

          {canManage && (
            <>
              <button
                type="button"
                onClick={exportCsv}
                className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={exportXlsx}
                className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Excel
              </button>
              <button
                type="button"
                onClick={exportSelectedPdf}
                className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </button>
            </>
          )}

          <button
            type="button"
            onClick={refreshAll}
            className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40 flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            New Report
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Uploader, description, upload date (YYYY-MM-DD)…"
                      className="pl-9 w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                  >
                    <option value="">All</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                  >
                    <option value="">All</option>
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                  >
                    <option value="">All</option>
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                  >
                    <option value="">All</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {canManage && (
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Reporting Officer</label>
                    <select
                      value={reportingOfficerEmployeeId}
                      onChange={(e) => setReportingOfficerEmployeeId(e.target.value)}
                      className="w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                    >
                      <option value="">All</option>
                      {employees
                        .filter((e) => e.status === 'ACTIVE')
                        .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''))
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {employeeName(e)}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Rows</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                  >
                    {[10, 20, 30, 50].map((n) => (
                      <option key={n} value={n}>
                        {n} per page
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {canManage && locationCards.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <MapPin className="h-4 w-4 text-slate-500" />
              Location Overview
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1">
              {(['ACTIVE', 'INACTIVE', 'ALL'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setLocationOverviewStatus(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    locationOverviewStatus === v
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                  }`}
                >
                  {v === 'ACTIVE' ? 'Active' : v === 'INACTIVE' ? 'Inactive' : 'All'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {locationCards.map((c) => (
              <button
                key={c.locationId}
                type="button"
                onClick={() => showLocationIncidents(c.locationId)}
                className={`text-left rounded-xl border p-4 transition-colors ${
                  locationId === c.locationId
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{c.locationName}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Last: {c.lastIncidentDate ? new Date(c.lastIncidentDate).toLocaleString() : '—'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-semibold ${c.criticalIncidents ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200'}`}>
                      {c.criticalIncidents ? `${c.criticalIncidents} Critical` : 'Normal'}
                    </div>
                    {c.locationStatus && (
                      <div className={`px-2 py-1 rounded-full text-[11px] font-semibold ${c.locationStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200'}`}>
                        {c.locationStatus}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Total</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">{c.totalIncidents}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Open</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">{c.openIncidents}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Team</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">{c.assignedSecurityTeam.length}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {canManage && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setAnalyticsOpen((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/40"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <BarChart3 className="h-4 w-4 text-slate-500" />
              Incident Analysis
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <select
                value={analyticsPeriod}
                onChange={(e) => setAnalyticsPeriod(e.target.value as any)}
                className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {analyticsOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="p-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-3">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Trend</div>
                    <div className="h-56 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics?.trend || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                          <Tooltip />
                          <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-3">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Type Distribution</div>
                    <div className="h-56 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip />
                          <Legend />
                          <Pie data={analytics?.byType || []} dataKey="count" nameKey="type" outerRadius={80}>
                            {(analytics?.byType || []).map((_, idx) => (
                              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-3">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Incidents per Location</div>
                    <div className="h-56 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics?.byLocation || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                          <XAxis dataKey="locationName" tick={{ fontSize: 11 }} interval={0} height={60} angle={-25} textAnchor="end" />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-3">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Officer Activity</div>
                    <div className="h-56 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={(analytics?.byOfficer || []).slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                          <XAxis dataKey="officerName" tick={{ fontSize: 11 }} interval={0} height={60} angle={-25} textAnchor="end" />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Incident Queue</div>
            <div className="text-xs text-slate-500">{data.total} total</div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-slate-500">Loading incidents…</div>
          ) : data.items.length === 0 ? (
            <div className="py-10 text-center text-slate-500">No incident reports found.</div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {groupedQueue.map((group) => (
                <div key={group.key}>
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/40 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {group.label}
                    </span>
                    <span className="text-slate-500">{group.items.length}</span>
                  </div>
                  {group.items.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setSelectedId(i.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 ${
                        selectedId === i.id ? 'bg-slate-50 dark:bg-slate-700/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-500">{i.reportNumber || i.id.slice(0, 8)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${severityPill(i.severity)}`}>{i.severity}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusPill(i.status)}`}>{i.status}</span>
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white truncate">{i.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(i.createdAt || i.incidentAt || i.date).toLocaleString()}</span>
                            <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{fullName(i.submittedBy || undefined)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Activity className="h-4 w-4" />
                          <span>{i.type}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={`px-3 py-1.5 rounded-md text-sm border border-slate-200 dark:border-slate-700 ${
                  page <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={`px-3 py-1.5 rounded-md text-sm border border-slate-200 dark:border-slate-700 ${
                  page >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Incident Detail</div>
            <div className="flex items-center gap-2">
              {canManage && selected && (
                <button
                  type="button"
                  onClick={openEdit}
                  className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40 flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Edit
                </button>
              )}
            </div>
          </div>

          {!selectedId ? (
            <div className="py-12 text-center text-slate-500">Select an incident from the queue.</div>
          ) : detailLoading ? (
            <div className="py-12 text-center text-slate-500">Loading detail…</div>
          ) : !selected ? (
            <div className="py-12 text-center text-slate-500">Unable to load incident detail.</div>
          ) : (
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-slate-500">{selected.reportNumber || selected.id}</div>
                    <div className="mt-1 text-base font-bold text-slate-900 dark:text-white">{selected.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{new Date(selected.incidentAt || selected.date).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${severityPill(selected.severity)}`}>{selected.severity}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusPill(selected.status)}`}>{selected.status}</span>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                  {selected.description}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs text-slate-500">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Location</span>
                  <span className="text-slate-700 dark:text-slate-200">{selected.location?.name || 'Unassigned'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" />Type</span>
                  <span className="text-slate-700 dark:text-slate-200">{selected.type}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />Reporting Officer</span>
                  <span className="text-slate-700 dark:text-slate-200">{employeeName(selected.reportingOfficer || undefined)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />Submitted By</span>
                  <span className="text-slate-700 dark:text-slate-200">{fullName(selected.submittedBy || undefined)}</span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                  <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-slate-500" />Timeline</span>
                </div>
                <div className="p-3 space-y-2">
                  {(selected.timeline || []).length === 0 ? (
                    <div className="text-xs text-slate-500">No timeline events.</div>
                  ) : (
                    <div className="space-y-2">
                      {(selected.timeline || []).map((ev) => (
                        <div key={ev.id} className="flex items-start gap-3">
                          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{ev.eventType}</div>
                            <div className="text-[11px] text-slate-500">{new Date(ev.createdAt).toLocaleString()} • {fullName(ev.actorUser || undefined)}</div>
                            {ev.payload && (
                              <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 break-words">{ev.payload}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                  <span className="flex items-center gap-2"><Download className="h-4 w-4 text-slate-500" />Evidence</span>
                </div>
                <div className="p-3">
                  {(selected.evidence || []).length === 0 ? (
                    <div className="text-xs text-slate-500">No evidence attached.</div>
                  ) : (
                    <div className="space-y-2">
                      {(selected.evidence || []).map((e) => (
                        <div key={e.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{e.originalName}</div>
                            <div className="text-[11px] text-slate-500">{e.kind} • {new Date(e.createdAt).toLocaleString()}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => downloadEvidence(e)}
                            className="px-3 py-1.5 rounded-md text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                          >
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                    <span className="flex items-center gap-2"><Activity className="h-4 w-4 text-slate-500" />Management</span>
                  </div>
                  <div className="p-3 space-y-3">
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1">Assign Investigator</div>
                      <div className="flex items-center gap-2">
                        <select
                          value={assigningInvestigatorId}
                          onChange={(e) => setAssigningInvestigatorId(e.target.value)}
                          className="flex-1 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                        >
                          <option value="">Select…</option>
                          {employees
                            .filter((e) => e.status === 'ACTIVE')
                            .map((e) => (
                              <option key={e.id} value={e.id}>
                                {employeeName(e)}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={assignInvestigator}
                          className="px-3 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-sm"
                        >
                          Assign
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1">Investigation Notes</div>
                      <textarea
                        rows={3}
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        className="w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm p-2"
                        placeholder="Add a note to the incident timeline…"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={addNote}
                          className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 text-sm flex items-center gap-2"
                        >
                          <Activity className="h-4 w-4" />
                          Add Note
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <IncidentModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSuccess={refreshAll}
        initialData={editingIncident}
      />
    </div>
  );
}
