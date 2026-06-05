"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PayslipsPage;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const api_1 = __importDefault(require("../../../../lib/api"));
const business_context_1 = require("../../../../context/business-context");
const localization_1 = require("../../../../lib/localization");
const lucide_react_1 = require("lucide-react");
const date_fns_1 = require("date-fns");
const generatePayslip_1 = require("../../../../utils/generatePayslip");
function PayslipsPage() {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [payslips, setPayslips] = (0, react_1.useState)([]);
    const [selectedStub, setSelectedStub] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    // Search and Filter State
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [showFilters, setShowFilters] = (0, react_1.useState)(false);
    const [startDate, setStartDate] = (0, react_1.useState)('');
    const [endDate, setEndDate] = (0, react_1.useState)('');
    const [groupByMonth, setGroupByMonth] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        fetchPayslips();
    }, []);
    const fetchPayslips = async () => {
        try {
            const res = await api_1.default.get('/payroll/paystubs');
            setPayslips(res.data);
            if (res.data.length > 0) {
                setSelectedStub(res.data[0]);
            }
        }
        catch (err) {
            console.error('Failed to fetch payslips', err);
        }
        finally {
            setLoading(false);
        }
    };
    // Filter Logic
    const filteredPayslips = (0, react_1.useMemo)(() => {
        return payslips.filter(stub => {
            // Search Text
            const searchLower = searchQuery.toLowerCase();
            const nameMatch = `${stub.employee.firstName} ${stub.employee.lastName}`.toLowerCase().includes(searchLower);
            const amountMatch = stub.netPay.toString().includes(searchLower);
            if (!nameMatch && !amountMatch)
                return false;
            // Date Range
            if (startDate && endDate) {
                const payDate = (0, date_fns_1.parseISO)(stub.payroll.payDate);
                const start = (0, date_fns_1.startOfDay)((0, date_fns_1.parseISO)(startDate));
                const end = (0, date_fns_1.endOfDay)((0, date_fns_1.parseISO)(endDate));
                if (!(0, date_fns_1.isWithinInterval)(payDate, { start, end }))
                    return false;
            }
            return true;
        });
    }, [payslips, searchQuery, startDate, endDate]);
    // Grouping Logic
    const groupedPayslips = (0, react_1.useMemo)(() => {
        if (!groupByMonth)
            return { 'All Payslips': filteredPayslips };
        const groups = {};
        const locale = (0, localization_1.getCountryConfig)(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country).locale;
        filteredPayslips.forEach(stub => {
            const date = (0, date_fns_1.parseISO)(stub.payroll.payDate);
            const key = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
            if (!groups[key])
                groups[key] = [];
            groups[key].push(stub);
        });
        return groups;
    }, [filteredPayslips, groupByMonth, selectedBusiness]);
    // Download Function
    const handleDownload = async () => {
        if (!selectedStub)
            return;
        const payrollData = {
            ...selectedStub.payroll,
            payStubs: [selectedStub]
        };
        // Business data is now included in the payroll object from the API
        const businessData = selectedStub.payroll.business || {};
        await (0, generatePayslip_1.generatePayslip)(payrollData, businessData);
    };
    return (<div className="w-full h-[calc(100vh-100px)] flex flex-col lg:flex-row gap-6 p-6 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
      {/* Left Panel: List */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4 h-full">
        <div className="flex flex-col gap-4 mb-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              My Payslips
            </h1>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <lucide_react_1.Activity className="w-5 h-5 text-blue-600 dark:text-blue-400"/>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <lucide_react_1.Filter className="w-4 h-4"/>
            </button>
            <button onClick={() => setGroupByMonth(!groupByMonth)} className={`p-2 rounded-lg border transition-colors ${groupByMonth ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`} title="Group by Month">
              <lucide_react_1.Layers className="w-4 h-4"/>
            </button>
          </div>

          {/* Expanded Filters */}
          <framer_motion_1.AnimatePresence>
            {showFilters && (<framer_motion_1.motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="flex gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">From</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full text-xs p-1 bg-transparent border-b border-slate-200 focus:outline-none focus:border-blue-500"/>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">To</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full text-xs p-1 bg-transparent border-b border-slate-200 focus:outline-none focus:border-blue-500"/>
                  </div>
                </div>
              </framer_motion_1.motion.div>)}
          </framer_motion_1.AnimatePresence>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
          {loading ? ([...Array(3)].map((_, i) => (<div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"/>))) : filteredPayslips.length === 0 ? (<div className="text-center p-8 text-slate-500">No payslips found</div>) : (Object.entries(groupedPayslips).map(([groupTitle, groupStubs]) => (<div key={groupTitle} className="space-y-3">
                {groupByMonth && (<h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 py-1 z-10 backdrop-blur-sm">
                    {groupTitle}
                  </h3>)}
                {groupStubs.map((stub) => (<framer_motion_1.motion.div key={stub.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={() => setSelectedStub(stub)} className={`p-4 rounded-xl cursor-pointer transition-all border ${(selectedStub === null || selectedStub === void 0 ? void 0 : selectedStub.id) === stub.id
                    ? 'bg-white dark:bg-slate-800 border-blue-500 shadow-lg shadow-blue-500/10'
                    : 'bg-white/50 dark:bg-slate-800/50 border-transparent hover:bg-white dark:hover:bg-slate-800'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {stub.employee.firstName} {stub.employee.lastName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {(0, localization_1.formatDate)(stub.payroll.payDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}
                        </p>
                        <p className="font-semibold text-slate-900 dark:text-white mt-1">
                          {(0, localization_1.formatCurrency)(stub.netPay, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                        </p>
                      </div>
                      <div className={`p-1.5 rounded-lg ${(selectedStub === null || selectedStub === void 0 ? void 0 : selectedStub.id) === stub.id
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                        <lucide_react_1.ArrowRight className="w-4 h-4"/>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md dark:bg-green-900/30 dark:text-green-400">
                        Paid
                      </span>
                      <span>Period: {(0, localization_1.formatDate)(stub.payroll.periodStart, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)} - {(0, localization_1.formatDate)(stub.payroll.periodEnd, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}</span>
                    </div>
                  </framer_motion_1.motion.div>))}
              </div>)))}
        </div>
      </div>

      {/* Right Panel: Detail View */}
      <div className="flex-1 h-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative">
        <framer_motion_1.AnimatePresence mode="wait">
          {selectedStub ? (<framer_motion_1.motion.div key={selectedStub.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full flex flex-col">
              {/* Header */}
              <div className="p-8 pb-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"/>
                
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-blue-200 text-sm font-medium mb-1">
                      Payslip for {selectedStub.employee.firstName} {selectedStub.employee.lastName}
                    </p>
                    <h2 className="text-4xl font-bold mb-4">{(0, localization_1.formatCurrency)(selectedStub.netPay, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</h2>
                    <div className="flex gap-4 text-sm text-slate-300">
                      <div className="flex items-center gap-1">
                        <lucide_react_1.Calendar className="w-4 h-4"/>
                        <span>Pay Date: {(0, localization_1.formatDate)(selectedStub.payroll.payDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={handleDownload} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm" title="Download PDF">
                    <lucide_react_1.Download className="w-5 h-5"/>
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
                    <p className="text-xs text-slate-300 mb-1">Gross Pay</p>
                    <p className="text-lg font-semibold">{(0, localization_1.formatCurrency)(selectedStub.grossPay, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
                    <p className="text-xs text-slate-300 mb-1">Taxes</p>
                    <p className="text-lg font-semibold text-red-300">-{(0, localization_1.formatCurrency)(selectedStub.taxes, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
                    <p className="text-xs text-slate-300 mb-1">Deductions</p>
                    <p className="text-lg font-semibold text-orange-300">-{(0, localization_1.formatCurrency)(selectedStub.deductions, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</p>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Earnings Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <lucide_react_1.TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400"/>
                      </div>
                      Earnings
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <span className="text-slate-600 dark:text-slate-300">Regular Pay</span>
                        <span className="font-medium">{(0, localization_1.formatCurrency)(selectedStub.grossPay - (selectedStub.bonus || 0) - (selectedStub.commission || 0), selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</span>
                      </div>
                      {selectedStub.bonus > 0 && (<div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          <span className="text-slate-600 dark:text-slate-300">Bonus</span>
                          <span className="font-medium">{(0, localization_1.formatCurrency)(selectedStub.bonus, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</span>
                        </div>)}
                      {selectedStub.commission > 0 && (<div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          <span className="text-slate-600 dark:text-slate-300">Commission</span>
                          <span className="font-medium">{(0, localization_1.formatCurrency)(selectedStub.commission, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</span>
                        </div>)}
                    </div>
                  </div>

                  {/* Taxes & Deductions Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <lucide_react_1.TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400"/>
                      </div>
                      Taxes & Deductions
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <span className="text-slate-600 dark:text-slate-300">Total Tax</span>
                        <span className="font-medium text-red-600 dark:text-red-400">-{(0, localization_1.formatCurrency)(selectedStub.taxes, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <span className="text-slate-600 dark:text-slate-300">Total Deductions</span>
                        <span className="font-medium text-orange-600 dark:text-orange-400">-{(0, localization_1.formatCurrency)(selectedStub.deductions, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</span>
                      </div>
                    </div>

                    {/* Simple Visualization */}
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                      <h4 className="text-sm font-medium text-slate-500 mb-4">Distribution</h4>
                      <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                        <div style={{ width: `${(selectedStub.netPay / selectedStub.grossPay) * 100}%` }} className="h-full bg-green-500" title="Net Pay"/>
                        <div style={{ width: `${(selectedStub.taxes / selectedStub.grossPay) * 100}%` }} className="h-full bg-red-500" title="Taxes"/>
                        <div style={{ width: `${(selectedStub.deductions / selectedStub.grossPay) * 100}%` }} className="h-full bg-orange-400" title="Deductions"/>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-slate-500 justify-center">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"/> Net Pay
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500"/> Taxes
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-orange-400"/> Deductions
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </framer_motion_1.motion.div>) : (<div className="h-full flex flex-col items-center justify-center text-slate-400">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <lucide_react_1.FileText className="w-10 h-10 opacity-50"/>
              </div>
              <p>Select a payslip to view details</p>
            </div>)}
        </framer_motion_1.AnimatePresence>
      </div>
    </div>);
}
