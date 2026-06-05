"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PayrollReportsPage;
const react_1 = require("react");
const business_context_1 = require("../../../../context/business-context");
const api_1 = __importDefault(require("../../../../lib/api"));
const recharts_1 = require("recharts");
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
const jspdf_1 = __importDefault(require("jspdf"));
const jspdf_autotable_1 = __importDefault(require("jspdf-autotable"));
const image_utils_1 = require("../../../../utils/image-utils");
const PayrollDetailsModal_1 = __importDefault(require("../../../../components/payroll/PayrollDetailsModal"));
const generatePayslip_1 = require("../../../../utils/generatePayslip");
const navigation_1 = require("next/navigation");
const localization_1 = require("../../../../lib/localization");
function PayrollReportsPage() {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [activeTab, setActiveTab] = (0, react_1.useState)('overview');
    const [payrolls, setPayrolls] = (0, react_1.useState)([]);
    const [employees, setEmployees] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [viewingPayrollId, setViewingPayrollId] = (0, react_1.useState)(null);
    // Date State
    const [startDate, setStartDate] = (0, react_1.useState)((0, date_fns_1.startOfMonth)(new Date()));
    const [endDate, setEndDate] = (0, react_1.useState)((0, date_fns_1.endOfMonth)(new Date()));
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [selectedBusiness]);
    const fetchData = async () => {
        if (!selectedBusiness)
            return;
        try {
            setLoading(true);
            const [payrollRes, employeeRes] = await Promise.all([
                api_1.default.get('/payroll', { params: { businessId: selectedBusiness.id } }),
                api_1.default.get('/employees?status=ACTIVE')
            ]);
            setPayrolls(payrollRes.data);
            setEmployees(employeeRes.data);
        }
        catch (error) {
            console.error('Failed to fetch data', error);
            sonner_1.toast.error('Failed to load payroll data');
        }
        finally {
            setLoading(false);
        }
    };
    // Filter payrolls based on date range
    const filteredPayrolls = (0, react_1.useMemo)(() => {
        return payrolls.filter(p => {
            if (!p.payDate)
                return false;
            const payDate = (0, date_fns_1.parseISO)(p.payDate);
            return (0, date_fns_1.isValid)(payDate) && (0, date_fns_1.isWithinInterval)(payDate, { start: startDate, end: endDate });
        }).sort((a, b) => new Date(b.payDate).getTime() - new Date(a.payDate).getTime()); // Newest first
    }, [payrolls, startDate, endDate]);
    // Calculate Summary Stats
    const stats = (0, react_1.useMemo)(() => {
        return filteredPayrolls.reduce((acc, p) => {
            if (p.status !== 'PROCESSED' && p.status !== 'PAID')
                return acc;
            acc.totalGross += p.totalGross || 0;
            acc.totalNet += p.totalNet || 0;
            acc.totalEmployeeTaxes += p.totalEmployeeTaxes || 0;
            acc.totalEmployerTaxes += p.totalEmployerTaxes || 0;
            acc.totalCost += (p.totalGross || 0) + (p.totalEmployerTaxes || 0);
            acc.count += 1;
            return acc;
        }, {
            totalGross: 0,
            totalNet: 0,
            totalEmployeeTaxes: 0,
            totalEmployerTaxes: 0,
            totalCost: 0,
            count: 0
        });
    }, [filteredPayrolls]);
    // Chart Data
    const chartData = (0, react_1.useMemo)(() => {
        return filteredPayrolls
            .filter(p => p.status === 'PROCESSED' || p.status === 'PAID')
            .slice().reverse() // Show oldest to newest in chart
            .map(p => ({
            date: (0, date_fns_1.format)((0, date_fns_1.parseISO)(p.payDate), 'MMM d'),
            gross: p.totalGross || 0,
            net: p.totalNet || 0,
            taxes: (p.totalEmployeeTaxes || 0) + (p.totalEmployerTaxes || 0),
            cost: (p.totalGross || 0) + (p.totalEmployerTaxes || 0)
        }));
    }, [filteredPayrolls]);
    const exportPDF = async () => {
        try {
            const doc = new jspdf_1.default();
            // Add Logo
            if (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.logoUrl) {
                try {
                    const logoData = await (0, image_utils_1.getBase64ImageFromURL)(selectedBusiness.logoUrl);
                    if (logoData) {
                        doc.addImage(logoData, 'PNG', 14, 10, 20, 20);
                    }
                }
                catch (e) {
                    console.warn('Failed to load logo', e);
                }
            }
            // Header
            doc.setFontSize(20);
            doc.text('Payroll Report', 14, 40);
            doc.setFontSize(10);
            doc.text((selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.name) || 'Business Name', 14, 46);
            doc.text(`Period: ${(0, date_fns_1.format)(startDate, 'MMM d, yyyy')} - ${(0, date_fns_1.format)(endDate, 'MMM d, yyyy')}`, 14, 51);
            // Summary
            doc.setFontSize(12);
            doc.text('Summary', 14, 65);
            const summaryData = [
                ['Total Payroll Cost', (0, localization_1.formatCurrency)(stats.totalCost, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)],
                ['Total Gross Pay', (0, localization_1.formatCurrency)(stats.totalGross, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)],
                ['Total Net Pay', (0, localization_1.formatCurrency)(stats.totalNet, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)],
                ['Total Taxes', (0, localization_1.formatCurrency)(stats.totalEmployeeTaxes + stats.totalEmployerTaxes, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)],
                ['Number of Runs', stats.count.toString()]
            ];
            (0, jspdf_autotable_1.default)(doc, {
                startY: 70,
                head: [['Metric', 'Value']],
                body: summaryData,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] },
                styles: { fontSize: 10 }
            });
            // Detailed Table
            doc.text('Detailed Payroll Runs', 14, doc.lastAutoTable.finalY + 15);
            const tableData = filteredPayrolls.map(p => [
                (0, localization_1.formatDate)(p.payDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country),
                `${(0, localization_1.formatDate)(p.periodStart, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country, { month: 'short', day: 'numeric' })} - ${(0, localization_1.formatDate)(p.periodEnd, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country, { month: 'short', day: 'numeric' })}`,
                p.type,
                (0, localization_1.formatCurrency)(p.totalGross, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode),
                (0, localization_1.formatCurrency)(p.totalNet, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode),
                (0, localization_1.formatCurrency)(p.totalEmployeeTaxes + p.totalEmployerTaxes, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode),
                p.status
            ]);
            (0, jspdf_autotable_1.default)(doc, {
                startY: doc.lastAutoTable.finalY + 20,
                head: [['Pay Date', 'Period', 'Type', 'Gross', 'Net', 'Taxes', 'Status']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [52, 73, 94] },
                styles: { fontSize: 8 }
            });
            doc.save(`Payroll_Report_${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd')}.pdf`);
            sonner_1.toast.success('Report exported successfully');
        }
        catch (error) {
            console.error('Export failed', error);
            sonner_1.toast.error('Failed to export PDF');
        }
    };
    const exportCSV = () => {
        const headers = ['Pay Date', 'Period Start', 'Period End', 'Type', 'Status', 'Total Gross', 'Total Net', 'Employee Taxes', 'Employer Taxes', 'Total Cost'];
        const rows = filteredPayrolls.map(p => [
            (0, date_fns_1.format)((0, date_fns_1.parseISO)(p.payDate), 'yyyy-MM-dd'),
            (0, date_fns_1.format)((0, date_fns_1.parseISO)(p.periodStart), 'yyyy-MM-dd'),
            (0, date_fns_1.format)((0, date_fns_1.parseISO)(p.periodEnd), 'yyyy-MM-dd'),
            p.type,
            p.status,
            p.totalGross.toFixed(2),
            p.totalNet.toFixed(2),
            p.totalEmployeeTaxes.toFixed(2),
            p.totalEmployerTaxes.toFixed(2),
            (p.totalGross + p.totalEmployerTaxes).toFixed(2)
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `payroll_report_${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    return (<div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <lucide_react_1.FileText className="w-8 h-8 text-blue-600"/>
            Payroll Reports
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Financial summary and detailed payroll analysis
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
            <input type="date" value={(0, date_fns_1.format)(startDate, 'yyyy-MM-dd')} onChange={(e) => e.target.value && setStartDate((0, date_fns_1.parseISO)(e.target.value))} className="bg-transparent border-none text-sm focus:ring-0 text-slate-700 dark:text-slate-300"/>
            <span className="text-slate-400 px-2">-</span>
            <input type="date" value={(0, date_fns_1.format)(endDate, 'yyyy-MM-dd')} onChange={(e) => e.target.value && setEndDate((0, date_fns_1.parseISO)(e.target.value))} className="bg-transparent border-none text-sm focus:ring-0 text-slate-700 dark:text-slate-300"/>
          </div>
          
          <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium">
            <lucide_react_1.Download size={16}/>
            PDF
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm font-medium">
            <lucide_react_1.FileText size={16}/>
            CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[
            { id: 'overview', name: 'Overview', icon: lucide_react_1.DollarSign },
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
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total Payroll Cost" value={(0, localization_1.formatCurrency)(stats.totalCost, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)} subtitle="Gross + Employer Taxes" icon={lucide_react_1.DollarSign} color="blue"/>
              <StatCard title="Total Net Pay" value={(0, localization_1.formatCurrency)(stats.totalNet, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)} subtitle="Disbursed to Employees" icon={lucide_react_1.TrendingUp} color="green"/>
              <StatCard title="Total Taxes" value={(0, localization_1.formatCurrency)(stats.totalEmployeeTaxes + stats.totalEmployerTaxes, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)} subtitle="Employee + Employer" icon={lucide_react_1.PieChart} color="purple"/>
              <StatCard title="Payroll Runs" value={stats.count} subtitle="Processed in Period" icon={lucide_react_1.Calendar} color="orange"/>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Payroll Cost Trends</h3>
              <div className="h-[350px] w-full">
                <recharts_1.ResponsiveContainer width="100%" height="100%">
                  <recharts_1.BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <recharts_1.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0"/>
                    <recharts_1.XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} dy={10}/>
                    <recharts_1.YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} tickFormatter={(value) => (0, localization_1.formatCurrency)(value, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode).replace(/(\d+)\.\d+/, '$1').replace(/\D/g, '') + 'k'} // Simplified for space
        />
                    <recharts_1.Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => [(0, localization_1.formatCurrency)(value || 0, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode), '']}/>
                    <recharts_1.Legend />
                    <recharts_1.Bar dataKey="gross" name="Gross Pay" stackId="a" fill="#3B82F6" radius={[0, 0, 4, 4]}/>
                    <recharts_1.Bar dataKey="taxes" name="Taxes" stackId="a" fill="#8B5CF6" radius={[4, 4, 0, 0]}/>
                  </recharts_1.BarChart>
                </recharts_1.ResponsiveContainer>
              </div>
            </div>
            
            {/* Recent Payrolls (Limited to 5) */}
             <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Payroll Runs</h3>
                   <button onClick={() => setActiveTab('history')} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View All</button>
                </div>
                <PayrollTable payrolls={filteredPayrolls.slice(0, 5)} onView={(p) => setViewingPayrollId(p.id)}/>
            </div>
          </div>)}

        {activeTab === 'history' && (<div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in fade-in duration-300">
             <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">All Payroll History</h3>
             </div>
            <PayrollTable payrolls={filteredPayrolls} onView={(p) => setViewingPayrollId(p.id)}/>
          </div>)}

        {activeTab === 'employees' && (<EmployeeReportList employees={employees}/>)}

        {activeTab === 'filings' && (<TaxFilingsTab />)}
      </div>

      {/* Payroll Details Modal */}
      {viewingPayrollId && (<PayrollDetailsModal_1.default payrollId={viewingPayrollId} onClose={() => setViewingPayrollId(null)}/>)}
    </div>);
}
// --- Components ---
function StatCard({ title, value, subtitle, icon: Icon, color }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    };
    return (<div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon size={24}/>
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h3>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-2">{subtitle}</p>}
    </div>);
}
function StatusBadge({ status }) {
    const styles = {
        DRAFT: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
        PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        PROCESSED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        PAID: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.DRAFT}`}>
      {status}
    </span>);
}
function PayrollTable({ payrolls, onView }) {
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
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium">
                    <tr>
                        <th className="px-6 py-4">Pay Date</th>
                        <th className="px-6 py-4">Period</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4 text-right">Gross Pay</th>
                        <th className="px-6 py-4 text-right">Net Pay</th>
                        <th className="px-6 py-4 text-right">Taxes</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {payrolls.map((payroll) => (<tr key={payroll.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                {(0, localization_1.formatDate)(payroll.payDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                {(0, localization_1.formatDate)(payroll.periodStart, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)} - {(0, localization_1.formatDate)(payroll.periodEnd, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}
                            </td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                    {payroll.type}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">
                                {(0, localization_1.formatCurrency)(payroll.totalGross, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-green-600 dark:text-green-400">
                                {(0, localization_1.formatCurrency)(payroll.totalNet, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                            </td>
                            <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">
                                {(0, localization_1.formatCurrency)(payroll.totalEmployeeTaxes + payroll.totalEmployerTaxes, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <StatusBadge status={payroll.status}/>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    {onView && (<button onClick={() => onView(payroll)} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400" title="View Details">
                                            <lucide_react_1.Eye size={18}/>
                                        </button>)}
                                    <button onClick={() => handleDownload(payroll.id)} disabled={downloading === payroll.id} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50" title="Download PDF">
                                        {downloading === payroll.id ? <lucide_react_1.Loader2 size={18} className="animate-spin"/> : <lucide_react_1.Download size={18}/>}
                                    </button>
                                </div>
                            </td>
                        </tr>))}
                </tbody>
            </table>
        </div>);
}
function TaxFilingsTab() {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [year, setYear] = (0, react_1.useState)(new Date().getFullYear());
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchFilings();
    }, [year]);
    const fetchFilings = async () => {
        try {
            setLoading(true);
            if (!(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id))
                return;
            const res = await api_1.default.get(`/payroll/report/year-end?businessId=${selectedBusiness.id}&year=${year}`);
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
function EmployeeReportList({ employees }) {
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
