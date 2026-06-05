"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeSidebar = EmployeeSidebar;
const react_1 = __importStar(require("react"));
const core_1 = require("@dnd-kit/core");
const lucide_react_1 = require("lucide-react");
function EmployeeSidebar({ employees, shifts, allShifts, statusFilter, onStatusFilterChange }) {
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const filteredEmployees = employees.filter(emp => `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()));
    const summary = (0, react_1.useMemo)(() => {
        const status = (s) => String(s.status || '').toUpperCase();
        const total = allShifts.length;
        const empty = allShifts.filter(s => status(s) === 'EMPTY').length;
        const unpublished = allShifts.filter(s => status(s) === 'DRAFT' || status(s) === 'CANCELLED').length;
        const published = allShifts.filter(s => status(s) === 'PUBLISHED').length;
        const open = allShifts.filter(s => status(s) === 'OPEN').length;
        return { total, empty, unpublished, published, open };
    }, [allShifts]);
    return (<div className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full min-h-0 z-10 shadow-sm">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-4">
        <div className="relative">
          <lucide_react_1.Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400"/>
          <input type="text" placeholder="Search" className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
        </div>

        {/* Open Shifts - Draggable template */}
        <DraggableOpenShift />
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredEmployees.map(emp => {
            const empShifts = shifts.filter(s => s.employeeId === emp.id);
            const shiftCount = empShifts.length;
            // Total scheduled hours including breaks
            const totalHours = empShifts.reduce((sum, s) => {
                if (!s.endTime)
                    return sum;
                const start = new Date(s.startTime);
                const end = new Date(s.endTime);
                const hours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
                return sum + hours;
            }, 0);
            const hoursLabel = `${Math.round(totalHours * 10) / 10}h`;
            const detail = `${shiftCount} shift${shiftCount === 1 ? '' : 's'} • ${hoursLabel}`;
            return <DraggableEmployee key={emp.id} employee={emp} detail={detail}/>;
        })}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
          Schedule filters
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusChip label="All" count={summary.total} active={statusFilter === 'ALL'} onClick={() => onStatusFilterChange('ALL')}/>
          <StatusChip label="Unpublished" count={summary.unpublished} active={statusFilter === 'UNPUBLISHED'} onClick={() => onStatusFilterChange('UNPUBLISHED')}/>
          <StatusChip label="Published" count={summary.published} active={statusFilter === 'PUBLISHED'} onClick={() => onStatusFilterChange('PUBLISHED')}/>
          <StatusChip label="Open" count={summary.open} active={statusFilter === 'OPEN'} onClick={() => onStatusFilterChange('OPEN')}/>
          <StatusChip label="Empty" count={summary.empty} active={statusFilter === 'EMPTY'} onClick={() => onStatusFilterChange('EMPTY')}/>
        </div>
      </div>
    </div>);
}
function StatusChip({ label, count, active, onClick }) {
    return (<button type="button" onClick={onClick} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${active
            ? 'bg-purple-600 text-white border-purple-600'
            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
      <span>{label}</span>
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200'}`}>
        {count}
      </span>
    </button>);
}
function DraggableEmployee({ employee, detail }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = (0, core_1.useDraggable)({
        id: `employee-${employee.id}`,
        data: {
            type: 'employee',
            employee
        }
    });
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;
    return (<div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 cursor-grab hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-3 ${isDragging ? 'opacity-50 z-50 shadow-xl rounded-lg border' : ''}`}>
      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-bold">
        {employee.firstName[0]}{employee.lastName[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
          {employee.firstName} {employee.lastName}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {detail}
        </div>
      </div>
    </div>);
}
function DraggableOpenShift() {
    const { attributes, listeners, setNodeRef, transform, isDragging } = (0, core_1.useDraggable)({
        id: `open-shifts-template`,
        data: {
            type: 'open_shift',
        }
    });
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;
    return (<div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800 cursor-grab hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center gap-3 ${isDragging ? 'opacity-50 z-50 shadow-xl' : ''}`} title="Drag to a location day cell to create an open shift">
      <div className="w-8 h-8 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center text-purple-700 dark:text-purple-300 text-xs font-bold">
        OS
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900 dark:text-white">Open shift</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">09:00–17:00</div>
      </div>
    </div>);
}
