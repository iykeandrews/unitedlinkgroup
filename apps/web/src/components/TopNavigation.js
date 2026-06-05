"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopNavigation = TopNavigation;
exports.MobileNavigation = MobileNavigation;
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const modules_1 = require("../lib/modules");
const navigation_config_1 = require("../lib/navigation-config");
const types_1 = require("@unitedlinkgroup/types");
const business_context_1 = require("@/context/business-context");
function TopNavigation({ enabledModuleIds, userRole }) {
    const pathname = (0, navigation_1.usePathname)();
    const normalizedRole = String(userRole || '').toUpperCase();
    const [openDropdown, setOpenDropdown] = (0, react_1.useState)(null);
    const navRef = (0, react_1.useRef)(null);
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    // Close dropdowns when clicking outside
    (0, react_1.useEffect)(() => {
        function handleClickOutside(event) {
            if (navRef.current && !navRef.current.contains(event.target)) {
                setOpenDropdown(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    // Close dropdown on route change
    (0, react_1.useEffect)(() => {
        setTimeout(() => setOpenDropdown(null), 0);
    }, [pathname]);
    const hasAccess = (moduleId) => (0, modules_1.canAccessModule)(normalizedRole || null, moduleId);
    const vendorModule = modules_1.MODULES.find((module) => module.id === 'Vendors') || null;
    const showVendorNavItem = normalizedRole === types_1.UserRole.SUPER_ADMIN &&
        !!(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id) &&
        !!vendorModule &&
        hasAccess('Vendors');
    const isAlwaysVisible = (moduleId) => moduleId === 'My_Profile' || moduleId.startsWith('Comm_') || moduleId.startsWith('Settings_');
    const getVisibleModules = (moduleIds) => {
        return moduleIds
            .filter(id => (enabledModuleIds.includes(id) || isAlwaysVisible(id)) && hasAccess(id))
            .map(id => modules_1.MODULES.find(m => m.id === id))
            .filter((m) => !!m);
    };
    // Industry modules are integrated within Operations group; no separate industry dropdown
    const getGroupColor = (groupLabel) => {
        switch (groupLabel) {
            case 'Operations': return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', groupHover: 'group-hover:text-blue-600 dark:group-hover:text-blue-400' };
            case 'People': return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', groupHover: 'group-hover:text-purple-600 dark:group-hover:text-purple-400' };
            case 'Finance': return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', groupHover: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400' };
            case 'Requests': return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', groupHover: 'group-hover:text-orange-600 dark:group-hover:text-orange-400' };
            case 'Insights': return { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', groupHover: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400' };
            default: return { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', groupHover: 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400' };
        }
    };
    const renderDropdown = (label, modules) => {
        // Always use mega menu style for professional look if it's a dropdown
        const isOpen = openDropdown === label;
        const isActiveGroup = modules.some(m => m.route === pathname);
        const colors = getGroupColor(label);
        const categories = Array.from(new Set(modules.map(m => m.category)));
        const hasMultipleCategories = categories.length > 1;
        const categoryOrder = (a, b) => {
            if (a === 'Core' && b !== 'Core')
                return -1;
            if (b === 'Core' && a !== 'Core')
                return 1;
            return a.localeCompare(b);
        };
        const grouped = {};
        modules.forEach(m => {
            const key = m.category;
            if (!grouped[key])
                grouped[key] = [];
            grouped[key].push(m);
        });
        const orderedCategories = categories.sort(categoryOrder);
        const orderedModules = hasMultipleCategories
            ? orderedCategories.flatMap(cat => grouped[cat])
            : modules;
        const columns = [[], [], []];
        orderedModules.forEach((m, i) => {
            columns[i % 3].push(m);
        });
        return (<div className="" key={label}>
        <button onClick={() => setOpenDropdown(isOpen ? null : label)} className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActiveGroup || isOpen
                ? 'bg-slate-800 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
          {label}
          <lucide_react_1.ChevronDown className={`ml-1 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
        </button>

        {isOpen && (<div className="fixed left-0 top-16 w-full bg-white dark:bg-slate-900 shadow-2xl border-t border-slate-200 dark:border-slate-800 z-50 animate-in fade-in slide-in-from-top-4 duration-300 ease-out">
             <div className="w-[90%] mx-auto px-4 py-12">
              <div className="grid grid-cols-3 gap-12">

                  {columns.map((columnModules, colIndex) => (<div key={colIndex} className={`${colIndex < 2 ? 'border-r border-slate-200 dark:border-slate-800' : ''} pr-8`}>
                      <div className="space-y-6">
                        {hasMultipleCategories && columnModules.length > 0 && (<div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {columnModules[0].category}
                          </div>)}
                        {columnModules.map((module) => {
                        const isActive = pathname === module.route;
                        return (<link_1.default key={module.id} href={module.route} onClick={() => setOpenDropdown(null)} className={`group flex items-start p-4 rounded-xl transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:shadow-sm ${isActive ? 'bg-slate-50 dark:bg-slate-800 ring-1 ring-blue-500/20' : ''}`}>
                                    <div className={`p-3 rounded-lg mr-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-md ${isActive ? `${colors.bg} ${colors.text}` : `bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:${colors.bg.replace('bg-', 'bg-')} ${colors.groupHover}`}`}>
                                      <module.icon className={`h-8 w-8 transition-colors duration-300 ${isActive ? '' : `group-hover:${colors.text.split(' ')[0]}`}`}/>
                                    </div>
                                    <div className="flex flex-col pt-1">
                                        <span className={`text-base font-bold transition-colors duration-200 ${isActive ? 'text-blue-600 dark:text-blue-400' : `text-slate-900 dark:text-white ${colors.groupHover}`}`}>
                                          {module.name}
                                        </span>
                                        <span className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                                          {module.description}
                                        </span>
                                    </div>
                                </link_1.default>);
                    })}
                      </div>
                    </div>))}
                </div>
             </div>
          </div>)}
      </div>);
    };
    const renderNavLink = (module) => {
        const isActive = pathname === module.route;
        return (<link_1.default key={module.id} href={module.route} className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${isActive
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
        <module.icon className="h-4 w-4 mr-2"/>
        {module.name}
      </link_1.default>);
    };
    return (<nav ref={navRef} className="flex items-center space-x-1">
      {/* Always show Dashboard first */}
      {renderNavLink(modules_1.MODULES.find(m => m.id === 'Dashboard'))}

      {/* Render Configured Groups */}
      {navigation_config_1.NAV_GROUPS.map(group => {
            const groupModules = getVisibleModules(group.moduleIds);
            if (groupModules.length === 0)
                return null;
            if (groupModules.length === 1) {
                return renderNavLink(groupModules[0]);
            }
            return renderDropdown(group.label, groupModules);
        })}

      {showVendorNavItem ? renderNavLink(vendorModule) : null}

      {/* No extra industry dropdown */}
    </nav>);
}
// Mobile Navigation Component
function MobileNavigation({ enabledModuleIds, userRole, onMobileClose }) {
    const pathname = (0, navigation_1.usePathname)();
    const normalizedRole = String(userRole || '').toUpperCase();
    const [expandedGroup, setExpandedGroup] = (0, react_1.useState)(null);
    const onClose = onMobileClose || (() => { });
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const hasAccess = (moduleId) => (0, modules_1.canAccessModule)(normalizedRole || null, moduleId);
    const vendorModule = modules_1.MODULES.find((module) => module.id === 'Vendors') || null;
    const showVendorNavItem = normalizedRole === types_1.UserRole.SUPER_ADMIN &&
        !!(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id) &&
        !!vendorModule &&
        hasAccess('Vendors');
    const VendorIcon = vendorModule === null || vendorModule === void 0 ? void 0 : vendorModule.icon;
    const isAlwaysVisible = (moduleId) => moduleId === 'My_Profile' || moduleId.startsWith('Comm_') || moduleId.startsWith('Settings_');
    const getVisibleModules = (moduleIds) => {
        return moduleIds
            .filter(id => (enabledModuleIds.includes(id) || isAlwaysVisible(id)) && hasAccess(id))
            .map(id => modules_1.MODULES.find(m => m.id === id))
            .filter((m) => !!m);
    };
    // No separate industry modules on mobile; integrated under Operations
    const toggleGroup = (label) => {
        setExpandedGroup(expandedGroup === label ? null : label);
    };
    return (<div className="space-y-1 pt-2 pb-3">
       {/* Dashboard */}
       <link_1.default href="/dashboard" onClick={onClose} className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/dashboard' ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
          <div className="flex items-center">
            <lucide_react_1.LayoutDashboard className="mr-3 h-5 w-5"/>
            Dashboard
          </div>
        </link_1.default>

        {/* Groups */}
        {navigation_config_1.NAV_GROUPS.map(group => {
            const groupModules = getVisibleModules(group.moduleIds);
            if (groupModules.length === 0)
                return null;
            if (groupModules.length === 1) {
                const m = groupModules[0];
                return (<link_1.default key={m.id} href={m.route} onClick={onClose} className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === m.route ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                <div className="flex items-center">
                  <m.icon className="mr-3 h-5 w-5"/>
                  {m.name}
                </div>
              </link_1.default>);
            }
            const isExpanded = expandedGroup === group.label;
            return (<div key={group.label} className="space-y-1">
              <button onClick={() => toggleGroup(group.label)} className="w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-700 hover:text-white">
                <div className="flex items-center">
                  {group.icon && <group.icon className="mr-3 h-5 w-5"/>}
                  {group.label}
                </div>
                <lucide_react_1.ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
              </button>
              
              {isExpanded && (<div className="pl-4 space-y-1">
                  {groupModules.map(m => (<link_1.default key={m.id} href={m.route} onClick={onClose} className={`block px-3 py-2 rounded-md text-sm font-medium ${pathname === m.route ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                      <div className="flex items-center">
                        <m.icon className="mr-3 h-4 w-4"/>
                        {m.name}
                      </div>
                    </link_1.default>))}
                </div>)}
            </div>);
        })}

        {showVendorNavItem ? (<link_1.default href={vendorModule.route} onClick={onClose} className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === vendorModule.route ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
            <div className="flex items-center">
              {VendorIcon ? <VendorIcon className="mr-3 h-5 w-5"/> : null}
              {vendorModule.name}
            </div>
          </link_1.default>) : null}

        {/* No separate Industry groups on mobile */}
    </div>);
}
