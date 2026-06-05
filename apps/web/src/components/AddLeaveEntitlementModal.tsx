import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../lib/api';
import { useBusiness } from '../context/business-context';
import { toast } from 'sonner';

interface LeaveType {
  id: string;
  name: string;
  isPaid: boolean;
}

interface AddLeaveEntitlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onSuccess: () => void;
}

export function AddLeaveEntitlementModal({ isOpen, onClose, employeeId, onSuccess }: AddLeaveEntitlementModalProps) {
  const { selectedBusiness, businesses } = useBusiness();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [hours, setHours] = useState('0');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const effectiveBusinessId = selectedBusiness?.id || businesses?.[0]?.id;
    if (isOpen && effectiveBusinessId) {
      fetchLeaveTypes(effectiveBusinessId);
    } else if (isOpen && !effectiveBusinessId) {
      toast.error('Please select a business to load leave types');
      setLeaveTypes([]);
      setSelectedLeaveTypeId('');
    }
  }, [isOpen, selectedBusiness?.id, businesses]);

  const fetchLeaveTypes = async (businessId: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/leave/types/${businessId}`);
      setLeaveTypes(res.data);
      if (res.data.length > 0) {
        setSelectedLeaveTypeId(res.data[0].id);
      } else {
        toast.info('No leave types available for this business');
        setSelectedLeaveTypeId('');
      }
    } catch (error) {
      console.error('Failed to fetch leave types', error);
      toast.error('Failed to load leave types');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveTypeId) return;

    try {
      setSubmitting(true);
      await api.post('/leave/balance', {
        employeeId,
        leaveTypeId: selectedLeaveTypeId,
        hours: parseFloat(hours),
      });
      toast.success('Leave entitlement added successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to add leave entitlement', error);
      toast.error('Failed to add leave entitlement');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-semibold leading-6 text-gray-900 dark:text-white">
                Add Leave Entitlement
              </h3>
              <button
                onClick={onClose}
                className="rounded-md bg-white dark:bg-slate-800 text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Leave Type
                </label>
                <select
                  value={selectedLeaveTypeId}
                  onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
                  className="block w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  disabled={loading}
                >
                  {leaveTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Initial Balance (Hours)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="block w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  required
                />
              </div>

              <div className="mt-5 sm:mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 inline-flex justify-center rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || loading}
                  className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
