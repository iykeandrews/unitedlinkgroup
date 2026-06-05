import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, User } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { useBusiness } from '../../context/business-context';
import { UserRole } from '@unitedlinkgroup/types';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email?: string;
  departmentId?: string | null;
}

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  department?: any;
}

export default function DepartmentModal({ isOpen, onClose, onSuccess, department }: DepartmentModalProps) {
  const { selectedBusiness } = useBusiness();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [members, setMembers] = useState<Employee[]>([]);
  const [memberToAddId, setMemberToAddId] = useState('');
  const [membersLoading, setMembersLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (department) {
      setName(department.name);
      setDescription(department.description || '');
      setManagerId(department.managerId || '');
    } else {
      setName('');
      setDescription('');
      setManagerId('');
    }
  }, [department, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      fetchRole();
      if (department?.id) {
        fetchMembers(department.id);
      } else {
        setMembers([]);
        setMemberToAddId('');
      }
    }
  }, [isOpen, department?.id]);

  const fetchRole = async () => {
    try {
      const res = await api.get('/auth/profile');
      setUserRole(res.data?.role ?? null);
    } catch {
      setUserRole(null);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (error) {
      console.error('Failed to fetch employees', error);
    }
  };

  const fetchMembers = async (departmentId: string) => {
    try {
      setMembersLoading(true);
      const res = await api.get(`/departments/${departmentId}/members`);
      setMembers(res.data || []);
    } catch (error: any) {
      const raw = error?.response?.data?.message;
      const message = Array.isArray(raw) ? raw.join(', ') : raw || 'Failed to load department members';
      toast.error(message);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const addMember = async () => {
    if (!department?.id) return;
    if (!memberToAddId) {
      toast.error('Select an employee to add');
      return;
    }
    try {
      await api.post(`/departments/${department.id}/members`, { employeeId: memberToAddId });
      setMemberToAddId('');
      await fetchMembers(department.id);
      onSuccess();
      toast.success('Member added');
    } catch (error: any) {
      const raw = error?.response?.data?.message;
      const message = Array.isArray(raw) ? raw.join(', ') : raw || 'Failed to add member';
      toast.error(message);
    }
  };

  const removeMember = async (employeeId: string) => {
    if (!department?.id) return;
    if (!confirm('Remove this member from the department?')) return;
    try {
      await api.delete(`/departments/${department.id}/members/${employeeId}`);
      await fetchMembers(department.id);
      onSuccess();
      toast.success('Member removed');
    } catch (error: any) {
      const raw = error?.response?.data?.message;
      const message = Array.isArray(raw) ? raw.join(', ') : raw || 'Failed to remove member';
      toast.error(message);
    }
  };

  const setAsManager = async (employeeId: string) => {
    if (!department?.id) return;
    try {
      await api.patch(`/departments/${department.id}`, { managerId: employeeId });
      setManagerId(employeeId);
      onSuccess();
      toast.success('Manager updated');
    } catch (error: any) {
      const raw = error?.response?.data?.message;
      const message = Array.isArray(raw) ? raw.join(', ') : raw || 'Failed to update manager';
      toast.error(message);
    }
  };

  const removeManager = async () => {
    if (!department?.id) return;
    try {
      await api.patch(`/departments/${department.id}`, { managerId: null });
      setManagerId('');
      onSuccess();
      toast.success('Manager removed');
    } catch (error: any) {
      const raw = error?.response?.data?.message;
      const message = Array.isArray(raw) ? raw.join(', ') : raw || 'Failed to remove manager';
      toast.error(message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        toast.error('Department name is required');
        return;
      }

      if (!department && userRole === UserRole.SUPER_ADMIN && !selectedBusiness?.id) {
        toast.error('Select a business before creating a department');
        return;
      }

      const payload = {
        name: trimmedName,
        description: description.trim() || undefined,
        managerId: managerId || undefined,
      };

      if (department) {
        await api.patch(`/departments/${department.id}`, payload);
      } else {
        await api.post('/departments', payload);
      }
      onSuccess();
      onClose();
      toast.success(department ? 'Department updated' : 'Department created');
    } catch (error) {
      const err = error as any;
      const raw = err?.response?.data?.message;
      const message = Array.isArray(raw) ? raw.join(', ') : raw || 'Failed to save department';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                    {department ? 'Edit Department' : 'Create Department'}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                      placeholder="e.g. Engineering"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                      placeholder="Brief description of the department..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Manager / Head
                    </label>
                    <div className="relative">
                      <select
                        value={managerId}
                        onChange={(e) => setManagerId(e.target.value)}
                        className="w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Select a manager</option>
                        {(members.length ? members : employees).map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName}
                          </option>
                        ))}
                      </select>
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {department?.id && (
                    <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">Members</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Add, set manager, or remove members.</div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{members.length} total</div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <select
                            value={memberToAddId}
                            onChange={(e) => setMemberToAddId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none dark:bg-slate-700 dark:text-white"
                          >
                            <option value="">Select employee to add</option>
                            {employees
                              .filter((e) => e.id && e.departmentId !== department.id)
                              .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''))
                              .map((e) => (
                                <option key={e.id} value={e.id}>
                                  {e.firstName} {e.lastName}
                                </option>
                              ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={addMember}
                          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                          disabled={membersLoading}
                        >
                          Add
                        </button>
                      </div>

                      <div className="mt-4 max-h-56 overflow-y-auto pr-1 space-y-2">
                        {membersLoading ? (
                          <div className="text-sm text-gray-500 dark:text-gray-400 py-3">Loading members…</div>
                        ) : members.length === 0 ? (
                          <div className="text-sm text-gray-500 dark:text-gray-400 py-3">No members in this department.</div>
                        ) : (
                          members.map((m) => {
                            const isManager = managerId === m.id;
                            return (
                              <div
                                key={m.id}
                                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30"
                              >
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {m.firstName} {m.lastName}
                                    {isManager && <span className="ml-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">Manager</span>}
                                  </div>
                                  {m.email && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{m.email}</div>}
                                </div>
                                <div className="flex items-center gap-2">
                                  {!isManager ? (
                                    <button
                                      type="button"
                                      onClick={() => setAsManager(m.id)}
                                      className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600"
                                    >
                                      Set Manager
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={removeManager}
                                      className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600"
                                    >
                                      Remove Manager
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeMember(m.id)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Department'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
