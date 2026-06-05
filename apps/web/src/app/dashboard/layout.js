"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardLayout;
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const navigation_2 = require("next/navigation");
const api_1 = __importDefault(require("../../lib/api"));
const types_1 = require("@unitedlinkgroup/types");
const push_1 = require("../../lib/push");
const file_url_1 = require("../../lib/file-url");
const theme_toggle_1 = require("@/components/theme-toggle");
const business_context_1 = require("../../context/business-context");
const TopNavigation_1 = require("@/components/TopNavigation");
const CommandPalette_1 = require("@/components/CommandPalette");
function BusinessList({ businesses, onSelect }) {
    return (<div className="w-full">
      <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Select a Business</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {businesses.map(b => {
            var _a, _b;
            return (<div key={b.id} onClick={() => onSelect(b)} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 dark:border-slate-700 group">
            <div className="flex items-center justify-between mb-4">
               {b.logoUrl ? (<div className="w-12 h-12 bg-white rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                   <img src={(0, file_url_1.resolveFileUrl)(b.logoUrl)} alt={b.name} className="w-full h-full object-contain"/>
                 </div>) : (<div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl">
                   {b.name.substring(0, 2).toUpperCase()}
                 </div>)}
               <lucide_react_1.Briefcase className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors"/>
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{b.name}</h3>
            <p className="text-gray-600 dark:text-slate-400 text-sm">EIN: {b.ein || 'N/A'}</p>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center text-sm text-gray-500 dark:text-slate-500">
               <span>Owner: {(_a = b.owner) === null || _a === void 0 ? void 0 : _a.firstName} {(_b = b.owner) === null || _b === void 0 ? void 0 : _b.lastName}</span>
               <span>{new Date(b.createdAt).toLocaleDateString()}</span>
            </div>
          </div>);
        })}
        
        {/* Add New Business Card */}
        <link_1.default href="/dashboard/add-business" className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group min-h-[200px]">
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
            <lucide_react_1.Plus className="w-6 h-6 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"/>
          </div>
          <span className="font-semibold text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">Add New Business</span>
        </link_1.default>
      </div>
    </div>);
}
function DashboardContent({ children }) {
    const pathname = (0, navigation_1.usePathname)();
    const router = (0, navigation_2.useRouter)();
    const [userRole, setUserRole] = (0, react_1.useState)(null);
    const [employeeType, setEmployeeType] = (0, react_1.useState)(null);
    const [isProfileOpen, setIsProfileOpen] = (0, react_1.useState)(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = (0, react_1.useState)(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = (0, react_1.useState)(false);
    const [unreadCount, setUnreadCount] = (0, react_1.useState)(0);
    const [brandLogoFailed, setBrandLogoFailed] = (0, react_1.useState)(false);
    const { selectedBusiness, setSelectedBusiness, businesses } = (0, business_context_1.useBusiness)();
    const enabledModules = (0, react_1.useMemo)(() => {
        const raw = (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.modules)
            ? selectedBusiness.modules.split(',').map(s => s.trim()).filter(Boolean)
            : [];
        const set = new Set(raw);
        if (set.has('People')) {
            set.add('People_EmploymentForms');
            set.add('People_SOPFiles');
            set.add('My_Forms');
        }
        return Array.from(set);
    }, [selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.modules]);
    const appName = (0, react_1.useMemo)(() => {
        let name = 'United Link Group';
        try {
            if (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.settings) {
                const s = JSON.parse(selectedBusiness.settings);
                if (s.softwareName)
                    name = s.softwareName;
            }
            if (!selectedBusiness && typeof window !== 'undefined') {
                const stored = localStorage.getItem('app_software_name');
                if (stored && stored !== 'Pamtech Security')
                    name = stored;
            }
        }
        catch { }
        return name;
    }, [selectedBusiness]);
    (0, react_1.useEffect)(() => {
        setBrandLogoFailed(false);
    }, [selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.logoUrl]);
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    (0, react_1.useEffect)(() => {
        try {
            if (!selectedBusiness && typeof window !== 'undefined') {
                const stored = localStorage.getItem('app_software_name');
                if (stored === 'Pamtech Security') {
                    localStorage.setItem('app_software_name', 'United Link Group');
                }
            }
        }
        catch { }
    }, [selectedBusiness]);
    (0, react_1.useEffect)(() => {
        const fetchProfile = async () => {
            try {
                const response = await api_1.default.get('/auth/profile');
                setUserRole(response.data.role);
                const nextEmployeeType = (response === null || response === void 0 ? void 0 : response.data) && response.data.employeeType ? String(response.data.employeeType) : null;
                setEmployeeType(nextEmployeeType);
                try {
                    if (nextEmployeeType) {
                        localStorage.setItem('employee_type', nextEmployeeType);
                    }
                    else {
                        localStorage.removeItem('employee_type');
                    }
                }
                catch { }
                // After profile is known, register web push and start SSE listener
                (0, push_1.registerWebPush)();
                (0, push_1.listenSSENotifications)();
            }
            catch (error) {
                console.error('Failed to fetch profile', error);
            }
        };
        fetchProfile();
    }, []);
    (0, react_1.useEffect)(() => {
        const roleUpper = String(userRole || '').toUpperCase();
        const typeUpper = String(employeeType || '').toUpperCase();
        const isOnboardingEmployee = roleUpper === 'EMPLOYEE' && typeUpper === 'ONBOARDING';
        if (!isOnboardingEmployee)
            return;
        if (pathname === null || pathname === void 0 ? void 0 : pathname.startsWith('/dashboard/forms'))
            return;
        router.replace('/dashboard/forms');
    }, [employeeType, pathname, router, userRole]);
    (0, react_1.useEffect)(() => {
        const fetchUnread = async () => {
            try {
                const res = await api_1.default.get('/notifications');
                const unread = (res.data || []).filter((n) => !n.read && n.type === 'CHAT').length;
                setUnreadCount(unread);
            }
            catch {
                // ignore
            }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 30000);
        const onRefresh = () => fetchUnread();
        window.addEventListener('notifications:refresh', onRefresh);
        return () => {
            clearInterval(interval);
            window.removeEventListener('notifications:refresh', onRefresh);
        };
    }, []);
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('selectedBusiness');
        localStorage.removeItem('superadminBusinessContext');
        localStorage.removeItem('employee_type');
        router.push('/login');
    };
    const showBusinessSelection = userRole === types_1.UserRole.SUPER_ADMIN &&
        !selectedBusiness &&
        pathname !== '/dashboard' &&
        pathname !== '/dashboard/add-business';
    const isSchedulingPage = pathname === null || pathname === void 0 ? void 0 : pathname.startsWith('/dashboard/scheduling');
    const isTimePage = pathname === null || pathname === void 0 ? void 0 : pathname.startsWith('/dashboard/time');
    const isAvailabilityPage = pathname === null || pathname === void 0 ? void 0 : pathname.startsWith('/dashboard/people/availability');
    const isPeoplePage = pathname === '/dashboard/people';
    const isDepartmentsPage = pathname === null || pathname === void 0 ? void 0 : pathname.startsWith('/dashboard/people/departments');
    const isRolesPage = pathname === null || pathname === void 0 ? void 0 : pathname.startsWith('/dashboard/people/roles');
    const isCommunicationsPage = pathname === null || pathname === void 0 ? void 0 : pathname.startsWith('/dashboard/communications');
    const isFullWidthPage = isSchedulingPage || isTimePage || isAvailabilityPage || isPeoplePage || isDepartmentsPage || isRolesPage || isCommunicationsPage;
    const isGlobalMode = userRole === types_1.UserRole.SUPER_ADMIN && !selectedBusiness;
    const isGeneralBusinessProfilePage = pathname === '/dashboard/settings/preferences';
    const shouldShowBusinessSelection = showBusinessSelection && !isGeneralBusinessProfilePage;
    if (pathname === '/dashboard/add-business') {
        return <>{children}</>;
    }
    return (<div className={`flex flex-col h-screen ${isPeoplePage ? 'bg-white' : 'bg-gray-50'} dark:bg-slate-950`}>
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 text-white shadow-md z-30">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Navigation */}
            <div className="flex items-center flex-1">
              <div className="flex-shrink-0 flex items-center gap-3 cursor-pointer" onClick={() => {
            if (userRole !== types_1.UserRole.SUPER_ADMIN)
                return;
            setSelectedBusiness(null);
            try {
                localStorage.removeItem('selectedBusiness');
                localStorage.removeItem('superadminBusinessContext');
            }
            catch { }
            router.push('/dashboard');
        }}>
                {selectedBusiness ? (<div className="flex items-center gap-2">
                      {selectedBusiness.logoUrl && !brandLogoFailed ? (<img src={(0, file_url_1.resolveFileUrl)(selectedBusiness.logoUrl)} alt="" className="w-[60px] h-[60px] rounded object-contain bg-transparent" onError={() => setBrandLogoFailed(true)}/>) : (<div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">
                          {selectedBusiness.name.substring(0, 2).toUpperCase()}
                        </div>)}
                      {(!selectedBusiness.logoUrl || brandLogoFailed) && (<span className="font-semibold text-white hidden sm:block">{selectedBusiness.name}</span>)}
                   </div>) : (<span className="text-xl font-bold tracking-tight text-blue-400">{appName}</span>)}
              </div>
              
              {!showBusinessSelection && !isGlobalMode && (<div className="hidden md:block ml-6 flex-1">
                  <TopNavigation_1.TopNavigation enabledModuleIds={enabledModules} userRole={userRole}/>
                </div>)}
            </div>

            {/* Right Side Actions */}
            <div className="hidden md:block flex-shrink-0">
              <div className="ml-4 flex items-center md:ml-6 space-x-4">
                {/* Theme Toggle */}
                <theme_toggle_1.ThemeToggle />
                
                {/* Search */}
                <button onClick={() => setIsCommandPaletteOpen(true)} className="relative group w-full md:w-64">
                  <div className="flex items-center w-full px-3 py-1.5 bg-slate-800 text-slate-400 rounded-md border border-transparent group-hover:border-slate-700 transition-all cursor-text">
                    <lucide_react_1.Search className="h-4 w-4 mr-2"/>
                    <span className="text-sm">Search...</span>
                    <kbd className="hidden md:inline-flex ml-auto h-5 items-center gap-1 rounded border border-slate-700 bg-slate-900 px-1.5 font-mono text-[10px] font-medium text-slate-500">
                      <span className="text-xs">⌘K</span>
                    </kbd>
                  </div>
                </button>

                <link_1.default href="/dashboard/communications/notifications" className="relative bg-slate-800 p-1 rounded-full text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white">
                  <span className="sr-only">View notifications</span>
                  <lucide_react_1.Bell className="h-5 w-5"/>
                  {unreadCount > 0 && (<span className="absolute -top-1 -right-1 text-[10px] font-bold bg-indigo-500 text-white rounded-full px-1.5 py-0.5">
                      {unreadCount}
                    </span>)}
                </link_1.default>

                {/* Profile Dropdown */}
                <div className="relative ml-3">
                  <div>
                    <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center max-w-xs text-sm bg-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white">
                      <span className="sr-only">Open user menu</span>
                      <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold border border-blue-400">
                        U
                      </div>
                    </button>
                  </div>
                  
                  {isProfileOpen && (<div className="origin-top-right absolute right-0 mt-2 w-64 rounded-md shadow-lg py-2 bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                      {(userRole === types_1.UserRole.BUSINESS_ADMIN || userRole === types_1.UserRole.SUPER_ADMIN) && !isGlobalMode && (<>
                          <link_1.default href="/dashboard/settings" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2" onClick={() => setIsProfileOpen(false)}>
                            <lucide_react_1.Settings className="w-4 h-4"/>
                            Settings
                          </link_1.default>
                          <div className="my-1 border-t border-slate-200 dark:border-slate-700"/>
                        </>)}
                      {(userRole === types_1.UserRole.BUSINESS_ADMIN || userRole === types_1.UserRole.SUPER_ADMIN) && (<>
                          <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Settings
                          </div>
                          <link_1.default href="/dashboard/settings/preferences" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2" onClick={() => setIsProfileOpen(false)}>
                            <lucide_react_1.Sliders className="w-4 h-4"/>
                            {isGlobalMode ? 'System Preferences' : 'System Preferences'}
                          </link_1.default>
                          {!isGlobalMode && (<>
                              <link_1.default href="/dashboard/settings/profile" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2" onClick={() => setIsProfileOpen(false)}>
                                <lucide_react_1.Building className="w-4 h-4"/>
                                Business Profile
                              </link_1.default>
                              <link_1.default href="/dashboard/settings/locations" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2" onClick={() => setIsProfileOpen(false)}>
                                <lucide_react_1.MapPin className="w-4 h-4"/>
                                Locations
                              </link_1.default>
                              <link_1.default href="/dashboard/settings/roles" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2" onClick={() => setIsProfileOpen(false)}>
                                <lucide_react_1.UserCog className="w-4 h-4"/>
                                Roles & Permissions
                              </link_1.default>
                              <link_1.default href="/dashboard/settings/modules" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2" onClick={() => setIsProfileOpen(false)}>
                                <lucide_react_1.ToggleLeft className="w-4 h-4"/>
                                Module Activation
                              </link_1.default>
                              <link_1.default href="/dashboard/settings/integrations" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2" onClick={() => setIsProfileOpen(false)}>
                                <lucide_react_1.Plug className="w-4 h-4"/>
                                Integrations
                              </link_1.default>
                            </>)}
                          <div className="my-2 border-t border-slate-200 dark:border-slate-700"/>
                        </>)}
                      <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2">
                        <lucide_react_1.LogOut className="w-4 h-4"/>
                        Logout
                      </button>
                    </div>)}
                </div>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="-mr-2 flex md:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="bg-slate-800 inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white">
                <span className="sr-only">Open main menu</span>
                <lucide_react_1.Menu className="block h-6 w-6" aria-hidden="true"/>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (<div className="md:hidden bg-slate-800 border-t border-slate-700">
             <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <TopNavigation_1.MobileNavigation enabledModuleIds={enabledModules} userRole={userRole} onMobileClose={() => setIsMobileMenuOpen(false)}/>
             </div>
             <div className="pt-4 pb-3 border-t border-slate-700">
                <div className="flex items-center px-5">
                   <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold border border-blue-400">
                        U
                      </div>
                   </div>
                   <div className="ml-3">
                      <div className="text-base font-medium leading-none text-white">User</div>
                      <div className="text-sm font-medium leading-none text-slate-400">user@example.com</div>
                   </div>
                   <link_1.default href="/dashboard/communications/notifications" className="relative ml-auto bg-slate-800 p-1 rounded-full text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white">
                      <span className="sr-only">View notifications</span>
                      <lucide_react_1.Bell className="h-6 w-6"/>
                      {unreadCount > 0 && (<span className="absolute -top-1 -right-1 text-[10px] font-bold bg-indigo-500 text-white rounded-full px-1.5 py-0.5">
                          {unreadCount}
                        </span>)}
                   </link_1.default>
                </div>
                <div className="mt-3 px-2 space-y-1">
                   {(userRole === types_1.UserRole.BUSINESS_ADMIN || userRole === types_1.UserRole.SUPER_ADMIN) && (<>
                       <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Settings</div>
                       <link_1.default href="/dashboard/settings/preferences" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:text-white hover:bg-slate-700">
                          {isGlobalMode ? 'System Preferences' : 'System Preferences'}
                       </link_1.default>
                       {!isGlobalMode && (<>
                           <link_1.default href="/dashboard/settings/profile" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:text-white hover:bg-slate-700">
                              Business Profile
                           </link_1.default>
                           <link_1.default href="/dashboard/settings/locations" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:text-white hover:bg-slate-700">
                              Locations
                           </link_1.default>
                           <link_1.default href="/dashboard/settings/roles" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:text-white hover:bg-slate-700">
                              Roles & Permissions
                           </link_1.default>
                           <link_1.default href="/dashboard/settings/modules" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:text-white hover:bg-slate-700">
                              Module Activation
                           </link_1.default>
                           <link_1.default href="/dashboard/settings/integrations" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:text-white hover:bg-slate-700">
                              Integrations
                           </link_1.default>
                         </>)}
                       <div className="my-2 border-t border-slate-700"/>
                     </>)}
                   <button onClick={handleLogout} className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:text-white hover:bg-slate-700">
                      Logout
                   </button>
                </div>
             </div>
          </div>)}
      </header>

      {/* Main Content Wrapper */}
      <main className={`flex-1 overflow-y-auto ${isFullWidthPage ? 'w-full' : 'p-4 sm:p-6 lg:p-8 w-full'}`}>
        {shouldShowBusinessSelection ? (<BusinessList businesses={businesses} onSelect={(b) => {
                try {
                    localStorage.setItem('superadminBusinessContext', '1');
                }
                catch { }
                setSelectedBusiness(b);
            }}/>) : (children)}
      </main>

      <link_1.default href="/dashboard/communications/chats" className="group fixed right-4 bottom-[30vh] z-40 flex items-center gap-2 rounded-full bg-slate-950/90 text-white px-3 py-2.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.65)] backdrop-blur border border-indigo-500/30 hover:border-indigo-400/60 hover:bg-slate-900/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 focus:ring-indigo-500 dark:focus:ring-offset-slate-950" aria-label="Open chats">
        <lucide_react_1.MessageSquare className="h-5 w-5 text-indigo-200 group-hover:text-indigo-100"/>
        <span className="text-sm font-semibold hidden sm:inline tracking-wide">Chat</span>
        {unreadCount > 0 && (<>
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse"/>
            <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold bg-indigo-500 text-white rounded-full">
              {unreadCount}
            </span>
          </>)}
      </link_1.default>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center justify-between">
          <span>© {new Date().getFullYear()} {selectedBusiness ? selectedBusiness.name : appName}</span>
          <a href="https://www.giovytech.com.ng" className="text-blue-600 dark:text-blue-400 hover:underline">
            Powered by Giovy Tech
          </a>
        </div>
      </footer>

      <CommandPalette_1.CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} enabledModuleIds={enabledModules} userRole={userRole}/>
    </div>);
}
function DashboardLayout({ children }) {
    return (<business_context_1.BusinessProvider>
      <DashboardContent>{children}</DashboardContent>
    </business_context_1.BusinessProvider>);
}
