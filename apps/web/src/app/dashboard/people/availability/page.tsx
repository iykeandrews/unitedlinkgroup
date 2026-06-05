'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AvailabilityCalendar, isAvailableOnDate, Availability } from './AvailabilityCalendar';
import { 
  Plus,
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  Edit,
  CalendarCheck,
  Calendar as CalendarIcon,
  Filter,
  List,
  X,
  ArrowRight
} from 'lucide-react';
import api from '../../../../lib/api';
import { EmployeeProfileModal } from '../../../../components/EmployeeProfileModal';
import { useAuth } from '../../../../context/auth-context';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  subDays, 
  differenceInDays,
  eachDayOfInterval
} from 'date-fns';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  availability?: any[];
  status: string;
}

const defaultAvailabilityForm = {
  id: '',
  isAvailable: true,
  startDate: '',
  endDate: '',
  allDay: true,
  repeat: 'DOES_NOT_REPEAT',
  repeatDays: [] as string[],
  endOption: '',
  endOn: '',
  comment: '',
};

function AvailabilityPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeAvailabilityModalOpen, setEmployeeAvailabilityModalOpen] = useState(false);
  const [availabilityForm, setAvailabilityForm] = useState(defaultAvailabilityForm);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filterAvailable, setFilterAvailable] = useState(false);
  
  // Date Range State
  const [startDate, setStartDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState(() => endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [allAvailabilities, setAllAvailabilities] = useState<Availability[]>([]);
  const itemsPerPage = 10;
  const isEmployeeUser = String(user?.role || '').toUpperCase() === 'EMPLOYEE';

  useEffect(() => {
    fetchEmployees();
    fetchAvailabilities();
  }, [isEmployeeUser]);

  // Date Range Handlers
  const handlePrevRange = () => {
    const diff = differenceInDays(endDate, startDate) + 1;
    setStartDate(prev => subDays(prev, diff));
    setEndDate(prev => subDays(prev, diff));
  };

  const handleNextRange = () => {
    const diff = differenceInDays(endDate, startDate) + 1;
    setStartDate(prev => addDays(prev, diff));
    setEndDate(prev => addDays(prev, diff));
  };

  const handleToday = () => {
    setStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setEndDate(endOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (!value) return;
    const date = new Date(value);
    if (type === 'start') {
      setStartDate(date);
      if (date > endDate) setEndDate(date);
    } else {
      setEndDate(date);
      if (date < startDate) setStartDate(date);
    }
  };

  const handleSearch = () => {
    setSearchQuery(inputValue);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setInputValue('');
    setCurrentPage(1);
  };

  useEffect(() => {
    const employeeId = searchParams.get('employeeId');
    if (employeeId && employees.length > 0) {
      const employee = employees.find(e => e.id === employeeId);
      if (employee) {
        setSelectedEmployee(employee);
        // Clean up URL
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('employeeId');
        router.replace(`/dashboard/people/availability?${newParams.toString()}`);
      }
    }
  }, [searchParams, router, employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      if (isEmployeeUser) {
        const res = await api.get('/employees/me');
        setEmployees(res.data ? [res.data] : []);
      } else {
        const res = await api.get('/employees');
        setEmployees(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch employees', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailabilities = async () => {
    try {
      const res = await api.get(isEmployeeUser ? '/employees/me/availability' : '/employees/availability/all');
      setAllAvailabilities(res.data);
    } catch (error) {
      console.error('Failed to fetch availabilities', error);
    }
  };

  // Filter and Pagination Logic
  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (
      emp.firstName.toLowerCase().includes(searchLower) ||
      emp.lastName.toLowerCase().includes(searchLower) ||
      emp.email.toLowerCase().includes(searchLower)
    );

    if (!matchesSearch) return false;

    if (filterAvailable) {
      // Check if employee is available on ANY day in the range
      // If startDate > endDate, interval throws error, so we handle it
      if (startDate > endDate) return false;

      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const empAvailabilities = allAvailabilities.filter(a => a.employeeId === emp.id);
      
      const isAvailableInRange = days.some(day => 
        empAvailabilities.some(a => isAvailableOnDate(a, day) && a.isAvailable)
      );
      
      if (!isAvailableInRange) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEdit = (employee: Employee) => {
    if (isEmployeeUser) return;
    setSelectedEmployee(employee);
  };

  const handleView = (employee: Employee) => {
    if (isEmployeeUser) return;
    setSelectedEmployee(employee);
  };

  const resetAvailabilityForm = () => {
    setAvailabilityForm(defaultAvailabilityForm);
  };

  const openCreateAvailabilityModal = () => {
    resetAvailabilityForm();
    setEmployeeAvailabilityModalOpen(true);
  };

  const openEditAvailabilityModal = (availability: Availability) => {
    setAvailabilityForm({
      id: availability.id,
      isAvailable: availability.isAvailable,
      startDate: availability.startDate ? format(new Date(availability.startDate), "yyyy-MM-dd'T'HH:mm") : '',
      endDate: availability.endDate ? format(new Date(availability.endDate), "yyyy-MM-dd'T'HH:mm") : '',
      allDay: availability.allDay,
      repeat: availability.repeat || 'DOES_NOT_REPEAT',
      repeatDays: availability.repeatDays ? availability.repeatDays.split(',').map((d) => d.trim()).filter(Boolean) : [],
      endOption: availability.endOption || '',
      endOn: availability.endOn ? format(new Date(availability.endOn), 'yyyy-MM-dd') : '',
      comment: availability.comment || '',
    });
    setEmployeeAvailabilityModalOpen(true);
  };

  const saveEmployeeAvailability = async () => {
    try {
      setSavingAvailability(true);
      const payload: any = {
        isAvailable: availabilityForm.isAvailable,
        startDate: new Date(availabilityForm.startDate).toISOString(),
        endDate: availabilityForm.endDate ? new Date(availabilityForm.endDate).toISOString() : null,
        allDay: availabilityForm.allDay,
        repeat: availabilityForm.repeat,
        repeatDays: availabilityForm.repeatDays,
        endOption: availabilityForm.endOption || null,
        endOn: availabilityForm.endOn ? new Date(availabilityForm.endOn).toISOString() : null,
        comment: availabilityForm.comment || null,
      };
      if (availabilityForm.id) {
        await api.patch(`/employees/me/availability/${availabilityForm.id}`, payload);
      } else {
        await api.post('/employees/me/availability', payload);
      }
      await fetchAvailabilities();
      setEmployeeAvailabilityModalOpen(false);
      resetAvailabilityForm();
    } catch (error) {
      console.error('Failed to save availability', error);
    } finally {
      setSavingAvailability(false);
    }
  };

  const deleteEmployeeAvailability = async () => {
    if (!availabilityForm.id) return;
    try {
      setSavingAvailability(true);
      await api.delete(`/employees/me/availability/${availabilityForm.id}`);
      await fetchAvailabilities();
      setEmployeeAvailabilityModalOpen(false);
      resetAvailabilityForm();
    } catch (error) {
      console.error('Failed to delete availability', error);
    } finally {
      setSavingAvailability(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Availability</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEmployeeUser ? 'Review your availability and constraints' : 'Manage employee availability and constraints'}
          </p>
        </div>
        {isEmployeeUser ? (
          <button
            type="button"
            onClick={openCreateAvailabilityModal}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Add Availability
          </button>
        ) : null}
      </div>

      {!isEmployeeUser ? (
        <EmployeeProfileModal
          isOpen={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          employee={selectedEmployee}
          onUpdate={fetchEmployees}
          initialTab="Availability"
        />
      ) : null}

      {isEmployeeUser && employeeAvailabilityModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {availabilityForm.id ? 'Edit Availability' : 'Add Availability'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your own availability schedule.</p>
              </div>
              <button onClick={() => setEmployeeAvailabilityModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 py-5">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Availability</span>
                <select
                  value={availabilityForm.isAvailable ? 'available' : 'unavailable'}
                  onChange={(e) => setAvailabilityForm((prev) => ({ ...prev, isAvailable: e.target.value === 'available' }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Repeat</span>
                <select
                  value={availabilityForm.repeat}
                  onChange={(e) => setAvailabilityForm((prev) => ({ ...prev, repeat: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="DOES_NOT_REPEAT">Does not repeat</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Start</span>
                <input
                  type="datetime-local"
                  value={availabilityForm.startDate}
                  onChange={(e) => setAvailabilityForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">End</span>
                <input
                  type="datetime-local"
                  value={availabilityForm.endDate}
                  onChange={(e) => setAvailabilityForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex items-center gap-3 md:col-span-2">
                <input
                  type="checkbox"
                  checked={availabilityForm.allDay}
                  onChange={(e) => setAvailabilityForm((prev) => ({ ...prev, allDay: e.target.checked }))}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">All day</span>
              </label>
              {availabilityForm.repeat === 'WEEKLY' ? (
                <div className="md:col-span-2 space-y-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Repeat days</span>
                  <div className="flex flex-wrap gap-2">
                    {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                      const selected = availabilityForm.repeatDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            setAvailabilityForm((prev) => ({
                              ...prev,
                              repeatDays: selected ? prev.repeatDays.filter((d) => d !== day) : [...prev.repeatDays, day],
                            }))
                          }
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${selected ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300'}`}
                        >
                          {day.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <label className="md:col-span-2 space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Comment</span>
                <textarea
                  value={availabilityForm.comment}
                  onChange={(e) => setAvailabilityForm((prev) => ({ ...prev, comment: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-slate-700">
              <div>
                {availabilityForm.id ? (
                  <button
                    type="button"
                    onClick={deleteEmployeeAvailability}
                    disabled={savingAvailability}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-60"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEmployeeAvailabilityModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEmployeeAvailability}
                  disabled={savingAvailability || !availabilityForm.startDate}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {savingAvailability ? 'Saving...' : availabilityForm.id ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Action Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-lg">
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto overflow-x-auto">
          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-slate-900 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              Calendar
            </button>
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-2 hidden md:block" />

          {/* Date Range Picker - Always visible */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900 rounded-lg p-1">
               <button onClick={handlePrevRange} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-500">
                 <ChevronLeft className="w-4 h-4" />
               </button>
               <button onClick={handleToday} className="px-2 py-1 text-xs font-medium hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-600 dark:text-gray-300">
                 Today
               </button>
               <button onClick={handleNextRange} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-500">
                 <ChevronRight className="w-4 h-4" />
               </button>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1">
              <input 
                type="date" 
                value={format(startDate, 'yyyy-MM-dd')}
                onChange={(e) => handleDateChange('start', e.target.value)}
                className="text-sm border-none focus:ring-0 p-0 w-[110px] bg-transparent text-gray-900 dark:text-white"
              />
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <input 
                type="date" 
                value={format(endDate, 'yyyy-MM-dd')}
                onChange={(e) => handleDateChange('end', e.target.value)}
                className="text-sm border-none focus:ring-0 p-0 w-[110px] bg-transparent text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-2 hidden md:block" />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div className="relative inline-flex items-center">
                <input 
                  type="checkbox" 
                  checked={filterAvailable} 
                  onChange={(e) => setFilterAvailable(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Available Only</span>
            </label>
          </div>

          {!isEmployeeUser ? <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-2 hidden md:block" /> : null}

          {!isEmployeeUser ? (
            <div className="flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search employees" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-l-lg text-sm w-48 focus:ring-1 focus:ring-indigo-500 outline-none dark:bg-slate-900 dark:text-white"
                />
              </div>
              <button 
                onClick={handleSearch}
                className="bg-indigo-700 text-white px-4 py-2 rounded-r-lg text-sm font-medium hover:bg-indigo-800 transition-colors"
              >
                Search
              </button>
              {(searchQuery || inputValue) && (
                <button 
                  onClick={handleClearSearch}
                  className="ml-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Clear Search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : null}
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-slate-700 px-2 py-1 rounded text-sm">
            <span>Page {currentPage}</span>
          </div>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      {viewMode === 'list' ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-white dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white">Employee</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white">Status</th>
                  {!isEmployeeUser ? <th className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={isEmployeeUser ? 3 : 4} className="px-6 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : paginatedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={isEmployeeUser ? 3 : 4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      {isEmployeeUser ? 'No availability records found.' : 'No employees found.'}
                    </td>
                  </tr>
                ) : (
                  paginatedEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium">
                            {employee.firstName[0]}{employee.lastName[0]}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {employee.firstName} {employee.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {employee.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {employee.role.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CalendarCheck className="w-3 h-3" />
                          Active
                        </span>
                      </td>
                      {!isEmployeeUser ? (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleView(employee)}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                              title="View Availability"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleEdit(employee)}
                              className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors"
                              title="Edit Availability"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      ) : (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => {
                              const employeeAvailability = allAvailabilities.find((a) => a.employeeId === employee.id);
                              if (employeeAvailability) openEditAvailabilityModal(employeeAvailability);
                              else openCreateAvailabilityModal();
                            }}
                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors"
                            title="Edit Availability"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <AvailabilityCalendar 
          employees={filteredEmployees}
          availabilities={allAvailabilities}
          startDate={startDate}
          endDate={endDate}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
}

export default function AvailabilityPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AvailabilityPageContent />
    </Suspense>
  );
}
