'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../../../lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ChevronLeft, Wallet, PieChart, TrendingUp, AlertCircle, Download, Search as SearchIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserRole } from '@unitedlinkgroup/types';
import { useBusiness } from '../../../../../context/business-context';
import { formatCurrency, formatDate } from '../../../../../lib/localization';

interface Loan {
  id: string;
  amount: number;
  balance: number;
  termMonths: number;
  perPayPeriodDeduction: number;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'DEFAULTED';
  createdAt: string;
  employee?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function LoansReportPage() {
  // Router for navigation back to loans dashboard
  const router = useRouter();
  const { selectedBusiness } = useBusiness();
  // Local state for loans and loading
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [monthInput, setMonthInput] = useState('');
  const [month, setMonth] = useState('');

  // Fetch profile and loans on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const profileRes = await api.get('/auth/profile');
        const role = profileRes.data.role as string;
        setUserRole(role);
        // Employees see their own loans; admins/managers see business loans
        const endpoint = role === UserRole.EMPLOYEE ? '/loans/my-loans' : '/loans';
        const res = await api.get(endpoint);
        setLoans(res.data || []);
      } catch (err) {
        toast.error('Failed to load loans report');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Compute summary metrics from loans
  const filteredLoans = useMemo(() => {
    const applyQuery = (l: Loan) => {
      if (!query) return true;
      const q = query.toLowerCase();
      const fields = [
        l.id,
        l.reason || '',
        l.status,
        `${l.employee?.firstName || ''} ${l.employee?.lastName || ''}`,
        l.employee?.email || ''
      ].join(' ').toLowerCase();
      return fields.includes(q);
    };
    const applyMonth = (l: Loan) => {
      if (!month) return true;
      const d = new Date(l.createdAt);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return ym === month;
    };
    return loans.filter(l => applyQuery(l) && applyMonth(l));
  }, [loans, query, month]);

  const summary = useMemo(() => {
    const filtered = filteredLoans;
    const totalCount = filtered.length;
    const totalAmount = filtered.reduce((sum, l) => sum + (l.amount || 0), 0);
    const totalBalance = filtered.reduce((sum, l) => sum + (l.balance || 0), 0);
    const approved = filtered.filter(l => l.status === 'APPROVED').length;
    const pending = filtered.filter(l => l.status === 'PENDING').length;
    const rejected = filtered.filter(l => l.status === 'REJECTED').length;
    const paid = filtered.filter(l => l.status === 'PAID').length;
    return { totalCount, totalAmount, totalBalance, approved, pending, rejected, paid };
  }, [filteredLoans]);

  return (
    <div className="p-6 space-y-6">
      {/* Header with back navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/requests/loans')}
            className="flex items-center text-sm text-blue-600 hover:text-blue-700"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Loans
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Loans Report</h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={monthInput}
            onChange={(e) => setMonthInput(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
          />
          <button
            type="button"
            onClick={() => setMonth(monthInput)}
            className="px-3 py-2 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-100 text-sm"
          >
            Apply Month
          </button>
          <input
            type="text"
            placeholder="Search"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
          />
          <button
            type="button"
            onClick={() => setQuery(queryInput)}
            className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm flex items-center gap-1"
          >
            <SearchIcon className="w-4 h-4" />
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              const rows = filteredLoans.map(l => ({
                id: l.id,
                employee: l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : '',
                email: l.employee?.email || '',
                reason: l.reason || '',
                amount: l.amount,
                balance: l.balance,
                termMonths: l.termMonths,
                perPayPeriodDeduction: l.perPayPeriodDeduction,
                status: l.status,
                createdAt: l.createdAt
              }));
              const header = ['ID','Employee','Email','Reason','Amount','Balance','TermMonths','PerPayPeriodDeduction','Status','CreatedAt'];
              const csv = [
                header.join(','),
                ...rows.map(r => [
                  r.id,
                  `"${r.employee}"`,
                  r.email,
                  `"${r.reason.replace(/"/g,'""')}"`,
                  r.amount,
                  r.balance,
                  r.termMonths,
                  r.perPayPeriodDeduction,
                  r.status,
                  r.createdAt
                ].join(','))
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `loans-report${month ? '-' + month : ''}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-3 py-2 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-100 text-sm flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Loans</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalCount}</p>
            </div>
            <PieChart className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalAmount, selectedBusiness?.currencyCode)}</p>
            </div>
            <Wallet className="w-6 h-6 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding Balance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalBalance, selectedBusiness?.currencyCode)}</p>
            </div>
            <TrendingUp className="w-6 h-6 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Approved</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{summary.approved}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{summary.pending}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Rejected</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{summary.rejected}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{summary.paid}</p>
        </div>
      </div>

      {/* Full report table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Full History</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">Showing {filteredLoans.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Term</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Per Period</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {filteredLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDate(loan.createdAt, selectedBusiness?.country)}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {loan.employee ? `${loan.employee.firstName} ${loan.employee.lastName}` : '—'}
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{loan.employee?.email || ''}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{loan.reason || '—'}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(loan.amount, selectedBusiness?.currencyCode)}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{formatCurrency(loan.balance, selectedBusiness?.currencyCode)}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{loan.termMonths} mo</td>
                  <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{formatCurrency(loan.perPayPeriodDeduction, selectedBusiness?.currencyCode)}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      loan.status === 'APPROVED'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : loan.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : loan.status === 'PAID'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {loan.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredLoans.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      No loans available
                    </div>
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading report...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
