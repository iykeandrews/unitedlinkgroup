'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, isBefore, isSameDay } from 'date-fns';
import { CheckCircle2, FileSignature, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { useBusiness } from '../../context/business-context';

type AssignmentStatus = 'PENDING' | 'SUBMITTED' | 'VOID';

interface Template {
  id: string;
  type: 'EMPLOYMENT_FORM' | 'SOP';
  title: string;
  description?: string | null;
  version?: string | null;
}

interface Assignment {
  id: string;
  status: AssignmentStatus;
  assignedAt: string;
  dueAt?: string | null;
  submittedAt?: string | null;
  template: Template;
}

export function EmployeeFormsMy() {
  const { selectedBusiness } = useBusiness();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Assignment[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/auth/profile');
        setRole(res.data.role);
      } catch {
        setRole(null);
      }
    };
    load();
  }, []);

  const fetchData = useCallback(async () => {
    if (!role) return;
    if (role === 'SUPER_ADMIN' && !selectedBusiness) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/employee-forms/my-assignments');
      setItems(res.data || []);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to load forms';
      toast.error(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [role, selectedBusiness]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const now = new Date();
    const pending = items.filter(i => i.status === 'PENDING').length;
    const submitted = items.filter(i => i.status === 'SUBMITTED').length;
    const overdue = items.filter(i => i.status === 'PENDING' && i.dueAt && isBefore(new Date(i.dueAt), now)).length;
    const dueToday = items.filter(i => i.status === 'PENDING' && i.dueAt && isSameDay(new Date(i.dueAt), now)).length;
    return { pending, submitted, overdue, dueToday, total: items.length };
  }, [items]);

  if (role === 'SUPER_ADMIN' && !selectedBusiness) {
    return (
      <div className="py-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="text-lg font-semibold text-slate-900 dark:text-white">Select a business</div>
          <div className="text-slate-500 dark:text-slate-400 mt-1">Forms require a business context.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Forms</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Complete assigned employment forms and SOP acknowledgements.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <StatCard label="Pending" value={stats.pending} danger={stats.overdue > 0} icon={<FileSignature className="w-4 h-4" />} />
          <StatCard label="Due today" value={stats.dueToday} icon={<FileSignature className="w-4 h-4" />} />
          <StatCard label="Overdue" value={stats.overdue} danger icon={<FileSignature className="w-4 h-4" />} />
          <StatCard label="Submitted" value={stats.submitted} icon={<CheckCircle2 className="w-4 h-4" />} />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Document</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">Loading…</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">No assigned forms.</td>
                  </tr>
                ) : (
                  items.map(a => {
                    const due = a.dueAt ? new Date(a.dueAt) : null;
                    const overdue = a.status === 'PENDING' && due && isBefore(due, new Date());
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900 dark:text-white">{a.template.title}</div>
                          <div className="text-xs text-slate-500 line-clamp-1">{a.template.description || '—'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">
                          {a.template.type === 'SOP' ? (
                            <span className="inline-flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                              SOP
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <FileSignature className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                              Employment form
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {due ? (
                            <span className={`${overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-700 dark:text-slate-200'}`}>
                              {format(due, 'd MMM yyyy')}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            a.status === 'SUBMITTED'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {a.status === 'SUBMITTED' ? (
                            <Link
                              href={`/dashboard/forms/${a.id}/print`}
                              target="_blank"
                              className="px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                            >
                              View
                            </Link>
                          ) : (
                            <Link
                              href={`/dashboard/forms/${a.id}`}
                              className="px-3 py-2 text-sm font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              Fill & Sign
                            </Link>
                          )}
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

