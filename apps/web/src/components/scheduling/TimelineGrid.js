"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelineGrid = TimelineGrid;
const react_1 = __importDefault(require("react"));
const core_1 = require("@dnd-kit/core");
const date_fns_1 = require("date-fns");
const ShiftCard_1 = require("./ShiftCard");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
const isShiftInDay = (shift, day) => {
    const dayStart = (0, date_fns_1.startOfDay)(day);
    const dayEnd = (0, date_fns_1.endOfDay)(day);
    const shiftStart = new Date(shift.startTime);
    const shiftEnd = shift.endTime ? new Date(shift.endTime) : null;
    if (!shiftEnd) {
        const now = new Date();
        const isStartDay = (0, date_fns_1.isSameDay)(shiftStart, day);
        const isTodayWhileInProgress = (0, date_fns_1.isSameDay)(now, day) && (now.getTime() >= shiftStart.getTime());
        return isStartDay || isTodayWhileInProgress;
    }
    return (((0, date_fns_1.isBefore)(shiftStart, dayEnd) || (0, date_fns_1.isSameDay)(shiftStart, dayEnd)) &&
        ((0, date_fns_1.isAfter)(shiftEnd, dayStart) || (0, date_fns_1.isSameDay)(shiftEnd, dayStart)));
};
function TimelineGrid({ view, groupBy, startDate, locations, employees, shifts, collapsed = false, readOnly = false, onShiftClick, onAddShiftAtLocation, onAddShiftForEmployee, currentUserId }) {
    const days = Array.from({ length: view === 'week' ? 7 : 1 }).map((_, i) => {
        return (0, date_fns_1.addDays)(startDate, i);
    });
    return (<div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
      <div className="min-w-[1000px]">
        {/* Header */}
        <div className="flex sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="w-64 flex-shrink-0 p-4 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          </div>
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
            {days.map(day => (<div key={day.toISOString()} className={`p-3 text-center border-r border-slate-200 dark:border-slate-700 last:border-r-0 ${(0, date_fns_1.isToday)(day) ? 'bg-purple-50 dark:bg-purple-900/10' : ''}`}>
                <div className={`text-sm font-semibold ${(0, date_fns_1.isToday)(day) ? 'text-purple-600 dark:text-purple-400' : 'text-slate-900 dark:text-white'}`}>
                  {(0, date_fns_1.format)(day, 'EEE')} <span className="ml-1 text-slate-500 dark:text-slate-400 font-normal">{(0, date_fns_1.format)(day, 'd')}</span>
                </div>
              </div>))}
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {/* Row Group Label */}
          <div className="flex bg-white dark:bg-slate-800">
            <div className="w-64 flex-shrink-0 p-3 pl-10 border-r border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <div className="w-8 h-4 rounded bg-slate-200 dark:bg-slate-700"/>
              <span className="text-sm font-medium text-slate-500">
                {groupBy === 'area' ? 'Locations' : 'Employees'}
              </span>
            </div>
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
              {days.map(day => (<div key={day.toISOString()} className="border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"></div>))}
            </div>
          </div>

          {groupBy === 'area' ? (<>
              {locations.map((location, idx) => (<LocationRow key={location.id} location={location} days={days} shifts={shifts.filter(s => s.locationId === location.id)} onShiftClick={onShiftClick} onAddShift={(locationId, date) => onAddShiftAtLocation(locationId, date)} colorIndex={idx} collapsed={collapsed} readOnly={readOnly} currentUserId={currentUserId}/>))}
              
              {/* Unassigned Shifts Row */}
              {shifts.some(s => !s.locationId || !locations.find(l => l.id === s.locationId)) && (<LocationRow key="unassigned" location={{
                    id: 'unassigned',
                    name: 'Unassigned / No Location',
                    address: '',
                    code: 'N/A'
                }} days={days} shifts={shifts.filter(s => !s.locationId || !locations.find(l => l.id === s.locationId))} onShiftClick={onShiftClick} onAddShift={(locationId, date) => {
                    // Cannot add to unassigned
                    sonner_1.toast.error('Cannot add shifts to Unassigned row. Please pick a location.');
                }} colorIndex={locations.length} collapsed={collapsed} readOnly={readOnly} currentUserId={currentUserId}/>)}

              {locations.length === 0 && !shifts.some(s => !s.locationId || !locations.find(l => l.id === s.locationId)) && (<div className="p-8 text-center text-slate-500">
                  No active locations found.
                </div>)}
            </>) : (<>
              {employees.map((employee, idx) => (<EmployeeRow key={employee.id} employee={employee} days={days} shifts={shifts.filter(s => s.employeeId === employee.id)} onShiftClick={onShiftClick} onAddShift={(employeeId, date) => onAddShiftForEmployee(employeeId, date)} colorIndex={idx} collapsed={collapsed} readOnly={readOnly} currentUserId={currentUserId}/>))}
              {employees.length === 0 && (<div className="p-8 text-center text-slate-500">
                  No active employees found.
                </div>)}
            </>)}
        </div>
        

      </div>
    </div>);
}
const LOCATION_COLORS = [
    { bg: 'bg-purple-500', text: 'text-purple-500' },
    { bg: 'bg-red-500', text: 'text-red-500' },
    { bg: 'bg-blue-500', text: 'text-blue-500' },
    { bg: 'bg-green-500', text: 'text-green-500' },
    { bg: 'bg-orange-500', text: 'text-orange-500' },
];
function LocationRow({ location, days, shifts, onShiftClick, onAddShift, colorIndex, collapsed, readOnly, currentUserId }) {
    var _a;
    const color = LOCATION_COLORS[colorIndex % LOCATION_COLORS.length];
    return (<div className="flex bg-white dark:bg-slate-800 group/row">
      <div className="w-64 flex-shrink-0 p-3 border-r border-slate-200 dark:border-slate-700 flex items-start gap-3">
        {/* Color Strip */}
        <div className={`w-1.5 h-6 rounded-full mt-1 ${color.bg}`}/>
        
        <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                {location.name}
                <span className="text-[10px] text-slate-400 font-normal border border-slate-200 dark:border-slate-600 rounded px-1">
                    {location.code || 'LOC'}
                </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {((_a = location.client) === null || _a === void 0 ? void 0 : _a.name) || 'No Client'}
            </div>
            {location.address && (<div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {location.address}
                </div>)}
        </div>
      </div>

      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
        {days.map(day => (<DroppableCell key={day.toISOString()} date={day} locationId={location.id} shifts={shifts.filter(s => isShiftInDay(s, day))} onShiftClick={onShiftClick} onAddShift={() => onAddShift(location.id, day)} collapsed={collapsed} readOnly={readOnly} currentUserId={currentUserId}/>))}
      </div>
    </div>);
}
function DroppableCell({ date, locationId, shifts, onShiftClick, onAddShift, collapsed, readOnly, currentUserId }) {
    const { isOver, setNodeRef } = (0, core_1.useDroppable)({
        id: `cell-${locationId}-${date.toISOString()}`,
        data: {
            type: 'cell',
            locationId,
            date,
        },
    });
    return (<div ref={setNodeRef} className={`border-r border-slate-200 dark:border-slate-700 p-2 transition-colors relative group/cell ${collapsed ? 'min-h-[48px]' : 'min-h-[100px]'} ${isOver ? 'bg-purple-50 dark:bg-purple-900/30 ring-1 ring-inset ring-purple-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
      <div className={`flex flex-col h-full ${collapsed ? '' : 'gap-2'}`}>
        {!collapsed && shifts.map(shift => (<div key={shift.id} className="min-h-[40px]">
            <ShiftCard_1.ShiftCard shift={shift} onEdit={onShiftClick} draggable={!readOnly} isMine={shift.employeeId === currentUserId}/>
          </div>))}
        
        {!readOnly && (<div className={`flex-1 flex items-end justify-center ${collapsed ? 'py-0' : 'py-2'} opacity-0 group-hover/cell:opacity-100 transition-opacity`}>
               <button onClick={(e) => {
                e.stopPropagation();
                onAddShift();
            }} className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
                   <lucide_react_1.Plus className="w-4 h-4"/>
               </button>
          </div>)}
      </div>
    </div>);
}
function EmployeeRow({ employee, days, shifts, onShiftClick, onAddShift, colorIndex, collapsed, readOnly, currentUserId }) {
    const color = LOCATION_COLORS[colorIndex % LOCATION_COLORS.length];
    return (<div className="flex bg-white dark:bg-slate-800 group/row">
      <div className="w-64 flex-shrink-0 p-3 border-r border-slate-200 dark:border-slate-700 flex items-start gap-3">
        <div className={`w-1.5 h-6 rounded-full mt-1 ${color.bg}`}/>
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {employee.firstName} {employee.lastName}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {employee.role || 'Employee'}
          </div>
        </div>
      </div>
      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
        {days.map(day => (<EmployeeDroppableCell key={day.toISOString()} date={day} employeeId={employee.id} shifts={shifts.filter(s => isShiftInDay(s, day))} onShiftClick={onShiftClick} onAddShift={() => onAddShift(employee.id, day)} collapsed={collapsed} readOnly={readOnly} currentUserId={currentUserId}/>))}
      </div>
    </div>);
}
function EmployeeDroppableCell({ date, employeeId, shifts, onShiftClick, onAddShift, collapsed, readOnly, currentUserId }) {
    const { isOver, setNodeRef } = (0, core_1.useDroppable)({
        id: `cell-emp-${employeeId}-${date.toISOString()}`,
        data: {
            type: 'cell',
            employeeId,
            date,
        },
    });
    return (<div ref={setNodeRef} className={`border-r border-slate-200 dark:border-slate-700 p-2 transition-colors relative group/cell ${collapsed ? 'min-h-[48px]' : 'min-h-[100px]'} ${isOver ? 'bg-purple-50 dark:bg-purple-900/30 ring-1 ring-inset ring-purple-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
      <div className={`flex flex-col h-full ${collapsed ? '' : 'gap-2'}`}>
        {!collapsed && shifts.map(shift => (<div key={shift.id} className="min-h-[40px]">
            <ShiftCard_1.ShiftCard shift={shift} onEdit={onShiftClick} draggable={!readOnly} isMine={shift.employeeId === currentUserId}/>
          </div>))}
        {!readOnly && (<div className={`flex-1 flex items-end justify-center ${collapsed ? 'py-0' : 'py-2'} opacity-0 group-hover/cell:opacity-100 transition-opacity`}>
            <button onClick={(e) => {
                e.stopPropagation();
                onAddShift();
            }} className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
              <lucide_react_1.Plus className="w-4 h-4"/>
            </button>
          </div>)}
      </div>
    </div>);
}
