import { useState, useEffect, useCallback, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Search, UserPlus, UserMinus, User, Building, Crown, BadgeCheck } from 'lucide-react';
import api from '../../lib/api';

interface DepartmentMembersModalProps {
  department?: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; // To refresh department counts
}

export default function DepartmentMembersModal({ department, isOpen, onClose, onUpdate }: DepartmentMembersModalProps) {
  const departmentId = department?.id as string | undefined;
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [centerDialog, setCenterDialog] = useState<null | {
    kind: 'info' | 'error' | 'confirm';
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    action?: () => Promise<void> | void;
  }>(null);
  const [centerDialogBusy, setCenterDialogBusy] = useState(false);

  const errorMessage = (err: any, fallback: string) => {
    const raw = err?.response?.data?.message;
    if (Array.isArray(raw)) return raw.join(', ');
    if (typeof raw === 'string' && raw.trim()) return raw;
    if (typeof err?.message === 'string' && err.message.trim()) return err.message;
    return fallback;
  };

  const openInfo = (title: string, message: string) => setCenterDialog({ kind: 'info', title, message });
  const openError = (title: string, message: string) => setCenterDialog({ kind: 'error', title, message });
  const openConfirm = (title: string, message: string, action: () => Promise<void> | void, confirmLabel = 'Confirm', cancelLabel = 'Cancel') =>
    setCenterDialog({ kind: 'confirm', title, message, action, confirmLabel, cancelLabel });

  const closeDialog = () => {
    if (centerDialogBusy) return;
    setCenterDialog(null);
  };

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      if (!departmentId) {
        setMembers([]);
        return;
      }
      const res = await api.get(`/departments/${departmentId}/members`);
      setMembers(res.data);
    } catch (error) {
      console.error('Failed to fetch members', error);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    if (isOpen && departmentId) {
      fetchMembers();
    } else {
      setMembers([]);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, departmentId, fetchMembers]);

  useEffect(() => {
    const searchEmployees = async () => {
      if (!departmentId) {
        setSearchResults([]);
        return;
      }
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setSearching(true);
        const res = await api.get('/employees');
        const allEmployees = res.data;
        const filtered = allEmployees.filter((emp: any) => 
          (emp.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           emp.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           emp.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
          emp.departmentId !== departmentId // Exclude existing members
        );
        setSearchResults(filtered.slice(0, 5));
      } catch (error) {
        console.error('Failed to search employees', error);
      } finally {
        setSearching(false);
      }
    };

    const timeoutId = setTimeout(searchEmployees, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, departmentId]);

  const handleAddMember = async (employeeId: string) => {
    try {
      if (!departmentId) {
        openError('No department selected', 'Select a department before adding members.');
        return;
      }
      await api.post(`/departments/${departmentId}/members`, { employeeId });
      setSearchQuery(''); // Clear search
      fetchMembers();
      onUpdate();
      openInfo('Member added', 'The employee has been added to this department.');
    } catch (error) {
      console.error('Failed to add member', error);
      openError('Unable to add member', errorMessage(error, 'Failed to add member'));
    }
  };

  const handleRemoveMember = async (employeeId: string) => {
    const member = members.find((m) => m.id === employeeId);
    const label = member ? `${member.firstName} ${member.lastName}`.trim() : 'this member';
    openConfirm(
      'Remove member',
      `Remove ${label} from this department?`,
      async () => {
        try {
          if (!departmentId) return;
          await api.delete(`/departments/${departmentId}/members/${employeeId}`);
          await fetchMembers();
          onUpdate();
          openInfo('Member removed', `${label} has been removed from this department.`);
        } catch (error) {
          console.error('Failed to remove member', error);
          openError('Unable to remove member', errorMessage(error, 'Failed to remove member'));
        }
      },
      'Remove',
      'Cancel'
    );
  };

  const handleAssignManager = async (employeeId: string) => {
    const member = members.find((m) => m.id === employeeId);
    const label = member ? `${member.firstName} ${member.lastName}`.trim() : 'this member';
    openConfirm(
      'Assign manager',
      `Make ${label} the department manager?`,
      async () => {
        try {
          if (!departmentId) return;
          await api.post(`/departments/${departmentId}/manager`, { employeeId });
          await fetchMembers();
          onUpdate();
          openInfo('Manager assigned', `${label} is now the department manager.`);
        } catch (error) {
          console.error('Failed to assign manager', error);
          openError('Unable to assign manager', errorMessage(error, 'Failed to assign manager'));
        }
      },
      'Assign',
      'Cancel'
    );
  };

  const handleRemoveManager = async () => {
    openConfirm(
      'Remove manager',
      'Remove the current manager from this department?',
      async () => {
        try {
          if (!departmentId) return;
          await api.delete(`/departments/${departmentId}/manager`);
          await fetchMembers();
          onUpdate();
          openInfo('Manager removed', 'This department no longer has a manager assigned.');
        } catch (error) {
          console.error('Failed to remove manager', error);
          openError('Unable to remove manager', errorMessage(error, 'Failed to remove manager'));
        }
      },
      'Remove',
      'Cancel'
    );
  };

  const getWorkerTypeLabel = (emp: any) => {
    const isW2 = !!emp.w2Profile;
    const is1099 = !!emp.contractorProfile;
    
    if (isW2 && is1099) return <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Dual</span>;
    if (isW2) return <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">W-2</span>;
    if (is1099) return <span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">1099</span>;
    return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Unassigned</span>;
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl transition-all border border-gray-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6">
                  <Dialog.Title className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Building className="w-5 h-5 text-indigo-500" />
                    Manage Members - {department?.name || ''}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Add Member Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Member</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search employees by name or email..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                    />
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  </div>
                  
                  {/* Search Results */}
                  {searchQuery && (
                    <div className="mt-2 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-lg relative z-10">
                      {searching ? (
                        <div className="p-3 text-sm text-gray-500 text-center">Searching...</div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map(emp => (
                          <div key={emp.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700 border-b last:border-0 border-gray-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-medium text-xs">
                                {emp.firstName[0]}{emp.lastName[0]}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{emp.firstName} {emp.lastName}</span>
                                  {getWorkerTypeLabel(emp)}
                                </div>
                                <div className="text-xs text-gray-500">{emp.email}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddMember(emp.id)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-sm text-gray-500 text-center">No employees found</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Current Members List */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Current Members ({members.length})</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                      <div className="text-center py-4 text-gray-500">Loading members...</div>
                    ) : members.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg">
                        <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No members assigned to this department yet.</p>
                      </div>
                    ) : (
                      members.map(member => {
                        const isManager = department?.managerId === member.id;
                        return (
                          <div key={member.id} className={`flex items-center justify-between p-3 rounded-lg border ${isManager ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-gray-50 border-gray-100 dark:bg-slate-700/50 dark:border-slate-700'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs shadow-sm ${isManager ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-200' : 'bg-white dark:bg-slate-600 text-gray-600 dark:text-gray-300'}`}>
                                {isManager ? <Crown className="w-4 h-4" /> : `${member.firstName[0]}${member.lastName[0]}`}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {member.firstName} {member.lastName}
                                  </span>
                                  {isManager && (
                                    <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-medium">Manager</span>
                                  )}
                                  {getWorkerTypeLabel(member)}
                                </div>
                                <div className="text-xs text-gray-500">{member.email}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {!isManager ? (
                                <button
                                  onClick={() => handleAssignManager(member.id)}
                                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                  title="Assign as Manager"
                                >
                                  <BadgeCheck className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={handleRemoveManager}
                                  className="p-1.5 text-indigo-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                  title="Remove as Manager"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Remove from department"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>

      {centerDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onMouseDown={closeDialog} />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-200 dark:border-slate-700">
              <div>
                <div className={`text-xs font-semibold uppercase tracking-wider ${centerDialog.kind === 'error' ? 'text-red-600 dark:text-red-400' : centerDialog.kind === 'confirm' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {centerDialog.kind === 'error' ? 'Action required' : centerDialog.kind === 'confirm' ? 'Confirm' : 'Success'}
                </div>
                <div className="mt-1 text-base font-bold text-gray-900 dark:text-white">{centerDialog.title}</div>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors"
                disabled={centerDialogBusy}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{centerDialog.message}</div>
            </div>

            <div className="p-5 pt-0 flex items-center justify-end gap-3">
              {centerDialog.kind === 'confirm' ? (
                <>
                  <button
                    type="button"
                    onClick={closeDialog}
                    disabled={centerDialogBusy}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
                  >
                    {centerDialog.cancelLabel || 'Cancel'}
                  </button>
                  <button
                    type="button"
                    disabled={centerDialogBusy}
                    onClick={async () => {
                      if (!centerDialog.action) return;
                      try {
                        setCenterDialogBusy(true);
                        await centerDialog.action();
                      } finally {
                        setCenterDialogBusy(false);
                        setCenterDialog(null);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 ${
                      centerDialog.title.toLowerCase().includes('remove') ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {centerDialog.confirmLabel || 'Confirm'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={closeDialog}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Transition>
  );
}
