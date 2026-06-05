import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, User, Utensils, MoreHorizontal, CheckCircle, AlertCircle, Megaphone } from 'lucide-react';
import { Shift, Employee, Location } from './types';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';
import { ModalActionButton } from '../Modal';
import { useBusiness } from '../../context/business-context';
import { formatCurrency } from '../../lib/localization';
import api from '../../lib/api';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: Partial<Shift>) => void;
  onDelete?: (shiftId: string) => void;
  shift?: Shift | null;
  employees: Employee[];
  locations: Location[];
  defaultDate?: Date;
  defaultLocationId?: string;
  defaultEmployee?: Employee;
  readOnly?: boolean;
  shiftPlacementLocked?: boolean;
  onApply?: () => void;
  onApproveApplication?: (appId: string) => void;
  onDeclineApplication?: (appId: string) => void;
  currentUserId?: string;
}

export function ShiftModal({ 
  isOpen, onClose, onSave, onDelete, shift, 
  employees, locations, defaultDate, defaultLocationId, defaultEmployee,
  readOnly = false,
  shiftPlacementLocked = false,
  onApply,
  onApproveApplication,
  onDeclineApplication,
  currentUserId
}: ShiftModalProps) {
   const { selectedBusiness } = useBusiness();


 
   const [formData, setFormData] = useState({
     employeeId: '',
     locationId: '',
     date: '',
     startTime: '09:00',
     endTime: '17:00',
     breakMinutes: 0,
     notes: ''
   });

   const [isMenuOpen, setIsMenuOpen] = useState(false);
   const [showSpecificDays, setShowSpecificDays] = useState(false);
   const [selectedDays, setSelectedDays] = useState<number[]>([]);
   const [showPattern, setShowPattern] = useState(false);
   const [patternWeeks, setPatternWeeks] = useState(4);
   const [showReplacementPicker, setShowReplacementPicker] = useState(false);
   const [replacementId, setReplacementId] = useState<string>('');
  const [replacementMode, setReplacementMode] = useState<'EDIT' | 'COVERAGE'>('EDIT');
   const [daysOn, setDaysOn] = useState<number>(3);
   const [daysOff, setDaysOff] = useState<number>(1);
   const [repeatUntil, setRepeatUntil] = useState<string>('');

   // Track if break is being edited
   const [isBreakEditing, setIsBreakEditing] = useState(false);

  const [history, setHistory] = useState<any | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [calloutOpen, setCalloutOpen] = useState(false);
  const [calloutSubmitting, setCalloutSubmitting] = useState(false);
  const [calloutReasonCode, setCalloutReasonCode] = useState('SICK');
  const [calloutType, setCalloutType] = useState<'EXCUSED' | 'UNEXCUSED' | 'EMERGENCY'>('EXCUSED');
  const [calloutNoticeAt, setCalloutNoticeAt] = useState<string>('');
  const [calloutReasonNote, setCalloutReasonNote] = useState<string>('');
  const [calloutFile, setCalloutFile] = useState<File | null>(null);

  const userApplication = shift?.applications?.find(app => app.employeeId === currentUserId);
  const hasApplied = !!userApplication;

  useEffect(() => {
    if (isOpen) {
      if (shift) {
        const start = new Date(shift.startTime);
        const end = shift.endTime ? new Date(shift.endTime) : null;
        setTimeout(() => setFormData({
          employeeId: shift.employeeId || '',
          locationId: shift.locationId,
          date: format(start, 'yyyy-MM-dd'),
          startTime: format(start, 'HH:mm'),
          endTime: end ? format(end, 'HH:mm') : '',
          breakMinutes: shift.breakMinutes || 0,
          notes: shift.notes || ''
        }), 0);
      } else {
        setTimeout(() => setFormData({
          employeeId: defaultEmployee?.id || '',
          locationId: defaultLocationId || locations[0]?.id || '',
          date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
          startTime: '09:00',
          endTime: '17:00',
          breakMinutes: 0,
          notes: ''
        }), 0);
      }
    }
  }, [isOpen, shift, defaultDate, defaultLocationId, defaultEmployee, locations]);

  useEffect(() => {
    if (!isOpen) return;
    if (!shift?.id) return;
    let cancelled = false;
    const run = async () => {
      try {
        setHistoryLoading(true);
        const res = await api.get(`/scheduling/shifts/${shift.id}/history`);
        if (!cancelled) setHistory(res.data || null);
      } catch {
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, shift?.id]);

  if (!isOpen) return null;
  const placementControlsDisabled = readOnly || shiftPlacementLocked;

  const toLocalInputValue = (d: Date) => {
    const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
    return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

    // Handle overnight shifts
    if (endDateTime < startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    onSave({
      id: shift?.id,
      employeeId: formData.employeeId,
      locationId: formData.locationId,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      breakMinutes: formData.breakMinutes,
      notes: formData.notes
    });
  };

  const handleBreakClick = () => {
    if (formData.breakMinutes === 0) {
      setFormData(prev => ({ ...prev, breakMinutes: 30 }));
    } else {
      setIsBreakEditing(true);
    }
  };

  const calculateStats = () => {
    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
    
    // Handle overnight shifts
    if (endDateTime < startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    const durationMs = endDateTime.getTime() - startDateTime.getTime();
    const totalHours = durationMs / (1000 * 60 * 60);
    const breakHours = (formData.breakMinutes || 0) / 60;
    const paidHours = Math.max(0, totalHours - breakHours);
    
    const employee = employees.find(e => e.id === formData.employeeId);
    const hourlyRate = employee?.hourlyRate || 0;
    const estimatedPay = paidHours * hourlyRate;

    return {
      paidHours: paidHours.toFixed(2),
      estimatedPay: estimatedPay.toFixed(2),
      hasRate: !!employee?.hourlyRate
    };
  };

  const stats = calculateStats();

  const buildShiftForDate = (date: Date): Partial<Shift> => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const startDateTime = new Date(`${dateStr}T${formData.startTime}`);
    const endDateTime = new Date(`${dateStr}T${formData.endTime}`);
    if (endDateTime < startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }
    return {
      employeeId: formData.employeeId,
      locationId: formData.locationId,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      breakMinutes: formData.breakMinutes,
      notes: formData.notes
    };
  };

  const repeatTomorrow = () => {
    if (!formData.date) return;
    const base = new Date(formData.date);
    const next = new Date(base);
    next.setDate(base.getDate() + 1);
    onSave(buildShiftForDate(next));
    toast.success('Shift repeated for tomorrow');
  };

  const repeatRestOfWeek = () => {
    if (!formData.date) return;
    const base = new Date(formData.date);
    const day = base.getDay();
    for (let i = 1; i <= (6 - day); i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      onSave(buildShiftForDate(d));
    }
    toast.success('Shift repeated for the rest of the week');
  };

  const applySpecificDays = () => {
    if (!formData.date || selectedDays.length === 0) return;
    const base = new Date(formData.date);
    const weekStart = startOfWeek(base, { weekStartsOn: 1 });
    selectedDays.forEach(dow => {
      const offset = dow === 0 ? 6 : dow - 1;
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + offset);
      onSave(buildShiftForDate(d));
    });
    setShowSpecificDays(false);
    setIsMenuOpen(false);
    toast.success('Shift repeated for specific days');
  };

  const applyPattern = () => {
    if (!formData.date || !repeatUntil) {
      toast.error('Please select an end date');
      return;
    }
    const start = new Date(formData.date);
    const end = new Date(repeatUntil);
    if (end < start) {
      toast.error('End date must be after start date');
      return;
    }
    let cursor = new Date(start);
    while (cursor <= end) {
      for (let i = 0; i < daysOn && cursor <= end; i++) {
        onSave(buildShiftForDate(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      for (let j = 0; j < daysOff && cursor <= end; j++) {
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    setShowPattern(false);
    setIsMenuOpen(false);
    toast.success('Pattern shifts created');
  };

  const splitShift = () => {
    if (!formData.date) return;
    const start = new Date(`${formData.date}T${formData.startTime}`);
    const end = new Date(`${formData.date}T${formData.endTime}`);
    if (end < start) end.setDate(end.getDate() + 1);
    const midMs = start.getTime() + Math.floor((end.getTime() - start.getTime()) / 2);
    const mid = new Date(midMs);
    const breakA = Math.floor((formData.breakMinutes || 0) / 2);
    const breakB = (formData.breakMinutes || 0) - breakA;
    const first: Partial<Shift> = {
      employeeId: formData.employeeId,
      locationId: formData.locationId,
      startTime: start.toISOString(),
      endTime: mid.toISOString(),
      breakMinutes: breakA,
      notes: formData.notes
    };
    const second: Partial<Shift> = {
      employeeId: formData.employeeId,
      locationId: formData.locationId,
      startTime: mid.toISOString(),
      endTime: end.toISOString(),
      breakMinutes: breakB,
      notes: formData.notes
    };
    onSave(first);
    onSave(second);
    if (shift && onDelete) {
      onDelete(shift.id);
    }
    toast.success('Shift split into two');
  };

  const findReplacement = () => {
    setReplacementId('');
    setReplacementMode('EDIT');
    setShowReplacementPicker(true);
  };
  const reassignCoverage = () => {
    setReplacementId('');
    setReplacementMode('COVERAGE');
    setShowReplacementPicker(true);
  };
  const applyReplacement = () => {
    if (!replacementId) {
      toast.error('Please select a replacement');
      return;
    }
    const chosen = employees.find(e => e.id === replacementId);
    if (!chosen) {
      toast.error('Invalid selection');
      return;
    }
    if (replacementMode === 'COVERAGE') {
      if (!shift?.id) {
        toast.error('Shift not found');
        return;
      }
      setShowReplacementPicker(false);
      setIsMenuOpen(false);
      (async () => {
        try {
          await api.post(`/scheduling/shifts/${shift.id}/reassign`, { replacementEmployeeId: chosen.id });
          window.dispatchEvent(new CustomEvent('scheduling:updated'));
          toast.success('Coverage assigned');
          onClose();
        } catch (e: any) {
          toast.error(e?.response?.data?.message || 'Failed to assign coverage');
        }
      })();
      return;
    }

    setFormData(prev => ({ ...prev, employeeId: chosen.id }));
    setShowReplacementPicker(false);
    setIsMenuOpen(false);
    toast.success(`Replacement selected: ${chosen.firstName} ${chosen.lastName}`);
  };

  const viewProfile = () => {
    window.open('/dashboard/people', '_blank');
  };

  const viewHistory = () => {
    setHistoryOpen(true);
    setIsMenuOpen(false);
  };

  const deleteShiftAction = () => {
    if (shift && onDelete) {
      onDelete(shift.id);
      onClose();
      toast.success('Shift deleted');
    } else {
      setFormData(prev => ({ ...prev, notes: '', breakMinutes: 0 }));
      toast.info('No existing shift to delete');
    }
  };

  const openCallout = () => {
    if (!shift) return;
    setCalloutReasonCode('SICK');
    setCalloutType('EXCUSED');
    setCalloutReasonNote('');
    setCalloutFile(null);
    setCalloutNoticeAt(toLocalInputValue(new Date()));
    setCalloutOpen(true);
  };

  const submitCallout = async () => {
    if (!shift?.id) return;
    try {
      setCalloutSubmitting(true);
      let documentationUrl: string | undefined;
      if (calloutFile) {
        const fd = new FormData();
        fd.append('file', calloutFile);
        const up = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        documentationUrl = up.data?.url;
      }
      await api.post(`/scheduling/shifts/${shift.id}/callout`, {
        reasonCode: calloutReasonCode,
        reasonNote: calloutReasonNote || undefined,
        type: calloutType,
        noticeAt: new Date(calloutNoticeAt).toISOString(),
        documentationUrl
      });
      window.dispatchEvent(new CustomEvent('scheduling:updated'));
      toast.success('Call-out submitted for approval');
      setCalloutOpen(false);
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to record call-out');
    } finally {
      setCalloutSubmitting(false);
    }
  };

  const broadcastOpenShift = async () => {
    if (!shift?.id) return;
    try {
      await api.post(`/scheduling/shifts/${shift.id}/broadcast`, {});
      toast.success('Broadcast sent');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to broadcast shift');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 rounded-t-lg">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {readOnly ? 'Shift Details' : (shift ? 'Edit Shift' : 'Create Shift')}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} id="shift-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              {/* Left Column: Core Details */}
              <div className="space-y-5">
                {/* Employee Selector */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                        <User size={16} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Employee</label>
                        <select
                            required
                            disabled={placementControlsDisabled}
                            className={`w-full bg-transparent border-none p-0 text-sm font-medium text-slate-900 dark:text-white focus:ring-0 ${placementControlsDisabled ? 'cursor-default' : 'cursor-pointer hover:underline'}`}
                            value={formData.employeeId}
                            onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                        >
                            <option value="">Select Employee</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.firstName} {emp.lastName} {emp.hourlyRate ? `(${formatCurrency(emp.hourlyRate, selectedBusiness?.currencyCode)}/hr)` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Location Selector */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <MapPin size={16} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Location</label>
                        <select
                            required
                            disabled={placementControlsDisabled}
                            className={`w-full bg-transparent border-none p-0 text-sm font-medium text-slate-900 dark:text-white focus:ring-0 ${placementControlsDisabled ? 'cursor-default' : 'cursor-pointer hover:underline'}`}
                            value={formData.locationId}
                            onChange={e => setFormData({ ...formData, locationId: e.target.value })}
                        >
                            <option value="">Select Location</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                        {formData.locationId && (() => {
                            const loc = locations.find(l => l.id === formData.locationId);
                            if (loc && (loc.client?.name || loc.address)) {
                                return (
                                    <div className="mt-1.5 flex flex-col gap-0.5">
                                        {loc.client?.name && (
                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                {loc.client.name}
                                            </div>
                                        )}
                                        {loc.address && (
                                            <div className="text-xs text-slate-400 dark:text-slate-500 flex items-start gap-1">
                                                <MapPin size={10} className="mt-0.5 shrink-0" />
                                                <span>{loc.address}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <Clock size={16} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Date</label>
                        <input
                            type="date"
                            required
                            disabled={placementControlsDisabled}
                            className="w-full bg-transparent border-none p-0 text-sm font-medium text-slate-900 dark:text-white focus:ring-0 disabled:opacity-100"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                </div>

                {/* Time */}
                <div className="pl-11">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 mb-1">Start</label>
                            <input
                                type="time"
                                required
                                disabled={placementControlsDisabled}
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-100"
                                value={formData.startTime}
                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                            />
                        </div>
                        <div className="text-slate-300 dark:text-slate-600 mt-5">→</div>
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 mb-1">End</label>
                            <input
                                type="time"
                                required
                                disabled={placementControlsDisabled}
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-100"
                                value={formData.endTime}
                                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
              </div>

              {/* Right Column: Additional Details */}
              <div className="space-y-5">
                {/* Break Section */}
                <div>
                     <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Break</label>
                     <div 
                        className={`flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 ${readOnly ? '' : 'cursor-pointer hover:text-purple-600'} transition-colors p-2 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900/50`}
                        onClick={readOnly ? undefined : handleBreakClick}
                     >
                        <Utensils size={14} />
                        {formData.breakMinutes === 0 ? (
                            <span>{readOnly ? 'No break' : 'Add break'}</span>
                        ) : isBreakEditing && !readOnly ? (
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <input 
                                    type="number" 
                                    autoFocus
                                    className="w-16 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 text-sm"
                                    value={formData.breakMinutes}
                                    onChange={e => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })}
                                    onBlur={() => setIsBreakEditing(false)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') setIsBreakEditing(false);
                                    }}
                                />
                                <span>min unpaid break</span>
                            </div>
                        ) : (
                            <span>{formData.breakMinutes} min unpaid break</span>
                        )}
                     </div>
                </div>

                {/* Notes */}
                <div>
                    {shiftPlacementLocked ? (
                        <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                            This shift is locked because time has already been tracked at this location. You can keep notes, but you cannot move or delete the assignment.
                        </div>
                    ) : null}
                    <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Notes</label>
                    <textarea
                        placeholder={readOnly ? "No notes" : "Add shift notes..."}
                        disabled={readOnly}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none disabled:opacity-100"
                        rows={3}
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>
                
                {/* Stats Summary */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3 flex justify-between items-center text-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex flex-col">
                        <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Total Hours</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{stats.paidHours} hrs</span>
                    </div>
                    {stats.hasRate && (
                        <div className="flex flex-col items-end">
                            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Est. Pay</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(Number(stats.estimatedPay), selectedBusiness?.currencyCode)}</span>
                        </div>
                    )}
                </div>

                {/* Applications (Admin) */}
                {!readOnly && shift?.applications && shift.applications.length > 0 && (
                   <div className="pt-2">
                      <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Applications</h4>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                          {shift.applications.map(app => (
                              <div key={app.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                                          {app.employee.firstName[0]}
                                      </div>
                                      <div className="text-sm text-slate-700 dark:text-slate-200">
                                          {app.employee.firstName} {app.employee.lastName}
                                      </div>
                                  </div>
                                  {app.status === 'PENDING' && (
                                      <div className="flex items-center gap-1">
                                          <button
                                              type="button"
                                              onClick={() => onDeclineApplication?.(app.id)}
                                              className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                                          >
                                              Decline
                                          </button>
                                          <button
                                              type="button"
                                              onClick={() => onApproveApplication?.(app.id)}
                                              className="text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 px-2 py-1 rounded transition-colors"
                                          >
                                              Approve
                                          </button>
                                      </div>
                                  )}
                                  {app.status === 'APPROVED' && (
                                      <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                                          <CheckCircle size={12} /> Approved
                                      </span>
                                  )}
                                  {app.status === 'REJECTED' && (
                                      <span className="text-xs font-medium text-red-500">Rejected</span>
                                  )}
                              </div>
                          ))}
                      </div>
                   </div>
                )}

                {/* Apply Button (Employee) */}
                {readOnly && shift?.status === 'OPEN' && (
                    <div className="pt-2">
                        {hasApplied ? (
                            userApplication?.status === 'REJECTED' ? (
                                <div className="w-full py-2 bg-red-50 text-red-600 text-center rounded-lg font-medium text-sm">
                                    Application Rejected
                                </div>
                            ) : (
                                <div className="w-full py-2 bg-blue-50 text-blue-600 text-center rounded-lg font-medium text-sm">
                                    Application Sent
                                </div>
                            )
                        ) : (
                            <button
                                type="button"
                                onClick={onApply}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                            >
                                Apply for Shift
                            </button>
                        )}
                    </div>
                )}

                {readOnly && shift?.id && shift.employeeId === currentUserId && shift.status !== 'OPEN' && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={openCallout}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors"
                    >
                      Report call-out
                    </button>
                  </div>
                )}

                {historyOpen && (
                  <div className="mt-6 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">Event History</div>
                      <button onClick={() => setHistoryOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="p-4 space-y-3">
                      {historyLoading && (
                        <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>
                      )}
                      {!historyLoading && history?.shift?.callout && (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            Call-out
                          </div>
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            Type: {history.shift.callout.type} · Reason: {history.shift.callout.reasonCode}
                          </div>
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            Status: {history.shift.callout.status || 'PENDING'}
                          </div>
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            Notice: {history.shift.callout.noticeAt ? new Date(history.shift.callout.noticeAt).toLocaleString() : 'N/A'}
                          </div>
                        </div>
                      )}
                      {!historyLoading && Array.isArray(history?.shift?.coverages) && history.shift.coverages.length > 0 && (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">Coverage</div>
                          <div className="mt-2 space-y-2">
                            {history.shift.coverages.slice(0, 5).map((c: any) => (
                              <div key={c.id} className="text-xs text-slate-700 dark:text-slate-300">
                                {c.replacementEmployee ? `${c.replacementEmployee.firstName} ${c.replacementEmployee.lastName}` : c.replacementEmployeeId}
                                {' · '}
                                {c.method || 'DIRECT'}
                                {typeof c.responseMinutes === 'number' ? ` · ${c.responseMinutes}m` : ''}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {!historyLoading && Array.isArray(history?.logs) && history.logs.length > 0 && (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">Audit</div>
                          <div className="mt-2 space-y-2">
                            {history.logs.slice(0, 10).map((l: any) => (
                              <div key={l.id} className="text-xs text-slate-700 dark:text-slate-300">
                                {new Date(l.at).toLocaleString()} · {l.action} · {l.by}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {!historyLoading && !history?.shift?.callout && (!Array.isArray(history?.shift?.coverages) || history.shift.coverages.length === 0) && (
                        <div className="text-sm text-slate-500 dark:text-slate-400">No events recorded.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        {!readOnly && (
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 shrink-0 rounded-b-lg relative z-10">
            {shift && onDelete ? (
                <ModalActionButton kind="delete" onClick={() => onDelete(shift.id)}>
                  Delete
                </ModalActionButton>
            ) : <div></div>}
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsMenuOpen(v => !v)}
                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors"
                aria-label="More actions"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              <ModalActionButton kind="cancel" onClick={onClose}>
                Cancel
              </ModalActionButton>
              <ModalActionButton kind="submit" type="submit" form="shift-form">
                Save
              </ModalActionButton>
            </div>
            
            {/* Context Menu */}
            {isMenuOpen && (
              <div className="absolute right-20 bottom-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg w-60 overflow-hidden z-20">
                <div className="py-2">
                  <button onClick={() => { repeatTomorrow(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Repeat for tomorrow</button>
                  <button onClick={() => { repeatRestOfWeek(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Repeat for rest of the week</button>
                  <button onClick={() => { setShowSpecificDays(true); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Repeat for specific days</button>
                  <button onClick={() => { setShowPattern(true); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Repeat for set pattern</button>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
                  {!shiftPlacementLocked ? (
                    <button onClick={() => { splitShift(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Split shift</button>
                  ) : null}
                  {!shiftPlacementLocked ? (
                    <button onClick={() => { findReplacement(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Find replacement</button>
                  ) : null}
                  {shift?.id && (
                    <button onClick={() => { openCallout(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Record call-out</button>
                  )}
                  {shift?.id && shift?.status === 'OPEN' && !shiftPlacementLocked && (
                    <>
                      <button onClick={() => { reassignCoverage(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Assign coverage</button>
                      <button onClick={() => { broadcastOpenShift(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                        <Megaphone className="w-4 h-4" />
                        Broadcast open shift
                      </button>
                    </>
                  )}
                  <button onClick={() => { viewProfile(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">View profile</button>
                  <button onClick={() => { viewHistory(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">View shift history</button>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
                  {!shiftPlacementLocked ? (
                    <button onClick={() => { deleteShiftAction(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Delete shift</button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Modals */}
        {showSpecificDays && (
          <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="text-lg font-bold">Repeat shift on specific days</div>
                <button onClick={() => setShowSpecificDays(false)} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="px-5 pt-3 text-sm text-slate-600 dark:text-slate-400">
                {(() => {
                  if (!formData.date) return '';
                  const base = new Date(formData.date);
                  const start = startOfWeek(base, { weekStartsOn: 1 });
                  const end = endOfWeek(base, { weekStartsOn: 1 });
                  return `Select days to repeat shift between ${format(start, 'EEE d/MM/yy')} to ${format(end, 'EEE d/MM/yy')}`;
                })()}
              </div>
              <div className="p-5 space-y-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedDays.length === 7}
                    onChange={(e) => {
                      setSelectedDays(e.target.checked ? [1,2,3,4,5,6,0] : []);
                    }}
                  />
                  <span>Select all</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {[['Mon',1],['Tue',2],['Wed',3],['Thu',4],['Fri',5],['Sat',6],['Sun',0]].map(([label, val]) => (
                    <label key={val as number} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedDays.includes(val as number)}
                        onChange={(e) => {
                          const v = val as number;
                          setSelectedDays(prev => e.target.checked ? [...prev, v] : prev.filter(x => x !== v));
                        }}
                      />
                      <span>{label as string}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="p-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                <button onClick={() => { setShowSpecificDays(false); }} className="px-4 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600">Cancel</button>
                <button onClick={applySpecificDays} className="px-4 py-2 text-sm rounded-md bg-purple-600 text-white">Apply</button>
              </div>
            </div>
          </div>
        )}
        {showPattern && (
          <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="text-lg font-bold">Repeat pattern</div>
                <button onClick={() => setShowPattern(false)} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm mb-1">Days on</label>
                    <input
                      type="number"
                      min={1}
                      value={daysOn}
                      onChange={(e) => setDaysOn(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded border border-slate-300 dark:border-slate-600 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Days off</label>
                    <select
                      value={daysOff}
                      onChange={(e) => setDaysOff(parseInt(e.target.value))}
                      className="w-full rounded border border-slate-300 dark:border-slate-600 px-3 py-2"
                    >
                      {[0,1,2,3,4,5,6,7].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-6">
                  <label className="block text-sm mb-1">Repeat until</label>
                  <input
                    type="date"
                    value={repeatUntil}
                    onChange={(e) => setRepeatUntil(e.target.value)}
                    className="w-full rounded border border-slate-300 dark:border-slate-600 px-3 py-2"
                  />
                </div>
              </div>
              <div className="p-5 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                <button onClick={() => { setShowPattern(false); }} className="px-4 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600">Cancel</button>
                <button
                  onClick={applyPattern}
                  disabled={!repeatUntil}
                  className={`px-4 py-2 text-sm rounded-md ${repeatUntil ? 'bg-purple-600 text-white' : 'bg-slate-300 text-slate-600 cursor-not-allowed'}`}
                >
                  Create shifts
                </button>
              </div>
            </div>
          </div>
        )}
        {showReplacementPicker && (
          <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-semibold">Find replacement</div>
              <div className="p-4 space-y-3">
                <label className="block text-sm">Select employee</label>
                <select
                  value={replacementId}
                  onChange={(e) => setReplacementId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-700 text-sm"
                >
                  <option value="">Choose an employee</option>
                  {employees.filter(e => e.id !== formData.employeeId).map(e => (
                    <option key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} {e.hourlyRate ? `(${formatCurrency(e.hourlyRate, selectedBusiness?.currencyCode)}/hr)` : ''}
                      </option>
                  ))}
                </select>
              </div>
              <div className="p-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                <button onClick={() => { setShowReplacementPicker(false); }} className="px-4 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600">Cancel</button>
                <button onClick={applyReplacement} className="px-4 py-2 text-sm rounded-md bg-purple-600 text-white">Apply</button>
              </div>
            </div>
          </div>
        )}

        {calloutOpen && (
          <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="font-semibold">Report call-out</div>
                <button onClick={() => setCalloutOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Reason</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    value={calloutReasonCode}
                    onChange={(e) => setCalloutReasonCode(e.target.value)}
                  >
                    <option value="SICK">Sick</option>
                    <option value="FAMILY_EMERGENCY">Family emergency</option>
                    <option value="TRANSPORTATION">Transportation</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Type</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    value={calloutType}
                    onChange={(e) => setCalloutType(e.target.value as any)}
                  >
                    <option value="EXCUSED">Excused</option>
                    <option value="UNEXCUSED">Unexcused</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Time of notice</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    value={calloutNoticeAt}
                    onChange={(e) => setCalloutNoticeAt(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Note (optional)</label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    rows={3}
                    value={calloutReasonNote}
                    onChange={(e) => setCalloutReasonNote(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Supporting document (optional)</label>
                  <input
                    type="file"
                    className="w-full text-sm"
                    onChange={(e) => setCalloutFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <div className="p-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setCalloutOpen(false)}
                  className="px-4 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600"
                  disabled={calloutSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={submitCallout}
                  className="px-4 py-2 text-sm rounded-md bg-red-600 text-white disabled:opacity-50"
                  disabled={calloutSubmitting}
                >
                  {calloutSubmitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
