"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PaymentsPage;
const react_1 = __importStar(require("react"));
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
const jspdf_1 = __importDefault(require("jspdf"));
const jspdf_autotable_1 = __importDefault(require("jspdf-autotable"));
const image_utils_1 = require("../../utils/image-utils");
const localization_1 = require("../../lib/localization");
const api_1 = __importDefault(require("../../lib/api"));
const business_context_1 = require("../../context/business-context");
const types_1 = require("@unitedlinkgroup/types");
const ExpenditureModal_1 = __importDefault(require("./ExpenditureModal"));
function PaymentsPage() {
    var _a, _b, _c;
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [userRole, setUserRole] = (0, react_1.useState)(null);
    const [period, setPeriod] = (0, react_1.useState)('THIS_WEEK');
    const [customRange, setCustomRange] = (0, react_1.useState)({});
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('all');
    const [typeFilter, setTypeFilter] = (0, react_1.useState)('all');
    const [methodFilter, setMethodFilter] = (0, react_1.useState)('all');
    const [searchText, setSearchText] = (0, react_1.useState)('');
    const [payments, setPayments] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [sortKey, setSortKey] = (0, react_1.useState)('date');
    const [sortDir, setSortDir] = (0, react_1.useState)('desc');
    const [page, setPage] = (0, react_1.useState)(1);
    const [pageSize, setPageSize] = (0, react_1.useState)(20);
    const [selectedPayment, setSelectedPayment] = (0, react_1.useState)(null);
    const [detailsOpen, setDetailsOpen] = (0, react_1.useState)(false);
    const [isExpenditureModalOpen, setIsExpenditureModalOpen] = (0, react_1.useState)(false);
    const [refreshTrigger, setRefreshTrigger] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        const loadProfile = async () => {
            try {
                const res = await api_1.default.get('/auth/profile');
                setUserRole(res.data.role);
            }
            catch { }
        };
        loadProfile();
    }, []);
    const { from, to } = (0, react_1.useMemo)(() => {
        const now = new Date();
        if (period === 'TODAY') {
            return { from: (0, date_fns_1.startOfDay)(now).toISOString(), to: (0, date_fns_1.endOfDay)(now).toISOString() };
        }
        if (period === 'THIS_WEEK') {
            return { from: (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 }).toISOString(), to: (0, date_fns_1.endOfWeek)(now, { weekStartsOn: 1 }).toISOString() };
        }
        if (period === 'THIS_MONTH') {
            return { from: (0, date_fns_1.startOfMonth)(now).toISOString(), to: (0, date_fns_1.endOfMonth)(now).toISOString() };
        }
        return { from: customRange.from, to: customRange.to };
    }, [period, customRange]);
    (0, react_1.useEffect)(() => {
        const fetchPayments = async () => {
            var _a;
            if (!selectedBusiness) {
                setPayments([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const res = await api_1.default.get('/payments', {
                    params: {
                        start: from,
                        end: to,
                        status: statusFilter === 'all' ? undefined : statusFilter,
                        type: typeFilter === 'all' ? undefined : typeFilter,
                        method: methodFilter === 'all' ? undefined : methodFilter,
                        q: searchText || undefined,
                        page,
                        pageSize,
                    },
                });
                setPayments(((_a = res.data) === null || _a === void 0 ? void 0 : _a.items) || res.data || []);
            }
            catch (error) {
                setPayments([]);
            }
            finally {
                setLoading(false);
            }
        };
        fetchPayments();
    }, [selectedBusiness, from, to, statusFilter, typeFilter, methodFilter, searchText, page, pageSize, refreshTrigger]);
    const filtered = (0, react_1.useMemo)(() => {
        let data = payments.slice();
        if (searchText) {
            const q = searchText.toLowerCase();
            data = data.filter(p => (p.reference || '').toLowerCase().includes(q) ||
                (p.payerName || '').toLowerCase().includes(q) ||
                (p.payeeName || '').toLowerCase().includes(q));
        }
        data.sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (typeof av === 'number' && typeof bv === 'number')
                return sortDir === 'asc' ? av - bv : bv - av;
            const sa = String(av || '');
            const sb = String(bv || '');
            return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
        });
        return data;
    }, [payments, searchText, sortKey, sortDir]);
    const paged = (0, react_1.useMemo)(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);
    const metrics = (0, react_1.useMemo)(() => {
        const total = filtered.reduce((sum, p) => sum + (p.amount || 0), 0);
        const incoming = filtered.filter(p => p.type === 'CLIENT' || p.type === 'REFUND').reduce((sum, p) => sum + (p.amount || 0), 0);
        const outgoing = filtered.filter(p => p.type === 'PAYROLL' || p.type === 'VENDOR' || p.type === 'OTHER').reduce((sum, p) => sum + (p.amount || 0), 0);
        const pending = filtered.filter(p => p.status === 'PENDING').length;
        const failed = filtered.filter(p => p.status === 'FAILED').length;
        return { total, incoming, outgoing, pending, failed };
    }, [filtered]);
    const onSort = (key) => {
        if (sortKey === key)
            setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        else {
            setSortKey(key);
            setSortDir('asc');
        }
    };
    const maskSensitive = (value) => {
        if (!value)
            return '';
        if (userRole === types_1.UserRole.SUPER_ADMIN || userRole === types_1.UserRole.BUSINESS_ADMIN || userRole === types_1.UserRole.MANAGER)
            return value;
        if (value.length <= 4)
            return '••••';
        return `${'•'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
    };
    const openDetails = async (p) => {
        setSelectedPayment(p);
        setDetailsOpen(true);
        try {
            const res = await api_1.default.get(`/payments/${p.id}`);
            setSelectedPayment(res.data || p);
        }
        catch { }
    };
    const exportCSV = () => {
        const rows = [['Date', 'Reference', 'Payer', 'Payee', 'Type', 'Amount', 'Status', 'Method']];
        filtered.forEach(p => {
            var _a;
            rows.push([
                (0, date_fns_1.format)(new Date(p.date), 'yyyy-MM-dd'),
                maskSensitive(p.reference),
                p.payerName || '',
                p.payeeName || '',
                p.type,
                String((_a = p.amount) !== null && _a !== void 0 ? _a : 0),
                p.status,
                p.method,
            ]);
        });
        const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments_${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        sonner_1.toast.success('Exported CSV');
    };
    const exportPDF = async () => {
        const doc = new jspdf_1.default({ unit: 'pt' });
        // Logo & Business Header
        if (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.logoUrl) {
            try {
                const logoData = await (0, image_utils_1.getBase64ImageFromURL)(selectedBusiness.logoUrl);
                doc.addImage(logoData, 'PNG', 40, 30, 60, 60, undefined, 'FAST');
            }
            catch (e) {
                console.warn('Failed to load logo', e);
            }
        }
        const titleX = (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.logoUrl) ? 110 : 40;
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text((selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.name) || 'Payments Report', titleX, 50);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.address) {
            doc.text(`${selectedBusiness.address}, ${selectedBusiness.city || ''} ${selectedBusiness.state || ''} ${selectedBusiness.zip || ''}`, titleX, 65);
        }
        doc.setFontSize(14);
        doc.text('Payments Report', 40, 110);
        doc.setFontSize(10);
        doc.text(`Generated on ${(0, localization_1.formatDate)(new Date(), selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}`, 40, 125);
        const body = filtered.map(p => [
            (0, localization_1.formatDate)(p.date, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country),
            maskSensitive(p.reference),
            p.payerName || '',
            p.payeeName || '',
            p.type,
            (0, localization_1.formatCurrency)(p.amount || 0, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode),
            p.status,
            p.method,
        ]);
        (0, jspdf_autotable_1.default)(doc, {
            startY: 140,
            head: [['Date', 'Reference', 'Payer', 'Payee', 'Type', 'Amount', 'Status', 'Method']],
            body,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [31, 41, 55] },
        });
        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 20, { align: 'right' });
        }
        doc.save(`payments_${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd')}.pdf`);
        sonner_1.toast.success('Exported PDF');
    };
    const statusBadge = (s) => {
        const map = {
            COMPLETED: { color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30', icon: <lucide_react_1.CheckCircle2 size={14}/>, label: 'Completed' },
            PENDING: { color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', icon: <lucide_react_1.Clock size={14}/>, label: 'Pending' },
            FAILED: { color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30', icon: <lucide_react_1.AlertTriangle size={14}/>, label: 'Failed' },
        };
        const m = map[s];
        return (<span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${m.color}`}>
        {m.icon}
        {m.label}
      </span>);
    };
    const canAccess = userRole && userRole !== types_1.UserRole.EMPLOYEE;
    return (<div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6 rounded-2xl bg-white/60 dark:bg-slate-900/40 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 text-indigo-600 dark:text-indigo-400 shadow-sm">
              <lucide_react_1.CreditCard size={20}/>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Payments</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">Enterprise-grade tracking with audit readiness</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsExpenditureModalOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition-all">
              <lucide_react_1.CreditCard size={16}/>
              Expenditure
            </button>
            <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:shadow-md transition-all">
              <lucide_react_1.Download size={16}/>
              CSV
            </button>
            <button onClick={exportPDF} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:shadow-md transition-all">
              <lucide_react_1.Download size={16}/>
              PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-900/30 p-4 shadow-sm hover:shadow-md transition-all">
            <div className="text-xs text-slate-600 dark:text-slate-400">Total Payments</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{(0, localization_1.formatCurrency)(metrics.total, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</div>
          </div>
          <div className="rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 p-4 shadow-sm hover:shadow-md transition-all">
            <div className="text-xs text-slate-600 dark:text-slate-400">Incoming</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{(0, localization_1.formatCurrency)(metrics.incoming, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</div>
          </div>
          <div className="rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 p-4 shadow-sm hover:shadow-md transition-all">
            <div className="text-xs text-slate-600 dark:text-slate-400">Outgoing</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">{(0, localization_1.formatCurrency)(metrics.outgoing, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</div>
          </div>
          <div className="rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Pending / Failed</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{metrics.pending} / {metrics.failed}</div>
              </div>
              <lucide_react_1.ShieldCheck className="text-slate-400" size={20}/>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search reference, payer, payee" className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"/>
                <lucide_react_1.Search className="absolute left-2 top-2.5 text-slate-400" size={16}/>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur border border-slate-200 dark:border-slate-700">
                <lucide_react_1.Calendar size={16} className="text-slate-400"/>
                <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-transparent text-sm text-slate-900 dark:text-white outline-none">
                  <option value="TODAY">Today</option>
                  <option value="THIS_WEEK">This Week</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="CUSTOM">Custom</option>
                </select>
                {period === 'CUSTOM' && (<div className="flex items-center gap-2">
                    <input type="date" value={customRange.from || ''} onChange={e => setCustomRange(r => ({ ...r, from: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} className="text-sm bg-transparent border rounded px-2 py-1 dark:border-slate-700 focus:ring-1 focus:ring-indigo-500"/>
                    <span className="text-slate-400">–</span>
                    <input type="date" value={customRange.to || ''} onChange={e => setCustomRange(r => ({ ...r, to: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} className="text-sm bg-transparent border rounded px-2 py-1 dark:border-slate-700 focus:ring-1 focus:ring-indigo-500"/>
                  </div>)}
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur border border-slate-200 dark:border-slate-700">
                <lucide_react_1.Filter size={16} className="text-slate-400"/>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-transparent text-sm text-slate-900 dark:text-white outline-none">
                  <option value="all">All Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-transparent text-sm text-slate-900 dark:text-white outline-none">
                  <option value="all">All Types</option>
                  <option value="PAYROLL">Payroll</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="CLIENT">Client</option>
                  <option value="REFUND">Refund</option>
                  <option value="OTHER">Other</option>
                </select>
                <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="bg-transparent text-sm text-slate-900 dark:text-white outline-none">
                  <option value="all">All Methods</option>
                  <option value="BANK">Bank</option>
                  <option value="CARD">Card</option>
                  <option value="CASH">Cash</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 dark:bg-slate-800/70 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 overflow-hidden shadow-sm">
          <div className="min-w-full overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <tr>
                  {[
            { key: 'date', label: 'Date' },
            { key: 'reference', label: 'Reference' },
            { key: 'payerName', label: 'Payer' },
            { key: 'payeeName', label: 'Payee' },
            { key: 'type', label: 'Type' },
            { key: 'amount', label: 'Amount' },
            { key: 'status', label: 'Status' },
            { key: 'method', label: 'Method' },
        ].map(({ key, label }) => (<th key={key} className="text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider px-4 py-3 cursor-pointer select-none" onClick={() => onSort(key)}>
                      {label}
                      {sortKey === key ? <span className="ml-1 text-slate-400">{sortDir === 'asc' ? '▲' : '▼'}</span> : null}
                    </th>))}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (<tr>
                    <td colSpan={9} className="px-4 py-12">
                      <div className="flex items-center justify-center text-slate-500 gap-3">
                        <lucide_react_1.Loader2 className="w-5 h-5 animate-spin"/>
                        <span>Loading payments...</span>
                      </div>
                    </td>
                  </tr>) : paged.length === 0 ? (<tr>
                    <td colSpan={9} className="px-4 py-12">
                      <div className="text-center text-slate-500">No payments found for the selected criteria</div>
                    </td>
                  </tr>) : (paged.map(p => (<tr key={p.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-all">
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{(0, localization_1.formatDate)(p.date, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}</td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{maskSensitive(p.reference)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{p.payerName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{p.payeeName || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300">{p.type}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white">{(0, localization_1.formatCurrency)(p.amount || 0, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                      <td className="px-4 py-3 text-sm">{statusBadge(p.status)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{p.method}</td>
                      <td className="px-4 py-3 text-sm">
                        <button onClick={() => openDetails(p)} className="text-indigo-600 hover:underline text-sm font-medium hover:opacity-80 transition-opacity">Details</button>
                      </td>
                    </tr>)))}
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

      {detailsOpen && selectedPayment && (<div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailsOpen(false)}/>
          <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xl border-l border-slate-200 dark:border-slate-700">
            <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-xs text-slate-500">Transaction</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{maskSensitive(selectedPayment.reference)}</div>
              </div>
              <button onClick={() => setDetailsOpen(false)} className="text-slate-600 dark:text-slate-300">Close</button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto h-[calc(100%-72px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50/80 dark:bg-slate-800/70 backdrop-blur p-4">
                  <div className="text-xs text-slate-500">Amount</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{(0, localization_1.formatCurrency)(selectedPayment.amount || 0, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</div>
                </div>
                <div className="rounded-xl bg-slate-50/80 dark:bg-slate-800/70 backdrop-blur p-4">
                  <div className="text-xs text-slate-500">Status</div>
                  <div className="mt-1">{statusBadge(selectedPayment.status)}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300">Details</div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-500">Date</div>
                    <div className="font-medium">{(0, date_fns_1.format)(new Date(selectedPayment.date), 'yyyy-MM-dd HH:mm')}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Type</div>
                    <div className="font-medium">{selectedPayment.type}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Method</div>
                    <div className="font-medium">{selectedPayment.method}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Payer</div>
                    <div className="font-medium">{selectedPayment.payerName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Payee</div>
                    <div className="font-medium">{selectedPayment.payeeName || '-'}</div>
                  </div>
                  {selectedPayment.invoiceId && (<div>
                      <div className="text-slate-500">Invoice</div>
                      <div className="font-medium">{selectedPayment.invoiceId}</div>
                    </div>)}
                  {selectedPayment.payrollRunId && (<div>
                      <div className="text-slate-500">Payroll Run</div>
                      <div className="font-medium">{selectedPayment.payrollRunId}</div>
                    </div>)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300">Tracking & Audit</div>
                <div className="p-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-500">Initiated by</div>
                    <div className="font-medium">{((_a = selectedPayment.createdBy) === null || _a === void 0 ? void 0 : _a.name) || '-'}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-slate-500">Approved by</div>
                    <div className="font-medium">{((_b = selectedPayment.approvedBy) === null || _b === void 0 ? void 0 : _b.name) || '-'}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-slate-500">Last modified by</div>
                    <div className="font-medium">{((_c = selectedPayment.modifiedBy) === null || _c === void 0 ? void 0 : _c.name) || '-'}</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-slate-500">Created at</div>
                      <div className="font-medium">{selectedPayment.createdAt ? (0, date_fns_1.format)(new Date(selectedPayment.createdAt), 'yyyy-MM-dd HH:mm') : '-'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Updated at</div>
                      <div className="font-medium">{selectedPayment.updatedAt ? (0, date_fns_1.format)(new Date(selectedPayment.updatedAt), 'yyyy-MM-dd HH:mm') : '-'}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-slate-500 mb-2">Status History</div>
                    <div className="space-y-2">
                      {(selectedPayment.auditTrail || []).map((e, idx) => (<div key={idx} className="flex items-center justify-between">
                          <div className="text-slate-600">{e.action}</div>
                          <div className="text-slate-400">{e.by || '-'}</div>
                          <div className="text-slate-400">{(0, localization_1.formatDate)(e.at, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)} {(0, date_fns_1.format)(new Date(e.at), 'HH:mm')}</div>
                        </div>))}
                      {(selectedPayment.auditTrail || []).length === 0 && <div className="text-slate-400">No audit entries</div>}
                    </div>
                  </div>
                </div>
              </div>

              {!canAccess && (<div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 flex items-center gap-3">
                  <lucide_react_1.AlertTriangle className="text-amber-600" size={18}/>
                  <div className="text-sm text-amber-800 dark:text-amber-300">Limited details due to access level</div>
                </div>)}
            </div>
          </div>
        </div>)}
      <ExpenditureModal_1.default isOpen={isExpenditureModalOpen} onClose={() => setIsExpenditureModalOpen(false)} onSuccess={() => setRefreshTrigger(prev => prev + 1)}/>
    </div>);
}
