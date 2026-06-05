import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { format, addDays, isSameDay, isToday, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';
import { Location, Shift, ViewType, GroupBy, Employee, EmployeeClockStatus } from './types';
import { ShiftCard } from './ShiftCard';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface TimelineGridProps {
  view: ViewType;
  groupBy: GroupBy;
  startDate: Date;
  locations: Location[];
  employees: Employee[];
  shifts: Shift[];
  shiftClockStatuses: Record<string, EmployeeClockStatus>;
  shiftPlacementLocks: Record<string, boolean>;
  collapsed?: boolean;
  readOnly?: boolean;
  onShiftClick: (shift: Shift) => void;
  onAddShiftAtLocation: (locationId: string, date: Date) => void;
  onAddShiftForEmployee: (employeeId: string, date: Date) => void;
  currentUserId?: string;
}

const isShiftInDay = (shift: Shift, day: Date) => {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const shiftStart = new Date(shift.startTime);
  const shiftEnd = shift.endTime ? new Date(shift.endTime) : null;

  if (!shiftEnd) {
    const now = new Date();
    const isStartDay = isSameDay(shiftStart, day);
    const isTodayWhileInProgress = isSameDay(now, day) && (now.getTime() >= shiftStart.getTime());
    return isStartDay || isTodayWhileInProgress;
  }

  return (
    (isBefore(shiftStart, dayEnd) || isSameDay(shiftStart, dayEnd)) &&
    (isAfter(shiftEnd, dayStart) || isSameDay(shiftEnd, dayStart))
  );
};

export function TimelineGrid({ view, groupBy, startDate, locations, employees, shifts, shiftClockStatuses, shiftPlacementLocks, collapsed = false, readOnly = false, onShiftClick, onAddShiftAtLocation, onAddShiftForEmployee, currentUserId }: TimelineGridProps) {
  const days = Array.from({ length: view === 'week' ? 7 : 1 }).map((_, i) => {
    return addDays(startDate, i);
  });

  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
      <div className="min-w-[1000px]">
        {/* Header */}
        <div className="flex sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="w-64 flex-shrink-0 p-4 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          </div>
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
            {days.map(day => (
              <div key={day.toISOString()} className={`p-3 text-center border-r border-slate-200 dark:border-slate-700 last:border-r-0 ${isToday(day) ? 'bg-purple-50 dark:bg-purple-900/10' : ''}`}>
                <div className={`text-sm font-semibold ${isToday(day) ? 'text-purple-600 dark:text-purple-400' : 'text-slate-900 dark:text-white'}`}>
                  {format(day, 'EEE')} <span className="ml-1 text-slate-500 dark:text-slate-400 font-normal">{format(day, 'd')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {/* Row Group Label */}
          <div className="flex bg-white dark:bg-slate-800">
            <div className="w-64 flex-shrink-0 p-3 pl-10 border-r border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <div className="w-8 h-4 rounded bg-slate-200 dark:bg-slate-700" />
              <span className="text-sm font-medium text-slate-500">
                {groupBy === 'area' ? 'Locations' : 'Employees'}
              </span>
            </div>
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
              {days.map(day => (
                <div key={day.toISOString()} className="border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"></div>
              ))}
            </div>
          </div>

          {groupBy === 'area' ? (
            <>
              {locations.map((location, idx) => (
                <LocationRow
                  key={location.id}
                  location={location}
                  days={days}
                  shifts={shifts.filter(s => s.locationId === location.id)}
                  onShiftClick={onShiftClick}
                  onAddShift={(locationId, date) => onAddShiftAtLocation(locationId, date)}
                  colorIndex={idx}
                  collapsed={collapsed}
                  readOnly={readOnly}
                  currentUserId={currentUserId}
                  shiftClockStatuses={shiftClockStatuses}
                  shiftPlacementLocks={shiftPlacementLocks}
                />
              ))}
              
              {/* Unassigned Shifts Row */}
              {shifts.some(s => !s.locationId || !locations.find(l => l.id === s.locationId)) && (
                <LocationRow
                  key="unassigned"
                  location={{
                    id: 'unassigned',
                    name: 'Unassigned / No Location',
                    address: '',
                    code: 'N/A'
                  }}
                  days={days}
                  shifts={shifts.filter(s => !s.locationId || !locations.find(l => l.id === s.locationId))}
                  onShiftClick={onShiftClick}
                  onAddShift={(_locationId, _date) => {
                      // Cannot add to unassigned
                      toast.error('Cannot add shifts to Unassigned row. Please pick a location.');
                  }}
                  colorIndex={locations.length}
                  collapsed={collapsed}
                  readOnly={readOnly}
                  currentUserId={currentUserId}
                  shiftClockStatuses={shiftClockStatuses}
                  shiftPlacementLocks={shiftPlacementLocks}
                />
              )}

              {locations.length === 0 && !shifts.some(s => !s.locationId || !locations.find(l => l.id === s.locationId)) && (
                <div className="p-8 text-center text-slate-500">
                  No active locations found.
                </div>
              )}
            </>
          ) : (
            <>
              {employees.map((employee, idx) => (
                <EmployeeRow
                  key={employee.id}
                  employee={employee}
                  days={days}
                  shifts={shifts.filter(s => s.employeeId === employee.id)}
                  onShiftClick={onShiftClick}
                  onAddShift={(employeeId, date) => onAddShiftForEmployee(employeeId, date)}
                  colorIndex={idx}
                  collapsed={collapsed}
                  readOnly={readOnly}
                  currentUserId={currentUserId}
                  shiftClockStatuses={shiftClockStatuses}
                  shiftPlacementLocks={shiftPlacementLocks}
                />
              ))}
              {employees.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No active employees found.
                </div>
              )}
            </>
          )}
        </div>
        

      </div>
    </div>
  );
}

const LOCATION_COLORS = [
    { bg: 'bg-purple-500', text: 'text-purple-500' },
    { bg: 'bg-red-500', text: 'text-red-500' },
    { bg: 'bg-blue-500', text: 'text-blue-500' },
    { bg: 'bg-green-500', text: 'text-green-500' },
    { bg: 'bg-orange-500', text: 'text-orange-500' },
];

function LocationRow({ location, days, shifts, onShiftClick, onAddShift, colorIndex, collapsed, readOnly, currentUserId, shiftClockStatuses, shiftPlacementLocks }: { 
    location: Location, 
    days: Date[], 
    shifts: Shift[], 
    onShiftClick: (shift: Shift) => void,
    onAddShift: (locationId: string, date: Date) => void,
    colorIndex: number,
    collapsed: boolean,
    readOnly: boolean,
    currentUserId?: string,
    shiftClockStatuses: Record<string, EmployeeClockStatus>,
    shiftPlacementLocks: Record<string, boolean>
}) {
  const color = LOCATION_COLORS[colorIndex % LOCATION_COLORS.length];

  return (
    <div className="flex bg-white dark:bg-slate-800 group/row">
      <div className="w-64 flex-shrink-0 p-3 border-r border-slate-200 dark:border-slate-700 flex items-start gap-3">
        {/* Color Strip */}
        <div className={`w-1.5 h-6 rounded-full mt-1 ${color.bg}`} />
        
        <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                {location.name}
                <span className="text-[10px] text-slate-400 font-normal border border-slate-200 dark:border-slate-600 rounded px-1">
                    {location.code || 'LOC'}
                </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {location.client?.name || 'No Client'}
            </div>
            {location.address && (
                <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {location.address}
                </div>
            )}
        </div>
      </div>

      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
        {days.map(day => (
          <DroppableCell
            key={day.toISOString()}
            date={day}
            locationId={location.id}
            shifts={shifts.filter(s => isShiftInDay(s, day))}
            onShiftClick={onShiftClick}
            onAddShift={() => onAddShift(location.id, day)}
            collapsed={collapsed}
            readOnly={readOnly}
            currentUserId={currentUserId}
            shiftClockStatuses={shiftClockStatuses}
            shiftPlacementLocks={shiftPlacementLocks}
          />
        ))}
      </div>
    </div>
  );
}

function DroppableCell({ date, locationId, shifts, onShiftClick, onAddShift, collapsed, readOnly, currentUserId, shiftClockStatuses, shiftPlacementLocks }: { 
    date: Date, 
    locationId: string, 
    shifts: Shift[], 
    onShiftClick: (shift: Shift) => void,
    onAddShift: () => void,
    collapsed?: boolean,
    readOnly?: boolean,
    currentUserId?: string,
    shiftClockStatuses?: Record<string, EmployeeClockStatus>,
    shiftPlacementLocks: Record<string, boolean>
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `cell-${locationId}-${date.toISOString()}`,
    data: {
      type: 'cell',
      locationId,
      date,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`border-r border-slate-200 dark:border-slate-700 p-2 transition-colors relative group/cell ${
        collapsed ? 'min-h-[48px]' : 'min-h-[100px]'
      } ${isOver ? 'bg-purple-50 dark:bg-purple-900/30 ring-1 ring-inset ring-purple-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
    >
      <div className={`flex flex-col h-full ${collapsed ? '' : 'gap-2'}`}>
        {!collapsed && shifts.map(shift => (
          <div key={shift.id} className="min-h-[40px]">
            <ShiftCard
              shift={shift}
              onEdit={onShiftClick}
              draggable={!readOnly && !shiftPlacementLocks[shift.id]}
              isMine={shift.employeeId === currentUserId}
              employeeClockStatus={shiftClockStatuses?.[shift.id]}
            />
          </div>
        ))}
        
        {!readOnly && (
          <div className={`flex-1 flex items-end justify-center ${collapsed ? 'py-0' : 'py-2'} opacity-0 group-hover/cell:opacity-100 transition-opacity`}>
               <button 
                  onClick={(e) => {
                      e.stopPropagation();
                      onAddShift();
                  }}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
               >
                   <Plus className="w-4 h-4" />
               </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeRow({ employee, days, shifts, onShiftClick, onAddShift, colorIndex, collapsed, readOnly, currentUserId, shiftClockStatuses, shiftPlacementLocks }: {
  employee: Employee;
  days: Date[];
  shifts: Shift[];
  onShiftClick: (shift: Shift) => void;
  onAddShift: (employeeId: string, date: Date) => void;
  colorIndex: number;
  collapsed: boolean;
  readOnly: boolean;
  currentUserId?: string;
  shiftClockStatuses: Record<string, EmployeeClockStatus>;
  shiftPlacementLocks: Record<string, boolean>;
}) {
  const color = LOCATION_COLORS[colorIndex % LOCATION_COLORS.length];
  return (
    <div className="flex bg-white dark:bg-slate-800 group/row">
      <div className="w-64 flex-shrink-0 p-3 border-r border-slate-200 dark:border-slate-700 flex items-start gap-3">
        <div className={`w-1.5 h-6 rounded-full mt-1 ${color.bg}`} />
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
        {days.map(day => (
          <EmployeeDroppableCell
            key={day.toISOString()}
            date={day}
            employeeId={employee.id}
            shifts={shifts.filter(s => isShiftInDay(s, day))}
            onShiftClick={onShiftClick}
            onAddShift={() => onAddShift(employee.id, day)}
            collapsed={collapsed}
            readOnly={readOnly}
            currentUserId={currentUserId}
            shiftClockStatuses={shiftClockStatuses}
            shiftPlacementLocks={shiftPlacementLocks}
          />
        ))}
      </div>
    </div>
  );
}

function EmployeeDroppableCell({ date, employeeId, shifts, onShiftClick, onAddShift, collapsed, readOnly, currentUserId, shiftClockStatuses, shiftPlacementLocks }: {
  date: Date;
  employeeId: string;
  shifts: Shift[];
  onShiftClick: (shift: Shift) => void;
  onAddShift: () => void;
  collapsed?: boolean;
  readOnly?: boolean;
  currentUserId?: string;
  shiftClockStatuses: Record<string, EmployeeClockStatus>;
  shiftPlacementLocks: Record<string, boolean>;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `cell-emp-${employeeId}-${date.toISOString()}`,
    data: {
      type: 'cell',
      employeeId,
      date,
    },
  });
  return (
    <div
      ref={setNodeRef}
      className={`border-r border-slate-200 dark:border-slate-700 p-2 transition-colors relative group/cell ${
        collapsed ? 'min-h-[48px]' : 'min-h-[100px]'
      } ${isOver ? 'bg-purple-50 dark:bg-purple-900/30 ring-1 ring-inset ring-purple-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
    >
      <div className={`flex flex-col h-full ${collapsed ? '' : 'gap-2'}`}>
        {!collapsed && shifts.map(shift => (
          <div key={shift.id} className="min-h-[40px]">
            <ShiftCard
              shift={shift}
              onEdit={onShiftClick}
              draggable={!readOnly && !shiftPlacementLocks[shift.id]}
              isMine={shift.employeeId === currentUserId}
              employeeClockStatus={shiftClockStatuses[shift.id]}
            />
          </div>
        ))}
        {!readOnly && (
          <div className={`flex-1 flex items-end justify-center ${collapsed ? 'py-0' : 'py-2'} opacity-0 group-hover/cell:opacity-100 transition-opacity`}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddShift();
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
