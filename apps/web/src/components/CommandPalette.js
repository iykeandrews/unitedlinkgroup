"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandPalette = CommandPalette;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
const framer_motion_1 = require("framer-motion");
const modules_1 = require("../lib/modules");
function CommandPalette({ isOpen, onClose, enabledModuleIds, userRole }) {
    const router = (0, navigation_1.useRouter)();
    const [query, setQuery] = (0, react_1.useState)('');
    const [selectedIndex, setSelectedIndex] = (0, react_1.useState)(0);
    const [recentModules, setRecentModules] = (0, react_1.useState)([]);
    // Load recent modules from localStorage on mount
    (0, react_1.useEffect)(() => {
        const saved = localStorage.getItem('recentModules');
        if (saved) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setRecentModules(JSON.parse(saved));
        }
    }, []);
    const addToRecents = (0, react_1.useCallback)((moduleId) => {
        const updated = [moduleId, ...recentModules.filter(id => id !== moduleId)].slice(0, 5);
        setRecentModules(updated);
        localStorage.setItem('recentModules', JSON.stringify(updated));
    }, [recentModules]);
    const hasAccess = (0, react_1.useCallback)((moduleId) => (0, modules_1.canAccessModule)(userRole, moduleId), [userRole]);
    // Filter modules based on query and access
    const filteredModules = (0, react_1.useMemo)(() => {
        if (!query)
            return [];
        return modules_1.MODULES.filter(module => {
            const isEnabled = enabledModuleIds.includes(module.id) || module.id.startsWith('Settings_') || module.id.startsWith('Comm_');
            const matchesQuery = module.name.toLowerCase().includes(query.toLowerCase()) ||
                module.description.toLowerCase().includes(query.toLowerCase());
            return isEnabled && hasAccess(module.id) && matchesQuery;
        }).slice(0, 10); // Limit to 10 results
    }, [query, enabledModuleIds, hasAccess]);
    const displayedModules = (0, react_1.useMemo)(() => {
        if (!query) {
            // Show recently accessed modules when query is empty
            return recentModules
                .map(id => modules_1.MODULES.find(m => m.id === id))
                .filter((m) => !!m && (enabledModuleIds.includes(m.id) || m.id.startsWith('Settings_')) && hasAccess(m.id));
        }
        return filteredModules;
    }, [query, recentModules, filteredModules, enabledModuleIds, hasAccess]);
    const handleSelect = (0, react_1.useCallback)((module) => {
        addToRecents(module.id);
        router.push(module.route);
        onClose();
        setQuery('');
    }, [addToRecents, router, onClose]);
    // Keyboard navigation
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (e) => {
            if (!isOpen)
                return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % displayedModules.length);
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + displayedModules.length) % displayedModules.length);
            }
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (displayedModules[selectedIndex]) {
                    handleSelect(displayedModules[selectedIndex]);
                }
            }
            else if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, displayedModules, selectedIndex, onClose, handleSelect]);
    // Prevent body scroll when open
    (0, react_1.useEffect)(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);
    return (<framer_motion_1.AnimatePresence>
      {isOpen && (<div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose}/>
          
          <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }} className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
            {/* Search Input */}
            <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <lucide_react_1.Search className="w-5 h-5 text-slate-400 mr-3"/>
              <input type="text" value={query} onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
            }} placeholder="Search modules, reports, settings..." className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400 text-lg" autoFocus/>
              <div className="flex items-center gap-2">
                <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400 opacity-100">
                  <span className="text-xs">ESC</span>
                </kbd>
              </div>
            </div>

            {/* Results List */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {displayedModules.length === 0 ? (<div className="py-12 text-center text-slate-500 dark:text-slate-400">
                  {query ? 'No modules found matching your search.' : 'Start typing to search...'}
                </div>) : (<>
                  {!query && recentModules.length > 0 && (<div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Recently Accessed
                    </div>)}
                  {displayedModules.map((module, index) => (<framer_motion_1.motion.button key={module.id} layout onClick={() => handleSelect(module)} onMouseEnter={() => setSelectedIndex(index)} className={`w-full flex items-center p-3 rounded-lg transition-colors ${index === selectedIndex
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                      <div className={`p-2 rounded-md mr-4 ${index === selectedIndex
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        {query ? <module.icon className="w-5 h-5"/> : <lucide_react_1.Clock className="w-5 h-5"/>}
                      </div>
                      
                      <div className="flex-1 text-left">
                        <div className={`font-medium ${index === selectedIndex
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-900 dark:text-white'}`}>
                          {module.name}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                          {module.description}
                        </div>
                      </div>

                      {index === selectedIndex && (<lucide_react_1.ArrowRight className="w-4 h-4 text-blue-500 dark:text-blue-400"/>)}
                    </framer_motion_1.motion.button>))}
                </>)}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
              <div className="flex gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="font-sans px-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">↵</kbd>
                  to select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-sans px-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">↑↓</kbd>
                  to navigate
                </span>
              </div>
            </div>
          </framer_motion_1.motion.div>
        </div>)}
    </framer_motion_1.AnimatePresence>);
}
