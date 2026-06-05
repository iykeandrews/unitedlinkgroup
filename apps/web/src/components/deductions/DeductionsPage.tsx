'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Filter, Search, Loader2, ShieldCheck, AlertTriangle, CheckCircle2, Clock, ArrowDownCircle, FileText, Edit2, PauseCircle, MoreHorizontal, Info } from 'lucide-react';
import { toast } from 'sonner';

import api from '../../lib/api';
import { useBusiness } from '../../context/business-context';
import { formatCurrency, formatDate } from '../../lib/localization';
import { UserRole } from '@unitedlinkgroup/types';
import { ConfirmModal } from '../ConfirmModal';

type DeductionStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';
type DeductionTaxClass = 'PRE_TAX' | 'POST_TAX';
type DeductionType = 'LOAN' | 'GARNISHMENT' | 'UNION_DUES' | 'INSURANCE' | 'RETIREMENT' | 'OTHER';
type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'SEMI_MONTHLY';
type SourceType = 'MANUAL' | 'LOAN' | 'COURT_ORDER';

interface Deduction {
  id: string;
  employeeId: string;
  employeeName: string;
  type: DeductionType;
  taxClass: DeductionTaxClass;
  amountType: 'FIXED' | 'PERCENT';
  amountValue: number;
  frequency: Frequency;
  status: DeductionStatus;
  startDate?: string;
  endDate?: string;
  source: SourceType;
  remainingBalance?: number | null;
  loanId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  auditTrail?: Array<{ at: string; action: string; by?: string }>;
}

