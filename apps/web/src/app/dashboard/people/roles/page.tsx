'use client';

import { useState, useEffect, Fragment } from 'react';
import { Plus, Shield, Edit, Trash2, Check, Users } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import api from '../../../../lib/api';
import RoleMembersModal from './RoleMembersModal';

const AVAILABLE_PERMISSIONS = [
  { id: 'MANAGE_EMPLOYEES', label: 'Manage Employees', description: 'Create, edit, and terminate employees' },
  { id: 'VIEW_EMPLOYEES', label: 'View Employees', description: 'View employee profiles' },
  { id: 'MANAGE_PAYROLL', label: 'Manage Payroll', description: 'Process payroll and view sensitive data' },
  { id: 'VIEW_PAYROLL', label: 'View Payroll', description: 'View payroll reports' },
  { id: 'MANAGE_SCHEDULE', label: 'Manage Schedule', description: 'Create and edit shifts' },
  { id: 'VIEW_SCHEDULE', label: 'View Schedule', description: 'View team schedules' },
  { id: 'MANAGE_DEPARTMENTS', label: 'Manage Departments', description: 'Create and edit departments' },
  { id: 'MANAGE_ROLES', label: 'Manage Roles', description: 'Create and assign roles' },
  { id: 'SEND_ANNOUNCEMENTS', label: 'Send Announcements', description: 'Post company-wide announcements' },
  { id: 'SEND_EMAILS', label: 'Send Emails', description: 'Send bulk emails' },
];

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/roles');
      setRoles(res.data);
    } catch (error) {
      console.error('Failed to fetch roles', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageMembers = (role: any) => {
    setSelectedRole(role);
    setIsMembersModalOpen(true);
  };

  const handleEdit = (role: any) => {
    setSelectedRole(role);
    setName(role.name);
    setDescription(role.description || '');
    setPermissions(role.permissions || []);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedRole(null);
    setName('');
    setDescription('');
    setPermissions([]);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await api.delete(`/roles/${id}`);
      fetchRoles();
    } catch (error) {
      console.error('Failed to delete role', error);
      alert('Failed to delete role. System roles cannot be deleted.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name, description, permissions };
      if (selectedRole) {
        await api.patch(`/roles/${selectedRole.id}`, payload);
      } else {
        await api.post('/roles', payload);
      }
      setIsModalOpen(false);
      fetchRoles();
    } catch (error) {
      console.error('Failed to save role', error);
      alert('Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (id: string) => {
    setPermissions(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-slate-950/50">
      <div className="flex-1 w-full p-6 space-y-8">
      <div className="flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">Roles & Permissions</h1>
          <p className="text-sm text-gray-500 mt-1">Define access levels and capabilities for your team</p>
        </div>
        <button
          onClick={handleCreate}
          className="group relative px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <div className="flex items-center gap-2 text-sm font-medium relative">
            <Plus className="w-4 h-4" />
            <span>Create Role</span>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />)
        ) : (
          roles.map(role => (
            <div key={role.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 flex flex-col hover:border-indigo-500/50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <Shield className="w-6 h-6" />
                </div>
                {!role.isSystem && (
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleManageMembers(role)} 
                      className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Manage Members"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEdit(role)} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(role.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{role.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                {role.description || 'No description provided'}
              </p>

              <div className="mt-auto">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Capabilities</div>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.slice(0, 3).map((p: string) => (
                    <span key={p} className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs rounded-md">
                      {AVAILABLE_PERMISSIONS.find(ap => ap.id === p)?.label || p}
                    </span>
                  ))}
                  {role.permissions.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 text-xs rounded-md">
                      +{role.permissions.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Transition show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl transition-all border border-gray-200 dark:border-slate-700">
                  <Dialog.Title className="text-lg font-bold text-gray-900 dark:text-white mb-6">
                    {selectedRole ? 'Edit Role' : 'Create Role'}
                  </Dialog.Title>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                          placeholder="e.g. Shift Supervisor"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <input
                          type="text"
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                          placeholder="Brief description..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Permissions</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                        {AVAILABLE_PERMISSIONS.map(perm => (
                          <div 
                            key={perm.id}
                            onClick={() => togglePermission(perm.id)}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              permissions.includes(perm.id)
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                                : 'bg-gray-50 dark:bg-slate-900/50 border-transparent hover:bg-gray-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              permissions.includes(perm.id)
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600'
                            }`}>
                              {permissions.includes(perm.id) && <Check className="w-3 h-3" />}
                            </div>
                            <div>
                              <div className={`text-sm font-medium ${
                                permissions.includes(perm.id) ? 'text-indigo-900 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {perm.label}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {perm.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Role'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <RoleMembersModal
        role={selectedRole}
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        onUpdate={fetchRoles}
      />
    </div>
  </div>
  );
}
