"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoansPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const framer_motion_1 = require("framer-motion");
const api_1 = __importDefault(require("../../../../lib/api"));
const Modal_1 = require("@/components/Modal");
const ConfirmModal_1 = require("@/components/ConfirmModal");
const lucide_react_1 = require("lucide-react");
const types_1 = require("@unitedlinkgroup/types");
const sonner_1 = require("sonner");
const date_fns_1 = require("date-fns");
const localization_1 = require("../../../../lib/localization");
const business_context_1 = require("../../../../context/business-context");
// --- Components ---
const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }) => (<framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity bg-${color}-500 blur-2xl`}/>
    <div className="flex justify-between items-start relative z-10">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400`}>
        <Icon className="w-6 h-6"/>
      </div>
    </div>
    {trend && (<div className="flex items-center mt-4 text-sm relative z-10">
        <span className={`flex items-center font-medium ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
          {trend === 'up' ? <lucide_react_1.ArrowUpRight className="w-4 h-4 mr-1"/> : <lucide_react_1.ArrowDownRight className="w-4 h-4 mr-1"/>}
          {trendValue}
        </span>
        <span className="text-gray-400 ml-2">vs last month</span>
      </div>)}
  </framer_motion_1.motion.div>);
const LoanTypeSelector = ({ selected, onSelect }) => {
    const types = [
        { id: 'personal', label: 'Personal', icon: lucide_react_1.Wallet },
        { id: 'home', label: 'Home', icon: lucide_react_1.Home },
        { id: 'medical', label: 'Medical', icon: lucide_react_1.HeartPulse },
        { id: 'education', label: 'Education', icon: lucide_react_1.GraduationCap },
        { id: 'travel', label: 'Travel', icon: lucide_react_1.Plane },
    ];
    return (<div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {types.map((type) => (<button key={type.id} type="button" onClick={() => onSelect(type.id)} className={`flex flex-col items-center justify-center p-3 rounded-xl min-w-[80px] transition-all border ${selected === type.id
                ? 'bg-blue-500/20 border-blue-500 text-white'
                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'}`}>
          <type.icon className={`w-6 h-6 mb-2 ${selected === type.id ? 'text-blue-400' : 'text-slate-500'}`}/>
          <span className="text-xs font-medium">{type.label}</span>
        </button>))}
    </div>);
};
const LoanCalculator = ({ onRequest, employees, onClose }) => {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [amount, setAmount] = (0, react_1.useState)(1000);
    const [term, setTerm] = (0, react_1.useState)(12);
    const [reason, setReason] = (0, react_1.useState)('');
    const [loanType, setLoanType] = (0, react_1.useState)('personal');
    const [targetEmployeeId, setTargetEmployeeId] = (0, react_1.useState)('');
    const [requestFor, setRequestFor] = (0, react_1.useState)('myself');
    const [analyzing, setAnalyzing] = (0, react_1.useState)(false);
    const [eligible, setEligible] = (0, react_1.useState)(true);
    // Assuming bi-weekly payments (26 per year)
    const biWeeklyPayment = (amount / (term * 2)).toFixed(2);
    const totalRepayment = amount.toFixed(2);
    // Mock eligibility check
    (0, react_1.useEffect)(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAnalyzing(true);
        const timer = setTimeout(() => {
            setAnalyzing(false);
            setEligible(amount <= 5000); // Mock rule
        }, 600);
        return () => clearTimeout(timer);
    }, [amount, term]);
    const handleSubmit = (e) => {
        e.preventDefault();
        if (employees && !targetEmployeeId) {
            sonner_1.toast.error('Please select an employee');
            return;
        }
        const finalReason = `[${loanType.toUpperCase()}] ${reason}`;
        onRequest(amount, term, finalReason, targetEmployeeId);
    };
    return (<framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden border border-slate-700/50">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-pulse"/>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-pulse delay-1000"/>

      {/* Close Button for Modal Mode */}
      {onClose && (<button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-20">
          <lucide_react_1.X className="w-5 h-5"/>
        </button>)}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              {employees ? 'New Loan Request' : 'Quick Advance'}
            </h2>
            <p className="text-slate-400 text-sm">AI-Powered Eligibility Check</p>
          </div>
          {!onClose && (<div className="p-3 bg-white/5 rounded-full backdrop-blur-md border border-white/10">
              <lucide_react_1.DollarSign className="w-6 h-6 text-blue-400"/>
            </div>)}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Employee Selector (Admin Only) */}
          {employees && (<div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Employee</label>
              <select value={targetEmployeeId} onChange={(e) => setTargetEmployeeId(e.target.value)} className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors text-white" required>
                <option value="">Select Employee...</option>
                {employees.map((emp) => (<option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>))}
              </select>
            </div>)}
          
          {/* Loan Type */}
          <div className="space-y-2 col-span-1 md:col-span-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Purpose</label>
            <LoanTypeSelector selected={loanType} onSelect={setLoanType}/>
          </div>

          {/* Amount Slider */}
          <div className="space-y-3 col-span-1">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-slate-400">Amount Required</span>
              <span className="text-blue-400 text-lg font-bold">{(0, localization_1.formatCurrency)(amount, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</span>
            </div>
            <input type="range" min="100" max="10000" step="100" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{(0, localization_1.formatCurrency)(100, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</span>
              <span>{(0, localization_1.formatCurrency)(10000, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</span>
            </div>
          </div>

          {/* Term Slider */}
          <div className="space-y-3 col-span-1">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-slate-400">Repayment Period</span>
              <span className="text-purple-400 text-lg font-bold">{term} Months</span>
            </div>
            <input type="range" min="1" max="24" step="1" value={term} onChange={(e) => setTerm(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
            <div className="flex justify-between text-xs text-slate-500">
              <span>1 Month</span>
              <span>24 Months</span>
            </div>
          </div>

          {/* Eligibility Indicator */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700 col-span-1">
             {analyzing ? (<div className="flex items-center text-blue-400 text-sm">
                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                 Analyzing eligibility...
               </div>) : (<>
                 {eligible ? (<lucide_react_1.ShieldCheck className="w-5 h-5 text-green-400"/>) : (<lucide_react_1.AlertCircle className="w-5 h-5 text-yellow-400"/>)}
                 <div className="flex-1">
                   <p className={`text-sm font-medium ${eligible ? 'text-green-400' : 'text-yellow-400'}`}>
                     {eligible ? 'Pre-Approved' : 'Review Required'}
                   </p>
                   {!eligible && <p className="text-xs text-slate-500">Amount exceeds instant approval limit</p>}
                 </div>
               </>)}
          </div>

          {/* Summary Box */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 col-span-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400 text-sm">Monthly Deduction</span>
              <span className="text-xl font-bold text-white">{(0, localization_1.formatCurrency)(Number(biWeeklyPayment), selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs">Total Repayment</span>
              <span className="text-slate-300 text-xs">{(0, localization_1.formatCurrency)(Number(totalRepayment), selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</span>
            </div>
          </div>

          {!eligible && (<div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-400/10 p-3 rounded-lg border border-amber-400/20 col-span-1 md:col-span-2">
              <lucide_react_1.AlertCircle className="w-4 h-4 shrink-0"/>
              <span>Amount exceeds likely approval limit. Consider reducing.</span>
            </div>)}

          <button type="submit" disabled={analyzing} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group col-span-1 md:col-span-2">
            {analyzing ? (<>
                <lucide_react_1.Activity className="w-5 h-5 animate-spin"/>
                Analyzing Eligibility...
              </>) : (<>
                Submit Application
                <lucide_react_1.ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
              </>)}
          </button>
            
          <p className="text-xs text-center text-slate-500 mt-4 col-span-1 md:col-span-2">
            By submitting, you agree to the deduction terms. Approval usually takes 24-48 hours.
          </p>
        </form>
      </div>
    </framer_motion_1.motion.div>);
};
const ActiveLoanCard = ({ loan }) => {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    // Router for navigation to scheduling
    const router = (0, navigation_1.useRouter)();
    const progress = ((loan.amount - loan.balance) / loan.amount) * 100;
    return (<framer_motion_1.motion.div layout className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:border-blue-500/30 transition-all duration-300">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center w-fit gap-1 ${loan.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            loan.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${loan.status === 'APPROVED' ? 'bg-green-500' :
            loan.status === 'PENDING' ? 'bg-yellow-500' : 'bg-red-500'}`}/>
              {loan.status}
            </span>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{(0, localization_1.formatCurrency)(loan.amount, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">ID: {loan.id.slice(-8).toUpperCase()}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shadow-inner">
            <lucide_react_1.Wallet className="w-6 h-6 text-blue-500"/>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Repayment Progress</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <framer_motion_1.motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"/>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-600/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Remaining</p>
              <p className="font-bold text-gray-900 dark:text-white">{(0, localization_1.formatCurrency)(loan.balance, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-600/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Per Paycheck</p>
              <p className="font-bold text-gray-900 dark:text-white">{(0, localization_1.formatCurrency)(loan.perPayPeriodDeduction, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-500 dark:text-gray-400">
            <lucide_react_1.Clock className="w-4 h-4 mr-2"/>
            <span>{loan.termMonths}mo Term</span>
          </div>
          <button type="button" onClick={() => router.push(`/dashboard/requests/loans/${loan.id}/schedule`)} className="text-blue-600 hover:text-blue-700 font-medium text-xs uppercase tracking-wide">
            View Schedule
          </button>
        </div>
      </div>
    </framer_motion_1.motion.div>);
};
function LoansPage() {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    // Next.js router for navigation
    const router = (0, navigation_1.useRouter)();
    const [loans, setLoans] = (0, react_1.useState)([]);
    const [employees, setEmployees] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [userRole, setUserRole] = (0, react_1.useState)(null);
    // Modals
    const [confirmModal, setConfirmModal] = (0, react_1.useState)({
        isOpen: false, title: '', message: '', onConfirm: () => { }, isLoading: false
    });
    const [rejectModal, setRejectModal] = (0, react_1.useState)({ isOpen: false, loanId: null, reason: '', isLoading: false });
    const [createModal, setCreateModal] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, []);
    const fetchData = async () => {
        try {
            setLoading(true);
            const profileRes = await api_1.default.get('/auth/profile');
            const role = profileRes.data.role;
            setUserRole(role);
            const endpoint = role === types_1.UserRole.EMPLOYEE ? '/loans/my-loans' : '/loans';
            const res = await api_1.default.get(endpoint);
            setLoans(res.data);
            if (role === types_1.UserRole.BUSINESS_ADMIN || role === types_1.UserRole.SUPER_ADMIN || role === types_1.UserRole.MANAGER) {
                try {
                    const empRes = await api_1.default.get('/employees?status=ACTIVE');
                    setEmployees(empRes.data);
                }
                catch (e) {
                    console.error('Failed to fetch employees', e);
                }
            }
        }
        catch (err) {
            console.error('Failed to fetch data', err);
            sonner_1.toast.error('Failed to load loans');
        }
        finally {
            setLoading(false);
        }
    };
    const handleRequestLoan = async (amount, termMonths, reason, targetEmployeeId) => {
        var _a, _b;
        try {
            await api_1.default.post('/loans', { amount, termMonths, reason, targetEmployeeId });
            sonner_1.toast.success('Loan requested successfully');
            setCreateModal(false);
            fetchData();
        }
        catch (err) {
            sonner_1.toast.error(((_b = (_a = err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to request loan');
        }
    };
    const handleApprove = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Approve Loan Request',
            message: 'Are you sure you want to approve this loan? This will initiate the funds transfer.',
            isLoading: false,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }));
                try {
                    await api_1.default.patch(`/loans/${id}/approve`);
                    sonner_1.toast.success('Loan approved successfully');
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    fetchData();
                }
                catch (err) {
                    sonner_1.toast.error('Failed to approve loan');
                    setConfirmModal(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };
    const handleReject = (id) => {
        setRejectModal({ isOpen: true, loanId: id, reason: '', isLoading: false });
    };
    const submitReject = async (e) => {
        e.preventDefault();
        if (!rejectModal.loanId)
            return;
        setRejectModal(prev => ({ ...prev, isLoading: true }));
        try {
            await api_1.default.patch(`/loans/${rejectModal.loanId}/reject`, { reason: rejectModal.reason });
            sonner_1.toast.success('Loan rejected');
            setRejectModal(prev => ({ ...prev, isOpen: false }));
            fetchData();
        }
        catch (err) {
            sonner_1.toast.error('Failed to reject loan');
            setRejectModal(prev => ({ ...prev, isLoading: false }));
        }
    };
    // Stats Calculation
    const stats = (0, react_1.useMemo)(() => {
        const totalBorrowed = loans.reduce((acc, l) => acc + (l.status === 'APPROVED' ? l.amount : 0), 0);
        const totalBalance = loans.reduce((acc, l) => acc + (l.status === 'APPROVED' ? l.balance : 0), 0);
        const activeCount = loans.filter(l => l.status === 'APPROVED').length;
        return { totalBorrowed, totalBalance, activeCount };
    }, [loans]);
    const isAdmin = userRole === types_1.UserRole.BUSINESS_ADMIN || userRole === types_1.UserRole.SUPER_ADMIN || userRole === types_1.UserRole.MANAGER;
    if (loading) {
        return (<div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>);
    }
    return (<div className="p-8 space-y-8 bg-gray-50/50 dark:bg-slate-900/50 min-h-screen">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            Financial Center
            <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full font-bold uppercase tracking-wide">
              Beta
            </span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your advances and track repayment progress</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Period:</span>
          <span className="px-4 py-2 bg-white dark:bg-slate-800 rounded-full text-sm font-semibold border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-2">
            <lucide_react_1.Calendar className="w-4 h-4 text-blue-500"/>
            {(0, date_fns_1.format)(new Date(), 'MMMM d, yyyy')}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title={isAdmin ? "Total Disbursed" : "Total Borrowed"} value={(0, localization_1.formatCurrency)(stats.totalBorrowed, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)} icon={lucide_react_1.DollarSign} color="blue" trend="up" trendValue="12%"/>
        <StatCard title="Outstanding Balance" value={(0, localization_1.formatCurrency)(stats.totalBalance, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)} icon={lucide_react_1.PieChart} color="purple" trend="down" trendValue="4%"/>
        <StatCard title="Active Loans" value={stats.activeCount} icon={lucide_react_1.Activity} color="green"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Calculator (Employee) or Pending Requests (Admin) */}
        <div className="lg:col-span-1">
          {isAdmin ? (<framer_motion_1.motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center text-gray-900 dark:text-white">
                  <lucide_react_1.Clock className="w-5 h-5 mr-2 text-yellow-500"/>
                  Pending Approvals
                </h2>
                <div className="flex gap-2">
                    <button onClick={() => setCreateModal(true)} className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors" title="New Request">
                        <lucide_react_1.Plus className="w-5 h-5"/>
                    </button>
                    <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-bold px-2 py-1 rounded-full flex items-center">
                    {loans.filter(l => l.status === 'PENDING').length}
                    </span>
                </div>
              </div>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700">
                {loans.filter(l => l.status === 'PENDING').length === 0 ? (<div className="text-center py-12 text-gray-400 bg-gray-50 dark:bg-slate-700/20 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                    <lucide_react_1.Check className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                    <p>No pending requests</p>
                    <p className="text-xs mt-1 opacity-60">All caught up!</p>
                  </div>) : (loans.filter(l => l.status === 'PENDING').map(loan => {
                var _a, _b;
                return (<framer_motion_1.motion.div key={loan.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-50 dark:bg-slate-700/30 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/50 hover:border-blue-200 dark:hover:border-blue-500/30 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{(_a = loan.employee) === null || _a === void 0 ? void 0 : _a.firstName} {(_b = loan.employee) === null || _b === void 0 ? void 0 : _b.lastName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                            <lucide_react_1.Calendar className="w-3 h-3 mr-1"/>
                            {(0, date_fns_1.format)(new Date(loan.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold border border-gray-100 dark:border-slate-600 shadow-sm">
                          {(0, localization_1.formatCurrency)(loan.amount, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                        </span>
                      </div>
                      
                      {loan.reason && (<div className="bg-white dark:bg-slate-800 p-3 rounded-xl text-sm text-gray-600 dark:text-gray-300 mb-3 border border-gray-100 dark:border-slate-700/50">
                           <span className="font-semibold text-xs text-gray-400 uppercase tracking-wider block mb-1">Request Details</span>
                           {loan.reason}
                        </div>)}
                      
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => handleApprove(loan.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-green-200 dark:shadow-none">
                          Approve
                        </button>
                        <button onClick={() => handleReject(loan.id)} className="flex-1 bg-white border border-red-200 text-red-700 hover:bg-red-50 dark:bg-red-900/10 dark:border-red-900/30 dark:hover:bg-red-900/20 dark:text-red-400 py-2 rounded-xl text-sm font-medium transition-colors">
                          Reject
                        </button>
                      </div>
                    </framer_motion_1.motion.div>);
            }))}
              </div>
            </framer_motion_1.motion.div>) : (<LoanCalculator onRequest={handleRequestLoan}/>)}
        </div>

        {/* Right Column: Active Loans & History */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Loans Section */}
          <section>
            <div className="flex justify-between items-end mb-4">
               <h2 className="text-xl font-bold text-gray-900 dark:text-white">Active Loans</h2>
               {loans.filter(l => l.status === 'APPROVED').length > 0 && (<span className="text-sm text-gray-500 dark:text-gray-400">
                   Next deduction: <span className="font-medium text-gray-900 dark:text-white">{(0, date_fns_1.format)((0, date_fns_1.addWeeks)(new Date(), 2), 'MMM d')}</span>
                 </span>)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loans.filter(l => l.status === 'APPROVED').length > 0 ? (loans.filter(l => l.status === 'APPROVED').map(loan => (<ActiveLoanCard key={loan.id} loan={loan}/>))) : (<div className="col-span-full bg-white dark:bg-slate-800 rounded-3xl p-10 text-center border border-dashed border-gray-300 dark:border-slate-700">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <lucide_react_1.Wallet className="w-8 h-8 text-gray-300 dark:text-slate-500"/>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Active Loans</h3>
                  <p className="text-gray-500 dark:text-gray-400">You don&apos;t have any active loans at the moment.</p>
                </div>)}
            </div>
          </section>

          {/* History Section (Table) */}
          <section className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Request History</h2>
              <button type="button" onClick={() => router.push('/dashboard/requests/loans/report')} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center hover:underline">
                View Full Report <lucide_react_1.ChevronRight className="w-4 h-4 ml-1"/>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700/30">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {loans.map((loan) => (<tr key={loan.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {(0, date_fns_1.format)(new Date(loan.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mr-3 text-blue-600 dark:text-blue-400">
                            <lucide_react_1.Wallet className="w-4 h-4"/>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Cash Advance</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{loan.termMonths} Months Term</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                        {(0, localization_1.formatCurrency)(loan.amount, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${loan.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                loan.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {(0, localization_1.formatCurrency)(loan.balance, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                      </td>
                    </tr>))}
                  {loans.length === 0 && (<tr>
                       <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                         No history available
                       </td>
                     </tr>)}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal_1.ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} isLoading={confirmModal.isLoading}/>

      {/* Rejection Modal */}
      <Modal_1.Modal isOpen={rejectModal.isOpen} onClose={() => setRejectModal(prev => ({ ...prev, isOpen: false }))} title="Reject Loan Request">
        <form onSubmit={submitReject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Rejection</label>
            <textarea required value={rejectModal.reason} onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))} className="w-full rounded-xl border-gray-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]" placeholder="Please provide a reason..."/>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setRejectModal(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600">
              Cancel
            </button>
            <button type="submit" disabled={rejectModal.isLoading} className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
              {rejectModal.isLoading ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal_1.Modal>

      {/* Create Request Modal (Admin) */}
      <Modal_1.Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="" maxWidth="max-w-3xl" variant="clean" className="!bg-transparent !shadow-none !border-0">
          <div className="mt-2">
            <LoanCalculator onRequest={handleRequestLoan} employees={employees} onClose={() => setCreateModal(false)}/>
          </div>
      </Modal_1.Modal>
    </div>);
}
