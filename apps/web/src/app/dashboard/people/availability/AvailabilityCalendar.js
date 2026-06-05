"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAvailableOnDate = void 0;
exports.AvailabilityCalendar = AvailabilityCalendar;
const react_1 = __importDefault(require("react"));
const date_fns_1 = require("date-fns");
const isAvailableOnDate = (availability, date) => {
    var _a;
    const dateDay = (0, date_fns_1.format)(date, 'eee').toLowerCase(); // 'mon', 'tue', ...
    const start = new Date(availability.startDate);
    const endOn = availability.endOn ? new Date(availability.endOn) : null;
    // Check date range
    if ((0, date_fns_1.isBefore)(date, (0, date_fns_1.startOfDay)(start)))
        return false;
    if (endOn && (0, date_fns_1.isAfter)(date, (0, date_fns_1.endOfDay)(endOn)))
        return false;
    // Check repetition
    if (availability.repeat === 'DOES_NOT_REPEAT') {
        return (0, date_fns_1.isSameDay)(date, start);
    }
    if (availability.repeat === 'WEEKLY') {
        const repeatDays = ((_a = availability.repeatDays) === null || _a === void 0 ? void 0 : _a.split(',').map(d => d.trim().toLowerCase())) || [];
        return repeatDays.includes(dateDay);
    }
    return false;
};
exports.isAvailableOnDate = isAvailableOnDate;
function AvailabilityCalendar({ employees, availabilities, startDate, endDate, onEdit }) {
    const days = (0, date_fns_1.eachDayOfInterval)({ start: startDate, end: endDate });
    const getEmployeeAvailabilityForDay = (employeeId, date) => {
        return availabilities.filter(a => a.employeeId === employeeId && (0, exports.isAvailableOnDate)(a, date));
    };
    return (<div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col h-[calc(100vh-250px)]">
      {/* Calendar Legend - Moved Header Controls to Parent */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-end items-center bg-gray-50 dark:bg-slate-900">
        <div className="flex gap-2 text-sm">
           <div className="flex items-center gap-1">
             <div className="w-3 h-3 bg-green-100 border border-green-300 rounded-sm"></div>
             <span className="text-gray-600 dark:text-gray-400">Available</span>
           </div>
           <div className="flex items-center gap-1">
             <div className="w-3 h-3 bg-red-100 border border-red-300 rounded-sm"></div>
             <span className="text-gray-600 dark:text-gray-400">Unavailable</span>
           </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (Employees) */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto">
          <div className="h-12 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 sticky top-0 z-10 flex items-center px-4 font-medium text-sm text-gray-500">
            Employee
          </div>
          {employees.map(employee => (<div key={employee.id} className="h-20 px-4 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors" onClick={() => onEdit(employee)}>
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                {employee.firstName[0]}{employee.lastName[0]}
              </div>
              <div className="overflow-hidden">
                <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                  {employee.firstName} {employee.lastName}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {employee.role.replace('_', ' ')}
                </div>
              </div>
            </div>))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
          <div className="min-w-[800px]">
            {/* Days Header */}
            <div className="flex sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
              {days.map(day => (<div key={day.toISOString()} className={`flex-1 p-3 text-center border-r border-gray-100 dark:border-slate-700 last:border-r-0 ${(0, date_fns_1.isSameDay)(day, new Date()) ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}>
                  <div className={`text-sm font-semibold ${(0, date_fns_1.isSameDay)(day, new Date()) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
                    {(0, date_fns_1.format)(day, 'EEE')}
                  </div>
                  <div className={`text-xs ${(0, date_fns_1.isSameDay)(day, new Date()) ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-500'}`}>
                    {(0, date_fns_1.format)(day, 'MMM d')}
                  </div>
                </div>))}
            </div>

            {/* Cells */}
            <div>
              {employees.map(employee => (<div key={employee.id} className="flex h-20 border-b border-gray-100 dark:border-slate-700/50">
                  {days.map(day => {
                const dayAvailabilities = getEmployeeAvailabilityForDay(employee.id, day);
                return (<div key={day.toISOString()} className="flex-1 border-r border-gray-100 dark:border-slate-700/50 p-1 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors" onClick={() => onEdit(employee)}>
                        <div className="flex flex-col gap-1 h-full overflow-y-auto custom-scrollbar">
                          {dayAvailabilities.length > 0 ? (dayAvailabilities.map((a, idx) => (<div key={idx} className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${a.isAvailable
                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'}`} title={a.comment || (a.isAvailable ? 'Available' : 'Unavailable')}>
                                {a.allDay ? 'All Day' : `${(0, date_fns_1.format)(new Date(a.startDate), 'HH:mm')} - ${a.endDate ? (0, date_fns_1.format)(new Date(a.endDate), 'HH:mm') : '?'}`}
                                {a.comment && <span className="ml-1 opacity-75">- {a.comment}</span>}
                              </div>))) : (<div className="h-full w-full flex items-center justify-center opacity-0 hover:opacity-100">
                               <span className="text-xs text-gray-300 dark:text-slate-600">+</span>
                            </div>)}
                        </div>
                      </div>);
            })}
                </div>))}
            </div>
          </div>
        </div>
      </div>
    </div>);
}
