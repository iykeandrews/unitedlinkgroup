'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, isBefore, isSameDay } from 'date-fns';
import { AlertCircle, Calendar, CheckCircle2, Download, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../../lib/api';
import { useBusiness } from '../../../../context/business-context';
import { Modal, ModalActionButton } from '../../../../components/Modal';
import { ConfirmModal } from '../../../../components/ConfirmModal';

type AssignmentStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type AssignmentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

interface Client {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
  clientId?: string | null;
  client?: Client | null;
}

interface Assignment {
  id: string;
  businessId: string;
  title: string;
  description?: string | null;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  locationId?: string | null;
  location?: Location | null;
  assigneeId?: string | null;
  assignee?: Employee | null;
  startAt?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatDateTimeForInput(value: string | null | undefined) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AssignmentsPage() {
  const { selectedBusiness } = useBusiness();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<AssignmentStatus | 'ALL'>('ALL');
  const [priority, setPriority] = useState<AssignmentPriority | 'ALL'>('ALL');
  const [assigneeId, setAssigneeId] = useState<string>('all');
  const [locationId, setLocationId] = useState<string>('all');

  const [editor, setEditor] = useState<{
    open: boolean;
    saving: boolean;
    id?: string;
    title: string;
    description: string;
    status: AssignmentStatus;
    priority: AssignmentPriority;
    assigneeId: string;
    locationId: string;
    startAt: string;
    dueAt: string;
  }>({
    open: false,
    saving: false,
    title: '',
    description: '',
    status: 'OPEN',
    priority: 'MEDIUM',
    assigneeId: 'unassigned',
    locationId: 'unassigned',
    startAt: '',
    dueAt: '',
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id?: string; isLoading: boolean }>({
    isOpen: false,
    id: undefined,
    isLoading: false,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/profile');
        setUserRole(res.data.role);
      } catch {
        setUserRole(null);
      }
    };
    fetchProfile();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (q.trim()) params.q = q.trim();
      if (status !== 'ALL') params.status = status;
      if (priority !== 'ALL') params.priority = priority;
      if (assigneeId !== 'all') params.assigneeId = assigneeId === 'unassigned' ? '' : assigneeId;
      if (locationId !== 'all') params.locationId = locationId === 'unassigned' ? '' : locationId;

      const [assignRes, empRes, locRes] = await Promise.allSettled([
        api.get('/assignments', { params }),
        api.get('/employees', { params: { status: 'ACTIVE' } }),
        api.get('/locations', { params: { status: 'ACTIVE' } }),
      ]);

      if (assignRes.status === 'fulfilled') setAssignments(assignRes.value.data || []);
      else throw assignRes.reason;

      if (empRes.status === 'fulfilled') setEmployees(empRes.value.data || []);
      if (locRes.status === 'fulfilled') setLocations(locRes.value.data || []);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to load assignments';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [assigneeId, locationId, priority, q, status]);

  useEffect(() => {
    if (!userRole) return;
    if (userRole === 'SUPER_ADMIN' && !selectedBusiness) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [fetchData, selectedBusiness, userRole]);

  const stats = useMemo(() => {
    const now = new Date();
    const open = assignments.filter(a => a.status === 'OPEN').length;
    const inProgress = assignments.filter(a => a.status === 'IN_PROGRESS').length;
    const completed = assignments.filter(a => a.status === 'COMPLETED').length;
    const overdue = assignments.filter(a => a.status !== 'COMPLETED' && a.dueAt && isBefore(new Date(a.dueAt), now)).length;
    const dueToday = assignments.filter(a => a.status !== 'COMPLETED' && a.dueAt && isSameDay(new Date(a.dueAt), now)).length;
    return { open, inProgress, completed, overdue, dueToday, total: assignments.length };
  }, [assignments]);

  const statusBadge = (s: AssignmentStatus) => {
    if (s === 'COMPLETED') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (s === 'IN_PROGRESS') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    if (s === 'CANCELLED') return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  };

  const priorityBadge = (p: AssignmentPriority) => {
    if (p === 'URGENT') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    if (p === 'HIGH') return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    if (p === 'LOW') return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
  };

  const openCreate = () => {
    setEditor({
      open: true,
      saving: false,
      title: '',
      description: '',
      status: 'OPEN',
      priority: 'MEDIUM',
      assigneeId: 'unassigned',
      locationId: 'unassigned',
      startAt: '',
      dueAt: '',
    });
  };

  const openEdit = (a: Assignment) => {
    setEditor({
      open: true,
      saving: false,
      id: a.id,
      title: a.title,
      description: a.description || '',
      status: a.status,
      priority: a.priority,
      assigneeId: a.assigneeId || 'unassigned',
      locationId: a.locationId || 'unassigned',
      startAt: formatDateTimeForInput(a.startAt),
      dueAt: formatDateTimeForInput(a.dueAt),
    });
  };

  const save = async () => {
    if (!editor.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setEditor(prev => ({ ...prev, saving: true }));
    try {
      const payload: any = {
        title: editor.title.trim(),
        description: editor.description.trim() ? editor.description.trim() : null,
        status: editor.status,
        priority: editor.priority,
        assigneeId: editor.assigneeId === 'unassigned' ? null : editor.assigneeId,
        locationId: editor.locationId === 'unassigned' ? null : editor.locationId,
        startAt: editor.startAt ? new Date(editor.startAt).toISOString() : null,
        dueAt: editor.dueAt ? new Date(editor.dueAt).toISOString() : null,
      };
      if (editor.id) {
        await api.patch(`/assignments/${editor.id}`, payload);
        toast.success('Assignment updated');
      } else {
        await api.post('/assignments', payload);
        toast.success('Assignment created');
      }
      setEditor(prev => ({ ...prev, open: false }));
      fetchData();
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to save assignment';
      toast.error(msg);
      setEditor(prev => ({ ...prev, saving: false }));
    }
  };

  const setQuickStatus = async (a: Assignment, next: AssignmentStatus) => {
    try {
      await api.patch(`/assignments/${a.id}`, { status: next });
      toast.success('Updated');
      fetchData();
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to update assignment';
      toast.error(msg);
    }
  };

  const confirmDelete = (id: string) => setDeleteConfirm({ isOpen: true, id, isLoading: false });

  const performDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleteConfirm(prev => ({ ...prev, isLoading: true }));
    try {
      await api.delete(`/assignments/${deleteConfirm.id}`);
      toast.success('Assignment deleted');
      setDeleteConfirm({ isOpen: false, id: undefined, isLoading: false });
      fetchData();
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to delete assignment';
      toast.error(msg);
      setDeleteConfirm(prev => ({ ...prev, isLoading: false }));
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Title', 'Status', 'Priority', 'Assignee', 'Site', 'Client', 'Start', 'Due', 'Created'],
      ...assignments.map(a => {
        const assignee = a.assignee ? `${a.assignee.firstName} ${a.assignee.lastName}` : '';
        const site = a.location?.name || '';
        const client = a.location?.client?.name || '';
        const startAt = a.startAt ? new Date(a.startAt).toISOString() : '';
        const dueAt = a.dueAt ? new Date(a.dueAt).toISOString() : '';
        return [
          a.title,
          a.status,
          a.priority,
          assignee,
          site,
          client,
          startAt,
          dueAt,
          new Date(a.createdAt).toISOString(),
        ];
      }),
    ];
    const csv = rows
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assignments.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (userRole === 'SUPER_ADMIN' && !selectedBusiness) {
    return (
      <div className="py-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="text-lg font-semibold text-slate-900 dark:text-white">Select a business</div>
          <div className="text-slate-500 dark:text-slate-400 mt-1">Assignments require a business context.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Assignments</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Track operational tasks across sites, assignees, and due dates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
            >
              <Download size={18} />
              Export CSV
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Plus size={18} />
              New assignment
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Open" value={stats.open} icon={<AlertCircle className="w-4 h-4" />} />
          <StatCard label="In progress" value={stats.inProgress} icon={<Calendar className="w-4 h-4" />} />
          <StatCard label="Due today" value={stats.dueToday} icon={<Calendar className="w-4 h-4" />} />
          <StatCard label="Overdue" value={stats.overdue} icon={<AlertCircle className="w-4 h-4" />} danger />
          <StatCard label="Completed" value={stats.completed} icon={<CheckCircle2 className="w-4 h-4" />} />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search assignments…"
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchData()}
                  className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    setQ('');
                    setStatus('ALL');
                    setPriority('ALL');
                    setAssigneeId('all');
                    setLocationId('all');
                    setTimeout(() => fetchData(), 0);
                  }}
                  className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="ALL">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="ALL">All priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="all">All assignees</option>
                <option value="unassigned">Unassigned</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </select>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="all">All sites</option>
                <option value="unassigned">No site</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.client?.name ? `${l.client.name} — ` : ''}{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Site</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assignee</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500">Loading assignments…</td>
                  </tr>
                ) : assignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500">No assignments found.</td>
                  </tr>
                ) : (
                  assignments.map((a) => {
                    const due = a.dueAt ? new Date(a.dueAt) : null;
                    const overdue = a.status !== 'COMPLETED' && due && isBefore(due, new Date());
                    return (
                      <tr
                        key={a.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                        onClick={() => openEdit(a)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900 dark:text-white">{a.title}</div>
                          <div className="text-xs text-slate-500 line-clamp-1">{a.description || '—'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">
                          {a.location?.client?.name ? (
                            <div className="flex flex-col">
                              <span className="font-medium">{a.location.client.name}</span>
                              <span className="text-xs text-slate-500">{a.location.name}</span>
                            </div>
                          ) : (
                            a.location?.name || '—'
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">
                          {a.assignee ? `${a.assignee.firstName} ${a.assignee.lastName}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {due ? (
                            <span className={`${overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-700 dark:text-slate-200'}`}>
                              {format(due, 'd MMM yyyy, HH:mm')}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${priorityBadge(a.priority)}`}>
                            {a.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(a.status)}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {a.status !== 'IN_PROGRESS' && a.status !== 'COMPLETED' && (
                              <button
                                onClick={() => setQuickStatus(a, 'IN_PROGRESS')}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                              >
                                Start
                              </button>
                            )}
                            {a.status !== 'COMPLETED' && (
                              <button
                                onClick={() => setQuickStatus(a, 'COMPLETED')}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-green-600 hover:bg-green-700 text-white"
                              >
                                Complete
                              </button>
                            )}
                            <button
                              onClick={() => confirmDelete(a.id)}
                              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={editor.open} onClose={() => setEditor(prev => ({ ...prev, open: false }))} title={editor.id ? 'Edit assignment' : 'New assignment'} maxWidth="max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Title</label>
            <input
              value={editor.title}
              onChange={(e) => setEditor(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g. Patrol check, Site inspection, Client request follow-up"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Description</label>
            <textarea
              value={editor.description}
              onChange={(e) => setEditor(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Add key details, instructions, and expected outcome."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Status</label>
            <select
              value={editor.status}
              onChange={(e) => setEditor(prev => ({ ...prev, status: e.target.value as any }))}
              className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Priority</label>
            <select
              value={editor.priority}
              onChange={(e) => setEditor(prev => ({ ...prev, priority: e.target.value as any }))}
              className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Assignee</label>
            <select
              value={editor.assigneeId}
              onChange={(e) => setEditor(prev => ({ ...prev, assigneeId: e.target.value }))}
              className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="unassigned">Unassigned</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Site</label>
            <select
              value={editor.locationId}
              onChange={(e) => setEditor(prev => ({ ...prev, locationId: e.target.value }))}
              className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="unassigned">No site</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.client?.name ? `${l.client.name} — ` : ''}{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Start</label>
            <input
              type="datetime-local"
              value={editor.startAt}
              onChange={(e) => setEditor(prev => ({ ...prev, startAt: e.target.value }))}
              className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Due</label>
            <input
              type="datetime-local"
              value={editor.dueAt}
              onChange={(e) => setEditor(prev => ({ ...prev, dueAt: e.target.value }))}
              className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setEditor(prev => ({ ...prev, open: false }));
            }}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <ModalActionButton kind="submit" onClick={() => save()} disabled={editor.saving}>
              {editor.saving ? 'Saving…' : editor.id ? 'Save changes' : 'Create'}
            </ModalActionButton>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: undefined, isLoading: false })}
        onConfirm={performDelete}
        title="Delete assignment"
        message="Delete this assignment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteConfirm.isLoading}
      />
    </div>
  );
}

function StatCard({ label, value, icon, danger }: { label: string; value: number; icon: any; danger?: boolean }) {
  return (
    <div className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between ${
      danger ? 'ring-1 ring-red-200 dark:ring-red-900/40' : ''
    }`}>
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</div>
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
        danger ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-200'
      }`}>
        {icon}
      </div>
    </div>
  );
}