export default function DeductionsPage() {
  const { selectedBusiness } = useBusiness();
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DeductionStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | DeductionType>('all');
  const [taxFilter, setTaxFilter] = useState<'all' | DeductionTaxClass>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | SourceType>('all');

  const [sortKey, setSortKey] = useState<keyof Deduction>('employeeName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [selected, setSelected] = useState<Deduction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editPayload, setEditPayload] = useState<Partial<Deduction>>({});
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    variant?: 'primary' | 'danger';
    onConfirm?: () => Promise<void> | void;
  }>({ isOpen: false });
  const [employeesOptions, setEmployeesOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPayload, setCreatePayload] = useState<Partial<Deduction & { employeeId: string }>>({
    status: 'ACTIVE',
    source: 'MANUAL',
    taxClass: 'POST_TAX',
    amountType: 'FIXED',
    frequency: 'BIWEEKLY',
  });
  const [loanDeductions, setLoanDeductions] = useState<Deduction[]>([]);
  const [loanRefreshTick, setLoanRefreshTick] = useState(0);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [policyOpen, setPolicyOpen] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get('/auth/profile');
        setUserRole(res.data.role as UserRole);
      } catch {}
    };
    loadProfile();
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.get('/employees', { params: { status: 'ACTIVE' } });
        const opts = (res.data || []).map((e: any) => ({ id: e.id, name: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email }));
        setEmployeesOptions(opts);
      } catch {}
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchDeductions = async () => {
      if (!selectedBusiness) {
        setDeductions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get('/deductions', {
          params: {
            status: statusFilter === 'all' ? undefined : statusFilter,
            type: typeFilter === 'all' ? undefined : typeFilter,
            taxClass: taxFilter === 'all' ? undefined : taxFilter,
            source: sourceFilter === 'all' ? undefined : sourceFilter,
            q: searchText || undefined,
            page,
            pageSize,
          },
        });
        setDeductions(res.data?.items || res.data || []);
      } catch {
        setDeductions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDeductions();
  }, [selectedBusiness, statusFilter, typeFilter, taxFilter, sourceFilter, searchText, page, pageSize]);

  useEffect(() => {
    let isMounted = true;
    const fetchLoans = async () => {
      try {
        const res = await api.get('/loans');
        const loans = (res.data || []) as Array<{
          id: string;
          amount: number;
          balance: number;
          termMonths: number;
          perPayPeriodDeduction: number;
          status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'DEFAULTED';
          employee?: { id?: string; firstName?: string; lastName?: string };
          createdAt?: string;
          updatedAt?: string;
        }>;
        const approved = loans.filter(l => l.status === 'APPROVED');
        const mapped: Deduction[] = approved.map(l => {
          const employeeId = l.employee?.id || '';
          const employeeName = `${l.employee?.firstName || ''} ${l.employee?.lastName || ''}`.trim();
          const status: DeductionStatus = l.balance > 0 ? 'ACTIVE' : 'COMPLETED';
          return {
            id: `loan-${l.id}`,
            employeeId,
            employeeName: employeeName || 'Employee',
            type: 'LOAN',
            taxClass: 'POST_TAX',
            amountType: 'FIXED',
            amountValue: l.perPayPeriodDeduction,
            frequency: 'BIWEEKLY',
            status,
            startDate: l.createdAt,
            endDate: undefined,
            source: 'LOAN',
            remainingBalance: l.balance,
            loanId: l.id,
            createdAt: l.createdAt,
            updatedAt: l.updatedAt,
            auditTrail: [
              { at: l.createdAt || new Date().toISOString(), action: 'Loan Approved' },
            ],
          };
        });
        if (isMounted) setLoanDeductions(mapped);
      } catch {
        if (isMounted) setLoanDeductions([]);
      }
    };
    fetchLoans();
    const interval = setInterval(() => {
      setLoanRefreshTick(t => t + 1);
      fetchLoans();
    }, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedBusiness]);

  const filtered = useMemo(() => {
    let data = deductions.slice().concat(loanDeductions);
    if (searchText) {
      const q = searchText.toLowerCase();
      data = data.filter(d =>
        (d.employeeName || '').toLowerCase().includes(q) ||
        (d.type || '').toLowerCase().includes(q)
      );
    }
    if (employeeFilter !== 'all') {
      data = data.filter(d => d.employeeId === employeeFilter);
    }
    if (statusFilter !== 'all') {
      data = data.filter(d => d.status === statusFilter);
    }
    if (typeFilter !== 'all') {
      data = data.filter(d => d.type === typeFilter);
    }
    if (taxFilter !== 'all') {
      data = data.filter(d => d.taxClass === taxFilter);
    }
    if (sourceFilter !== 'all') {
      data = data.filter(d => d.source === sourceFilter);
    }
    data.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const sa = String(av ?? '');
      const sb = String(bv ?? '');
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return data;
  }, [deductions, loanDeductions, searchText, sortKey, sortDir, employeeFilter, statusFilter, typeFilter, taxFilter, sourceFilter]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchText, employeeFilter, statusFilter, typeFilter, taxFilter, sourceFilter]);

  const statusBadge = (s: DeductionStatus) => {
    const map: Record<DeductionStatus, { color: string; icon: React.ReactNode; label: string }> = {
      ACTIVE: { color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30', icon: <CheckCircle2 size={14} />, label: 'Active' },
      PAUSED: { color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', icon: <PauseCircle size={14} />, label: 'Paused' },
      COMPLETED: { color: 'text-slate-600 bg-slate-100 dark:bg-slate-800/40', icon: <Clock size={14} />, label: 'Completed' },
    };
    const m = map[s];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${m.color}`}>
        {m.icon}
        {m.label}
      </span>
    );
  };

  const canManage = userRole && userRole !== UserRole.EMPLOYEE;

  const openDetails = async (d: Deduction) => {
    setSelected(d);
    setDetailsOpen(true);
    setEditPayload({
      type: d.type,
      taxClass: d.taxClass,
      amountType: d.amountType,
      amountValue: d.amountValue,
      frequency: d.frequency,
      status: d.status,
      startDate: d.startDate,
      endDate: d.endDate,
    });
    try {
      if (d.loanId) {
        const loanRes = await api.get(`/loans/${d.loanId}`);
        setSelectedLoan(loanRes.data);
        try {
          const auditRes = await api.get('/audit', { params: { resource: 'Loan', resourceId: d.loanId, limit: 50 } });
          const trail = (auditRes.data || []).map((l: any) => ({
            at: l.at || l.createdAt,
            action: l.action,
            by: l.by || '-',
          }));
          setSelected(s => (s ? { ...s, auditTrail: trail } : s));
        } catch {}
      } else {
        const res = await api.get(`/deductions/${d.id}`);
        setSelected(res.data || d);
      }
    } catch {}
  };

  const saveEdit = async () => {
    if (!selected) return;
    try {
      await api.put(`/deductions/${selected.id}`, { ...editPayload });
      toast.success('Deduction updated');
      setDetailsOpen(false);
      setSelected(null);
      setEditPayload({});
      const res = await api.get('/deductions', { params: { page, pageSize } });
      setDeductions(res.data?.items || res.data || []);
    } catch {
      toast.error('Failed to update deduction');
    }
  };

  const togglePause = async (d: Deduction) => {
    const next = d.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    setConfirmState({
      isOpen: true,
      title: next === 'ACTIVE' ? 'Resume Deduction' : 'Pause Deduction',
      message: next === 'ACTIVE'
        ? `Resume deduction for ${d.employeeName}? It will be applied to the next payroll.`
        : `Pause deduction for ${d.employeeName}? It will not be applied until resumed.`,
      confirmText: next === 'ACTIVE' ? 'Resume' : 'Pause',
      variant: next === 'ACTIVE' ? 'primary' : 'danger',
      onConfirm: async () => {
        try {
          await api.put(`/deductions/${d.id}/status`, { status: next });
          toast.success(next === 'ACTIVE' ? 'Deduction resumed' : 'Deduction paused');
          const res = await api.get('/deductions', { params: { page, pageSize } });
          setDeductions(res.data?.items || res.data || []);
        } catch {
          toast.error('Failed to change status');
        } finally {
          setConfirmState(s => ({ ...s, isOpen: false }));
        }
      }
    });
  };

  const employeesList = useMemo(() => {
    const pairs = Array.from(new Map(deductions.map(d => [d.employeeId, d.employeeName])).entries());
    return pairs.map(([id, name]) => ({ id, name }));
  }, [deductions]);

  const metrics = useMemo(() => {
    const combined = deductions.concat(loanDeductions);
    const active = combined.filter(d => d.status === 'ACTIVE');
    const completed = combined.filter(d => d.status === 'COMPLETED');
    const loans = combined.filter(d => d.type === 'LOAN');
    const totalFixedActive = active
      .filter(d => d.amountType === 'FIXED')
      .reduce((sum, d) => sum + (d.amountValue || 0), 0);
    const percentCount = active.filter(d => d.amountType === 'PERCENT').length;
    return {
      totalActive: active.length,
      totalFixedAmountActive: totalFixedActive,
      percentActiveCount: percentCount,
      loanCount: loans.length,
      completedCount: completed.length,
    };
  }, [deductions, loanDeductions]);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6 rounded-2xl bg-white/60 dark:bg-slate-900/40 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 text-indigo-600 dark:text-indigo-400 shadow-sm">
              <ArrowDownCircle size={20} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Deductions</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">Payroll-integrated and DC-compliant deductions management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
              >
                + Create Deduction
              </button>
            )}
            <button onClick={() => setPolicyOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:shadow-md transition-all">
              <FileText size={16} />
              Policy
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 p-4 shadow-sm">
            <div className="text-xs text-slate-600 dark:text-slate-400">Active Deductions</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.totalActive}</div>
          </div>
          <div className="rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-600 dark:text-slate-400">Total Amount (current period)</div>
              <Info className="text-slate-400" size={14} aria-label="Computed from active fixed-amount deductions; percent-based reductions vary by gross pay." />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(metrics.totalFixedAmountActive, selectedBusiness?.currencyCode)}{metrics.percentActiveCount ? <span className="ml-2 text-xs font-medium text-slate-500">+ {metrics.percentActiveCount} % deductions</span> : null}</div>
          </div>
          <div className="rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 p-4 shadow-sm">
            <div className="text-xs text-slate-600 dark:text-slate-400">Loan‑based Deductions</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.loanCount}</div>
          </div>
          <div className="rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 p-4 shadow-sm">
            <div className="text-xs text-slate-600 dark:text-slate-400">Completed</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.completedCount}</div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <input
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="Search employee or deduction type"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Search className="absolute left-2 top-2.5 text-slate-400" size={16} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur border border-slate-200 dark:border-slate-700">
                <Filter size={16} className="text-slate-400" />
                <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} className="bg-transparent text-sm text-slate-900 dark:text-white outline-none">
                  <option value="all">Employee</option>
                  {employeesList.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="bg-transparent text-sm text-slate-900 dark:text-white outline-none">
                  <option value="all">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="bg-transparent text-sm text-slate-900 dark:text-white outline-none">
                  <option value="all">All Types</option>
                  <option value="LOAN">Loan Repayment</option>
                  <option value="GARNISHMENT">Garnishment</option>
                  <option value="UNION_DUES">Union Dues</option>
                  <option value="INSURANCE">Insurance Premium</option>
                  <option value="RETIREMENT">Retirement</option>
                  <option value="OTHER">Other</option>
                </select>
                <select value={taxFilter} onChange={e => setTaxFilter(e.target.value as any)} className="bg-transparent text-sm text-slate-900 dark:text-white outline-none">
                  <option value="all">Tax Class</option>
                  <option value="PRE_TAX">Pre-tax</option>
                  <option value="POST_TAX">Post-tax</option>
                </select>
                <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as any)} className="bg-transparent text-sm text-slate-900 dark:text-white outline-none">
                  <option value="all">Source</option>
                  <option value="MANUAL">Manual</option>
                  <option value="LOAN">Loan</option>
                  <option value="COURT_ORDER">Court Order</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 dark:bg-slate-800/70 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 overflow-hidden shadow-sm">
          <div className="min-w-full overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 sticky top-0 z-10">
                <tr>
                  {[
                    { key: 'employeeName', label: 'Employee' },
                    { key: 'type', label: 'Type' },
                    { key: 'amountValue', label: 'Amount' },
                    { key: 'frequency', label: 'Frequency' },
                    { key: 'remainingBalance', label: 'Remaining' },
                    { key: 'status', label: 'Status' },
                    { key: 'source', label: 'Source' },
                  ].map(({ key, label }) => (
                    <th key={key} className="text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider px-4 py-3 cursor-pointer select-none" onClick={() => {
                      setSortKey(key as keyof Deduction);
                      setSortDir(d => (sortKey === (key as keyof Deduction) ? (d === 'asc' ? 'desc' : 'asc') : 'asc'));
                    }}>
                      {label}
                      {sortKey === (key as keyof Deduction) ? <span className="ml-1 text-slate-400">{sortDir === 'asc' ? '▲' : '▼'}</span> : null}
                    </th>
                  ))}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-4">
                      <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-10 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        ))}
                      </div>
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12">
                      <div className="text-center text-slate-500">
                        <div className="text-lg font-semibold mb-1">No deductions found</div>
                        <div className="text-sm">
                          Try adjusting filters or {canManage && <button onClick={() => setCreateOpen(true)} className="text-indigo-600 hover:underline">create a deduction</button>}.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map(d => (
                    <tr key={d.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-all">
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{d.employeeName}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300">
                          {d.type === 'LOAN' ? 'Loan Repayment' : d.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                        {d.amountType === 'FIXED' ? formatCurrency(d.amountValue, selectedBusiness?.currencyCode) : `${d.amountValue}%`} {d.taxClass === 'PRE_TAX' ? '(Pre-tax)' : '(Post-tax)'}
                        {d.type === 'LOAN' && (
                          <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                            Loan
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{d.frequency}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{typeof d.remainingBalance === 'number' ? formatCurrency(d.remainingBalance, selectedBusiness?.currencyCode) : '-'}</td>
                      <td className="px-4 py-3 text-sm">{statusBadge(d.status)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{d.source === 'COURT_ORDER' ? 'Court Order' : d.source.charAt(0) + d.source.slice(1).toLowerCase()}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="relative inline-block">
                          <button
                            aria-label="Actions"
                            onClick={() => openDetails(d)}
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <MoreHorizontal size={18} className="text-slate-600 dark:text-slate-300" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Page {page} • Showing {paged.length} of {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-50 hover:shadow-sm transition-all">
                Prev
              </button>
              <button disabled={(page * pageSize) >= filtered.length} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-50 hover:shadow-sm transition-all">
                Next
              </button>
              <select value={pageSize} onChange={e => setPageSize(parseInt(e.target.value))} className="ml-2 text-sm bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur border border-slate-200 dark:border-slate-700 rounded px-2 py-1">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {detailsOpen && selected && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailsOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xl border-l border-slate-200 dark:border-slate-700">
            <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-slate-500" />
                <div>
                  <div className="text-xs text-slate-500">Deduction</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{selected.employeeName}</div>
                </div>
              </div>
              <button onClick={() => setDetailsOpen(false)} className="text-slate-600 dark:text-slate-300">Close</button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto h-[calc(100%-72px)]">
              <div className="flex items-center gap-2">
                {selected.type === 'LOAN' && (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                    Loan‑linked
                  </span>
                )}
                {selected.status === 'ACTIVE' && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" title="Applied to next payroll">
                    Applied to next payroll
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300">Configuration</div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-500">Type</div>
                    <select value={editPayload.type || ''} onChange={e => setEditPayload(p => ({ ...p, type: e.target.value as any }))} disabled={selected.type === 'LOAN'} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                      <option value="LOAN">Loan Repayment</option>
                      <option value="GARNISHMENT">Garnishment</option>
                      <option value="UNION_DUES">Union Dues</option>
                      <option value="INSURANCE">Insurance Premium</option>
                      <option value="RETIREMENT">Retirement</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-slate-500">Tax Class</div>
                    <select value={editPayload.taxClass || ''} onChange={e => setEditPayload(p => ({ ...p, taxClass: e.target.value as any }))} disabled={selected.type === 'LOAN'} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                      <option value="PRE_TAX">Pre-tax</option>
                      <option value="POST_TAX">Post-tax</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-slate-500">Amount Type</div>
                    <select value={editPayload.amountType || ''} onChange={e => setEditPayload(p => ({ ...p, amountType: e.target.value as any }))} disabled={selected.type === 'LOAN'} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                      <option value="FIXED">Fixed</option>
                      <option value="PERCENT">Percent</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-slate-500">Amount</div>
                    <input type="number" value={editPayload.amountValue ?? ''} onChange={e => setEditPayload(p => ({ ...p, amountValue: parseFloat(e.target.value) }))} disabled={selected.type === 'LOAN'} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
                  </div>
                  <div>
                    <div className="text-slate-500">Frequency</div>
                    <select value={editPayload.frequency || ''} onChange={e => setEditPayload(p => ({ ...p, frequency: e.target.value as any }))} disabled={selected.type === 'LOAN'} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                      <option value="WEEKLY">Weekly</option>
                      <option value="BIWEEKLY">Biweekly</option>
                      <option value="SEMI_MONTHLY">Semi-monthly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-slate-500">Status</div>
                    <select value={editPayload.status || ''} onChange={e => setEditPayload(p => ({ ...p, status: e.target.value as any }))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                      <option value="ACTIVE">Active</option>
                      <option value="PAUSED">Paused</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-slate-500">Start Date</div>
                    <input type="date" value={editPayload.startDate ? format(new Date(editPayload.startDate), 'yyyy-MM-dd') : ''} onChange={e => setEditPayload(p => ({ ...p, startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
                  </div>
                  <div>
                    <div className="text-slate-500">End Date</div>
                    <input type="date" value={editPayload.endDate ? format(new Date(editPayload.endDate), 'yyyy-MM-dd') : ''} onChange={e => setEditPayload(p => ({ ...p, endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300">Payroll Impact Preview</div>
                <div className="p-4 text-sm space-y-2">
                  <div className="text-slate-600">Per-period deduction:</div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {editPayload.amountType === 'PERCENT' ? `${editPayload.amountValue ?? 0}%` : `${formatCurrency(editPayload.amountValue ?? 0, selectedBusiness?.currencyCode)}`} • {editPayload.taxClass === 'PRE_TAX' ? 'Pre-tax' : 'Post-tax'}
                  </div>
                  <div className="text-xs text-slate-500">Applied automatically during payroll creation. Reduces net pay only.</div>
                  {selected.type === 'LOAN' && typeof selected.remainingBalance === 'number' && (
                    <div className="mt-3">
                      <div className="text-slate-600 mb-1">Repayment progress</div>
                      <div className="w-full h-2 rounded bg-slate-200 dark:bg-slate-800">
                        <div className="h-2 rounded bg-indigo-500" style={{ width: `${Math.max(0, Math.min(100, (((selectedLoan?.amount || 0) - (selectedLoan?.balance || 0)) / Math.max(1, (selectedLoan?.amount || 0))) * 100))}%` }} />
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Remaining: {formatCurrency(selected.remainingBalance, selectedBusiness?.currencyCode)}{selectedLoan?.amount ? ` • Original: ${formatCurrency(selectedLoan.amount || 0, selectedBusiness?.currencyCode)} • Repaid: ${formatCurrency(Math.max(0, (selectedLoan.amount || 0) - (selectedLoan.balance || 0)), selectedBusiness?.currencyCode)}` : ''}</div>
                      {selected.loanId && (
                        <div className="text-xs text-slate-500 mt-1">
                          Loan Ref: {selected.loanId} • <a href="/dashboard/requests/loans" className="text-indigo-600 hover:underline">View Loan</a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selected.type === 'LOAN' && selectedLoan && Array.isArray(selectedLoan.repayments) && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300">Repayment History</div>
                  <div className="p-4 space-y-2 text-sm">
                    {(selectedLoan.repayments || []).length === 0 && <div className="text-slate-400">No repayments yet</div>}
                    {(selectedLoan.repayments || []).map((r: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="text-slate-600">Payroll: {r.payrollId || '-'}</div>
                        <div className="text-slate-400">{format(new Date(r.date), 'yyyy-MM-dd')}</div>
                        <div className="font-medium text-slate-900 dark:text-white">{formatCurrency(r.amount || 0, selectedBusiness?.currencyCode)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300">Tracking & Audit</div>
                <div className="p-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-500">Created</div>
                    <div className="font-medium">{selected.createdAt ? format(new Date(selected.createdAt), 'yyyy-MM-dd HH:mm') : '-'}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-slate-500">Updated</div>
                    <div className="font-medium">{selected.updatedAt ? format(new Date(selected.updatedAt), 'yyyy-MM-dd HH:mm') : '-'}</div>
                  </div>
                  <div className="mt-3">
                    <div className="text-slate-500 mb-2">Status History</div>
                    <div className="space-y-2">
                      {(selected.auditTrail || []).map((e, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="text-slate-600">{e.action}</div>
                          <div className="text-slate-400">{e.by || '-'}</div>
                          <div className="text-slate-400">{format(new Date(e.at), 'yyyy-MM-dd HH:mm')}</div>
                        </div>
                      ))}
                      {(selected.auditTrail || []).length === 0 && <div className="text-slate-400">No audit entries</div>}
                    </div>
                  </div>
                </div>
              </div>

              {!canManage && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 flex items-center gap-3">
                  <AlertTriangle className="text-amber-600" size={18} />
                  <div className="text-sm text-amber-800 dark:text-amber-300">Limited editing due to access level</div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setDetailsOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm">Cancel</button>
                <button onClick={saveEdit} disabled={!canManage || selected.type === 'LOAN'} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50 flex items-center gap-2">
                  <ShieldCheck size={16} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {policyOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPolicyOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[620px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xl border-l border-slate-200 dark:border-slate-700">
            <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-slate-500" />
                <div>
                  <div className="text-xs text-slate-500">Deductions Policy</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">Operational Rules</div>
                </div>
              </div>
              <button onClick={() => setPolicyOpen(false)} className="text-slate-600 dark:text-slate-300">Close</button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto h-[calc(100%-72px)]">
              <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info size={16} className="text-slate-500" />
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Overview</div>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Deductions are integrated with payroll. Loan‑based deductions are system‑generated from approved employee loans and update automatically as repayments occur.
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Automatic Loan Synchronization</div>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li>Approved loans are auto‑retrieved and displayed as active, system‑generated deductions.</li>
                  <li>Duplicate loan deductions are prevented; each loan links to a single deduction.</li>
                  <li>Loan deductions carry a “Loan” badge and link to the source loan.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Loan Deduction Rules</div>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li>Core fields (amount, frequency, remaining balance) are read‑only.</li>
                  <li>Balances auto‑update from payroll repayments; completion occurs at zero balance.</li>
                  <li>Deduction status reflects Active, Paused, or Completed according to repayments.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Display & Detail View</div>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li>Employee name, type, amount, tax class, frequency, remaining balance, status, and source are shown.</li>
                  <li>Detail view includes loan summary, repayment history by payroll run, remaining balance, and a link to the original loan request.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Payroll Integration</div>
                </div>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li>Loan deductions apply automatically during payroll creation and finalization.</li>
                  <li>Each run reduces the loan balance and records repayment history.</li>
                  <li>Payroll consistency checks prevent processing when deduction logic would be inconsistent.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Audit & Compliance</div>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li>Automated updates are logged, including loan repayments and payoff events.</li>
                  <li>Audit entries include action type, timestamp, and actor metadata.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Actions & Restrictions</div>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li>Loan‑generated deductions cannot be deleted.</li>
                  <li>Pause/Resume is available where permitted; manual edits are restricted for loan deductions.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Performance & Reliability</div>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li>Loan data loading is non‑blocking; the page renders while data is fetched.</li>
                  <li>Empty states are handled gracefully when no deductions or loans exist.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end">
                <button onClick={() => setPolicyOpen(false)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm">OK</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xl border-l border-slate-200 dark:border-slate-700">
            <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-slate-500" />
                <div>
                  <div className="text-xs text-slate-500">New Deduction</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">Create</div>
                </div>
              </div>
              <button onClick={() => setCreateOpen(false)} className="text-slate-600 dark:text-slate-300">Close</button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto h-[calc(100%-72px)]">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300">Assignment</div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="sm:col-span-2">
                    <div className="text-slate-500">Employee</div>
                    <select
                      value={createPayload.employeeId || ''}
                      onChange={e => setCreatePayload(p => ({ ...p, employeeId: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    >
                      <option value="">Select employee</option>
                      {employeesOptions.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300">Configuration</div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-500">Type</div>
                    <select value={createPayload.type || ''} onChange={e => setCreatePayload(p => ({ ...p, type: e.target.value as any }))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                      <option value="">Select type</option>
                      <option value="LOAN">Loan Repayment</option>
                      <option value="GARNISHMENT">Garnishment</option>
                      <option value="UNION_DUES">Union Dues</option>
                      <option value="INSURANCE">Insurance Premium</option>
                      <option value="RETIREMENT">Retirement</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-slate-500">Tax Class</div>
                    <select value={createPayload.taxClass || ''} onChange={e => setCreatePayload(p => ({ ...p, taxClass: e.target.value as any }))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                      <option value="">Select tax class</option>
                      <option value="PRE_TAX">Pre-tax</option>
                      <option value="POST_TAX">Post-tax</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-slate-500">Amount Type</div>
                    <select value={createPayload.amountType || ''} onChange={e => setCreatePayload(p => ({ ...p, amountType: e.target.value as any }))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                      <option value="FIXED">Fixed</option>
                      <option value="PERCENT">Percent</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-slate-500">Amount</div>
                    <input type="number" value={createPayload.amountValue ?? ''} onChange={e => setCreatePayload(p => ({ ...p, amountValue: parseFloat(e.target.value) }))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
                  </div>
                  <div>
                    <div className="text-slate-500">Frequency</div>
                    <select value={createPayload.frequency || ''} onChange={e => setCreatePayload(p => ({ ...p, frequency: e.target.value as any }))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                      <option value="">Select frequency</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="BIWEEKLY">Biweekly</option>
                      <option value="SEMI_MONTHLY">Semi-monthly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-slate-500">Status</div>
                    <select value={createPayload.status || ''} onChange={e => setCreatePayload(p => ({ ...p, status: e.target.value as any }))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                      <option value="ACTIVE">Active</option>
                      <option value="PAUSED">Paused</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-slate-500">Start Date</div>
                    <input type="date" value={createPayload.startDate ? format(new Date(createPayload.startDate), 'yyyy-MM-dd') : ''} onChange={e => setCreatePayload(p => ({ ...p, startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
                  </div>
                  <div>
                    <div className="text-slate-500">End Date</div>
                    <input type="date" value={createPayload.endDate ? format(new Date(createPayload.endDate), 'yyyy-MM-dd') : ''} onChange={e => setCreatePayload(p => ({ ...p, endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
                  </div>
                  <div>
                    <div className="text-slate-500">Source</div>
                    <select value={createPayload.source || ''} onChange={e => setCreatePayload(p => ({ ...p, source: e.target.value as any }))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                      <option value="MANUAL">Manual</option>
                      <option value="LOAN">Loan</option>
                      <option value="COURT_ORDER">Court Order</option>
                    </select>
                  </div>
                  {createPayload.source === 'LOAN' && (
                    <div className="sm:col-span-2">
                      <div className="text-slate-500">Linked Loan ID</div>
                      <input
                        type="text"
                        value={createPayload.loanId ?? ''}
                        onChange={e => setCreatePayload(p => ({ ...p, loanId: e.target.value }))}
                        placeholder="Enter approved loan ID"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300">Compliance Notes</div>
                <div className="p-4 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                  <div>Pre‑tax/Post‑tax classification affects taxable wages.</div>
                  <div>Percent deductions should not cause net wages to fall below DC minimum wage. Enforcement occurs at payroll finalization.</div>
                  <div>Court orders must be accurately represented. Ensure correct source selection.</div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm">Cancel</button>
                <button
                  onClick={async () => {
                    // Basic validations
                    if (!createPayload.employeeId) { toast.warning('Select employee'); return; }
                    if (!createPayload.type) { toast.warning('Select deduction type'); return; }
                    if (!createPayload.taxClass) { toast.warning('Select tax class'); return; }
                    if (!createPayload.amountType) { toast.warning('Select amount type'); return; }
                    if (!createPayload.frequency) { toast.warning('Select frequency'); return; }
                    const amt = createPayload.amountValue ?? 0;
                    if (!(amt > 0)) { toast.warning('Amount must be greater than 0'); return; }
                    if (createPayload.amountType === 'PERCENT' && (amt <= 0 || amt > 100)) { toast.warning('Percent must be between 0 and 100'); return; }
                    if (!createPayload.startDate) { toast.warning('Set start date'); return; }
                    if (createPayload.endDate && new Date(createPayload.endDate).getTime() < new Date(createPayload.startDate).getTime()) {
                      toast.warning('End date must be on or after start date'); return;
                    }
                    if (createPayload.source === 'LOAN') {
                      const targetLoanId = createPayload.loanId || '';
                      const exists = loanDeductions.some(ld => ld.loanId === targetLoanId);
                      if (!targetLoanId) { toast.warning('Enter approved loan ID'); return; }
                      if (exists) { toast.error('Loan deduction already exists'); return; }
                    }
                    try {
                      const payload: any = {
                        employeeId: createPayload.employeeId,
                        type: createPayload.type,
                        taxClass: createPayload.taxClass,
                        amountType: createPayload.amountType,
                        amountValue: createPayload.amountValue,
                        frequency: createPayload.frequency,
                        status: createPayload.status,
                        startDate: createPayload.startDate,
                        endDate: createPayload.endDate,
                        source: createPayload.source,
                        loanId: createPayload.source === 'LOAN' ? (createPayload.loanId || undefined) : undefined,
                      };
                      await api.post('/deductions', payload);
                      toast.success('Deduction created');
                      setCreateOpen(false);
                      setCreatePayload({
                        status: 'ACTIVE',
                        source: 'MANUAL',
                        taxClass: 'POST_TAX',
                        amountType: 'FIXED',
                        frequency: 'BIWEEKLY',
                      });
                      const res = await api.get('/deductions', { params: { page, pageSize } });
                      setDeductions(res.data?.items || res.data || []);
                    } catch (e: any) {
                      const msg = e?.response?.data?.message || 'Failed to create deduction';
                      toast.error(msg);
                    }
                  }}
                  disabled={!canManage}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  <ShieldCheck size={16} />
                  Create Deduction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(s => ({ ...s, isOpen: false }))}
        title={confirmState.title || 'Confirm Action'}
        message={confirmState.message || 'Are you sure you want to proceed?'}
        onConfirm={confirmState.onConfirm || (() => {})}
        variant={confirmState.variant || 'primary'}
        confirmText={confirmState.confirmText || 'Confirm'}
      />
    </div>
  );
}
