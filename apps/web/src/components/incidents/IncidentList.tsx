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

export default function IncidentList({detailId, onClose}: {detailId:string; onClose:()=>void}) {
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
  const [emailBusy, setEmailBusy] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [assigningInvestigatorId, setAssigningInvestigatorId] = useState('');

  useEffect(() => {setSelectedId(detailId);}, [detailId]);

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
    if(!canManage || !selected) return;
    try {
      const response=await api.get('/incident-reports/export',{params:{format:'pdf',id:selected.id},responseType:'blob'});
      const url=URL.createObjectURL(response.data);const a=document.createElement('a');a.href=url;a.download='incident-report.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch {toast.error('Unable to export report');}
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
      const target=new URL(e.url,window.location.origin);
      if(!['http:','https:'].includes(target.protocol))throw Error('Invalid attachment URL');
      const res=target.origin===window.location.origin?await api.get(target.pathname+target.search,{responseType:'blob'}):{data:await fetch(target.href,{credentials:'omit'}).then(response=>{if(!response.ok)throw Error('Download failed');return response.blob();})};
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

  const exportSelectedExcel = async () => {
    try {
      const response=await api.get('/incident-reports/export',{params:{format:'xlsx',id:detailId},responseType:'blob'});
      const url=URL.createObjectURL(response.data);const a=document.createElement('a');a.href=url;a.download='incident-report.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch {toast.error('Unable to export report');}
  };
  const emailClient = async () => {
    if(emailBusy)return;setEmailBusy(true);
    try {
      const response=await api.post('/incident-reports/'+detailId+'/email-client');
      if(response.data.status==='SENT') toast.success('Report accepted by the mail server');
      else toast.error('Email failed or partially accepted. Check delivery details before retrying.');
      await fetchDetail(detailId);
    } catch(error:any) {toast.error(error?.response?.data?.message||'Unable to email client');} finally {setEmailBusy(false);}
  };
  return (<div className="space-y-4">        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Incident Detail</div><button onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">Close</button>{canManage && <><button onClick={exportSelectedPdf} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">PDF</button><button onClick={exportSelectedExcel} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">Excel</button></>}{canManage && <button disabled={emailBusy} onClick={emailClient} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">Email client</button>}
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
                    <div className="mt-1 text-xs text-slate-500">{new Date(selected.incidentAt || selected.date).toLocaleString("en-US",{timeZone:"America/New_York"})}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${severityPill(selected.severity)}`}>{selected.severity}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusPill(selected.status)}`}>{selected.status}</span>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                  <span className="whitespace-pre-wrap break-words">{selected.description}</span>
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
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{ev.eventType.replaceAll('_',' ')}</div>
                            <div className="text-[11px] text-slate-500">{new Date(ev.createdAt).toLocaleString("en-US", {timeZone:"America/New_York"})} • {fullName(ev.actorUser || undefined)}</div>
                            {ev.payload && (
                              <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 break-words">{(() => {try {const payload=JSON.parse(ev.payload);if(payload.note)return payload.note;if(payload.message)return payload.message+(payload.recipients?' Recipients: '+payload.recipients.join(', '):'');if(payload.after?.status)return 'Status: '+payload.after.status.replaceAll('_',' ');if(payload.originalName)return payload.originalName;if(payload.investigatorEmployeeId)return 'Investigator assigned';return 'Report details updated';}catch{return ev.payload;}})()}</div>
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
                            <div className="text-[11px] text-slate-500">{e.kind} • {new Date(e.createdAt).toLocaleString("en-US", {timeZone:"America/New_York"})}</div>
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
      <IncidentModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSuccess={refreshAll}
        initialData={editingIncident}
      />
    </div>
  );
}
