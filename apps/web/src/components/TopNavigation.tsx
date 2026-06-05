
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, LayoutDashboard } from 'lucide-react';
import { canAccessModule, MODULES, Module } from '../lib/modules';
import { NAV_GROUPS } from '../lib/navigation-config';
import { UserRole } from '@unitedlinkgroup/types';
import { useBusiness } from '@/context/business-context';

interface TopNavigationProps {
  enabledModuleIds: string[];
  userRole: string | null;
  onMobileClose?: () => void;
}

export function TopNavigation({ enabledModuleIds, userRole }: TopNavigationProps) {
  const pathname = usePathname();
  const normalizedRole = String(userRole || '').toUpperCase();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const { selectedBusiness } = useBusiness();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setTimeout(() => setOpenDropdown(null), 0);
  }, [pathname]);

  const hasAccess = (moduleId: string) => canAccessModule(normalizedRole || null, moduleId);
  const vendorModule = MODULES.find((module) => module.id === 'Vendors') || null;
  const showVendorNavItem =
    normalizedRole === UserRole.SUPER_ADMIN &&
    !!selectedBusiness?.id &&
    !!vendorModule &&
    hasAccess('Vendors');

  const isAlwaysVisible = (moduleId: string) =>
    moduleId === 'My_Profile' || moduleId.startsWith('Comm_') || moduleId.startsWith('Settings_');

  const getVisibleModules = (moduleIds: string[]) => {
    return moduleIds
      .filter(id => (enabledModuleIds.includes(id) || isAlwaysVisible(id)) && hasAccess(id))
      .map(id => MODULES.find(m => m.id === id))
      .filter((m): m is Module => !!m);
  };

  // Industry modules are integrated within Operations group; no separate industry dropdown

  const getGroupColor = (groupLabel: string) => {
    switch (groupLabel) {
      case 'Operations': return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', groupHover: 'group-hover:text-blue-600 dark:group-hover:text-blue-400' };
      case 'People': return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', groupHover: 'group-hover:text-purple-600 dark:group-hover:text-purple-400' };
      case 'Finance': return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', groupHover: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400' };
      case 'Requests': return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', groupHover: 'group-hover:text-orange-600 dark:group-hover:text-orange-400' };
      case 'Insights': return { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', groupHover: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400' };
      default: return { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', groupHover: 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400' };
    }
  };

  const renderDropdown = (label: string, modules: Module[]) => {
    // Always use mega menu style for professional look if it's a dropdown
    const isOpen = openDropdown === label;
    const isActiveGroup = modules.some(m => m.route === pathname);
    const colors = getGroupColor(label);

    const categories = Array.from(new Set(modules.map(m => m.category)));
    const hasMultipleCategories = categories.length > 1;
    const categoryOrder = (a: string, b: string) => {
      if (a === 'Core' && b !== 'Core') return -1;
      if (b === 'Core' && a !== 'Core') return 1;
      return a.localeCompare(b);
    };
    const grouped: Record<string, Module[]> = {};
    modules.forEach(m => {
      const key = m.category;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });
    const orderedCategories = categories.sort(categoryOrder);
    const orderedModules = hasMultipleCategories
      ? orderedCategories.flatMap(cat => grouped[cat])
      : modules;
    const columns: Module[][] = [[], [], []];
    orderedModules.forEach((m, i) => {
      columns[i % 3].push(m);
    });

    return (
      <div className="" key={label}>
        <button
          onClick={() => setOpenDropdown(isOpen ? null : label)}
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActiveGroup || isOpen
              ? 'bg-slate-800 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          {label}
          <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div 
            className="fixed left-0 top-16 w-full bg-white dark:bg-slate-900 shadow-2xl border-t border-slate-200 dark:border-slate-800 z-50 animate-in fade-in slide-in-from-top-4 duration-300 ease-out"
          >
             <div className="w-[90%] mx-auto px-4 py-12">
              <div className="grid grid-cols-3 gap-12">

                  {columns.map((columnModules, colIndex) => (
                    <div key={colIndex} className={`${colIndex < 2 ? 'border-r border-slate-200 dark:border-slate-800' : ''} pr-8`}>
                      <div className="space-y-6">
                        {hasMultipleCategories && columnModules.length > 0 && (
                          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {columnModules[0].category}
                          </div>
                        )}
                        {columnModules.map((module) => {
                            const isActive = pathname === module.route;
                            return (
                                <Link
                                    key={module.id}
                                    href={module.route}
                                    onClick={() => setOpenDropdown(null)}
                                    className={`group flex items-start p-4 rounded-xl transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:shadow-sm ${
                                        isActive ? 'bg-slate-50 dark:bg-slate-800 ring-1 ring-blue-500/20' : ''
                                    }`}
                                >
                                    <div className={`p-3 rounded-lg mr-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-md ${
                                      isActive ? `${colors.bg} ${colors.text}` : `bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:${colors.bg.replace('bg-', 'bg-')} ${colors.groupHover}`
                                    }`}>
                                      <module.icon className={`h-8 w-8 transition-colors duration-300 ${isActive ? '' : `group-hover:${colors.text.split(' ')[0]}`}`} />
                                    </div>
                                    <div className="flex flex-col pt-1">
                                        <span className={`text-base font-bold transition-colors duration-200 ${
                                          isActive ? 'text-blue-600 dark:text-blue-400' : `text-slate-900 dark:text-white ${colors.groupHover}`
                                        }`}>
                                          {module.name}
                                        </span>
                                        <span className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                                          {module.description}
                                        </span>
                                    </div>
                                </Link>
                            )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}
      </div>
    );
  };

  const renderNavLink = (module: Module) => {
    const isActive = pathname === module.route;
    return (
      <Link
        key={module.id}
        href={module.route}
        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <module.icon className="h-4 w-4 mr-2" />
        {module.name}
      </Link>
    );
  };

  return (
    <nav ref={navRef} className="flex items-center space-x-1">
      {/* Always show Dashboard first */}
      {hasAccess('Dashboard') ? renderNavLink(MODULES.find(m => m.id === 'Dashboard')!) : null}

      {/* Render Configured Groups */}
      {NAV_GROUPS.map(group => {
        const groupModules = getVisibleModules(group.moduleIds);
        
        if (groupModules.length === 0) return null;
        
        if (groupModules.length === 1) {
          return renderNavLink(groupModules[0]);
        }

        return renderDropdown(group.label, groupModules);
      })}

      {showVendorNavItem ? renderNavLink(vendorModule!) : null}

      {/* No extra industry dropdown */}
    </nav>
  );
}

// Mobile Navigation Component
export function MobileNavigation({ enabledModuleIds, userRole, onMobileClose }: TopNavigationProps) {
  const pathname = usePathname();
  const normalizedRole = String(userRole || '').toUpperCase();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const onClose = onMobileClose || (() => {});
  const { selectedBusiness } = useBusiness();

  const hasAccess = (moduleId: string) => canAccessModule(normalizedRole || null, moduleId);
  const vendorModule = MODULES.find((module) => module.id === 'Vendors') || null;
  const showVendorNavItem =
    normalizedRole === UserRole.SUPER_ADMIN &&
    !!selectedBusiness?.id &&
    !!vendorModule &&
    hasAccess('Vendors');
  const VendorIcon = vendorModule?.icon;

  const isAlwaysVisible = (moduleId: string) =>
    moduleId === 'My_Profile' || moduleId.startsWith('Comm_') || moduleId.startsWith('Settings_');

  const getVisibleModules = (moduleIds: string[]) => {
    return moduleIds
      .filter(id => (enabledModuleIds.includes(id) || isAlwaysVisible(id)) && hasAccess(id))
      .map(id => MODULES.find(m => m.id === id))
      .filter((m): m is Module => !!m);
  };

  // No separate industry modules on mobile; integrated under Operations

  const toggleGroup = (label: string) => {
    setExpandedGroup(expandedGroup === label ? null : label);
  };

  return (
    <div className="space-y-1 pt-2 pb-3">
       {/* Dashboard */}
       {hasAccess('Dashboard') ? (
         <Link
            href="/dashboard"
            onClick={onClose}
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname === '/dashboard' ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <div className="flex items-center">
              <LayoutDashboard className="mr-3 h-5 w-5" />
              Dashboard
            </div>
          </Link>
       ) : null}

        {/* Groups */}
        {NAV_GROUPS.map(group => {
          const groupModules = getVisibleModules(group.moduleIds);
          if (groupModules.length === 0) return null;

          if (groupModules.length === 1) {
             const m = groupModules[0];
             return (
               <Link
                key={m.id}
                href={m.route}
                onClick={onClose}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === m.route ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <m.icon className="mr-3 h-5 w-5" />
                  {m.name}
                </div>
              </Link>
             )
          }

          const isExpanded = expandedGroup === group.label;
          return (
            <div key={group.label} className="space-y-1">
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <div className="flex items-center">
                  {group.icon && <group.icon className="mr-3 h-5 w-5" />}
                  {group.label}
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              
              {isExpanded && (
                <div className="pl-4 space-y-1">
                  {groupModules.map(m => {
                    return (
                      <Link
                        key={m.id}
                        href={m.route}
                        onClick={onClose}
                        className={`block px-3 py-2 rounded-md text-sm font-medium ${
                          pathname === m.route ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center">
                          <m.icon className="mr-3 h-4 w-4" />
                          {m.name}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {showVendorNavItem ? (
          <Link
            href={vendorModule!.route}
            onClick={onClose}
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname === vendorModule!.route ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <div className="flex items-center">
              {VendorIcon ? <VendorIcon className="mr-3 h-5 w-5" /> : null}
              {vendorModule!.name}
            </div>
          </Link>
        ) : null}

        {/* No separate Industry groups on mobile */}
    </div>
  );
}
