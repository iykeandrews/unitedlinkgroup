"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PayrollPage;
const react_1 = require("react");
const api_1 = __importDefault(require("../../../lib/api"));
const navigation_1 = require("next/navigation");
const sonner_1 = require("sonner");
const lucide_react_1 = require("lucide-react");
const generatePayslip_1 = require("../../../utils/generatePayslip");
const business_context_1 = require("../../../context/business-context");
const localization_1 = require("../../../lib/localization");
const PayrollDetailsModal_1 = __importDefault(require("../../../components/payroll/PayrollDetailsModal"));
// --- Components ---
const StatCard = ({ title, value, icon: Icon, colorClass, bgClass }) => (<div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</h3>
      </div>
      <div className={`p-3 rounded-full ${bgClass}`}>
        <Icon className={`w-6 h-6 ${colorClass}`}/>
      </div>
    </div>
  </div>);
function PayrollPage() {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [activeTab, setActiveTab] = (0, react_1.useState)('overview');
    const [payrolls, setPayrolls] = (0, react_1.useState)([]);
    const [employees, setEmployees] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    // Stats
    const [stats, setStats] = (0, react_1.useState)({
        ytdCost: 0,
        lastPayDate: '-',
        activeEmployees: 0,
        nextPayDate: '-'
    });
    const [resumingPayroll, setResumingPayroll] = (0, react_1.useState)(null);
    const [viewingPayrollId, setViewingPayrollId] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [activeTab]);
    const fetchData = async () => {
        try {
            setLoading(true);
            const businessId = getBusinessId();
            if (!businessId)
                return;
            const [payrollRes, employeeRes] = await Promise.all([
                api_1.default.get('/payroll', { params: { businessId } }),
                api_1.default.get('/employees?status=ACTIVE') // Assuming endpoint exists or filters work
            ]);
            setPayrolls(payrollRes.data);
            setEmployees(employeeRes.data);
            // Calculate Stats
            const processed = payrollRes.data.filter((p) => p.status === 'PROCESSED' || p.status === 'PAID');
            const totalCost = processed.reduce((acc, p) => acc + (p.totalGross + p.totalEmployerTaxes), 0);
            const lastRun = processed.length > 0 ? processed[0] : null;
            setStats({
                ytdCost: totalCost,
                lastPayDate: lastRun ? (0, localization_1.formatDate)(lastRun.payDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country) : '-',
                activeEmployees: employeeRes.data.length,
                nextPayDate: 'Dec 29, 2024' // Mock for now, normally calculated from schedule
            });
        }
        catch (error) {
            console.error('Failed to fetch payroll data', error);
            // toast.error('Failed to load payroll data'); 
        }
        finally {
            setLoading(false);
        }
    };
    const getBusinessId = () => {
        if (typeof window === 'undefined')
            return null;
        const stored = localStorage.getItem('selectedBusiness');
        return stored ? JSON.parse(stored).id : null;
    };
    const handleContinuePayroll = (payroll) => {
        setResumingPayroll(payroll);
        setActiveTab('run');
    };
    const handleDeletePayroll = async (payroll) => {
        if (!confirm('Are you sure you want to delete this draft payroll? This action cannot be undone.'))
            return;
        try {
            setLoading(true);
            await api_1.default.delete(`/payroll/${payroll.id}`);
            sonner_1.toast.success('Draft payroll deleted');
            fetchData();
        }
        catch (error) {
            console.error('Failed to delete payroll', error);
            sonner_1.toast.error('Failed to delete payroll');
            setLoading(false);
        }
    };
    return (<div className="space-y-6 p-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Payroll</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Washington DC • {stats.activeEmployees} Active Workers
          </p>
        </div>
        <div className="flex gap-3">
           <button onClick={() => {
            setResumingPayroll(null);
            setActiveTab('run');
        }} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all active:scale-95">
            <lucide_react_1.Play size={18}/>
            Run Payroll
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[
            { id: 'overview', name: 'Overview', icon: lucide_react_1.DollarSign },
            { id: 'run', name: 'Run Payroll', icon: lucide_react_1.Play },
            { id: 'history', name: 'History', icon: lucide_react_1.FileText },
            { id: 'employees', name: 'Employees', icon: lucide_react_1.Users },
            { id: 'filings', name: 'Tax & Filings', icon: lucide_react_1.CheckCircle2 },
        ].map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'}
              `}>
              <tab.icon className={`
                -ml-0.5 mr-2 h-5 w-5
                ${activeTab === tab.id ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-500'}
              `}/>
              {tab.name}
            </button>))}
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (<div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard title="Total Cost (YTD)" value={(0, localization_1.formatCurrency)(stats.ytdCost, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)} icon={lucide_react_1.DollarSign} bgClass="bg-green-50 dark:bg-green-900/20" colorClass="text-green-600 dark:text-green-400"/>
              <StatCard title="Next Pay Date" value={stats.nextPayDate} icon={lucide_react_1.Calendar} bgClass="bg-blue-50 dark:bg-blue-900/20" colorClass="text-blue-600 dark:text-blue-400"/>
               <StatCard title="Active Workers" value={stats.activeEmployees} icon={lucide_react_1.Users} bgClass="bg-purple-50 dark:bg-purple-900/20" colorClass="text-purple-600 dark:text-purple-400"/>
               <StatCard title="Tax Status (DC)" value="Compliant" icon={lucide_react_1.CheckCircle2} bgClass="bg-indigo-50 dark:bg-indigo-900/20" colorClass="text-indigo-600 dark:text-indigo-400"/>
            </div>

            {/* Recent Payrolls */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-semibold text-slate-900 dark:text-white">Recent Payroll Runs</h3>
                <button onClick={() => setActiveTab('history')} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View All</button>
              </div>
              <PayrollTable payrolls={payrolls.slice(0, 5)} onContinue={handleContinuePayroll} onDelete={handleDeletePayroll} onView={(p) => setViewingPayrollId(p.id)}/>
            </div>
          </div>)}

        {activeTab === 'run' && (<RunPayrollWizard employees={employees} initialPayroll={resumingPayroll} onSuccess={() => {
                fetchData();
                setActiveTab('history');
                setResumingPayroll(null);
            }}/>)}

        {activeTab === 'history' && (<div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in fade-in duration-300">
            <PayrollTable payrolls={payrolls} onContinue={handleContinuePayroll} onDelete={handleDeletePayroll} onView={(p) => setViewingPayrollId(p.id)}/>
          </div>)}

        {activeTab === 'employees' && (<EmployeePayrollList employees={employees}/>)}

        {activeTab === 'filings' && (<TaxFilingsTab />)}
      </div>

      {/* Payroll Details Modal */}
      {viewingPayrollId && (<PayrollDetailsModal_1.default payrollId={viewingPayrollId} onClose={() => setViewingPayrollId(null)}/>)}
    </div>);
}
function TaxFilingsTab() {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [year, setYear] = (0, react_1.useState)(new Date().getFullYear());
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const getBusinessId = () => {
        if (typeof window === 'undefined')
            return null;
        const stored = localStorage.getItem('selectedBusiness');
        return stored ? JSON.parse(stored).id : null;
    };
    (0, react_1.useEffect)(() => {
        fetchFilings();
    }, [year]);
    const fetchFilings = async () => {
        try {
            setLoading(true);
            const businessId = getBusinessId();
            if (!businessId)
                return;
            const res = await api_1.default.get(`/payroll/report/year-end?businessId=${businessId}&year=${year}`);
            setData(res.data);
        }
        catch (err) {
            console.error(err);
            sonner_1.toast.error('Failed to fetch tax filings');
        }
        finally {
            setLoading(false);
        }
    };
    const downloadCSV = (type) => {
        if (!data)
            return;
        const items = type === 'w2' ? data.w2s : data.nec1099s;
        if (!items || items.length === 0) {
            sonner_1.toast.info('No data to export');
            return;
        }
        // Flatten and get headers
        const headers = Object.keys(items[0]);
        const csvContent = [
            headers.join(','),
            ...items.map((row) => headers.map(fieldName => JSON.stringify(row[fieldName] || '')).join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${type}_${year}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    if (loading)
        return <div className="flex justify-center p-12"><lucide_react_1.Loader2 className="animate-spin"/></div>;
    return (<div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Year-End Tax Forms</h2>
          <p className="text-sm text-slate-500">Generate W-2 and 1099-NEC forms for your employees and contractors.</p>
        </div>
        <div className="flex items-center space-x-4">
           <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="form-select rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
             {[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
           </select>
        </div>
      </div>

      {/* W-2 Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-medium text-slate-900 dark:text-white">Form W-2 (Employees)</h3>
            <button onClick={() => downloadCSV('w2')} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center">
                <lucide_react_1.Download size={16} className="mr-1"/> Export CSV
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                        <th className="px-6 py-3">Employee</th>
                        <th className="px-6 py-3">SSN</th>
                        <th className="px-6 py-3 text-right">Wages (Box 1)</th>
                        <th className="px-6 py-3 text-right">Fed Tax (Box 2)</th>
                        <th className="px-6 py-3 text-right">State Tax (Box 17)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {data === null || data === void 0 ? void 0 : data.w2s.map((w2) => {
            var _a;
            return (<tr key={w2.employeeId}>
                            <td className="px-6 py-4 font-medium">{w2.name}</td>
                            <td className="px-6 py-4 text-slate-500">***-**-{((_a = w2.ssn) === null || _a === void 0 ? void 0 : _a.slice(-4)) || '****'}</td>
                            <td className="px-6 py-4 text-right">{(0, localization_1.formatCurrency)(w2.wages, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                            <td className="px-6 py-4 text-right">{(0, localization_1.formatCurrency)(w2.fedIncomeTax, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                            <td className="px-6 py-4 text-right">{(0, localization_1.formatCurrency)(w2.stateIncomeTax, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                        </tr>);
        })}
                    {(!(data === null || data === void 0 ? void 0 : data.w2s) || data.w2s.length === 0) && (<tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No W-2 data found for this year.</td></tr>)}
                </tbody>
            </table>
        </div>
      </div>

      {/* 1099-NEC Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-medium text-slate-900 dark:text-white">Form 1099-NEC (Contractors)</h3>
             <button onClick={() => downloadCSV('1099')} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center">
                <lucide_react_1.Download size={16} className="mr-1"/> Export CSV
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                        <th className="px-6 py-3">Contractor</th>
                        <th className="px-6 py-3">TIN</th>
                        <th className="px-6 py-3 text-right">Nonemployee Comp (Box 1)</th>
                        <th className="px-6 py-3 text-right">State Tax</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                     {data === null || data === void 0 ? void 0 : data.nec1099s.map((nec) => {
            var _a;
            return (<tr key={nec.contractorId}>
                            <td className="px-6 py-4 font-medium">{nec.name}</td>
                            <td className="px-6 py-4 text-slate-500">***-**-{((_a = nec.tin) === null || _a === void 0 ? void 0 : _a.slice(-4)) || '****'}</td>
                            <td className="px-6 py-4 text-right">{(0, localization_1.formatCurrency)(nec.nonemployeeCompensation, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                            <td className="px-6 py-4 text-right">{(0, localization_1.formatCurrency)(nec.stateTaxWithheld, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                        </tr>);
        })}
                     {(!(data === null || data === void 0 ? void 0 : data.nec1099s) || data.nec1099s.length === 0) && (<tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No 1099-NEC data found for this year.</td></tr>)}
                </tbody>
            </table>
        </div>
      </div>
    </div>);
}
// --- Sub-Components ---
function PayrollTable({ payrolls, onContinue, onDelete, onView }) {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [downloading, setDownloading] = (0, react_1.useState)(null);
    const handleDownload = async (payrollId) => {
        try {
            setDownloading(payrollId);
            const res = await api_1.default.get(`/payroll/${payrollId}`);
            await (0, generatePayslip_1.generatePayslip)(res.data, selectedBusiness);
            sonner_1.toast.success('Payslips downloaded successfully');
        }
        catch (error) {
            console.error(error);
            sonner_1.toast.error('Failed to download payslips');
        }
        finally {
            setDownloading(null);
        }
    };
    if (payrolls.length === 0) {
        return (<div className="p-12 text-center text-slate-500">
        <p>No payroll records found.</p>
      </div>);
    }
    return (<div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="px-6 py-3 font-medium">Pay Date</th>
            <th className="px-6 py-3 font-medium">Period</th>
            <th className="px-6 py-3 font-medium">Type</th>
            <th className="px-6 py-3 font-medium">Status</th>
            <th className="px-6 py-3 font-medium">Total Cost</th>
            <th className="px-6 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {payrolls.map((p) => {
            var _a;
            return (<tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
              <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                {(0, localization_1.formatDate)(p.payDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}
              </td>
              <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                {(0, localization_1.formatDate)(p.periodStart, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country, { month: 'short', day: 'numeric' })} - {(0, localization_1.formatDate)(p.periodEnd, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}
              </td>
              <td className="px-6 py-4 text-slate-500 dark:text-slate-400 capitalize">
                {((_a = p.type) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'Regular'}
              </td>
              <td className="px-6 py-4">
                 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                  ${p.status === 'PROCESSED' || p.status === 'PAID'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                  {p.status.toLowerCase()}
                </span>
              </td>
              <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                {(0, localization_1.formatCurrency)((p.totalGross || 0) + (p.totalEmployerTaxes || 0), selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
              </td>
              <td className="px-6 py-4 text-right">
                {(p.status === 'DRAFT' || p.status === 'PROCESSED') && onContinue ? (<div className="flex items-center justify-end gap-2">
                    <button onClick={() => onDelete === null || onDelete === void 0 ? void 0 : onDelete(p)} className="text-slate-400 hover:text-red-600 p-1" title="Delete Draft">
                        <lucide_react_1.Trash2 size={16}/>
                    </button>
                    <button onClick={() => onContinue(p)} className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center">
                        Continue <lucide_react_1.ChevronRight size={16} className="ml-1"/>
                    </button>
                  </div>) : (<div className="flex items-center justify-end gap-2">
                    {onView && (<button onClick={() => onView(p)} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400" title="View Details">
                        <lucide_react_1.Eye size={18}/>
                      </button>)}
                    <button onClick={() => handleDownload(p.id)} disabled={downloading === p.id} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50" title="Download PDF">
                      {downloading === p.id ? <lucide_react_1.Loader2 size={18} className="animate-spin"/> : <lucide_react_1.Download size={18}/>}
                    </button>
                  </div>)}
              </td>
            </tr>);
        })}
        </tbody>
      </table>
    </div>);
}
function RunPayrollWizard({ employees, onSuccess, initialPayroll }) {
    var _a, _b;
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [step, setStep] = (0, react_1.useState)(1);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [formData, setFormData] = (0, react_1.useState)({
        schedule: 'BI_WEEKLY',
        periodStart: '',
        periodEnd: '',
        payDate: '',
        type: 'REGULAR'
    });
    const [previewData, setPreviewData] = (0, react_1.useState)(null);
    const [inputData, setInputData] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        if (initialPayroll) {
            setFormData({
                schedule: 'BI_WEEKLY', // or derive if possible, but payroll object doesn't have it directly usually
                periodStart: initialPayroll.periodStart.split('T')[0], // Ensure format YYYY-MM-DD
                periodEnd: initialPayroll.periodEnd.split('T')[0],
                payDate: initialPayroll.payDate.split('T')[0],
                type: initialPayroll.type || 'REGULAR'
            });
            loadDraft(initialPayroll.id);
        }
    }, [initialPayroll]);
    const loadDraft = async (payrollId) => {
        var _a, _b, _c;
        if (!payrollId) {
            console.error('loadDraft called with missing payrollId');
            sonner_1.toast.error('Invalid payroll ID');
            return;
        }
        console.log('Loading draft for payrollId:', payrollId);
        setLoading(true);
        try {
            // 2. Fetch existing payroll data (do NOT recalculate)
            const res = await api_1.default.get(`/payroll/${payrollId}`);
            const payrollData = res.data;
            setPreviewData(payrollData);
            // Initialize Input Data from PayStubs
            if (payrollData.payStubs) {
                setInputData(payrollData.payStubs.map((stub) => {
                    const details = stub.deductionDetails ? JSON.parse(stub.deductionDetails) : {};
                    const taxDetails = stub.taxDetails ? JSON.parse(stub.taxDetails) : {};
                    return {
                        id: stub.id,
                        employeeId: stub.employeeId,
                        workerType: stub.workerType, // Add workerType
                        regularHours: stub.regularHours || 0,
                        overtimeHours: stub.overtimeHours || 0,
                        bonus: stub.bonus || 0,
                        commission: stub.commission || 0,
                        reimbursement: stub.reimbursement || 0,
                        deductions: stub.deductions || 0,
                        isManualDeduction: !!details.manualOverride,
                        federalTax: taxDetails.federalTax || 0,
                        socialSecurity: taxDetails.socialSecurity || 0,
                        medicare: taxDetails.medicare || 0,
                        stateTax: taxDetails.stateTax || 0,
                        isManualTax: !!taxDetails.manualOverride
                    };
                }));
            }
            setStep(2);
        }
        catch (error) {
            console.error('Load Draft Error:', error);
            if ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) {
                console.error('Error Details:', error.response.data);
            }
            let msg = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message;
            if (Array.isArray(msg))
                msg = msg.join(', ');
            sonner_1.toast.error(msg || 'Failed to load payroll draft');
        }
        finally {
            setLoading(false);
        }
    };
    const getBusinessId = () => {
        if (typeof window === 'undefined')
            return null;
        const stored = localStorage.getItem('selectedBusiness');
        return stored ? JSON.parse(stored).id : null;
    };
    const handleCalculate = async () => {
        var _a, _b, _c;
        setLoading(true);
        try {
            const businessId = getBusinessId();
            if (!businessId) {
                sonner_1.toast.error('No business selected');
                return;
            }
            // 1. Create Draft
            const createRes = await api_1.default.post('/payroll/create', {
                businessId,
                periodStart: new Date(formData.periodStart).toISOString(),
                periodEnd: new Date(formData.periodEnd).toISOString(),
                payDate: new Date(formData.payDate).toISOString(),
                type: formData.type
            });
            const payrollId = createRes.data.id;
            // 2. Calculate (Initialize)
            const calcRes = await api_1.default.post(`/payroll/${payrollId}/calculate`);
            setPreviewData(calcRes.data);
            // Initialize Input Data
            setInputData(calcRes.data.payStubs.map((stub) => {
                const details = stub.deductionDetails ? JSON.parse(stub.deductionDetails) : {};
                const taxDetails = stub.taxDetails ? JSON.parse(stub.taxDetails) : {};
                return {
                    id: stub.id,
                    employeeId: stub.employeeId,
                    workerType: stub.workerType, // Add workerType
                    regularHours: stub.regularHours || 0,
                    overtimeHours: stub.overtimeHours || 0,
                    bonus: stub.bonus || 0,
                    commission: stub.commission || 0,
                    reimbursement: stub.reimbursement || 0,
                    deductions: stub.deductions || 0,
                    isManualDeduction: !!details.manualOverride,
                    federalTax: taxDetails.federalTax || 0,
                    socialSecurity: taxDetails.socialSecurity || 0,
                    medicare: taxDetails.medicare || 0,
                    stateTax: taxDetails.stateTax || 0,
                    isManualTax: !!taxDetails.manualOverride
                };
            }));
            setStep(2);
        }
        catch (error) {
            console.error('Calculate Error:', error);
            if ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) {
                console.error('Error Details:', error.response.data);
            }
            let msg = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message;
            if (Array.isArray(msg))
                msg = msg.join(', ');
            // Handle specific backend errors
            if (msg && msg.includes('already exists')) {
                msg = 'A payroll run for this period already exists. Please check Drafts or History.';
            }
            sonner_1.toast.error(msg || 'Failed to create payroll draft');
        }
        finally {
            setLoading(false);
        }
    };
    const handleRecalculate = async () => {
        var _a, _b, _c;
        if (!confirm('This will reset all manual changes and recalculate based on approved timesheets. Continue?'))
            return;
        setLoading(true);
        try {
            if (!(previewData === null || previewData === void 0 ? void 0 : previewData.id))
                return;
            const calcRes = await api_1.default.post(`/payroll/${previewData.id}/calculate`);
            setPreviewData(calcRes.data);
            setInputData(calcRes.data.payStubs.map((stub) => ({
                id: stub.id,
                employeeId: stub.employeeId,
                workerType: stub.workerType, // Add workerType
                regularHours: stub.regularHours || 0,
                overtimeHours: stub.overtimeHours || 0,
                bonus: stub.bonus || 0,
                commission: stub.commission || 0,
                reimbursement: stub.reimbursement || 0,
                deductions: stub.deductions || 0,
            })));
            sonner_1.toast.success('Payroll recalculated from timesheets');
        }
        catch (error) {
            console.error('Recalculate Error:', error);
            if ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) {
                console.error('Error Details:', error.response.data);
            }
            let msg = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message;
            if (Array.isArray(msg))
                msg = msg.join(', ');
            sonner_1.toast.error(msg || 'Failed to recalculate payroll');
        }
        finally {
            setLoading(false);
        }
    };
    const handlePreview = async () => {
        var _a, _b, _c;
        setIsSaving(true);
        try {
            // Save inputs
            const updates = inputData.map(input => {
                const payload = {
                    regularHours: Number(input.regularHours),
                    overtimeHours: Number(input.overtimeHours),
                    bonus: Number(input.bonus),
                    commission: Number(input.commission),
                    reimbursement: Number(input.reimbursement)
                };
                if (input.isManualDeduction) {
                    payload.deductions = Number(input.deductions);
                }
                if (input.isManualTax) {
                    payload.federalTax = Number(input.federalTax);
                    payload.socialSecurity = Number(input.socialSecurity);
                    payload.medicare = Number(input.medicare);
                    payload.stateTax = Number(input.stateTax);
                }
                return api_1.default.patch(`/payroll/paystub/${input.id}`, payload);
            });
            const responses = await Promise.all(updates);
            const updatedStubs = responses.map(r => r.data);
            // Update previewData with new calculations
            const totalGross = updatedStubs.reduce((acc, s) => acc + s.grossPay, 0);
            const totalEmployerTaxes = updatedStubs.reduce((acc, s) => acc + s.employerTaxes, 0);
            setPreviewData({
                ...previewData,
                payStubs: updatedStubs,
                totalGross,
                totalEmployerTaxes
            });
            setStep(3);
        }
        catch (err) {
            console.error('Preview Error:', err);
            if ((_a = err.response) === null || _a === void 0 ? void 0 : _a.data) {
                console.error('Error Details:', err.response.data);
            }
            let msg = (_c = (_b = err.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message;
            if (Array.isArray(msg))
                msg = msg.join(', ');
            sonner_1.toast.error(msg || 'Failed to update payroll inputs');
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleSubmit = async () => {
        var _a, _b, _c;
        // Approve and finalize
        setLoading(true);
        try {
            if (!(previewData === null || previewData === void 0 ? void 0 : previewData.id))
                return;
            await api_1.default.post(`/payroll/${previewData.id}/finalize`);
            sonner_1.toast.success('Payroll approved and finalized!');
            onSuccess();
        }
        catch (err) {
            console.error('Submit Error:', err);
            if ((_a = err.response) === null || _a === void 0 ? void 0 : _a.data) {
                console.error('Error Details:', err.response.data);
            }
            let msg = (_c = (_b = err.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message;
            if (Array.isArray(msg))
                msg = msg.join(', ');
            sonner_1.toast.error(msg || 'Failed to finalize payroll');
        }
        finally {
            setLoading(false);
        }
    };
    const handleInputChange = (id, field, value) => {
        setInputData(prev => prev.map(item => {
            if (item.id !== id)
                return item;
            const updates = { [field]: value };
            if (field === 'deductions') {
                updates.isManualDeduction = true;
            }
            if (['federalTax', 'socialSecurity', 'medicare', 'stateTax'].includes(field)) {
                updates.isManualTax = true;
            }
            return { ...item, ...updates };
        }));
    };
    if (step === 1) {
        // ... (Step 1 Form) ...
        return (<div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-xl font-semibold mb-6">Run Payroll - Step 1: Period</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pay Schedule</label>
              <select className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" value={formData.schedule} onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}>
                <option value="WEEKLY">Weekly</option>
                <option value="BI_WEEKLY">Bi-Weekly</option>
                <option value="SEMI_MONTHLY">Semi-Monthly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Run Type</label>
              <select className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <option value="REGULAR">Regular Payroll</option>
                <option value="OFF_CYCLE">Off-Cycle</option>
                <option value="BONUS">Bonus Run</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Period Start</label>
              <input type="date" required className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" value={formData.periodStart} onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}/>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Period End</label>
              <input type="date" required className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" value={formData.periodEnd} onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}/>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pay Date</label>
            <input type="date" required className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" value={formData.payDate} onChange={(e) => setFormData({ ...formData, payDate: e.target.value })}/>
          </div>

          <div className="pt-6 flex justify-end">
            <button onClick={handleCalculate} disabled={loading || !formData.periodStart || !formData.periodEnd || !formData.payDate} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {loading && <lucide_react_1.Loader2 className="w-4 h-4 animate-spin"/>}
              Next: Enter Hours
            </button>
          </div>
        </div>
      </div>);
    }
    if (step === 2) {
        return (<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Enter Hours & Earnings</h2>
              <div className="flex gap-3">
                 <button onClick={handleRecalculate} disabled={loading || isSaving} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                    Recalculate
                </button>
                <button onClick={handlePreview} disabled={isSaving || loading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                    {isSaving && <lucide_react_1.Loader2 className="w-4 h-4 animate-spin"/>}
                    Preview Payroll
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <h3 className="text-md font-semibold mb-4 text-slate-800 dark:text-slate-200">W-2 Employees</h3>
              <table className="w-full text-sm text-left mb-8">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3 w-32">Rate</th>
                    <th className="px-4 py-3 w-32">Reg Hours</th>
                    <th className="px-4 py-3 w-32">OT Hours</th>
                    <th className="px-4 py-3 w-32">Bonus ($)</th>
                    <th className="px-4 py-3 w-32">Commission ($)</th>
                    <th className="px-4 py-3 w-24">FED WTH</th>
                    <th className="px-4 py-3 w-24">FICA</th>
                    <th className="px-4 py-3 w-24">MEDFICA</th>
                    <th className="px-4 py-3 w-24">STATE</th>
                    <th className="px-4 py-3 w-24">Deductions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {inputData.filter(input => input.workerType === 'W2').map((input) => {
                const employee = employees.find(e => e.id === input.employeeId);
                return (<tr key={input.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{employee === null || employee === void 0 ? void 0 : employee.firstName} {employee === null || employee === void 0 ? void 0 : employee.lastName}</div>
                          <div className="text-xs text-slate-500">{employee === null || employee === void 0 ? void 0 : employee.payType}</div>
                          {(employee === null || employee === void 0 ? void 0 : employee.workerType) === 'BOTH' && <span className="text-[10px] bg-purple-100 text-purple-800 px-1 rounded ml-1">W-2 Portion</span>}
                        </td>
                        <td className="px-4 py-3">
                           <div className="text-sm text-slate-600 dark:text-slate-400">
                             ${(employee === null || employee === void 0 ? void 0 : employee.hourlyRate) || (employee === null || employee === void 0 ? void 0 : employee.salary) || 0}
                           </div>
                        </td>
                        <td className="px-4 py-3">
                           <input type="number" className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" value={input.regularHours} onChange={(e) => handleInputChange(input.id, 'regularHours', e.target.value)}/>
                        </td>
                        <td className="px-4 py-3">
                           <input type="number" className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" value={input.overtimeHours} onChange={(e) => handleInputChange(input.id, 'overtimeHours', e.target.value)}/>
                        </td>
                         <td className="px-4 py-3">
                           <input type="number" className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" value={input.bonus} onChange={(e) => handleInputChange(input.id, 'bonus', e.target.value)}/>
                        </td>
                         <td className="px-4 py-3">
                           <input type="number" className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" value={input.commission} onChange={(e) => handleInputChange(input.id, 'commission', e.target.value)}/>
                        </td>
                        <td className="px-4 py-3">
                           <input type="number" className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs" value={input.federalTax} onChange={(e) => handleInputChange(input.id, 'federalTax', e.target.value)}/>
                        </td>
                        <td className="px-4 py-3">
                           <input type="number" className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs" value={input.socialSecurity} onChange={(e) => handleInputChange(input.id, 'socialSecurity', e.target.value)}/>
                        </td>
                        <td className="px-4 py-3">
                           <input type="number" className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs" value={input.medicare} onChange={(e) => handleInputChange(input.id, 'medicare', e.target.value)}/>
                        </td>
                        <td className="px-4 py-3">
                           <input type="number" className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs" value={input.stateTax} onChange={(e) => handleInputChange(input.id, 'stateTax', e.target.value)}/>
                        </td>
                        <td className="px-4 py-3">
                            <input type="number" className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" value={input.deductions} onChange={(e) => handleInputChange(input.id, 'deductions', e.target.value)}/>
                        </td>
                      </tr>);
            })}
                </tbody>
              </table>

              <h3 className="text-md font-semibold mb-4 text-slate-800 dark:text-slate-200">1099 Contractors</h3>
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-4 py-3">Contractor</th>
                    <th className="px-4 py-3 w-32">Hours/Units</th>
                    <th className="px-4 py-3 w-32">Rate</th>
                    <th className="px-4 py-3 w-32">Deductions ($)</th>
                    <th className="px-4 py-3 w-32">Reimbursement ($)</th>
                    <th className="px-4 py-3 w-32">Total Pay ($)</th>
                    <th className="px-4 py-3 w-24">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {inputData.filter(input => input.workerType === 'CONTRACTOR_1099').map((input) => {
                const employee = employees.find(e => e.id === input.employeeId);
                return (<tr key={input.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{employee === null || employee === void 0 ? void 0 : employee.firstName} {employee === null || employee === void 0 ? void 0 : employee.lastName}</div>
                          <div className="text-xs text-slate-500">{employee === null || employee === void 0 ? void 0 : employee.payType}</div>
                          {(employee === null || employee === void 0 ? void 0 : employee.workerType) === 'BOTH' && <span className="text-[10px] bg-purple-100 text-purple-800 px-1 rounded ml-1">1099 Portion</span>}
                        </td>
                        <td className="px-4 py-3">
                           <input type="number" className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" value={input.regularHours} onChange={(e) => handleInputChange(input.id, 'regularHours', e.target.value)}/>
                        </td>
                        <td className="px-4 py-3">
                           <div className="text-sm text-slate-600 dark:text-slate-400">
                             ${(employee === null || employee === void 0 ? void 0 : employee.hourlyRate) || (employee === null || employee === void 0 ? void 0 : employee.salary) || 0}
                           </div>
                        </td>
                        <td className="px-4 py-3">
                           <input type="number" className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" value={input.deductions} onChange={(e) => handleInputChange(input.id, 'deductions', e.target.value)}/>
                        </td>
                         <td className="px-4 py-3">
                           <input type="number" className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" value={input.reimbursement} onChange={(e) => handleInputChange(input.id, 'reimbursement', e.target.value)}/>
                        </td>
                         <td className="px-4 py-3">
                           <div className="text-sm font-medium text-slate-900 dark:text-white">
                             {/* Assuming simple calculation for display, real calc is backend */}
                             {(0, localization_1.formatCurrency)(((input.regularHours || 0) * ((employee === null || employee === void 0 ? void 0 : employee.hourlyRate) || 0)) + Number(input.reimbursement || 0) - Number(input.deductions || 0), selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                           </div>
                        </td>
                        <td className="px-4 py-3">
                           <input type="text" placeholder="Optional" className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs"/>
                        </td>
                      </tr>);
            })}
                </tbody>
              </table>

            </div>
          </div>
        </div>);
    }
    // Preview Step (Step 3)
    return (<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
             <h2 className="text-xl font-bold text-slate-900 dark:text-white">Review Payroll</h2>
             <p className="text-slate-500">
               Total Cash Requirement: <span className="font-bold text-slate-900 dark:text-white">{(0, localization_1.formatCurrency)(((previewData === null || previewData === void 0 ? void 0 : previewData.totalGross) || 0) + ((previewData === null || previewData === void 0 ? void 0 : previewData.totalEmployerTaxes) || 0), selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</span>
             </p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setStep(2)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
               Back
             </button>
             <button onClick={handleSubmit} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm">
               Submit Payroll
             </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* W-2 Employees Section */}
          <h3 className="text-md font-semibold mb-4 text-slate-800 dark:text-slate-200">W-2 Employees</h3>
          <table className="w-full text-sm text-left mb-8">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Gross Pay</th>
                <th className="px-4 py-3">FED WTH</th>
                <th className="px-4 py-3">FICA</th>
                <th className="px-4 py-3">MEDFICA</th>
                <th className="px-4 py-3">STATE</th>
                <th className="px-4 py-3">Deductions</th>
                <th className="px-4 py-3">Net Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {(_a = previewData === null || previewData === void 0 ? void 0 : previewData.payStubs) === null || _a === void 0 ? void 0 : _a.filter((stub) => stub.workerType === 'W2').map((stub) => {
            const employee = employees.find(e => e.id === stub.employeeId);
            const taxDetails = stub.taxDetails ? JSON.parse(stub.taxDetails) : {};
            return (<tr key={stub.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{employee === null || employee === void 0 ? void 0 : employee.firstName} {employee === null || employee === void 0 ? void 0 : employee.lastName}</div>
                      <div className="text-xs text-slate-500">W-2 Employee</div>
                      {(employee === null || employee === void 0 ? void 0 : employee.workerType) === 'BOTH' && <span className="text-[10px] bg-purple-100 text-purple-800 px-1 rounded ml-1">W-2 Portion</span>}
                    </td>
                    <td className="px-4 py-3">
                        {stub.regularHours + stub.overtimeHours > 0 ? (stub.regularHours + stub.overtimeHours).toFixed(1) : '-'}
                    </td>
                    <td className="px-4 py-3">{(0, localization_1.formatCurrency)(stub.grossPay, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                    <td className="px-4 py-3 text-red-600">-{(0, localization_1.formatCurrency)(taxDetails.federalTax || 0, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                    <td className="px-4 py-3 text-red-600">-{(0, localization_1.formatCurrency)(taxDetails.socialSecurity || 0, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                    <td className="px-4 py-3 text-red-600">-{(0, localization_1.formatCurrency)(taxDetails.medicare || 0, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                    <td className="px-4 py-3 text-red-600">-{(0, localization_1.formatCurrency)(taxDetails.stateTax || 0, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                    <td className="px-4 py-3 text-red-600">-{(0, localization_1.formatCurrency)(stub.deductions, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{(0, localization_1.formatCurrency)(stub.netPay, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                  </tr>);
        })}
            </tbody>
          </table>

          {/* 1099 Contractors Section */}
          <h3 className="text-md font-semibold mb-4 text-slate-800 dark:text-slate-200">1099 Contractors</h3>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3">Contractor</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Total Pay</th>
                <th className="px-4 py-3">Deductions</th>
                <th className="px-4 py-3">Reimbursement</th>
                <th className="px-4 py-3">Net Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {(_b = previewData === null || previewData === void 0 ? void 0 : previewData.payStubs) === null || _b === void 0 ? void 0 : _b.filter((stub) => stub.workerType === 'CONTRACTOR_1099').map((stub) => {
            const employee = employees.find(e => e.id === stub.employeeId);
            return (<tr key={stub.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{employee === null || employee === void 0 ? void 0 : employee.firstName} {employee === null || employee === void 0 ? void 0 : employee.lastName}</div>
                      <div className="text-xs text-slate-500">Contractor</div>
                      {(employee === null || employee === void 0 ? void 0 : employee.workerType) === 'BOTH' && <span className="text-[10px] bg-purple-100 text-purple-800 px-1 rounded ml-1">1099 Portion</span>}
                    </td>
                    <td className="px-4 py-3">
                        {stub.regularHours > 0 ? stub.regularHours.toFixed(1) : '-'}
                    </td>
                    <td className="px-4 py-3">{(0, localization_1.formatCurrency)(stub.grossPay, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                    <td className="px-4 py-3 text-red-600">-{(0, localization_1.formatCurrency)(stub.deductions, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                    <td className="px-4 py-3 text-green-600">+{(0, localization_1.formatCurrency)(stub.reimbursement, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{(0, localization_1.formatCurrency)(stub.netPay, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                  </tr>);
        })}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
}
function EmployeePayrollList({ employees }) {
    const router = (0, navigation_1.useRouter)();
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    return (<div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in fade-in duration-300">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white">Employee Payroll Settings</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Worker Type</th>
              <th className="px-6 py-3 font-medium">Schedule</th>
              <th className="px-6 py-3 font-medium">Pay Type</th>
              <th className="px-6 py-3 font-medium">Rate</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {employees.map((e) => {
            var _a;
            return (<tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                  {e.firstName} {e.lastName}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                    ${e.workerType === 'CONTRACTOR_1099'
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                    : e.workerType === 'BOTH'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                    {e.workerType === 'CONTRACTOR_1099' ? '1099 Contractor' : e.workerType === 'BOTH' ? 'W-2 & 1099' : 'W-2 Employee'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {e.paySchedule || 'Bi-Weekly'}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 capitalize">
                  {(_a = e.payType) === null || _a === void 0 ? void 0 : _a.toLowerCase()}
                </td>
                <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">
                  {e.payType === 'HOURLY' ? `${(0, localization_1.formatCurrency)(e.hourlyRate || 0, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}/hr` : `${(0, localization_1.formatCurrency)(e.salary || 0, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}/yr`}
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => router.push(`/dashboard/people?employeeId=${e.id}`)} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                    <lucide_react_1.Settings size={18}/>
                  </button>
                </td>
              </tr>);
        })}
          </tbody>
        </table>
      </div>
    </div>);
}
