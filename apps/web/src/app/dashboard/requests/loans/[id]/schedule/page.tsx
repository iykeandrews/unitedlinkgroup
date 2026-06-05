'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '../../../../../../lib/api';
import { addWeeks } from 'date-fns';
import { formatCurrency, formatDate } from '../../../../../../lib/localization';
import { useBusiness } from '../../../../../../context/business-context';
import { ChevronLeft, Wallet, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Repayment {
  id?: string;
  amount: number;
  createdAt?: string;
  payrollId?: string;
}

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
  repayments?: Repayment[];
}

export default function LoanRepaymentSchedulePage() {
  const { selectedBusiness } = useBusiness();
  const router = useRouter();
  const params = useParams();
  const loanId = Array.isArray(params?.id) ? params?.id[0] : (params as any)?.id;

  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!loanId) return;
      try {
        setLoading(true);
        const res = await api.get(`/loans/${loanId}`);
        setLoan(res.data);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load loan');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loanId]);

  const timeline = useMemo(() => {
    if (!loan) return { completed: [], upcoming: [] as { date: Date; amount: number }[] };
    const completed = (loan.repayments || []).map(r => ({
      date: r.createdAt ? new Date(r.createdAt) : undefined,
      amount: r.amount,
      payrollId: r.payrollId,
      id: r.id,
    }));

    const upcoming: { date: Date; amount: number }[] = [];
    let remaining = loan.balance;

    const lastCompletedDate = completed.length > 0
      ? completed
          .filter(r => r.date)
          .sort((a, b) => (a.date!.getTime() - b.date!.getTime()))
          .slice(-1)[0]?.date
      : undefined;

    let startDate = lastCompletedDate || new Date(loan.createdAt);
    if (startDate < new Date()) startDate = new Date();

    while (remaining > 0 && upcoming.length < loan.termMonths * 2) {
      const nextDate = upcoming.length === 0 ? addWeeks(startDate, 2) : addWeeks(upcoming[upcoming.length - 1].date, 2);
      const amount = Math.min(loan.perPayPeriodDeduction, remaining);
      upcoming.push({ date: nextDate, amount });
      remaining -= amount;
    }

    return { completed, upcoming };
  }, [loan]);

  return (
    <div className="p-6 space-y-6">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Repayment Schedule</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!loan) {
              toast.error('Loan not loaded');
              return;
            }
            const doc = new jsPDF();
            const title = 'Repayment Schedule';
            const loanShort = loan.id ? `#${loan.id.slice(-8).toUpperCase()}` : '';
            doc.setFontSize(18);
            doc.text(`${title} ${loanShort}`, 14, 18);
            doc.setFontSize(11);
            const subLeft = [
              loan.employee ? `${loan.employee.firstName} ${loan.employee.lastName}` : '',
              loan.employee?.email || '',
            ].filter(Boolean).join(' • ');
            if (subLeft) doc.text(subLeft, 14, 25);

            doc.setFontSize(12);
            doc.text('Summary', 14, 36);
            autoTable(doc, {
              startY: 40,
              head: [['Label', 'Value']],
              body: [
                ['Original Amount', formatCurrency(loan.amount, selectedBusiness?.currencyCode)],
                ['Outstanding Balance', formatCurrency(loan.balance, selectedBusiness?.currencyCode)],
                ['Per Pay Period', formatCurrency(loan.perPayPeriodDeduction, selectedBusiness?.currencyCode)],
              ],
              styles: { fontSize: 10 },
              headStyles: { fillColor: [241, 245, 249], textColor: 51 },
            });
            let nextY = (doc as any).lastAutoTable.finalY + 8;

            doc.setFontSize(12);
            doc.text('Completed Payments', 14, nextY);
            autoTable(doc, {
              startY: nextY + 4,
              head: [['Amount', 'Date', 'Payroll']],
              body: [
                ...(timeline.completed.map(r => [
                  formatCurrency(r.amount, selectedBusiness?.currencyCode),
                  r.date ? formatDate(r.date, selectedBusiness?.country) : 'Date unavailable',
                  r.payrollId ? r.payrollId : '—',
                ]))
              ],
              styles: { fontSize: 10 },
              headStyles: { fillColor: [241, 245, 249], textColor: 51 },
            });
            nextY = (doc as any).lastAutoTable.finalY + 8;

            doc.setFontSize(12);
            doc.text('Upcoming Schedule', 14, nextY);
            autoTable(doc, {
              startY: nextY + 4,
              head: [['Amount', 'Date', 'Frequency']],
              body: timeline.upcoming.map(u => [
                formatCurrency(u.amount, selectedBusiness?.currencyCode),
                formatDate(u.date, selectedBusiness?.country),
                'Bi-weekly',
              ]),
              styles: { fontSize: 10 },
              headStyles: { fillColor: [241, 245, 249], textColor: 51 },
            });
            nextY = (doc as any).lastAutoTable.finalY + 8;

            doc.setFontSize(12);
            doc.text('Loan Details', 14, nextY);
            const detailsBody = [
              ['Loan ID', loan.id],
              ['Status', loan.status],
              ['Reason', loan.reason || '—'],
              ['Term', `${loan.termMonths} months`],
              ['Created At', formatDate(new Date(loan.createdAt), selectedBusiness?.country)],
              ['Employee', loan.employee ? `${loan.employee.firstName} ${loan.employee.lastName}` : '—'],
              ['Employee Email', loan.employee?.email || '—'],
              ['Per Pay Period', formatCurrency(loan.perPayPeriodDeduction, selectedBusiness?.currencyCode)],
              ['Original Amount', formatCurrency(loan.amount, selectedBusiness?.currencyCode)],
              ['Outstanding Balance', formatCurrency(loan.balance, selectedBusiness?.currencyCode)],
            ];
            autoTable(doc, {
              startY: nextY + 4,
              head: [['Field', 'Value']],
              body: detailsBody,
              styles: { fontSize: 10 },
              headStyles: { fillColor: [241, 245, 249], textColor: 51 },
            });

            doc.save(`loan-schedule-${loanId}.pdf`);
          }}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm"
        >
          Download PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Original Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(loan?.amount || 0, selectedBusiness?.currencyCode)}</p>
            </div>
            <Wallet className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding Balance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(loan?.balance || 0, selectedBusiness?.currencyCode)}</p>
            </div>
            <Wallet className="w-6 h-6 text-indigo-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Per Pay Period</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(loan?.perPayPeriodDeduction || 0, selectedBusiness?.currencyCode)}</p>
            </div>
            <Calendar className="w-6 h-6 text-green-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-slate-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Completed Payments</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {timeline.completed.length > 0 ? (
              timeline.completed.map((r) => (
                <div key={r.id || `${r.payrollId}-${r.amount}-${r.date?.toISOString()}`} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(r.amount, selectedBusiness?.currencyCode)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{r.date ? formatDate(r.date, selectedBusiness?.country) : 'Date unavailable'}</p>
                  </div>
                  {r.payrollId ? (
                    <span className="text-xs text-gray-400">Payroll: {r.payrollId}</span>
                  ) : (
                    <span className="text-xs text-gray-400">Manual</span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No repayments recorded yet
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-slate-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upcoming Schedule</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {timeline.upcoming.length > 0 ? (
              timeline.upcoming.map((u, idx) => (
                <div key={`${idx}-${u.date.toISOString()}`} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(u.amount, selectedBusiness?.currencyCode)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(u.date, selectedBusiness?.country)}</p>
                  </div>
                  <span className="text-xs text-gray-400">Bi-weekly</span>
                </div>
              ))
            ) : (
              <div className="p-6 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No upcoming payments
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Loan Details</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Employee</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {loan?.employee ? `${loan.employee.firstName} ${loan.employee.lastName}` : '—'}
            </p>
            <p className="text-gray-500 dark:text-gray-400">{loan?.employee?.email || ''}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Status</p>
            <p className="font-semibold text-gray-900 dark:text-white">{loan?.status || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Reason</p>
            <p className="font-semibold text-gray-900 dark:text-white">{loan?.reason || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Term</p>
            <p className="font-semibold text-gray-900 dark:text-white">{loan?.termMonths} months</p>
          </div>
        </div>
      </div>
    </div>
  );
}
