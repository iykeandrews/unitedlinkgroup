import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Search, UserPlus, UserMinus, User } from 'lucide-react';
import api from '../../../../lib/api';

interface RoleMembersModalProps {
  role: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; // To refresh role counts
}

export default function RoleMembersModal({ role, isOpen, onClose, onUpdate }: RoleMembersModalProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (isOpen && role) {
      fetchMembers();
    } else {
      setMembers([]);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, role]);

  useEffect(() => {
    const searchEmployees = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setSearching(true);
        // We fetch all employees and filter locally for simplicity, 
        // or backend should support search. Assuming local filter for now 
        // as backend search might not be optimized for name.
        // Actually, let's fetch all employees once or use a search endpoint.
        // For now, let's assume we can fetch all and filter.
        const res = await api.get('/employees');
        const allEmployees = res.data;
        const filtered = allEmployees.filter((emp: any) => 
          (emp.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           emp.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           emp.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
          emp.customRoleId !== role.id // Exclude existing members
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
  }, [searchQuery, role?.id]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/roles/${role.id}/members`);
      setMembers(res.data);
    } catch (error) {
      console.error('Failed to fetch members', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (employeeId: string) => {
    try {
      await api.post(`/roles/${role.id}/members`, { employeeId });
      setSearchQuery(''); // Clear search
      fetchMembers();
      onUpdate();
    } catch (error) {
      console.error('Failed to add member', error);
      alert('Failed to add member');
    }
  };

  const handleRemoveMember = async (employeeId: string) => {
    if (!confirm('Are you sure you want to remove this member from the role?')) return;
    try {
      await api.delete(`/roles/${role.id}/members/${employeeId}`);
      fetchMembers();
      onUpdate();
    } catch (error) {
      console.error('Failed to remove member', error);
      alert('Failed to remove member');
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl transition-all border border-gray-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6">
                  <Dialog.Title className="text-lg font-bold text-gray-900 dark:text-white">
                    Manage Members - {role?.name}
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
                    <div className="mt-2 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
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
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{emp.firstName} {emp.lastName}</div>
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
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {loading ? (
                      <div className="text-center py-4 text-gray-500">Loading members...</div>
                    ) : members.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg">
                        <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No members assigned to this role yet.</p>
                      </div>
                    ) : (
                      members.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-700">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium text-xs shadow-sm">
                              {member.firstName[0]}{member.lastName[0]}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{member.firstName} {member.lastName}</div>
                              <div className="text-xs text-gray-500">{member.email}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Remove member"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
