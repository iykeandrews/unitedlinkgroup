'use client';

import { useEffect, useState, Suspense, Fragment } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Popover, Transition } from '@headlessui/react';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal, 
  Plus,
  LayoutGrid,
  List as ListIcon,
  User,
  DollarSign,
  Activity,
  Briefcase,
  Download,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../lib/api';
import { useBusiness } from '../../../context/business-context';
import { useAuth } from '../../../context/auth-context';
import { AddTeamMemberModal } from '../../../components/AddTeamMemberModal';
import { EmployeeProfileModal } from '../../../components/EmployeeProfileModal';
import EmployeeSelfProfilePage from '../../../components/people/EmployeeSelfProfilePage';
import { generateEmployeePdf } from '../../../utils/generateEmployeePdf';
import { formatCurrency } from '../../../lib/localization';
import { resolveFileUrl } from '../../../lib/file-url';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  profileImageUrl?: string;
  type: string;
  payType: string;
  hourlyRate?: number;
  salary?: number;
  phone?: string;
  address?: string;
  preferredName?: string;
  pronouns?: string;
  dateOfBirth?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  officialEmail?: string;
  hireDate?: string;
  payrollId?: string;
  workPeriod?: string;
  hoursPerPeriod?: number;
  daysPerPeriod?: number;
  stressProfile?: string;
}

function AdminPeoplePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedBusiness } = useBusiness();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const itemsPerPage = 12; // Increased for grid view

  useEffect(() => {
    fetchEmployees();
  }, [selectedBusiness]);

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setIsAddModalOpen(true);
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('action');
      router.replace(`/dashboard/people${newParams.toString() ? `?${newParams.toString()}` : ''}`);
    }

    const employeeId = searchParams.get('employeeId');
    if (employeeId && employees.length > 0) {
      const employee = employees.find(e => e.id === employeeId);
      if (employee) {
        setSelectedEmployee(employee);
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('employeeId');
        router.replace(`/dashboard/people${newParams.toString() ? `?${newParams.toString()}` : ''}`);
      }
    }
  }, [searchParams, router, employees]);

  const fetchEmployees = async () => {
    try {
      if (!selectedBusiness) {
        setEmployees([]);
        return;
      }
      const res = await api.get('/employees');
      setEmployees(res.data);
      if (selectedEmployee) {
        const updated = res.data.find((e: Employee) => e.id === selectedEmployee.id);
        if (updated) setSelectedEmployee(updated);
      }
    } catch (error) {
      console.error('Failed to fetch employees', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (
      emp.firstName.toLowerCase().includes(searchLower) ||
      emp.lastName.toLowerCase().includes(searchLower) ||
      emp.email.toLowerCase().includes(searchLower) ||
      emp.role.toLowerCase().includes(searchLower)
    );
    
    const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === paginatedEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedEmployees.map(e => e.id)));
    }
  };

  const getPayRates = (emp: Employee) => {
    const baseRate = emp.hourlyRate || (emp.salary ? emp.salary / 2080 : 20);
    return {
      weekday: baseRate,
      saturday: baseRate * 1.5,
      sunday: baseRate * 2.0,
      holiday: baseRate * 2.5
    };
  };

  const getRoleDisplay = (role: string) => {
    if (role === 'BUSINESS_ADMIN') return 'System Administrator';
    if (role === 'MANAGER') return 'Manager';
    return 'Employee';
  };

  const getRoleColor = (role: string) => {
    if (role === 'BUSINESS_ADMIN') return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
    if (role === 'MANAGER') return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-indigo-500 animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-slate-950/50">
      <div className="flex-1 w-full p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            People
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
            Manage your team, roles, and payroll details
          </p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="group relative px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 flex items-center gap-2 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <Plus className="w-5 h-5" />
          <span>Add Team Member</span>
        </button>
      </div>

      <AddTeamMemberModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchEmployees}
      />

      <EmployeeProfileModal
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        employee={selectedEmployee}
        onUpdate={fetchEmployees}
        initialTab={searchParams.get('tab') || undefined}
        highlightQualificationId={searchParams.get('qualificationId') || undefined}
      />

      {/* Controls Bar */}
      <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 p-4 rounded-2xl flex flex-col lg:flex-row justify-between items-center gap-4 shadow-xl">
        <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
          {/* Search */}
          <div className="relative group min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by name, email, or role..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 mx-2 hidden md:block"></div>

          {/* View Toggles */}
          <div className="flex bg-gray-50 dark:bg-slate-900/50 rounded-lg p-1 border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Filters */}
          <Popover className="relative">
            <Popover.Button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {(roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {(roleFilter !== 'ALL' ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0)}
                </span>
              )}
            </Popover.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute right-0 z-30 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 p-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                      Status
                    </label>
                    <div className="space-y-1">
                      {['ALL', 'ACTIVE', 'INACTIVE', 'TERMINATED'].map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                            statusFilter === status
                              ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <span className="capitalize">{status.toLowerCase()}</span>
                          {statusFilter === status && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-slate-700/50"></div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                      Role
                    </label>
                    <div className="space-y-1">
                      {['ALL', 'BUSINESS_ADMIN', 'MANAGER', 'SECURITY_OFFICER'].map((role) => (
                        <button
                          key={role}
                          onClick={() => setRoleFilter(role)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                            roleFilter === role
                              ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <span className="capitalize">{role === 'BUSINESS_ADMIN' ? 'Admin' : role.toLowerCase().replace('_', ' ')}</span>
                          {roleFilter === role && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
                    <div className="pt-2 border-t border-gray-100 dark:border-slate-700/50">
                      <button
                        onClick={() => {
                          setRoleFilter('ALL');
                          setStatusFilter('ALL');
                        }}
                        className="w-full py-2 text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>
        </div>

        {/* Pagination Info */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
          <span>
            Showing <span className="text-gray-900 dark:text-white font-medium">{paginatedEmployees.length}</span> of <span className="text-gray-900 dark:text-white font-medium">{filteredEmployees.length}</span>
          </span>
          <div className="flex gap-1">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Grid/List */}
      <div className="min-h-[500px]">
        {paginatedEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-700/50 border-dashed">
            <User className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No team members found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div 
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {paginatedEmployees.map((employee, index) => {
                  const rates = getPayRates(employee);
                  return (
                    <motion.div
                      key={employee.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`
                        group relative bg-white dark:bg-slate-800/40 backdrop-blur-sm rounded-2xl border transition-all duration-300
                        ${selectedIds.has(employee.id) ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-gray-200 dark:border-slate-700/50 hover:border-indigo-300 dark:hover:border-slate-600'}
                        shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-black/20 hover:-translate-y-1
                      `}
                    >
                      {/* Selection Overlay */}
                      <div className="absolute top-4 left-4 z-10">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-indigo-600 dark:text-indigo-500 focus:ring-offset-0 focus:ring-indigo-500 transition-colors cursor-pointer"
                          checked={selectedIds.has(employee.id)}
                          onChange={() => toggleSelection(employee.id)}
                        />
                      </div>

                      {/* Download Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generateEmployeePdf(employee, selectedBusiness);
                        }}
                        className="absolute top-4 right-4 p-2 rounded-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-gray-200 dark:hover:border-slate-700 text-gray-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 transition-all z-20"
                        title="Download Profile PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {/* Card Content */}
                      <div className="p-6 flex flex-col items-center text-center cursor-pointer" onClick={() => setSelectedEmployee(employee)}>
                        <div className="relative mb-4 w-20 h-20">
                          {employee.profileImageUrl ? (
                            <img
                              src={resolveFileUrl(employee.profileImageUrl)}
                              alt={`${employee.firstName} ${employee.lastName}`}
                              className="w-20 h-20 rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-300 object-cover"
                            />
                          ) : (
                            <Image 
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${employee.firstName} ${employee.lastName}`} 
                              alt={`${employee.firstName} ${employee.lastName}`}
                              fill
                              className="rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-300 object-cover"
                            />
                          )}
                          <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 border-white dark:border-slate-800 flex items-center justify-center ${employee.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-slate-500'}`}></div>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {employee.firstName} {employee.lastName}
                        </h3>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium border mb-4 ${getRoleColor(employee.role)}`}>
                          {getRoleDisplay(employee.role)}
                        </div>

                        <div className="w-full grid grid-cols-2 gap-2 mb-6">
                          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-2 border border-gray-100 dark:border-slate-700/50">
                            <div className="flex items-center justify-center gap-1.5 text-gray-500 dark:text-slate-400 text-xs mb-1">
                              <Activity className="w-3 h-3" />
                              Stress
                            </div>
                            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Low</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-2 border border-gray-100 dark:border-slate-700/50">
                            <div className="flex items-center justify-center gap-1.5 text-gray-500 dark:text-slate-400 text-xs mb-1">
                              <DollarSign className="w-3 h-3" />
                              Rate
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(rates.weekday, selectedBusiness?.currencyCode)}</div>
                          </div>
                        </div>

                        <div className="w-full pt-4 border-t border-gray-100 dark:border-slate-700/50 flex items-center justify-between text-sm">
                          <span className="text-gray-500 flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3" />
                            {employee.type || 'Full Time'}
                          </span>
                          <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium text-xs uppercase tracking-wider">
                            View Profile
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div 
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {/* Modern List View Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50/80 dark:bg-slate-800/80 backdrop-blur-md border border-gray-200 dark:border-slate-700/50 rounded-xl mb-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider shadow-sm">
                  <div className="col-span-1 flex items-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                      checked={selectedIds.size === paginatedEmployees.length && paginatedEmployees.length > 0}
                      onChange={toggleAll}
                    />
                  </div>
                  <div className="col-span-3 flex items-center gap-2 group cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    Employee
                    <ChevronRight className="w-3 h-3 rotate-90 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="col-span-2">Role</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Pay Rate</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                {paginatedEmployees.map((employee, index) => {
                  const rates = getPayRates(employee);
                  return (
                    <motion.div
                      key={employee.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`
                        group grid grid-cols-12 gap-4 items-center px-6 py-4 bg-white dark:bg-slate-800/40 backdrop-blur-sm rounded-xl border transition-all duration-200
                        ${selectedIds.has(employee.id) ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/5' : 'border-gray-200 dark:border-slate-700/50 hover:border-indigo-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800/80'}
                        shadow-sm hover:shadow-md
                      `}
                    >
                      <div className="col-span-1">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500"
                          checked={selectedIds.has(employee.id)}
                          onChange={() => toggleSelection(employee.id)}
                        />
                      </div>
                      <div className="col-span-3 flex items-center gap-3 cursor-pointer" onClick={() => setSelectedEmployee(employee)}>
                        <div className="relative w-10 h-10 rounded-full overflow-hidden">
                          {employee.profileImageUrl ? (
                            <img
                              src={resolveFileUrl(employee.profileImageUrl)}
                              alt={`${employee.firstName} ${employee.lastName}`}
                              className="w-10 h-10 object-cover"
                            />
                          ) : (
                            <Image 
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${employee.firstName} ${employee.lastName}`} 
                              alt={`${employee.firstName} ${employee.lastName}`}
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{employee.email}</div>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleColor(employee.role)}`}>
                          {getRoleDisplay(employee.role)}
                        </span>
                      </div>
                      <div className="col-span-2">
                         <div className="flex items-center gap-2">
                           <span className={`w-2 h-2 rounded-full ${employee.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-400 dark:bg-slate-500'}`}></span>
                           <span className="text-sm text-gray-700 dark:text-slate-300 capitalize">{employee.status?.toLowerCase() || 'Active'}</span>
                         </div>
                      </div>
                      <div className="col-span-2 text-sm text-gray-900 dark:text-slate-300">
                        {formatCurrency(rates.weekday, selectedBusiness?.currencyCode)} <span className="text-gray-500 text-xs">/hr</span>
                      </div>
                      <div className="col-span-2 flex justify-end gap-1">
                        <button 
                          onClick={(e) => {
                             e.stopPropagation();
                             generateEmployeePdf(employee, selectedBusiness);
                          }}
                          className="p-2 text-gray-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => setSelectedEmployee(employee)}
                          className="p-2 text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  </div>
  );
}

export default function PeoplePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading People...</div>;
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading People...</div>}>
      {String(user?.role || '').toUpperCase() === 'EMPLOYEE' ? <EmployeeSelfProfilePage /> : <AdminPeoplePageContent />}
    </Suspense>
  );
}
