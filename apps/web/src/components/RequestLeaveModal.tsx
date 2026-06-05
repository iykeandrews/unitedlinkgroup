import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Paperclip, Clock } from 'lucide-react';
import api from '../lib/api';
import { useBusiness } from '../context/business-context';
import { toast } from 'sonner';

interface RequestLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  onSuccess?: () => void;
}

interface LeaveType {
  id: string;
  name: string;
  isPaid: boolean;
}

interface LeaveBalance {
  id: string;
  leaveTypeId: string;
  balanceHours: number;
}

export function RequestLeaveModal({ isOpen, onClose, employeeId, employeeName, onSuccess }: RequestLeaveModalProps) {
  const { selectedBusiness, businesses } = useBusiness();
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [comment, setComment] = useState('');
  const [totalHours, setTotalHours] = useState(0);
  
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingType, setSavingType] = useState(false);

  const fetchData = React.useCallback(async (businessId: string) => {
    try {
      setLoading(true);
      const [typesRes, balancesRes] = await Promise.all([
        // Fetch leave types for the effective business ID
        api.get(`/leave/types/${businessId}`),
        api.get(`/leave/balance?employeeId=${employeeId}`)
      ]);
      setLeaveTypes(typesRes.data);
      setBalances(balancesRes.data);
      if (!typesRes.data || typesRes.data.length === 0) {
        toast.info('No leave types found for this business');
      }
    } catch (error) {
      console.error('Failed to fetch leave data', error);
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    // Choose an effective business ID to ensure dropdown works even if none is selected
    const effectiveBusinessId = selectedBusiness?.id || businesses?.[0]?.id;
    if (isOpen && effectiveBusinessId) {
      fetchData(effectiveBusinessId);
    } else if (isOpen && !effectiveBusinessId) {
      // Notify when business context is missing
      toast.error('Please select a business to request leave types');
      setLeaveTypes([]);
    }
  }, [isOpen, selectedBusiness?.id, businesses, fetchData]);

  useEffect(() => {
    const calc = async () => {
      if (!startDate || !endDate) return;
      try {
        const res = await api.get('/leave/calculate-hours', {
          params: {
            employeeId,
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
            isAllDay: allDay,
            startTime: allDay ? undefined : startTime,
            endTime: allDay ? undefined : endTime
          }
        });
        setTotalHours(res.data.totalHours || 0);
      } catch (e) {
        setTotalHours(0);
      }
    };
    calc();
  }, [employeeId, startDate, endDate, allDay, startTime, endTime]);

  const handleSubmit = async () => {
    if (!leaveTypeId) return;

    try {
      setSubmitting(true);
      await api.post('/leave/request', {
        employeeId,
        leaveTypeId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        isAllDay: allDay,
        startTime: allDay ? undefined : startTime,
        endTime: allDay ? undefined : endTime,
        reason: comment,
        totalHours
      });
      
      toast.success('Leave requested successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to request leave', error);
      toast.error(error.response?.data?.message || 'Failed to request leave');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBalance = balances.find(b => b.leaveTypeId === leaveTypeId);
  const selectedLeaveType = leaveTypes.find(lt => lt.id === leaveTypeId);
  const [editForm, setEditForm] = useState<any | null>(null);

  useEffect(() => {
    if (selectedLeaveType) {
      setEditForm({
        name: selectedLeaveType.name,
        description: (selectedLeaveType as any).description || '',
        isPaid: !!selectedLeaveType.isPaid,
        allowNegativeBalance: !!(selectedLeaveType as any).allowNegativeBalance,
        requiresApproval: !!(selectedLeaveType as any).requiresApproval,
        color: (selectedLeaveType as any).color || '',
        accrualFrequency: (selectedLeaveType as any).accrualFrequency || '',
        accrualRate: (selectedLeaveType as any).accrualRate ?? '',
        maxBalance: (selectedLeaveType as any).maxBalance ?? '',
        carryOverLimit: (selectedLeaveType as any).carryOverLimit ?? ''
      });
    } else {
      setEditForm(null);
    }
  }, [selectedLeaveType]);

  const setField = (key: string, value: any) => {
    setEditForm((prev: any) => ({ ...(prev || {}), [key]: value }));
  };

  const saveLeaveType = async () => {
    if (!selectedLeaveType || !editForm) return;
    try {
      setSavingType(true);
      const payload = { ...editForm };
      // Sanitize numeric fields: convert empty strings to null, and strings to numbers
      ['accrualRate', 'maxBalance', 'carryOverLimit'].forEach(field => {
        if (payload[field] === '') {
          payload[field] = null;
        } else if (payload[field] !== null && payload[field] !== undefined) {
          payload[field] = Number(payload[field]);
        }
      });
      await api.put(`/leave/types/${selectedLeaveType.id}`, payload);
      toast.success('Leave type updated');
      const effectiveBusinessId = selectedBusiness?.id || businesses?.[0]?.id;
      if (effectiveBusinessId) {
        const res = await api.get(`/leave/types/${effectiveBusinessId}`);
        setLeaveTypes(res.data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to update leave type');
    } finally {
      setSavingType(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Leave" maxWidth="max-w-5xl">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm text-gray-500 font-medium">Requesting for: <span className="text-gray-900 dark:text-white font-bold">{employeeName}</span></h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 mb-3">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                All day
              </label>
              {!allDay && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
                    <div className="relative">
                      <Clock className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full pl-8 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">End Time</label>
                    <div className="relative">
                      <Clock className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full pl-8 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
              <select
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                disabled={loading || leaveTypes.length === 0}
              >
                <option value="">Select a leave type...</option>
                {leaveTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Comment</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                placeholder="Reason for leave..."
              />
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Attachments</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-5 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                  <Paperclip className="h-7 w-7 mb-2 text-gray-400" />
                  <span className="text-xs">Click to upload or drag and drop</span>
                  <span className="text-[11px] text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            {editForm ? (
              <div className="rounded-lg border border-gray-200 dark:border-slate-700">
                <div className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 text-xs font-semibold">
                  Configure Leave Type
                </div>
                <div className="p-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setField('name', e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                    <input
                      type="text"
                      value={editForm.color || ''}
                      onChange={(e) => setField('color', e.target.value)}
                      placeholder="bg-green-100 text-green-800"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                    <input
                      type="text"
                      value={editForm.description || ''}
                      onChange={(e) => setField('description', e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
                      <input
                        type="checkbox"
                        checked={!!editForm.isPaid}
                        onChange={(e) => setField('isPaid', e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Paid
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
                      <input
                        type="checkbox"
                        checked={!!editForm.requiresApproval}
                        onChange={(e) => setField('requiresApproval', e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Requires Approval
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-500 col-span-2">
                      <input
                        type="checkbox"
                        checked={!!editForm.allowNegativeBalance}
                        onChange={(e) => setField('allowNegativeBalance', e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Allow Negative Balance
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Accrual Frequency</label>
                    <select
                      value={editForm.accrualFrequency || ''}
                      onChange={(e) => setField('accrualFrequency', e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                    >
                      <option value="">None</option>
                      <option value="WEEKLY">WEEKLY</option>
                      <option value="MONTHLY">MONTHLY</option>
                      <option value="ANNUALLY">ANNUALLY</option>
                    </select>
                    <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                      Accrual method: PER_PAY_PERIOD when frequency is set; PER_HOUR when empty.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Accrual Rate (hrs)</label>
                      <input
                        type="number"
                        value={editForm.accrualRate ?? ''}
                        onChange={(e) => setField('accrualRate', e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Max Balance (hrs)</label>
                      <input
                        type="number"
                        value={editForm.maxBalance ?? ''}
                        onChange={(e) => setField('maxBalance', e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Carry Over Limit (hrs)</label>
                    <input
                      type="number"
                      value={editForm.carryOverLimit ?? ''}
                      onChange={(e) => setField('carryOverLimit', e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 px-3 pb-3">
                  <button
                    onClick={saveLeaveType}
                    disabled={savingType}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingType ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">Select a leave type to configure</div>
            )}
          </div>
        </div>

        {leaveTypeId && (
             <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4 border border-blue-100 dark:border-blue-800">
            <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                    <span className="block text-gray-500 dark:text-gray-400 text-xs">Current Balance</span>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{selectedBalance?.balanceHours || 0} hrs</span>
                </div>
                 <div>
                    <span className="block text-gray-500 dark:text-gray-400 text-xs">This Request</span>
                    <span className="font-semibold text-sm text-red-600 dark:text-red-400">-{totalHours.toFixed(1)} hrs</span>
                </div>
                 <div>
                    <span className="block text-gray-500 dark:text-gray-400 text-xs">Future Balance</span>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{((selectedBalance?.balanceHours || 0) - totalHours).toFixed(1)} hrs</span>
                </div>
            </div>
          </div>
        )}
        
        

        

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-600 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!leaveTypeId || !startDate || !endDate}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Request
          </button>
        </div>
      </div>
    </Modal>
  );
}
