"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardPage;
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const api_1 = __importDefault(require("../../lib/api"));
const business_context_1 = require("../../context/business-context");
const ExpiringQualificationsModal_1 = require("../../components/ExpiringQualificationsModal");
const DashboardHeader_1 = require("../../components/dashboard/DashboardHeader");
const StatsCards_1 = require("../../components/dashboard/StatsCards");
const NewsFeed_1 = require("../../components/dashboard/NewsFeed");
const SidebarWidgets_1 = require("../../components/dashboard/SidebarWidgets");
const DashboardAlerts_1 = require("../../components/dashboard/DashboardAlerts");
const localization_1 = require("../../lib/localization");
const Modal_1 = require("../../components/Modal");
const types_1 = require("@unitedlinkgroup/types");
const recharts_1 = require("recharts");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
function DashboardPage() {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [profile, setProfile] = (0, react_1.useState)(null);
    const [stats, setStats] = (0, react_1.useState)(null);
    const [expiringSites, setExpiringSites] = (0, react_1.useState)([]);
    const [expiringQualifications, setExpiringQualifications] = (0, react_1.useState)([]);
    const [dismissedAlerts, setDismissedAlerts] = (0, react_1.useState)([]);
    const [showExpiringQualBanner, setShowExpiringQualBanner] = (0, react_1.useState)(true);
    const [isExpiringQualModalOpen, setIsExpiringQualModalOpen] = (0, react_1.useState)(false);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [currentDate, setCurrentDate] = (0, react_1.useState)(new Date());
    const [employeeDash, setEmployeeDash] = (0, react_1.useState)(null);
    const [employeeDashLoading, setEmployeeDashLoading] = (0, react_1.useState)(false);
    const [clocking, setClocking] = (0, react_1.useState)(false);
    const [superDash, setSuperDash] = (0, react_1.useState)(null);
    const [superDashLoading, setSuperDashLoading] = (0, react_1.useState)(false);
    const [superDays, setSuperDays] = (0, react_1.useState)(30);
    const [businessOverview, setBusinessOverview] = (0, react_1.useState)(null);
    const [businessOverviewLoading, setBusinessOverviewLoading] = (0, react_1.useState)(false);
    const [chatThreads, setChatThreads] = (0, react_1.useState)([]);
    const [chatThreadsLoading, setChatThreadsLoading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const fetchProfile = async () => {
            try {
                const profileRes = await api_1.default.get('/auth/profile');
                setProfile(profileRes.data);
                setCurrentDate(new Date());
            }
            catch (err) {
                console.error(err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);
    (0, react_1.useEffect)(() => {
        const role = (profile === null || profile === void 0 ? void 0 : profile.role) || null;
        if (!role)
            return;
        if (role === types_1.UserRole.EMPLOYEE)
            return;
        if (role === types_1.UserRole.SUPER_ADMIN && !(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id))
            return;
        let cancelled = false;
        const loadBusinessDashboard = async () => {
            try {
                const [statsRes, locationsRes, qualRes] = await Promise.all([
                    api_1.default.get('/reports/dashboard-stats').catch(() => ({ data: null })),
                    api_1.default.get('/locations').catch(() => ({ data: [] })),
                    api_1.default.get('/employees/qualifications/expiring').catch(() => ({ data: [] })),
                ]);
                if (cancelled)
                    return;
                if (statsRes.data)
                    setStats(statsRes.data);
                if (qualRes.data)
                    setExpiringQualifications(qualRes.data);
                if (locationsRes.data) {
                    const now = new Date();
                    const expiring = locationsRes.data
                        .filter((loc) => {
                        if (!loc.endDate)
                            return false;
                        const end = new Date(loc.endDate);
                        const diffTime = end.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays <= 30 && diffDays >= -30;
                    })
                        .map((loc) => {
                        const end = new Date(loc.endDate);
                        const diffTime = end.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return { ...loc, daysRemaining: diffDays };
                    });
                    setExpiringSites(expiring);
                }
            }
            catch (err) {
                console.error(err);
            }
        };
        loadBusinessDashboard();
        return () => {
            cancelled = true;
        };
    }, [profile === null || profile === void 0 ? void 0 : profile.role, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id]);
    (0, react_1.useEffect)(() => {
        const role = (profile === null || profile === void 0 ? void 0 : profile.role) || null;
        if (role !== types_1.UserRole.EMPLOYEE)
            return;
        let cancelled = false;
        const load = async () => {
            try {
                setEmployeeDashLoading(true);
                const res = await api_1.default.get('/reports/employee-dashboard', { params: { days: 30 } });
                if (cancelled)
                    return;
                setEmployeeDash(res.data || null);
            }
            catch {
                if (cancelled)
                    return;
                setEmployeeDash(null);
            }
            finally {
                if (!cancelled)
                    setEmployeeDashLoading(false);
            }
        };
        load();
        const id = window.setInterval(load, 60000);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, [profile === null || profile === void 0 ? void 0 : profile.role]);
    (0, react_1.useEffect)(() => {
        const role = (profile === null || profile === void 0 ? void 0 : profile.role) || null;
        if (!role)
            return;
        if (role === types_1.UserRole.EMPLOYEE)
            return;
        if (!(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id))
            return;
        let cancelled = false;
        const load = async () => {
            try {
                setBusinessOverviewLoading(true);
                setChatThreadsLoading(true);
                const [overviewRes, threadsRes] = await Promise.all([
                    api_1.default.get('/reports/business-overview', { params: { days: 30 } }),
                    api_1.default.get('/chats/threads'),
                ]);
                if (cancelled)
                    return;
                setBusinessOverview(overviewRes.data || null);
                setChatThreads((threadsRes.data || []).slice(0, 8));
            }
            catch {
                if (cancelled)
                    return;
                setBusinessOverview(null);
                setChatThreads([]);
            }
            finally {
                if (!cancelled) {
                    setBusinessOverviewLoading(false);
                    setChatThreadsLoading(false);
                }
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [profile === null || profile === void 0 ? void 0 : profile.role, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id]);
    (0, react_1.useEffect)(() => {
        const role = (profile === null || profile === void 0 ? void 0 : profile.role) || null;
        if (role !== types_1.UserRole.SUPER_ADMIN)
            return;
        if (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id)
            return;
        let cancelled = false;
        const load = async () => {
            try {
                setSuperDashLoading(true);
                const res = await api_1.default.get('/reports/superadmin-dashboard', { params: { days: superDays } });
                if (cancelled)
                    return;
                setSuperDash(res.data || null);
            }
            catch (e) {
                if (cancelled)
                    return;
                setSuperDash(null);
            }
            finally {
                if (!cancelled)
                    setSuperDashLoading(false);
            }
        };
        load();
        const id = window.setInterval(load, 90000);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, [profile === null || profile === void 0 ? void 0 : profile.role, superDays, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id]);
    if (loading) {
        return (<div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>);
    }
    const formattedDate = (0, localization_1.formatDateLong)(currentDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country);
    const hasModule = (module) => {
        if (!(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.modules))
            return false;
        return selectedBusiness.modules.split(',').includes(module);
    };
    if ((profile === null || profile === void 0 ? void 0 : profile.role) === types_1.UserRole.EMPLOYEE) {
        return (<EmployeeDashboard loading={employeeDashLoading} data={employeeDash} onRefresh={async () => {
                try {
                    setEmployeeDashLoading(true);
                    const res = await api_1.default.get('/reports/employee-dashboard', { params: { days: 30 } });
                    setEmployeeDash(res.data || null);
                }
                finally {
                    setEmployeeDashLoading(false);
                }
            }} onClockIn={async () => {
                var _a, _b, _c, _d, _e;
                if (!((_a = employeeDash === null || employeeDash === void 0 ? void 0 : employeeDash.schedule) === null || _a === void 0 ? void 0 : _a.canClockIn))
                    return;
                if (clocking)
                    return;
                try {
                    setClocking(true);
                    const locId = ((_c = (_b = employeeDash === null || employeeDash === void 0 ? void 0 : employeeDash.schedule) === null || _b === void 0 ? void 0 : _b.currentShift) === null || _c === void 0 ? void 0 : _c.locationId) || null;
                    await api_1.default.post('/time-tracking/clock-in', { locationId: locId || undefined });
                    const res = await api_1.default.get('/reports/employee-dashboard', { params: { days: 30 } });
                    setEmployeeDash(res.data || null);
                    sonner_1.toast.success('Clocked in');
                }
                catch (e) {
                    sonner_1.toast.error(((_e = (_d = e === null || e === void 0 ? void 0 : e.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) || 'Failed to clock in');
                }
                finally {
                    setClocking(false);
                }
            }} onClockOut={async () => {
                var _a, _b, _c;
                if (!((_a = employeeDash === null || employeeDash === void 0 ? void 0 : employeeDash.timeTracking) === null || _a === void 0 ? void 0 : _a.activeTimesheet))
                    return;
                if (clocking)
                    return;
                try {
                    setClocking(true);
                    await api_1.default.post('/time-tracking/clock-out', {});
                    const res = await api_1.default.get('/reports/employee-dashboard', { params: { days: 30 } });
                    setEmployeeDash(res.data || null);
                    sonner_1.toast.success('Clocked out');
                }
                catch (e) {
                    sonner_1.toast.error(((_c = (_b = e === null || e === void 0 ? void 0 : e.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || 'Failed to clock out');
                }
                finally {
                    setClocking(false);
                }
            }}/>);
    }
    if ((profile === null || profile === void 0 ? void 0 : profile.role) === types_1.UserRole.SUPER_ADMIN) {
        if (!(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id)) {
            return (<SuperAdminDashboard loading={superDashLoading} data={superDash} days={superDays} setDays={setSuperDays} onRefresh={async () => {
                    try {
                        setSuperDashLoading(true);
                        const res = await api_1.default.get('/reports/superadmin-dashboard', { params: { days: superDays } });
                        setSuperDash(res.data || null);
                    }
                    finally {
                        setSuperDashLoading(false);
                    }
                }}/>);
        }
    }
    if ((selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id) && (profile === null || profile === void 0 ? void 0 : profile.role) !== types_1.UserRole.EMPLOYEE) {
        return (<BusinessContextDashboard profile={profile} stats={stats} businessOverview={businessOverview} businessOverviewLoading={businessOverviewLoading} chatThreads={chatThreads} chatThreadsLoading={chatThreadsLoading}/>);
    }
    return (<div className="space-y-8 max-w-[1600px] mx-auto">
      {(profile === null || profile === void 0 ? void 0 : profile.role) === types_1.UserRole.SUPER_ADMIN && (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id) && (<SuperAdminBusinessContextBar businessName={selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.name}/>)}
      <DashboardHeader_1.DashboardHeader profile={profile} formattedDate={formattedDate} hasModule={hasModule} businessName={selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.name}/>

      <DashboardAlerts_1.DashboardAlerts expiringQualifications={expiringQualifications} expiringSites={expiringSites} showExpiringQualBanner={showExpiringQualBanner} setShowExpiringQualBanner={setShowExpiringQualBanner} setIsExpiringQualModalOpen={setIsExpiringQualModalOpen} dismissedAlerts={dismissedAlerts} setDismissedAlerts={setDismissedAlerts} profile={profile}/>

      <StatsCards_1.StatsCards stats={stats} hasModule={hasModule} userProfile={profile} country={selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country}/>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <NewsFeed_1.NewsFeed userProfile={profile}/>
          
          {/* We can add the charts component here later if needed,
            or integrate existing charts into a new component */}
        </div>

        {/* Right Sidebar */}
        <SidebarWidgets_1.SidebarWidgets expiringQualifications={expiringQualifications} stats={stats} hasModule={hasModule}/>
      </div>

      <ExpiringQualificationsModal_1.ExpiringQualificationsModal isOpen={isExpiringQualModalOpen} onClose={() => setIsExpiringQualModalOpen(false)} qualifications={expiringQualifications}/>
    </div>);
}
function BusinessContextDashboard({ profile, stats, businessOverview, businessOverviewLoading, chatThreads, chatThreadsLoading, }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const country = selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country;
    const currencyCode = (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode) || 'USD';
    const hasModule = (0, react_1.useMemo)(() => {
        const set = new Set(((selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.modules) || '').split(',').map((x) => x.trim()).filter(Boolean));
        return (moduleId) => set.has(moduleId);
    }, [selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.modules]);
    const money = (value) => {
        const v = typeof value === 'number' && Number.isFinite(value) ? value : 0;
        try {
            return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }).format(v);
        }
        catch {
            return `${v.toFixed(2)} ${currencyCode}`;
        }
    };
    const cashflowWeekly = (0, react_1.useMemo)(() => {
        var _a;
        return (((_a = businessOverview === null || businessOverview === void 0 ? void 0 : businessOverview.charts) === null || _a === void 0 ? void 0 : _a.cashflowWeekly) || []).slice(-12).map((x) => ({ ...x, label: x.week.slice(5) }));
    }, [(_a = businessOverview === null || businessOverview === void 0 ? void 0 : businessOverview.charts) === null || _a === void 0 ? void 0 : _a.cashflowWeekly]);
    const invoicesByStatus = (0, react_1.useMemo)(() => {
        var _a;
        const src = ((_a = businessOverview === null || businessOverview === void 0 ? void 0 : businessOverview.charts) === null || _a === void 0 ? void 0 : _a.invoicesByStatus) || [];
        const colors = {
            PAID: '#22c55e',
            SENT: '#6366f1',
            OVERDUE: '#ef4444',
            DRAFT: '#94a3b8',
            VOID: '#64748b',
        };
        return src.slice(0, 6).map((x) => ({ ...x, color: colors[x.status] || '#8b5cf6' }));
    }, [(_b = businessOverview === null || businessOverview === void 0 ? void 0 : businessOverview.charts) === null || _b === void 0 ? void 0 : _b.invoicesByStatus]);
    return (<div className="space-y-8 max-w-[1600px] mx-auto">
      {(profile === null || profile === void 0 ? void 0 : profile.role) === types_1.UserRole.SUPER_ADMIN && <SuperAdminBusinessContextBar businessName={selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.name}/>}
      <DashboardHeader_1.DashboardHeader profile={profile} formattedDate={(0, localization_1.formatDateLong)(new Date(), country)} hasModule={hasModule} businessName={selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.name}/>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active employees</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{(_c = stats === null || stats === void 0 ? void 0 : stats.activeEmployees) !== null && _c !== void 0 ? _c : 0}</div>
                <lucide_react_1.Users className="w-5 h-5 text-slate-400"/>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">On shift now: {(_d = stats === null || stats === void 0 ? void 0 : stats.onShiftNow) !== null && _d !== void 0 ? _d : 0}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Scheduled today</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{(_e = stats === null || stats === void 0 ? void 0 : stats.scheduledToday) !== null && _e !== void 0 ? _e : 0}</div>
                <lucide_react_1.Calendar className="w-5 h-5 text-slate-400"/>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pending requests: {(_f = stats === null || stats === void 0 ? void 0 : stats.pendingRequests) !== null && _f !== void 0 ? _f : 0}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Outstanding invoices</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{money((_g = businessOverview === null || businessOverview === void 0 ? void 0 : businessOverview.kpis) === null || _g === void 0 ? void 0 : _g.outstandingTotal)}</div>
                <lucide_react_1.FileText className="w-5 h-5 text-slate-400"/>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Overdue: {money((_h = businessOverview === null || businessOverview === void 0 ? void 0 : businessOverview.kpis) === null || _h === void 0 ? void 0 : _h.overdueTotal)}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">30-day finance</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{money((_j = businessOverview === null || businessOverview === void 0 ? void 0 : businessOverview.kpis) === null || _j === void 0 ? void 0 : _j.revenueLastTotal)}</div>
                <lucide_react_1.DollarSign className="w-5 h-5 text-slate-400"/>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Expenses: {money((_k = businessOverview === null || businessOverview === void 0 ? void 0 : businessOverview.kpis) === null || _k === void 0 ? void 0 : _k.expensesLastTotal)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">Cashflow</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Invoices vs expenses (weekly)</div>
                </div>
                <div className="flex items-center gap-2">
                  <link_1.default href="/dashboard/finance/invoices" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                    Invoices
                  </link_1.default>
                  <link_1.default href="/dashboard/finance/payments" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                    Payments
                  </link_1.default>
                </div>
              </div>
              <div className="mt-4 h-72">
                {businessOverviewLoading ? (<div className="h-full w-full rounded-xl bg-slate-100 dark:bg-slate-900/40 animate-pulse"/>) : (<recharts_1.ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                    <recharts_1.BarChart data={cashflowWeekly}>
                      <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)"/>
                      <recharts_1.XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="rgba(100,116,139,0.6)"/>
                      <recharts_1.YAxis tick={{ fontSize: 12 }} stroke="rgba(100,116,139,0.6)"/>
                      <recharts_1.Tooltip />
                      <recharts_1.Legend />
                      <recharts_1.Bar dataKey="invoicesTotal" name="Invoices" fill="#6366f1" radius={[10, 10, 0, 0]}/>
                      <recharts_1.Bar dataKey="paymentsTotal" name="Expenses" fill="#f59e0b" radius={[10, 10, 0, 0]}/>
                    </recharts_1.BarChart>
                  </recharts_1.ResponsiveContainer>)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">Invoice mix</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">By status</div>
                </div>
              </div>
              <div className="mt-4 h-72">
                {businessOverviewLoading ? (<div className="h-full w-full rounded-xl bg-slate-100 dark:bg-slate-900/40 animate-pulse"/>) : (<recharts_1.ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                    <recharts_1.PieChart>
                      <recharts_1.Pie data={invoicesByStatus} dataKey="total" nameKey="status" innerRadius={54} outerRadius={84} paddingAngle={2}>
                        {invoicesByStatus.map((x) => (<recharts_1.Cell key={x.status} fill={x.color}/>))}
                      </recharts_1.Pie>
                      <recharts_1.Tooltip />
                      <recharts_1.Legend />
                    </recharts_1.PieChart>
                  </recharts_1.ResponsiveContainer>)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
              <div className="p-5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">Recent invoices</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Latest billing activity</div>
                </div>
                <link_1.default href="/dashboard/finance/invoices" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2">
                  View all <lucide_react_1.ArrowRight className="w-4 h-4"/>
                </link_1.default>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold">Invoice</th>
                      <th className="text-left px-5 py-3 font-semibold">Client</th>
                      <th className="text-right px-5 py-3 font-semibold">Total</th>
                      <th className="text-right px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {(((_l = businessOverview === null || businessOverview === void 0 ? void 0 : businessOverview.recent) === null || _l === void 0 ? void 0 : _l.invoices) || []).slice(0, 6).map((inv) => {
            var _a;
            return (<tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{inv.invoiceNumber}</td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{((_a = inv.client) === null || _a === void 0 ? void 0 : _a.name) || '—'}</td>
                        <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{money(inv.total)}</td>
                        <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-300">{inv.status}</td>
                      </tr>);
        })}
                    {!businessOverviewLoading && (((_m = businessOverview === null || businessOverview === void 0 ? void 0 : businessOverview.recent) === null || _m === void 0 ? void 0 : _m.invoices) || []).length === 0 ? (<tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                          No invoices yet.
                        </td>
                      </tr>) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
              <div className="p-5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">Recent expenses</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Latest payments recorded</div>
                </div>
                <link_1.default href="/dashboard/finance/payments" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2">
                  View all <lucide_react_1.ArrowRight className="w-4 h-4"/>
                </link_1.default>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold">Payee</th>
                      <th className="text-left px-5 py-3 font-semibold">Type</th>
                      <th className="text-right px-5 py-3 font-semibold">Amount</th>
                      <th className="text-right px-5 py-3 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {(((_o = businessOverview === null || businessOverview === void 0 ? void 0 : businessOverview.recent) === null || _o === void 0 ? void 0 : _o.payments) || []).slice(0, 6).map((p) => (<tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{p.payeeName || p.reference || '—'}</td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{p.type}</td>
                        <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{money(p.amount)}</td>
                        <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400">{new Date(p.date).toLocaleDateString()}</td>
                      </tr>))}
                    {!businessOverviewLoading && (((_p = businessOverview === null || businessOverview === void 0 ? void 0 : businessOverview.recent) === null || _p === void 0 ? void 0 : _p.payments) || []).length === 0 ? (<tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                          No payments yet.
                        </td>
                      </tr>) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">Chats</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Recent conversations</div>
              </div>
              <link_1.default href="/dashboard/communications/chats" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2">
                Open <lucide_react_1.ArrowRight className="w-4 h-4"/>
              </link_1.default>
            </div>
            <div className="mt-4 space-y-2">
              {chatThreadsLoading ? (<div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-900/40 animate-pulse"/>) : chatThreads.length === 0 ? (<div className="py-8 text-sm text-slate-500 dark:text-slate-400">No chat threads.</div>) : (chatThreads.slice(0, 6).map((t) => {
            var _a;
            return (<link_1.default key={t.id} href={`/dashboard/communications/chats?threadId=${encodeURIComponent(t.id)}`} className="block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-2">
                          <lucide_react_1.MessageSquare className="w-4 h-4 text-slate-400"/>
                          {t.displayTitle || 'Chat'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {((_a = t.lastMessage) === null || _a === void 0 ? void 0 : _a.text) ? `${t.lastMessage.senderName}: ${t.lastMessage.text}` : 'No messages yet'}
                        </div>
                      </div>
                      {t.unreadCount > 0 ? (<div className="text-xs font-bold bg-indigo-600 text-white rounded-full px-2 py-1 whitespace-nowrap">
                          {t.unreadCount}
                        </div>) : (<div className="text-xs text-slate-400 whitespace-nowrap">{new Date(t.updatedAt).toLocaleDateString()}</div>)}
                    </div>
                  </link_1.default>);
        }))}
            </div>
          </div>
        </div>
      </div>
    </div>);
}
function SuperAdminDashboard({ loading, data, days, setDays, onRefresh, }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    const router = (0, navigation_1.useRouter)();
    const { setSelectedBusiness } = (0, business_context_1.useBusiness)();
    const chartsReady = (0, react_1.useSyncExternalStore)(() => () => { }, () => true, () => false);
    const [selectedBusinessId, setSelectedBusinessId] = (0, react_1.useState)(null);
    const [businessesModalOpen, setBusinessesModalOpen] = (0, react_1.useState)(false);
    const [businessSearch, setBusinessSearch] = (0, react_1.useState)('');
    const [manageSearch, setManageSearch] = (0, react_1.useState)('');
    const [managedBusinesses, setManagedBusinesses] = (0, react_1.useState)([]);
    const [managedBusinessesLoading, setManagedBusinessesLoading] = (0, react_1.useState)(false);
    const [businessActionModal, setBusinessActionModal] = (0, react_1.useState)({ isOpen: false, kind: 'deactivate', business: null, confirmText: '', saving: false });
    const totals = data === null || data === void 0 ? void 0 : data.totals;
    const growth = (0, react_1.useMemo)(() => { var _a; return (((_a = data === null || data === void 0 ? void 0 : data.charts) === null || _a === void 0 ? void 0 : _a.growth) || []).slice(-Math.min(days, 90)).map((d) => ({ ...d, date: d.date.slice(5) })); }, [(_a = data === null || data === void 0 ? void 0 : data.charts) === null || _a === void 0 ? void 0 : _a.growth, days]);
    const modulePie = (0, react_1.useMemo)(() => {
        var _a;
        const arr = ((_a = data === null || data === void 0 ? void 0 : data.charts) === null || _a === void 0 ? void 0 : _a.modulesTop) || [];
        const colors = ['#6366f1', '#8b5cf6', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6', '#a855f7', '#64748b'];
        return arr.map((m, i) => ({ ...m, color: colors[i % colors.length] }));
    }, [(_b = data === null || data === void 0 ? void 0 : data.charts) === null || _b === void 0 ? void 0 : _b.modulesTop]);
    const recent = (data === null || data === void 0 ? void 0 : data.recentBusinesses) || [];
    const filteredBusinesses = (0, react_1.useMemo)(() => {
        const q = businessSearch.trim().toLowerCase();
        if (!q)
            return recent;
        return recent.filter((b) => {
            var _a;
            const hay = `${b.name || ''} ${((_a = b.owner) === null || _a === void 0 ? void 0 : _a.email) || ''} ${b.country || ''} ${b.industry || ''} ${b.businessType || ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [recent, businessSearch]);
    const selectedBusinessObj = (0, react_1.useMemo)(() => {
        if (!selectedBusinessId)
            return null;
        return recent.find((b) => b.id === selectedBusinessId) || null;
    }, [recent, selectedBusinessId]);
    const loadManagedBusinesses = (0, react_1.useCallback)(async () => {
        var _a, _b;
        try {
            setManagedBusinessesLoading(true);
            const res = await api_1.default.get('/businesses');
            setManagedBusinesses(Array.isArray(res.data) ? res.data : []);
        }
        catch (e) {
            setManagedBusinesses([]);
            sonner_1.toast.error(((_b = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to load businesses');
        }
        finally {
            setManagedBusinessesLoading(false);
        }
    }, []);
    (0, react_1.useEffect)(() => {
        loadManagedBusinesses();
    }, [loadManagedBusinesses]);
    const filteredManagedBusinesses = (0, react_1.useMemo)(() => {
        const q = manageSearch.trim().toLowerCase();
        const list = (managedBusinesses || []).filter((b) => (b === null || b === void 0 ? void 0 : b.status) !== 'DELETED');
        if (!q)
            return list;
        return list.filter((b) => {
            var _a;
            const hay = `${b.name || ''} ${((_a = b.owner) === null || _a === void 0 ? void 0 : _a.email) || ''} ${b.country || ''} ${b.industry || ''} ${b.businessType || ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [manageSearch, managedBusinesses]);
    const statusPill = (status) => {
        const s = (status || 'ACTIVE').toUpperCase();
        if (s === 'INACTIVE') {
            return (<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <lucide_react_1.Ban className="w-3.5 h-3.5"/>
          Inactive
        </span>);
        }
        return (<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        <lucide_react_1.CheckCircle2 className="w-3.5 h-3.5"/>
        Active
      </span>);
    };
    const openBusinessAction = (business, kind) => {
        setBusinessActionModal({
            isOpen: true,
            kind,
            business,
            confirmText: '',
            saving: false,
        });
    };
    const runBusinessAction = async () => {
        var _a, _b;
        const business = businessActionModal.business;
        if (!(business === null || business === void 0 ? void 0 : business.id))
            return;
        if (businessActionModal.kind === 'delete') {
            const expected = (business.name || '').trim().toLowerCase();
            if (!expected || businessActionModal.confirmText.trim().toLowerCase() !== expected) {
                sonner_1.toast.error('Type the business name to confirm deletion');
                return;
            }
        }
        try {
            setBusinessActionModal((prev) => ({ ...prev, saving: true }));
            if (businessActionModal.kind === 'deactivate') {
                await api_1.default.patch(`/businesses/${business.id}/deactivate`);
                sonner_1.toast.success('Business deactivated');
            }
            else if (businessActionModal.kind === 'activate') {
                await api_1.default.patch(`/businesses/${business.id}/activate`);
                sonner_1.toast.success('Business activated');
            }
            else {
                await api_1.default.delete(`/businesses/${business.id}`);
                sonner_1.toast.success('Business deleted');
            }
            setBusinessActionModal({ isOpen: false, kind: 'deactivate', business: null, confirmText: '', saving: false });
            if (selectedBusinessId === business.id)
                setSelectedBusinessId(null);
            await Promise.all([onRefresh(), loadManagedBusinesses()]);
        }
        catch (e) {
            sonner_1.toast.error(((_b = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to update business');
            setBusinessActionModal((prev) => ({ ...prev, saving: false }));
        }
    };
    const setContextAndGo = (business, href) => {
        try {
            localStorage.setItem('superadminBusinessContext', '1');
        }
        catch { }
        setSelectedBusiness(business);
        router.push(href);
    };
    return (<div className="max-w-[1600px] mx-auto space-y-6">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase flex items-center gap-2">
              <lucide_react_1.Globe className="w-4 h-4"/>
              Super Admin Overview
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Platform Dashboard</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Global KPIs, growth, and operational signals</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 180 days</option>
            </select>
            <button type="button" onClick={onRefresh} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
              <lucide_react_1.RefreshCw className="w-4 h-4"/>
              Refresh
            </button>
            <button type="button" onClick={() => setBusinessesModalOpen(true)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
              <lucide_react_1.Building2 className="w-4 h-4"/>
              Businesses
            </button>
            <link_1.default href="/dashboard/settings/preferences" className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
              <lucide_react_1.Settings className="w-4 h-4"/>
              System preferences
            </link_1.default>
            <link_1.default href="/dashboard/add-business" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-2">
              <lucide_react_1.Building2 className="w-4 h-4"/>
              Add business
            </link_1.default>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Businesses</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{(_c = totals === null || totals === void 0 ? void 0 : totals.businessTotal) !== null && _c !== void 0 ? _c : 0}</div>
            <lucide_react_1.Building2 className="w-5 h-5 text-slate-400"/>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">New: {(_d = totals === null || totals === void 0 ? void 0 : totals.businessNew) !== null && _d !== void 0 ? _d : 0} ({days}d)</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Employees</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{(_e = totals === null || totals === void 0 ? void 0 : totals.employeeTotal) !== null && _e !== void 0 ? _e : 0}</div>
            <lucide_react_1.Users className="w-5 h-5 text-slate-400"/>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Active: {(_f = totals === null || totals === void 0 ? void 0 : totals.activeEmployeeTotal) !== null && _f !== void 0 ? _f : 0}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active shifts</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{(_g = totals === null || totals === void 0 ? void 0 : totals.activeTimesheets) !== null && _g !== void 0 ? _g : 0}</div>
            <lucide_react_1.Activity className="w-5 h-5 text-slate-400"/>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Clocked in now</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Open incidents</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{(_h = totals === null || totals === void 0 ? void 0 : totals.openIncidents) !== null && _h !== void 0 ? _h : 0}</div>
            <lucide_react_1.AlertTriangle className="w-5 h-5 text-amber-500"/>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Not closed</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending approvals</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{((_j = totals === null || totals === void 0 ? void 0 : totals.pendingLoans) !== null && _j !== void 0 ? _j : 0) + ((_k = totals === null || totals === void 0 ? void 0 : totals.pendingLeaves) !== null && _k !== void 0 ? _k : 0)}</div>
            <lucide_react_1.ClipboardCheck className="w-5 h-5 text-slate-400"/>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Loans: {(_l = totals === null || totals === void 0 ? void 0 : totals.pendingLoans) !== null && _l !== void 0 ? _l : 0} • Leave: {(_m = totals === null || totals === void 0 ? void 0 : totals.pendingLeaves) !== null && _m !== void 0 ? _m : 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">Growth</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Businesses and employees over time</div>
            </div>
          </div>
          <div className="mt-4 h-72">
            {chartsReady ? (<recharts_1.ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                <recharts_1.LineChart data={growth}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)"/>
                  <recharts_1.XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="rgba(100,116,139,0.6)"/>
                  <recharts_1.YAxis tick={{ fontSize: 12 }} stroke="rgba(100,116,139,0.6)" allowDecimals={false}/>
                  <recharts_1.Tooltip />
                  <recharts_1.Legend />
                  <recharts_1.Line type="monotone" dataKey="newBusinesses" name="New businesses" stroke="#6366f1" strokeWidth={2} dot={false}/>
                  <recharts_1.Line type="monotone" dataKey="newEmployees" name="New employees" stroke="#8b5cf6" strokeWidth={2} dot={false}/>
                </recharts_1.LineChart>
              </recharts_1.ResponsiveContainer>) : (<div className="h-full w-full rounded-xl bg-slate-100 dark:bg-slate-900/40 animate-pulse"/>)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">Module adoption</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Top enabled modules</div>
          </div>
          <div className="mt-4 h-72">
            {chartsReady ? (<recharts_1.ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                <recharts_1.PieChart>
                  <recharts_1.Pie data={modulePie} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={2}>
                    {modulePie.map((m) => (<recharts_1.Cell key={m.name} fill={m.color}/>))}
                  </recharts_1.Pie>
                  <recharts_1.Tooltip />
                  <recharts_1.Legend />
                </recharts_1.PieChart>
              </recharts_1.ResponsiveContainer>) : (<div className="h-full w-full rounded-xl bg-slate-100 dark:bg-slate-900/40 animate-pulse"/>)}
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">Expiring qualifications: {(_o = totals === null || totals === void 0 ? void 0 : totals.expiringQualifications) !== null && _o !== void 0 ? _o : 0}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">Business management</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Deactivate or delete businesses from the platform</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={manageSearch} onChange={(e) => setManageSearch(e.target.value)} placeholder="Search name, owner email, country..." className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 min-w-[260px]"/>
            <button type="button" onClick={loadManagedBusinesses} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
              <lucide_react_1.RefreshCw className="w-4 h-4"/>
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Business</th>
                  <th className="text-left px-5 py-3 font-semibold">Owner</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-right px-5 py-3 font-semibold">Created</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                {managedBusinessesLoading ? (<tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>) : filteredManagedBusinesses.length === 0 ? (<tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                      No businesses found.
                    </td>
                  </tr>) : (filteredManagedBusinesses.slice(0, 50).map((b) => {
            var _a, _b, _c;
            const inactive = ((b === null || b === void 0 ? void 0 : b.status) || 'ACTIVE').toUpperCase() === 'INACTIVE';
            return (<tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{b.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[520px]">
                            {b.industry || b.businessType || '—'}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-200">{((_a = b.owner) === null || _a === void 0 ? void 0 : _a.email) || '—'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {[(_b = b.owner) === null || _b === void 0 ? void 0 : _b.firstName, (_c = b.owner) === null || _c === void 0 ? void 0 : _c.lastName].filter(Boolean).join(' ') || '—'}
                          </div>
                        </td>
                        <td className="px-5 py-3">{statusPill(b.status)}</td>
                        <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <button type="button" onClick={() => {
                    setBusinessesModalOpen(false);
                    setContextAndGo(b, '/dashboard');
                }} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200">
                              Open
                            </button>
                            {inactive ? (<button type="button" onClick={() => openBusinessAction(b, 'activate')} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                                Activate
                              </button>) : (<button type="button" onClick={() => openBusinessAction(b, 'deactivate')} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold">
                                Deactivate
                              </button>)}
                            <button type="button" onClick={() => openBusinessAction(b, 'delete')} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1">
                              <lucide_react_1.Trash2 className="w-3.5 h-3.5"/>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>);
        }))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal_1.Modal isOpen={businessActionModal.isOpen} onClose={() => setBusinessActionModal({ isOpen: false, kind: 'deactivate', business: null, confirmText: '', saving: false })} title={businessActionModal.kind === 'delete'
            ? 'Delete business'
            : businessActionModal.kind === 'deactivate'
                ? 'Deactivate business'
                : 'Activate business'} maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="text-sm text-slate-700 dark:text-slate-200">
            <div className="font-semibold">{((_p = businessActionModal.business) === null || _p === void 0 ? void 0 : _p.name) || 'Business'}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{((_r = (_q = businessActionModal.business) === null || _q === void 0 ? void 0 : _q.owner) === null || _r === void 0 ? void 0 : _r.email) || ''}</div>
          </div>

          {businessActionModal.kind === 'delete' ? (<div className="space-y-3">
              <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-800 dark:text-red-200">
                This will delete the business from the platform dashboard and remove access.
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-200">
                Type <span className="font-bold">{(_s = businessActionModal.business) === null || _s === void 0 ? void 0 : _s.name}</span> to confirm.
              </div>
              <input value={businessActionModal.confirmText} onChange={(e) => setBusinessActionModal((prev) => ({ ...prev, confirmText: e.target.value }))} placeholder="Business name" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200"/>
            </div>) : (<div className="text-sm text-slate-600 dark:text-slate-300">
              {businessActionModal.kind === 'deactivate'
                ? 'Users will no longer be able to use this business in the system.'
                : 'Users will be able to use this business again.'}
            </div>)}

          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setBusinessActionModal({ isOpen: false, kind: 'deactivate', business: null, confirmText: '', saving: false })} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200" disabled={businessActionModal.saving}>
              Cancel
            </button>
            <button type="button" onClick={runBusinessAction} disabled={businessActionModal.saving} className={businessActionModal.kind === 'delete'
            ? 'px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold'
            : businessActionModal.kind === 'deactivate'
                ? 'px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold'
                : 'px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold'}>
              {businessActionModal.saving ? 'Working…' : businessActionModal.kind === 'delete' ? 'Delete' : businessActionModal.kind === 'deactivate' ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </Modal_1.Modal>

      <Modal_1.Modal isOpen={businessesModalOpen} onClose={() => setBusinessesModalOpen(false)} title="Businesses" maxWidth="max-w-6xl">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Select a business to set context, then use modules as normal.
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input value={businessSearch} onChange={(e) => setBusinessSearch(e.target.value)} placeholder="Search name, owner email, country..." className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 min-w-[260px]"/>
              <link_1.default href="/dashboard/add-business" onClick={() => setBusinessesModalOpen(false)} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-2">
                <lucide_react_1.Building2 className="w-4 h-4"/>
                Add business
              </link_1.default>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold">Business</th>
                    <th className="text-left px-5 py-3 font-semibold">Owner</th>
                    <th className="text-left px-5 py-3 font-semibold">Country</th>
                    <th className="text-right px-5 py-3 font-semibold">Employees</th>
                    <th className="text-right px-5 py-3 font-semibold">Sites</th>
                    <th className="text-right px-5 py-3 font-semibold">Incidents</th>
                    <th className="text-right px-5 py-3 font-semibold">Created</th>
                    <th className="text-right px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                  {loading ? (<tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                        Loading…
                      </td>
                    </tr>) : filteredBusinesses.length === 0 ? (<tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                        No businesses found.
                      </td>
                    </tr>) : (filteredBusinesses.map((b) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            return (<tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-5 py-3">
                          <button type="button" onClick={() => setSelectedBusinessId(b.id)} className="text-left">
                            <div className="font-semibold text-slate-900 dark:text-white">{b.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[420px]">
                              {b.industry || b.businessType || '—'}
                            </div>
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-200">{((_a = b.owner) === null || _a === void 0 ? void 0 : _a.email) || '—'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {[(_b = b.owner) === null || _b === void 0 ? void 0 : _b.firstName, (_c = b.owner) === null || _c === void 0 ? void 0 : _c.lastName].filter(Boolean).join(' ') || '—'}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{b.country || '—'}</td>
                        <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{(_e = (_d = b._count) === null || _d === void 0 ? void 0 : _d.employees) !== null && _e !== void 0 ? _e : 0}</td>
                        <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{(_g = (_f = b._count) === null || _f === void 0 ? void 0 : _f.locations) !== null && _g !== void 0 ? _g : 0}</td>
                        <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{(_j = (_h = b._count) === null || _h === void 0 ? void 0 : _h.incidentReports) !== null && _j !== void 0 ? _j : 0}</td>
                        <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" onClick={() => {
                    setBusinessesModalOpen(false);
                    setContextAndGo(b, '/dashboard');
                }} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">
                              Open
                            </button>
                            <button type="button" onClick={() => {
                    setBusinessesModalOpen(false);
                    setContextAndGo(b, '/dashboard/security/incidents');
                }} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200">
                              Incidents
                            </button>
                            <button type="button" onClick={() => {
                    setBusinessesModalOpen(false);
                    setContextAndGo(b, '/dashboard/people');
                }} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200">
                              People
                            </button>
                          </div>
                        </td>
                      </tr>);
        }))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal_1.Modal>

      <Modal_1.Modal isOpen={!!selectedBusinessObj} onClose={() => setSelectedBusinessId(null)} title={(selectedBusinessObj === null || selectedBusinessObj === void 0 ? void 0 : selectedBusinessObj.name) || 'Business'} maxWidth="max-w-3xl">
        {selectedBusinessObj && (<div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Employees</div>
                <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{selectedBusinessObj._count.employees}</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sites</div>
                <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{selectedBusinessObj._count.locations}</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Incidents</div>
                <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{selectedBusinessObj._count.incidentReports}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Modules</div>
              <div className="mt-2 text-sm text-slate-800 dark:text-slate-200">
                {(selectedBusinessObj.modules || '').split(',').map((x) => x.trim()).filter(Boolean).join(', ') || 'None'}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => {
                setSelectedBusiness(selectedBusinessObj);
                sonner_1.toast.success('Business context set');
                try {
                    localStorage.setItem('superadminBusinessContext', '1');
                }
                catch { }
                setSelectedBusinessId(null);
                setBusinessesModalOpen(false);
            }} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">
                Set context
              </button>
              <button type="button" onClick={() => setContextAndGo(selectedBusinessObj, '/dashboard/security/incidents')} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Open incidents
              </button>
              <button type="button" onClick={() => setContextAndGo(selectedBusinessObj, '/dashboard/settings')} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Settings
              </button>
            </div>
          </div>)}
      </Modal_1.Modal>
    </div>);
}
function SuperAdminBusinessContextBar({ businessName }) {
    const router = (0, navigation_1.useRouter)();
    const { setSelectedBusiness } = (0, business_context_1.useBusiness)();
    return (<div className="rounded-2xl border border-indigo-200/60 dark:border-indigo-700/30 bg-indigo-50/60 dark:bg-indigo-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="text-sm text-indigo-900 dark:text-indigo-200">
        <span className="font-bold">Business context:</span> {businessName || 'Selected business'}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => {
            setSelectedBusiness(null);
            try {
                localStorage.removeItem('selectedBusiness');
                localStorage.removeItem('superadminBusinessContext');
            }
            catch { }
            router.push('/dashboard');
        }} className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 text-sm font-semibold text-indigo-700 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
          Back to platform
        </button>
        <link_1.default href="/dashboard/settings" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">
          Business settings
        </link_1.default>
        <link_1.default href="/dashboard/vendors" className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 text-sm font-semibold text-indigo-700 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center gap-2">
          <lucide_react_1.Store className="w-4 h-4"/>
          Vendors
        </link_1.default>
      </div>
    </div>);
}
function EmployeeDashboard({ loading, data, onRefresh, onClockIn, onClockOut, }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
    const name = (data === null || data === void 0 ? void 0 : data.employee) ? `${data.employee.firstName} ${data.employee.lastName}`.trim() : 'Employee';
    const now = (data === null || data === void 0 ? void 0 : data.now) ? new Date(data.now) : new Date();
    const active = !!((_a = data === null || data === void 0 ? void 0 : data.timeTracking) === null || _a === void 0 ? void 0 : _a.activeTimesheet);
    const currentShift = ((_b = data === null || data === void 0 ? void 0 : data.schedule) === null || _b === void 0 ? void 0 : _b.currentShift) || null;
    const nextShift = ((_c = data === null || data === void 0 ? void 0 : data.schedule) === null || _c === void 0 ? void 0 : _c.nextShift) || null;
    const [reportsModalOpen, setReportsModalOpen] = (0, react_1.useState)(false);
    const [selectedWeekKey, setSelectedWeekKey] = (0, react_1.useState)(null);
    const chartsReady = (0, react_1.useSyncExternalStore)(() => () => { }, () => true, () => false);
    const punctualityPie = (0, react_1.useMemo)(() => {
        var _a;
        const p = (_a = data === null || data === void 0 ? void 0 : data.metrics) === null || _a === void 0 ? void 0 : _a.punctuality;
        if (!p)
            return [];
        return [
            { name: 'On time', value: p.onTime, color: '#6366f1' },
            { name: 'Late', value: p.late, color: '#f59e0b' },
            { name: 'Missed', value: p.missed, color: '#ef4444' },
        ].filter((x) => x.value > 0);
    }, [(_d = data === null || data === void 0 ? void 0 : data.metrics) === null || _d === void 0 ? void 0 : _d.punctuality]);
    const punctualityTrend = (0, react_1.useMemo)(() => {
        var _a;
        const arr = ((_a = data === null || data === void 0 ? void 0 : data.charts) === null || _a === void 0 ? void 0 : _a.punctualityDaily) || [];
        return arr.slice(-14).map((p) => ({
            date: p.date.slice(5),
            lateMinutes: p.lateMinutes == null ? 0 : p.lateMinutes,
            missed: p.status === 'MISSED' ? 1 : 0,
            onTime: p.status === 'ON_TIME' ? 1 : 0,
        }));
    }, [(_e = data === null || data === void 0 ? void 0 : data.charts) === null || _e === void 0 ? void 0 : _e.punctualityDaily]);
    const reportsWeekly = (0, react_1.useMemo)(() => {
        var _a;
        return (((_a = data === null || data === void 0 ? void 0 : data.charts) === null || _a === void 0 ? void 0 : _a.reportsWeekly) || []).slice(-10).map((r) => ({
            week: r.week,
            label: r.week.slice(5),
            count: r.count,
            incidentCount: r.incidentCount,
            patrolCount: r.patrolCount,
        }));
    }, [(_f = data === null || data === void 0 ? void 0 : data.charts) === null || _f === void 0 ? void 0 : _f.reportsWeekly]);
    const canClockIn = !!((_g = data === null || data === void 0 ? void 0 : data.schedule) === null || _g === void 0 ? void 0 : _g.canClockIn) && !active;
    const canClockOut = active;
    const weekStart = (key) => new Date(`${key}T00:00:00.000Z`);
    const weekEndExclusive = (key) => new Date(weekStart(key).getTime() + 7 * 24 * 60 * 60 * 1000);
    const selectedWeek = (0, react_1.useMemo)(() => {
        if (!selectedWeekKey)
            return null;
        return reportsWeekly.find((r) => r.week === selectedWeekKey) || null;
    }, [reportsWeekly, selectedWeekKey]);
    const weekActivity = (0, react_1.useMemo)(() => {
        if (!selectedWeekKey)
            return [];
        const start = weekStart(selectedWeekKey).getTime();
        const end = weekEndExclusive(selectedWeekKey).getTime();
        return ((data === null || data === void 0 ? void 0 : data.activity) || [])
            .filter((a) => {
            const t = new Date(a.createdAt).getTime();
            return t >= start && t < end;
        })
            .slice(0, 20);
    }, [data === null || data === void 0 ? void 0 : data.activity, selectedWeekKey]);
    const openReports = (weekKey) => {
        const fallback = reportsWeekly.length ? reportsWeekly[reportsWeekly.length - 1].week : null;
        setSelectedWeekKey(weekKey || selectedWeekKey || fallback);
        setReportsModalOpen(true);
    };
    const activityHref = (a) => {
        if (a.kind === 'INCIDENT')
            return '/dashboard/security/incidents';
        if (a.kind === 'PATROL')
            return '/dashboard/security/patrols';
        return '/dashboard/security/incidents';
    };
    return (<div className="max-w-[1600px] mx-auto space-y-6">
      <div className="rounded-3xl border border-indigo-200/40 dark:border-indigo-700/30 bg-gradient-to-br from-white via-indigo-50/60 to-purple-50/60 dark:from-slate-950 dark:via-indigo-950/30 dark:to-purple-950/20 p-6 shadow-sm overflow-hidden relative">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-400/20 blur-3xl rounded-full"/>
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-400/20 blur-3xl rounded-full"/>

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 tracking-wider uppercase flex items-center gap-2">
              <lucide_react_1.Zap className="w-4 h-4"/>
              Employee Command Center
            </div>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white truncate">
              Welcome back, {name}
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2 flex-wrap">
              <lucide_react_1.Clock className="w-4 h-4 text-gray-400"/>
              {now.toLocaleString()}
              {(currentShift === null || currentShift === void 0 ? void 0 : currentShift.locationName) ? (<>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <lucide_react_1.MapPin className="w-4 h-4 text-gray-400"/>
                  <span className="truncate">{currentShift.locationName}</span>
                </>) : null}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" onClick={onRefresh} className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-white dark:hover:bg-slate-900 transition-colors">
              Refresh
            </button>
            <link_1.default href="/dashboard/scheduling" className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-white dark:hover:bg-slate-900 transition-colors flex items-center gap-2">
              <lucide_react_1.Calendar className="w-4 h-4"/>
              My schedule
              <lucide_react_1.ArrowRight className="w-4 h-4 opacity-60"/>
            </link_1.default>

            <button type="button" disabled={!canClockIn || loading} onClick={onClockIn} className={`px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 transition-colors ${canClockIn
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20'
            : 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'}`}>
              <lucide_react_1.Play className="w-4 h-4"/>
              Clock in
            </button>
            <button type="button" disabled={!canClockOut || loading} onClick={onClockOut} className={`px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 transition-colors ${canClockOut
            ? 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800'
            : 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'}`}>
              <lucide_react_1.Square className="w-4 h-4"/>
              Clock out
            </button>
          </div>
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          <div className="rounded-2xl border border-gray-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 p-5">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Punctuality (30 days)</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {(_k = (_j = (_h = data === null || data === void 0 ? void 0 : data.metrics) === null || _h === void 0 ? void 0 : _h.punctuality) === null || _j === void 0 ? void 0 : _j.onTimeRate) !== null && _k !== void 0 ? _k : 0}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                Avg late: {(_o = (_m = (_l = data === null || data === void 0 ? void 0 : data.metrics) === null || _l === void 0 ? void 0 : _l.punctuality) === null || _m === void 0 ? void 0 : _m.avgLateMinutes) !== null && _o !== void 0 ? _o : 0}m
              </div>
            </div>
            <div className="mt-3 h-28">
              {chartsReady ? (<recharts_1.ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={112}>
                  <recharts_1.LineChart data={punctualityTrend}>
                    <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)"/>
                    <recharts_1.XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="rgba(100,116,139,0.6)"/>
                    <recharts_1.YAxis tick={{ fontSize: 11 }} stroke="rgba(100,116,139,0.6)"/>
                    <recharts_1.Tooltip />
                    <recharts_1.Line type="monotone" dataKey="lateMinutes" stroke="#6366f1" strokeWidth={2} dot={false}/>
                  </recharts_1.LineChart>
                </recharts_1.ResponsiveContainer>) : (<div className="h-full w-full rounded-xl bg-gray-100 dark:bg-slate-800/60 animate-pulse"/>)}
            </div>
          </div>

          <div role="button" tabIndex={0} onClick={() => openReports(null)} onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ')
                return;
            e.preventDefault();
            openReports(null);
        }} className="rounded-2xl border border-purple-200/70 dark:border-purple-700/40 bg-white/70 dark:bg-slate-900/60 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-44 h-44 bg-purple-500/20 blur-3xl rounded-full"/>
            <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-indigo-500/20 blur-3xl rounded-full"/>

            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Report submissions (weekly)</div>
                <div className="mt-2 flex items-end gap-3">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{(_r = (_q = (_p = data === null || data === void 0 ? void 0 : data.metrics) === null || _p === void 0 ? void 0 : _p.reports) === null || _q === void 0 ? void 0 : _q.total) !== null && _r !== void 0 ? _r : 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Incidents: {(_u = (_t = (_s = data === null || data === void 0 ? void 0 : data.metrics) === null || _s === void 0 ? void 0 : _s.reports) === null || _t === void 0 ? void 0 : _t.incidentCount) !== null && _u !== void 0 ? _u : 0} • Patrol: {(_x = (_w = (_v = data === null || data === void 0 ? void 0 : data.metrics) === null || _v === void 0 ? void 0 : _v.reports) === null || _w === void 0 ? void 0 : _w.patrolCount) !== null && _x !== void 0 ? _x : 0}
                  </div>
                </div>
              </div>
              <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-500/15 border border-purple-200/60 dark:border-purple-500/20 px-2 py-1 rounded-full whitespace-nowrap">
                Click to review
              </div>
            </div>

            <div className="relative mt-3 h-28">
              {chartsReady ? (<recharts_1.ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={112}>
                  <recharts_1.BarChart data={reportsWeekly}>
                    <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)"/>
                    <recharts_1.XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="rgba(100,116,139,0.6)"/>
                    <recharts_1.YAxis tick={{ fontSize: 11 }} stroke="rgba(100,116,139,0.6)" allowDecimals={false}/>
                    <recharts_1.Tooltip />
                    <recharts_1.Legend wrapperStyle={{ fontSize: 11 }}/>
                    <recharts_1.Bar dataKey="incidentCount" name="Incidents" stackId="a" fill="#8b5cf6" radius={[8, 8, 0, 0]} onClick={(d) => {
                var _a;
                const wk = (_a = d === null || d === void 0 ? void 0 : d.payload) === null || _a === void 0 ? void 0 : _a.week;
                if (!wk)
                    return;
                openReports(wk);
            }}/>
                    <recharts_1.Bar dataKey="patrolCount" name="Patrol" stackId="a" fill="#6366f1" radius={[8, 8, 0, 0]} onClick={(d) => {
                var _a;
                const wk = (_a = d === null || d === void 0 ? void 0 : d.payload) === null || _a === void 0 ? void 0 : _a.week;
                if (!wk)
                    return;
                openReports(wk);
            }}/>
                  </recharts_1.BarChart>
                </recharts_1.ResponsiveContainer>) : (<div className="h-full w-full rounded-xl bg-gray-100 dark:bg-slate-800/60 animate-pulse"/>)}
            </div>

            <div className="relative mt-3 flex items-center gap-2 flex-wrap">
              <link_1.default href="/dashboard/security/incidents" onClick={(e) => e.stopPropagation()} className="px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-white dark:hover:bg-slate-900 transition-colors">
                View incidents
              </link_1.default>
              <link_1.default href="/dashboard/security/patrols" onClick={(e) => e.stopPropagation()} className="px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-white dark:hover:bg-slate-900 transition-colors">
                View patrol logs
              </link_1.default>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 p-5">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Consistency</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{(_z = (_y = data === null || data === void 0 ? void 0 : data.metrics) === null || _y === void 0 ? void 0 : _y.streakOnTimeDays) !== null && _z !== void 0 ? _z : 0}d</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 text-right">On-time streak</div>
            </div>
            <div className="mt-3 h-28">
              {chartsReady ? (<recharts_1.ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={112}>
                  <recharts_1.PieChart>
                    <recharts_1.Pie data={punctualityPie} dataKey="value" nameKey="name" innerRadius={34} outerRadius={52} paddingAngle={2}>
                      {punctualityPie.map((e) => (<recharts_1.Cell key={e.name} fill={e.color}/>))}
                    </recharts_1.Pie>
                    <recharts_1.Tooltip />
                  </recharts_1.PieChart>
                </recharts_1.ResponsiveContainer>) : (<div className="h-full w-full rounded-xl bg-gray-100 dark:bg-slate-800/60 animate-pulse"/>)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-bold text-gray-900 dark:text-white">Today</div>
              <link_1.default href="/dashboard/time" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2">
                Time & attendance <lucide_react_1.ArrowRight className="w-4 h-4"/>
              </link_1.default>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Current shift</div>
                <div className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
                  {currentShift ? `${new Date(currentShift.startTime).toLocaleTimeString()} – ${new Date(currentShift.endTime).toLocaleTimeString()}` : 'No active shift'}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">{(currentShift === null || currentShift === void 0 ? void 0 : currentShift.locationName) || ' '}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Next shift</div>
                <div className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
                  {nextShift ? `${new Date(nextShift.startTime).toLocaleTimeString()} – ${new Date(nextShift.endTime).toLocaleTimeString()}` : 'No upcoming shift today'}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">{(nextShift === null || nextShift === void 0 ? void 0 : nextShift.locationName) || ' '}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-bold text-gray-900 dark:text-white">Recent activity</div>
              <link_1.default href="/dashboard/security/incidents" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2">
                Reports <lucide_react_1.ArrowRight className="w-4 h-4"/>
              </link_1.default>
            </div>
            <div className="mt-4 divide-y divide-gray-200/60 dark:divide-slate-700/60">
              {((data === null || data === void 0 ? void 0 : data.activity) || []).length === 0 ? (<div className="py-8 text-sm text-gray-500 dark:text-gray-400">No recent activity.</div>) : (((data === null || data === void 0 ? void 0 : data.activity) || []).slice(0, 8).map((a) => (<link_1.default key={`${a.kind}_${a.id}`} href={activityHref(a)} className="py-3 flex items-start justify-between gap-3 hover:bg-gray-50/70 dark:hover:bg-slate-800/30 rounded-xl px-2 transition-colors">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{a.kind}</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{a.title || 'Update'}</div>
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</div>
                  </link_1.default>)))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <div className="text-lg font-bold text-gray-900 dark:text-white">Quick actions</div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <link_1.default href="/dashboard/communications/chats" className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">Chats</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Team updates</div>
                </div>
                <lucide_react_1.ArrowRight className="w-4 h-4 text-gray-400"/>
              </link_1.default>
              <link_1.default href="/dashboard/communications/notifications" className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">Notifications</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Your inbox</div>
                </div>
                <lucide_react_1.ArrowRight className="w-4 h-4 text-gray-400"/>
              </link_1.default>
              <link_1.default href="/dashboard/requests/loans" className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <lucide_react_1.ClipboardCheck className="w-4 h-4 text-indigo-500"/> Loan request
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Request a loan and track status</div>
                </div>
                <lucide_react_1.ArrowRight className="w-4 h-4 text-gray-400"/>
              </link_1.default>
            </div>
          </div>
        </div>
      </div>

      {loading ? (<div className="text-sm text-gray-500 dark:text-gray-400">Loading dashboard…</div>) : null}

      <Modal_1.Modal isOpen={reportsModalOpen} onClose={() => setReportsModalOpen(false)} title="Reports overview" maxWidth="max-w-4xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {selectedWeek ? (<>
                  Week of <span className="font-semibold text-gray-900 dark:text-white">{selectedWeek.week}</span> •{' '}
                  <span className="font-semibold">{selectedWeek.count}</span> total (
                  <span className="font-semibold">{selectedWeek.incidentCount}</span> incidents,{' '}
                  <span className="font-semibold">{selectedWeek.patrolCount}</span> patrol logs)
                </>) : ('Select a week from the chart')}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <link_1.default href="/dashboard/security/incidents" onClick={() => setReportsModalOpen(false)} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
                New / View incidents
              </link_1.default>
              <link_1.default href="/dashboard/security/patrols" onClick={() => setReportsModalOpen(false)} className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-800">
                View patrol logs
              </link_1.default>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Weekly trend</div>
            <div className="h-56">
              {chartsReady ? (<recharts_1.ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={224}>
                  <recharts_1.BarChart data={reportsWeekly}>
                    <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)"/>
                    <recharts_1.XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="rgba(100,116,139,0.6)"/>
                    <recharts_1.YAxis tick={{ fontSize: 12 }} stroke="rgba(100,116,139,0.6)" allowDecimals={false}/>
                    <recharts_1.Tooltip />
                    <recharts_1.Legend />
                    <recharts_1.Bar dataKey="incidentCount" name="Incidents" stackId="a" fill="#8b5cf6" radius={[10, 10, 0, 0]} onClick={(d) => {
                var _a;
                const wk = (_a = d === null || d === void 0 ? void 0 : d.payload) === null || _a === void 0 ? void 0 : _a.week;
                if (!wk)
                    return;
                setSelectedWeekKey(wk);
            }}/>
                    <recharts_1.Bar dataKey="patrolCount" name="Patrol" stackId="a" fill="#6366f1" radius={[10, 10, 0, 0]} onClick={(d) => {
                var _a;
                const wk = (_a = d === null || d === void 0 ? void 0 : d.payload) === null || _a === void 0 ? void 0 : _a.week;
                if (!wk)
                    return;
                setSelectedWeekKey(wk);
            }}/>
                  </recharts_1.BarChart>
                </recharts_1.ResponsiveContainer>) : (<div className="h-full w-full rounded-xl bg-gray-100 dark:bg-slate-800/60 animate-pulse"/>)}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Items (from your recent activity)</div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSelectedWeekKey(reportsWeekly.length ? reportsWeekly[reportsWeekly.length - 1].week : null)} className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Latest week
                </button>
              </div>
            </div>
            <div className="mt-3 divide-y divide-gray-200/60 dark:divide-slate-700/60">
              {weekActivity.length === 0 ? (<div className="py-8 text-sm text-gray-500 dark:text-gray-400">No items captured for this week.</div>) : (weekActivity.map((a) => (<link_1.default key={`${a.kind}_${a.id}`} href={activityHref(a)} onClick={() => setReportsModalOpen(false)} className="py-3 flex items-start justify-between gap-3 hover:bg-gray-50/70 dark:hover:bg-slate-800/30 rounded-xl px-2 transition-colors">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{a.kind}</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{a.title || 'Update'}</div>
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</div>
                  </link_1.default>)))}
            </div>
          </div>
        </div>
      </Modal_1.Modal>
    </div>);
}
