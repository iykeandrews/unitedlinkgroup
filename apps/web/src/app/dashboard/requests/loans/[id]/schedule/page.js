"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoanRepaymentSchedulePage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const api_1 = __importDefault(require("../../../../../../lib/api"));
const date_fns_1 = require("date-fns");
const localization_1 = require("../../../../../../lib/localization");
const business_context_1 = require("../../../../../../context/business-context");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
const jspdf_1 = __importDefault(require("jspdf"));
const jspdf_autotable_1 = __importDefault(require("jspdf-autotable"));
function LoanRepaymentSchedulePage() {
    var _a;
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const router = (0, navigation_1.useRouter)();
    const params = (0, navigation_1.useParams)();
    const loanId = Array.isArray(params === null || params === void 0 ? void 0 : params.id) ? params === null || params === void 0 ? void 0 : params.id[0] : params === null || params === void 0 ? void 0 : params.id;
    const [loan, setLoan] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        const load = async () => {
            var _a, _b;
            if (!loanId)
                return;
            try {
                setLoading(true);
                const res = await api_1.default.get(`/loans/${loanId}`);
                setLoan(res.data);
            }
            catch (err) {
                sonner_1.toast.error(((_b = (_a = err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to load loan');
            }
            finally {
                setLoading(false);
            }
        };
        load();
    }, [loanId]);
    const timeline = (0, react_1.useMemo)(() => {
        var _a;
        if (!loan)
            return { completed: [], upcoming: [] };
        const completed = (loan.repayments || []).map(r => ({
            date: r.createdAt ? new Date(r.createdAt) : undefined,
            amount: r.amount,
            payrollId: r.payrollId,
            id: r.id,
        }));
        const upcoming = [];
        let remaining = loan.balance;
        const lastCompletedDate = completed.length > 0
            ? (_a = completed
                .filter(r => r.date)
                .sort((a, b) => (a.date.getTime() - b.date.getTime()))
                .slice(-1)[0]) === null || _a === void 0 ? void 0 : _a.date
            : undefined;
        let startDate = lastCompletedDate || new Date(loan.createdAt);
        if (startDate < new Date())
            startDate = new Date();
        while (remaining > 0 && upcoming.length < loan.termMonths * 2) {
            const nextDate = upcoming.length === 0 ? (0, date_fns_1.addWeeks)(startDate, 2) : (0, date_fns_1.addWeeks)(upcoming[upcoming.length - 1].date, 2);
            const amount = Math.min(loan.perPayPeriodDeduction, remaining);
            upcoming.push({ date: nextDate, amount });
            remaining -= amount;
        }
        return { completed, upcoming };
    }, [loan]);
    return (<div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push('/dashboard/requests/loans')} className="flex items-center text-sm text-blue-600 hover:text-blue-700">
            <lucide_react_1.ChevronLeft className="w-4 h-4 mr-1"/>
            Back to Loans
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Repayment Schedule</h1>
        </div>
        <button type="button" onClick={() => {
            var _a, _b;
            if (!loan) {
                sonner_1.toast.error('Loan not loaded');
                return;
            }
            const doc = new jspdf_1.default();
            const title = 'Repayment Schedule';
            const loanShort = loan.id ? `#${loan.id.slice(-8).toUpperCase()}` : '';
            doc.setFontSize(18);
            doc.text(`${title} ${loanShort}`, 14, 18);
            doc.setFontSize(11);
            const subLeft = [
                loan.employee ? `${loan.employee.firstName} ${loan.employee.lastName}` : '',
                ((_a = loan.employee) === null || _a === void 0 ? void 0 : _a.email) || '',
            ].filter(Boolean).join(' • ');
            if (subLeft)
                doc.text(subLeft, 14, 25);
            doc.setFontSize(12);
            doc.text('Summary', 14, 36);
            (0, jspdf_autotable_1.default)(doc, {
                startY: 40,
                head: [['Label', 'Value']],
                body: [
                    ['Original Amount', (0, localization_1.formatCurrency)(loan.amount, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)],
                    ['Outstanding Balance', (0, localization_1.formatCurrency)(loan.balance, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)],
                    ['Per Pay Period', (0, localization_1.formatCurrency)(loan.perPayPeriodDeduction, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)],
                ],
                styles: { fontSize: 10 },
                headStyles: { fillColor: [241, 245, 249], textColor: 51 },
            });
            let nextY = doc.lastAutoTable.finalY + 8;
            doc.setFontSize(12);
            doc.text('Completed Payments', 14, nextY);
            (0, jspdf_autotable_1.default)(doc, {
                startY: nextY + 4,
                head: [['Amount', 'Date', 'Payroll']],
                body: [
                    ...(timeline.completed.map(r => [
                        (0, localization_1.formatCurrency)(r.amount, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode),
                        r.date ? (0, localization_1.formatDate)(r.date, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country) : 'Date unavailable',
                        r.payrollId ? r.payrollId : '—',
                    ]))
                ],
                styles: { fontSize: 10 },
                headStyles: { fillColor: [241, 245, 249], textColor: 51 },
            });
            nextY = doc.lastAutoTable.finalY + 8;
            doc.setFontSize(12);
            doc.text('Upcoming Schedule', 14, nextY);
            (0, jspdf_autotable_1.default)(doc, {
                startY: nextY + 4,
                head: [['Amount', 'Date', 'Frequency']],
                body: timeline.upcoming.map(u => [
                    (0, localization_1.formatCurrency)(u.amount, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode),
                    (0, localization_1.formatDate)(u.date, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country),
                    'Bi-weekly',
                ]),
                styles: { fontSize: 10 },
                headStyles: { fillColor: [241, 245, 249], textColor: 51 },
            });
            nextY = doc.lastAutoTable.finalY + 8;
            doc.setFontSize(12);
            doc.text('Loan Details', 14, nextY);
            const detailsBody = [
                ['Loan ID', loan.id],
                ['Status', loan.status],
                ['Reason', loan.reason || '—'],
                ['Term', `${loan.termMonths} months`],
                ['Created At', (0, localization_1.formatDate)(new Date(loan.createdAt), selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)],
                ['Employee', loan.employee ? `${loan.employee.firstName} ${loan.employee.lastName}` : '—'],
                ['Employee Email', ((_b = loan.employee) === null || _b === void 0 ? void 0 : _b.email) || '—'],
                ['Per Pay Period', (0, localization_1.formatCurrency)(loan.perPayPeriodDeduction, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)],
                ['Original Amount', (0, localization_1.formatCurrency)(loan.amount, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)],
                ['Outstanding Balance', (0, localization_1.formatCurrency)(loan.balance, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)],
            ];
            (0, jspdf_autotable_1.default)(doc, {
                startY: nextY + 4,
                head: [['Field', 'Value']],
                body: detailsBody,
                styles: { fontSize: 10 },
                headStyles: { fillColor: [241, 245, 249], textColor: 51 },
            });
            doc.save(`loan-schedule-${loanId}.pdf`);
        }} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm">
          Download PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Original Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{(0, localization_1.formatCurrency)((loan === null || loan === void 0 ? void 0 : loan.amount) || 0, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</p>
            </div>
            <lucide_react_1.Wallet className="w-6 h-6 text-blue-500"/>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding Balance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{(0, localization_1.formatCurrency)((loan === null || loan === void 0 ? void 0 : loan.balance) || 0, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</p>
            </div>
            <lucide_react_1.Wallet className="w-6 h-6 text-indigo-500"/>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Per Pay Period</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{(0, localization_1.formatCurrency)((loan === null || loan === void 0 ? void 0 : loan.perPayPeriodDeduction) || 0, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</p>
            </div>
            <lucide_react_1.Calendar className="w-6 h-6 text-green-500"/>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-slate-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Completed Payments</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {timeline.completed.length > 0 ? (timeline.completed.map((r) => {
            var _a;
            return (<div key={r.id || `${r.payrollId}-${r.amount}-${(_a = r.date) === null || _a === void 0 ? void 0 : _a.toISOString()}`} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{(0, localization_1.formatCurrency)(r.amount, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{r.date ? (0, localization_1.formatDate)(r.date, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country) : 'Date unavailable'}</p>
                  </div>
                  {r.payrollId ? (<span className="text-xs text-gray-400">Payroll: {r.payrollId}</span>) : (<span className="text-xs text-gray-400">Manual</span>)}
                </div>);
        })) : (<div className="p-6 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <lucide_react_1.AlertCircle className="w-4 h-4"/>
                No repayments recorded yet
              </div>)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-slate-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upcoming Schedule</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {timeline.upcoming.length > 0 ? (timeline.upcoming.map((u, idx) => (<div key={`${idx}-${u.date.toISOString()}`} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{(0, localization_1.formatCurrency)(u.amount, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{(0, localization_1.formatDate)(u.date, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}</p>
                  </div>
                  <span className="text-xs text-gray-400">Bi-weekly</span>
                </div>))) : (<div className="p-6 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <lucide_react_1.AlertCircle className="w-4 h-4"/>
                No upcoming payments
              </div>)}
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
              {(loan === null || loan === void 0 ? void 0 : loan.employee) ? `${loan.employee.firstName} ${loan.employee.lastName}` : '—'}
            </p>
            <p className="text-gray-500 dark:text-gray-400">{((_a = loan === null || loan === void 0 ? void 0 : loan.employee) === null || _a === void 0 ? void 0 : _a.email) || ''}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Status</p>
            <p className="font-semibold text-gray-900 dark:text-white">{(loan === null || loan === void 0 ? void 0 : loan.status) || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Reason</p>
            <p className="font-semibold text-gray-900 dark:text-white">{(loan === null || loan === void 0 ? void 0 : loan.reason) || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Term</p>
            <p className="font-semibold text-gray-900 dark:text-white">{loan === null || loan === void 0 ? void 0 : loan.termMonths} months</p>
          </div>
        </div>
      </div>
    </div>);
}
