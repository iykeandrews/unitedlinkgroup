import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  MouseSensor, 
  TouchSensor,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, isWithinInterval, parseISO, startOfDay, endOfDay, endOfMonth, endOfYear, addDays, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, RefreshCw, Copy, BarChart, Settings, HelpCircle, ChevronDown, CheckCircle, AlertCircle, Circle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import api from '../../lib/api';
import { useBusiness } from '../../context/business-context';
import { Employee, EmployeeClockStatus, Location, Shift, ViewType, Client, LeaveRequest, GroupBy } from './types';
import { EmployeeSidebar } from './EmployeeSidebar';
import { TimelineGrid } from './TimelineGrid';
import { ShiftModal } from './ShiftModal';
import { ShiftCard } from './ShiftCard';
import { LeaveConflictModal } from './LeaveConflictModal';
import { ConfirmModal } from '../ConfirmModal';

export default function SchedulingPage() {
  const router = useRouter();
  const { selectedBusiness } = useBusiness();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('week');
  const [groupBy, setGroupBy] = useState<GroupBy>('area');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EMPTY' | 'UNPUBLISHED' | 'PUBLISHED' | 'OPEN'>('ALL');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [myData, setMyData] = useState<{
    employee: { id: string; firstName: string; lastName: string; hourlyRate: number };
    shifts: Shift[];
    summary: { totalHours: number; totalBreakMinutes: number; payableHours: number; estimatedEarnings: number };
  } | null>(null);
  
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [scheduleTimesheets, setScheduleTimesheets] = useState<Array<{
    id: string;
    employeeId: string;
    startTime: string;
    endTime?: string | null;
    locationId?: string | null;
    breaks?: Array<{ id: string; endTime?: string | null; type?: string | null }>;
  }>>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [pendingCallouts, setPendingCallouts] = useState<Array<{
    id: string;
    createdAt: string;
    type: string;
    reasonCode: string;
    reasonNote?: string | null;
    shift?: { id: string; startTime: string; endTime?: string | null; location?: { name?: string | null } | null } | null;
    absentEmployee?: { id: string; firstName: string; lastName: string; email?: string | null } | null;
  }>>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [areasCollapsed, setAreasCollapsed] = useState(false);
  const [bulkModal, setBulkModal] = useState<{ open: boolean; field: 'notes' | 'breakMinutes'; value: string }>({ open: false, field: 'notes', value: '' });
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [peerShifts, setPeerShifts] = useState<Shift[]>([]);
  const [calloutActionLoadingId, setCalloutActionLoadingId] = useState<string | null>(null);
  const [calloutRejectState, setCalloutRejectState] = useState<{ isOpen: boolean; calloutId?: string; reason: string }>({
    isOpen: false,
    calloutId: undefined,
    reason: '',
  });
  const [actionConfirm, setActionConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    variant: 'danger' | 'primary';
    onConfirm: (() => void) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'primary',
    onConfirm: null,
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [modalDefaults, setModalDefaults] = useState<{
    date?: Date;
    locationId?: string;
    employee?: Employee;
  }>({});

  const [conflictModalState, setConflictModalState] = useState<{
    isOpen: boolean;
    employeeName: string;
    locationName: string;
    date: string;
    pendingAction: () => void;
  }>({
    isOpen: false,
    employeeName: '',
    locationName: '',
    date: '',
    pendingAction: () => {},
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; shiftId?: string; isLoading?: boolean }>({
    isOpen: false,
    shiftId: undefined,
    isLoading: false
  });
  
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const fetchClients = async () => {
    try {
        const res = await api.get('/clients');
        // Filter for active clients if the API returns all
        const activeClients = res.data.filter((c: Client) => c.status === 'ACTIVE');
        setClients(activeClients);
    } catch (error) {
        console.error('Failed to fetch clients', error);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      
      const locationParams: any = { status: 'ACTIVE' };
      if (selectedClientId && selectedClientId !== 'all') {
        locationParams.clientId = selectedClientId;
      }

      // Fetch data independently to identify failures without failing all
      const [locResult, empResult, shiftResult, timesheetResult, leaveResult] = await Promise.allSettled([
        api.get('/locations', { params: locationParams }),
        api.get('/employees', { params: { status: 'ACTIVE' } }),
        api.get('/scheduling/shifts', {
          params: {
            start: start.toISOString(),
            end: end.toISOString(),
          }
        }),
        api.get('/time-tracking/timesheets', {
          params: {
            start: start.toISOString(),
            end: end.toISOString(),
          }
        }),
        api.get('/leave/requests', { params: { status: 'APPROVED' } })
      ]);

      let fetchedLocations: Location[] = [];
      let fetchedEmployees: Employee[] = [];
      let fetchedShifts: Shift[] = [];
      let fetchedTimesheets: Array<{
        id: string;
        employeeId: string;
        startTime: string;
        endTime?: string | null;
        locationId?: string | null;
        breaks?: Array<{ id: string; endTime?: string | null; type?: string | null }>;
      }> = [];
      let fetchedLeaveRequests: LeaveRequest[] = [];
      const errors: string[] = [];

      if (locResult.status === 'fulfilled') {
        fetchedLocations = locResult.value.data;
      } else {
        console.error('Locations fetch failed:', locResult.reason);
        errors.push(`Locations: ${locResult.reason?.response?.data?.message || locResult.reason.message}`);
      }

      if (empResult.status === 'fulfilled') {
        fetchedEmployees = empResult.value.data;
      } else {
        console.error('Employees fetch failed:', empResult.reason);
        errors.push(`Employees: ${empResult.reason?.response?.data?.message || empResult.reason.message}`);
      }

      if (shiftResult.status === 'fulfilled') {
        fetchedShifts = shiftResult.value.data;
      } else {
        console.error('Shifts fetch failed:', shiftResult.reason);
        errors.push(`Shifts: ${shiftResult.reason?.response?.data?.message || shiftResult.reason.message}`);
      }

      if (timesheetResult.status === 'fulfilled') {
        fetchedTimesheets = Array.isArray(timesheetResult.value.data) ? timesheetResult.value.data : [];
      } else {
        console.error('Timesheets fetch failed:', timesheetResult.reason);
        errors.push(`Time tracking: ${timesheetResult.reason?.response?.data?.message || timesheetResult.reason.message}`);
      }

      if (leaveResult.status === 'fulfilled') {
        fetchedLeaveRequests = leaveResult.value.data;
      } else {
        // Leave requests failure is non-critical for some roles
        console.warn('Leave requests fetch failed:', leaveResult.reason);
      }

      setLocations(fetchedLocations);
      setEmployees(fetchedEmployees);
      setShifts(fetchedShifts);
      setScheduleTimesheets(fetchedTimesheets);
      setLeaveRequests(fetchedLeaveRequests);

      if (errors.length > 0) {
        toast.error(`Failed to load schedule parts: ${errors.join(', ')}`);
      }
    } catch (error: any) {
      console.error('Unexpected error in fetchData', error);
      toast.error('Unexpected error loading schedule');
    } finally {
      setLoading(false);
    }
  }, [currentDate, selectedClientId]);

  const shiftClockStatuses = useMemo<Record<string, EmployeeClockStatus>>(() => {
    const byShift: Record<string, EmployeeClockStatus> = {};

    for (const shift of shifts) {
      if (!shift.employeeId || !shift.locationId || !shift.startTime) continue;

      const shiftStart = new Date(shift.startTime).getTime();
      const shiftEnd = new Date(shift.endTime || shift.startTime).getTime();

      const matchingTimesheets = scheduleTimesheets
        .filter((timesheet) => {
          if (timesheet.employeeId !== shift.employeeId) return false;
          if ((timesheet.locationId || null) !== (shift.locationId || null)) return false;

          const timesheetStart = new Date(timesheet.startTime).getTime();
          const timesheetEnd = new Date(timesheet.endTime || timesheet.startTime).getTime();

          return timesheetStart <= shiftEnd && timesheetEnd >= shiftStart;
        })
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      const matched = matchingTimesheets[0];
      if (!matched) continue;

      const hasActiveBreak = Array.isArray(matched.breaks) && matched.breaks.some((entry) => !entry.endTime);
      byShift[shift.id] = {
        status: hasActiveBreak ? 'ON_BREAK' : matched.endTime ? 'CLOCKED_OUT' : 'CLOCKED_IN',
        timesheetId: matched.id,
        startTime: matched.startTime,
        endTime: matched.endTime || null,
        locationId: matched.locationId || null,
        breakType: hasActiveBreak ? (matched.breaks?.find((entry) => !entry.endTime)?.type || null) : null,
      };
    }

    return byShift;
  }, [scheduleTimesheets, shifts]);

  const shiftPlacementLocks = useMemo<Record<string, boolean>>(() => {
    const locks: Record<string, boolean> = {};
    const nowMs = Date.now();

    for (const shift of shifts) {
      if (!shift.employeeId || !shift.locationId || !shift.startTime) continue;

      const shiftStart = new Date(shift.startTime).getTime();
      const shiftEnd = new Date(shift.endTime || shift.startTime).getTime();

      if (nowMs >= shiftStart) {
        locks[shift.id] = true;
        continue;
      }

      const isLocked = scheduleTimesheets.some((timesheet) => {
        if (timesheet.employeeId !== shift.employeeId) return false;
        if ((timesheet.locationId || null) !== (shift.locationId || null)) return false;

        const timesheetStart = new Date(timesheet.startTime).getTime();
        const timesheetEnd = new Date(timesheet.endTime || timesheet.startTime).getTime();

        return timesheetStart <= shiftEnd && timesheetEnd >= shiftStart;
      });

      if (isLocked) {
        locks[shift.id] = true;
      }
    }

    return locks;
  }, [scheduleTimesheets, shifts]);

  const fetchPendingCallouts = useCallback(async () => {
    if (!userRole || userRole === 'EMPLOYEE') return;
    if (userRole === 'SUPER_ADMIN' && !selectedBusiness) {
      setPendingCallouts([]);
      return;
    }
    try {
      const res = await api.get('/scheduling/callouts/pending');
      setPendingCallouts(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Pending callouts fetch failed:', error);
      setPendingCallouts([]);
    }
  }, [selectedBusiness, userRole]);

  const fetchMy = useCallback(async () => {
      setLoading(true);
      try {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        const res = await api.get('/scheduling/my', {
          params: { start: start.toISOString(), end: end.toISOString() }
        });
        setMyData(res.data);
        const peersRes = await api.get('/scheduling/my-peers', {
          params: { start: start.toISOString(), end: end.toISOString() }
        });
        setPeerShifts(peersRes.data || []);
      } catch (error) {
      } finally {
        setLoading(false);
      }
  }, [currentDate]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/profile');
        setUserRole(res.data.role);
        setCurrentUserId(res.data.employeeId || res.data.id);
      } catch {}
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!userRole) return;
    if (userRole === 'EMPLOYEE') return;
    
    if (userRole === 'SUPER_ADMIN' && !selectedBusiness) {
      setLoading(false);
      return;
    }
    
    fetchClients();
  }, [userRole, selectedBusiness]);

  useEffect(() => {
    if (!userRole) return;
    if (userRole === 'EMPLOYEE') return;

    if (userRole === 'SUPER_ADMIN' && !selectedBusiness) {
      setLoading(false);
      return;
    }

    fetchData();
    fetchPendingCallouts();

    const onFocus = () => {
      fetchData();
      fetchPendingCallouts();
    };
    window.addEventListener('focus', onFocus);
    const onLeaveUpdated = () => {
      fetchData();
      fetchPendingCallouts();
    };
    window.addEventListener('leave:updated', onLeaveUpdated as any);
    const onSchedulingUpdated = () => {
      fetchData();
      fetchPendingCallouts();
    };
    window.addEventListener('scheduling:updated', onSchedulingUpdated as any);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('leave:updated', onLeaveUpdated as any);
      window.removeEventListener('scheduling:updated', onSchedulingUpdated as any);
    };
  }, [userRole, selectedBusiness, fetchData, fetchPendingCallouts]);

  useEffect(() => {
    if (userRole !== 'EMPLOYEE') return;
    fetchMy();
    const onSchedulingUpdated = () => fetchMy();
    window.addEventListener('scheduling:updated', onSchedulingUpdated as any);
    return () => {
      window.removeEventListener('scheduling:updated', onSchedulingUpdated as any);
    };
  }, [currentDate, userRole, fetchMy]);

  const checkLeaveConflict = (employeeId: string, shiftStart: Date, shiftEnd: Date) => {
    return leaveRequests.find((req) => {
      if (req.employeeId !== employeeId || req.status !== 'APPROVED') return false;

      const leaveStartBase = parseISO(req.startDate);
      const leaveEndBase = req.resumedAt ? parseISO(req.resumedAt) : parseISO(req.endDate);

      const isAllDay = (req as any).isAllDay ?? true;
      const startTime = (req as any).startTime || null;
      const endTime = (req as any).endTime || null;

      const leaveStart = (() => {
        if (!isAllDay && startTime) {
          const [h, m] = String(startTime).split(':').map(Number);
          const d = new Date(leaveStartBase);
          d.setHours(h || 0, m || 0, 0, 0);
          return d;
        }
        return startOfDay(leaveStartBase);
      })();

      const leaveEnd = (() => {
        if (req.resumedAt) return leaveEndBase;
        if (!isAllDay && endTime) {
          const [h, m] = String(endTime).split(':').map(Number);
          const d = new Date(leaveEndBase);
          d.setHours(h || 0, m || 0, 0, 0);
          return d;
        }
        return endOfDay(leaveEndBase);
      })();

      return shiftStart.getTime() < leaveEnd.getTime() && shiftEnd.getTime() > leaveStart.getTime();
    });
  };

  const handleApplyForShift = async () => {
    if (!selectedShift) return;
    try {
      await api.post(`/scheduling/shifts/${selectedShift.id}/apply`);
      toast.success('Application submitted successfully');
      setIsModalOpen(false);
      if (userRole === 'EMPLOYEE') {
          fetchMy();
      } else {
          fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to apply for shift');
    }
  };

  const handleApproveApplication = async (appId: string) => {
    try {
      await api.post(`/scheduling/applications/${appId}/approve`);
      toast.success('Application approved');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve application');
    }
  };

  const handleDeclineApplication = async (appId: string) => {
    try {
      await api.post(`/scheduling/applications/${appId}/decline`);
      toast.success('Application declined');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to decline application');
    }
  };

  const handleApproveCallout = async (calloutId: string) => {
    try {
      setCalloutActionLoadingId(calloutId);
      await api.post(`/scheduling/callouts/${calloutId}/approve`);
      toast.success('Call-out approved and shift opened');
      await Promise.all([fetchData(), fetchPendingCallouts()]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to approve call-out');
    } finally {
      setCalloutActionLoadingId(null);
    }
  };

  const handleRejectCallout = async () => {
    if (!calloutRejectState.calloutId) return;
    try {
      setCalloutActionLoadingId(calloutRejectState.calloutId);
      await api.post(`/scheduling/callouts/${calloutRejectState.calloutId}/reject`, {
        reason: calloutRejectState.reason.trim() || undefined,
      });
      toast.success('Call-out rejected');
      setCalloutRejectState({ isOpen: false, calloutId: undefined, reason: '' });
      await fetchPendingCallouts();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to reject call-out');
    } finally {
      setCalloutActionLoadingId(null);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

  // Case 1: Drag Employee to Grid Cell -> Create New Shift
  if (activeData?.type === 'employee' && overData?.type === 'cell') {
      const dayStart = startOfDay(overData.date);
      const dayEnd = endOfDay(overData.date);
      const conflict = checkLeaveConflict(activeData.employee.id, dayStart, dayEnd);
      
      const proceed = () => {
        setModalDefaults({
            date: overData.date,
            locationId: overData.locationId,
            employee: activeData.employee
        });
        setSelectedShift(null);
        setIsModalOpen(true);
      };

      if (conflict) {
          const locationName = overData.locationId 
            ? (locations.find(l => l.id === overData.locationId)?.name || 'Unknown Location')
            : 'Any Location';
          setConflictModalState({
              isOpen: true,
              employeeName: `${activeData.employee.firstName} ${activeData.employee.lastName}`,
              locationName: locationName,
              date: format(overData.date, 'EEE d MMM'),
              pendingAction: proceed
          });
          return;
      }
      
      proceed();
  }

  // Case 2: Drag Shift to Grid Cell -> Move Shift
  if (activeData?.type === 'shift' && overData?.type === 'cell') {
      const shift = activeData.shift as Shift;
      if (shiftPlacementLocks[shift.id]) {
        toast.error('This shift cannot be moved because it is already locked (started or tracked)');
        return;
      }
      const newDate = overData.date as Date;
      const newLocationId = overData.locationId as string | undefined;
      const targetEmployeeId = (overData.employeeId as string | undefined) ?? shift.employeeId;

      // Calculate new times preserving duration
      if (!shift.endTime) return;
      const oldStart = new Date(shift.startTime);
      const oldEnd = new Date(shift.endTime);
      const durationMs = oldEnd.getTime() - oldStart.getTime();
      const newStart = new Date(newDate);
      newStart.setHours(oldStart.getHours(), oldStart.getMinutes());
      const newEnd = new Date(newStart.getTime() + durationMs);

      // Check conflict for target employee on target date
      let conflict: LeaveRequest | undefined;
      if (targetEmployeeId) {
        conflict = checkLeaveConflict(targetEmployeeId, newStart, newEnd);
      }

      const executeMove = async () => {
        const updatedShift = {
          ...shift,
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
          locationId: newLocationId ?? shift.locationId,
          location: locations.find(l => l.id === (newLocationId ?? shift.locationId)),
          employeeId: targetEmployeeId,
          employee: employees.find(e => e.id === targetEmployeeId) || shift.employee
        };

        setShifts(prev => prev.map(s => s.id === shift.id ? updatedShift : s));

        const payload: any = {
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
        };
        // Update relations via nested connect/disconnect
        if (typeof targetEmployeeId !== 'undefined') {
          payload.employee = targetEmployeeId
            ? { connect: { id: targetEmployeeId } }
            : { disconnect: true };
        }
        const nextLocationId = newLocationId ?? shift.locationId;
        if (typeof nextLocationId !== 'undefined') {
          payload.location = nextLocationId
            ? { connect: { id: nextLocationId } }
            : { disconnect: true };
        }

        try {
          await api.put(`/scheduling/shifts/${shift.id}`, payload);
          toast.success('Change saved as draft');
          fetchData();
        } catch (error) {
          console.error('Failed to move shift', error);
          const msg = (error as any)?.response?.data?.message || 'Failed to move shift';
          toast.error(msg);
          fetchData(); // Revert
        }
      };

      if (conflict) {
        const locationName = locations.find(l => l.id === (newLocationId ?? shift.locationId))?.name || 'Unknown Location';
        const employee = employees.find(e => e.id === targetEmployeeId);
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee';

        setConflictModalState({
          isOpen: true,
          employeeName: employeeName,
          locationName: locationName,
          date: format(newDate, 'EEE d MMM'),
          pendingAction: executeMove
        });
        return;
      }

      await executeMove();
  }
    // Case 3: Drag Open Shift template to Location cell -> Create unassigned OPEN shift
    if (activeData?.type === 'open_shift' && overData?.type === 'cell') {
      const locationId = (overData as any).locationId as string | undefined;
      const date = (overData as any).date as Date;
      if (!locationId) {
        toast.error('Drop open shifts onto a location day cell');
        return;
      }
      const start = new Date(date);
      const end = new Date(date);
      start.setHours(9, 0, 0, 0);
      end.setHours(17, 0, 0, 0);
      const location = locations.find(l => l.id === locationId);
      const payload: any = {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        notes: 'Open shift',
        status: 'DRAFT',
        location: { connect: { id: locationId } },
      };
      if (location?.businessId) {
        payload.business = { connect: { id: location.businessId } };
      }
      try {
        const res = await api.post('/scheduling/shifts', payload);
        setShifts(prev => [...prev, { ...(res.data as any) }]);
        toast.success('Open shift created');
      } catch (error) {
        console.error('Failed to create open shift', error);
        toast.error('Failed to create open shift');
      }
      return;
    }
  };

  const handleSaveShift = async (shiftData: Partial<Shift>) => {
      if (shiftData.id && shiftPlacementLocks[shiftData.id]) {
        toast.error('This shift cannot be modified because it is already locked (started or tracked)');
        return;
      }

      // Helper to perform the actual save
      const executeSave = async () => {
        try {
            if (shiftData.id) {
              // Update
              // For update, we can usually use scalars if the backend allows, 
              // but to be safe and consistent with typical Prisma usage in this project:
              const updatePayload: any = {
                // Basic scalar fields
                startTime: shiftData.startTime,
                endTime: shiftData.endTime,
                notes: shiftData.notes,
              };
              // Update relations using nested connect/disconnect to satisfy Prisma ShiftUpdateInput
              if (typeof shiftData.employeeId !== 'undefined') {
                updatePayload.employee = shiftData.employeeId
                  ? { connect: { id: shiftData.employeeId } }
                  : { disconnect: true };
              }
              if (typeof shiftData.locationId !== 'undefined') {
                updatePayload.location = shiftData.locationId
                  ? { connect: { id: shiftData.locationId } }
                  : { disconnect: true };
              }
              await api.put(`/scheduling/shifts/${shiftData.id}`, updatePayload);
              toast.success('Change saved as draft');
            } else {
              // Create - Transform to relation syntax for validation
              const createPayload: any = {
                startTime: shiftData.startTime,
                endTime: shiftData.endTime,
                notes: shiftData.notes,
                status: 'DRAFT',
              };
              // Only connect relations when provided to allow open shifts
              if (shiftData.employeeId) {
                createPayload.employee = { connect: { id: shiftData.employeeId } };
              }
              if (shiftData.locationId) {
                createPayload.location = { connect: { id: shiftData.locationId } };
              }
              
              // We'll try to find businessId from the location
              const location = locations.find(l => l.id === shiftData.locationId);

              if (location && location.businessId) {
                   createPayload.business = { connect: { id: location.businessId } };
              } else if (locations.length > 0 && locations[0].businessId) {
                   // Fallback to first location's business if specific location lacks it (shouldn't happen if data is consistent)
                   createPayload.business = { connect: { id: locations[0].businessId } };
              } else if (selectedBusiness?.id) {
                   // Final fallback: use currently selected business context
                   createPayload.business = { connect: { id: selectedBusiness.id } };
              }
      
              await api.post('/scheduling/shifts', createPayload);
              toast.success('Draft shift created');
            }
            setIsModalOpen(false);
            fetchData();
          } catch (error) {
            console.error('Failed to save shift', error);
            const msg = (error as any)?.response?.data?.message || 'Failed to save shift';
            toast.error(msg);
          }
      };

      // Check conflict
      if (shiftData.employeeId && shiftData.startTime) {
          const start = new Date(shiftData.startTime);
          const end = shiftData.endTime ? new Date(shiftData.endTime) : endOfDay(start);
          const conflict = checkLeaveConflict(shiftData.employeeId, start, end);
          
          if (conflict) {
              const locationName = locations.find(l => l.id === shiftData.locationId)?.name || 'Unknown Location';
              const employee = employees.find(e => e.id === shiftData.employeeId);
              const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee';
              
              setConflictModalState({
                  isOpen: true,
                  employeeName: employeeName,
                  locationName: locationName,
                  date: format(start, 'EEE d MMM'),
                  pendingAction: executeSave
              });
              return;
          }
      }
      
      await executeSave();
  };

  const handleDeleteShift = (shiftId: string) => {
    if (shiftPlacementLocks[shiftId]) {
      toast.error('This shift cannot be deleted because it is already locked (started or tracked)');
      return;
    }
    setDeleteConfirm({ isOpen: true, shiftId, isLoading: false });
  };

  const performDeleteShift = async () => {
    if (!deleteConfirm.shiftId) return;
    try {
      setDeleteConfirm(prev => ({ ...prev, isLoading: true }));
      await api.delete(`/scheduling/shifts/${deleteConfirm.shiftId}`);
      toast.success('Shift deleted');
      setIsModalOpen(false);
      setDeleteConfirm({ isOpen: false, shiftId: undefined, isLoading: false });
      fetchData();
    } catch (error) {
      console.error('Failed to delete shift', error);
      const msg = (error as any)?.response?.data?.message || 'Failed to delete shift';
      toast.error(msg);
      setDeleteConfirm(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const unpublishedCount = shifts.filter(s => {
    const st = String(s.status || '').toUpperCase();
    return st === 'DRAFT' || st === 'CANCELLED' || st === 'EMPTY';
  }).length;
  const hasUnpublishedChanges = unpublishedCount > 0;
  const isWeekPublished = shifts.length > 0 && !hasUnpublishedChanges;
  const visibleShifts = React.useMemo(() => {
    const st = (s: Shift) => String(s.status || '').toUpperCase();
    if (statusFilter === 'EMPTY') return shifts.filter(s => st(s) === 'EMPTY');
    if (statusFilter === 'UNPUBLISHED') return shifts.filter(s => st(s) === 'DRAFT' || st(s) === 'CANCELLED');
    if (statusFilter === 'PUBLISHED') return shifts.filter(s => st(s) === 'PUBLISHED');
    if (statusFilter === 'OPEN') return shifts.filter(s => st(s) === 'OPEN');
    return shifts;
  }, [shifts, statusFilter]);

  if (userRole === 'EMPLOYEE') {
    const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedBusiness?.currencyCode || 'USD' });
    const empLocations: Location[] = Array.from(
      new Map((myData?.shifts || [])
        .map(s => s.location)
        .filter(Boolean)
        .map(loc => [loc!.id, loc!])
      ).values()
    );
    const empEmployee: Employee[] = myData ? [{ id: myData.employee.id, firstName: myData.employee.firstName, lastName: myData.employee.lastName, email: '', role: 'Employee', hourlyRate: myData.employee.hourlyRate }] : [];
    const empShifts: Shift[] = myData?.shifts || [];

    return (
      <div className="flex flex-col h[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between shrink-0 h-16">
          <div className="flex items-center gap-4">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {myData ? `${myData.employee.firstName} ${myData.employee.lastName}` : 'My Schedule'}
            </div>
            <div className="flex items-center bg-purple-50 dark:bg-purple-900/20 rounded-lg p-0.5">
              <button onClick={handlePrevWeek} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-purple-700 dark:text-purple-300 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm font-semibold text-purple-700 dark:text-purple-300">
                {format(weekStart, 'd MMM')} - {format(weekEnd, 'd MMM')}
              </span>
              <button onClick={handleNextWeek} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-purple-700 dark:text-purple-300 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-sm text-slate-700 dark:text-slate-300">
              Hours: <span className="font-semibold">{myData?.summary.payableHours?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-300">
              Earnings: <span className="font-semibold">{currencyFormatter.format(myData?.summary.estimatedEarnings || 0)}</span>
            </div>
          </div>
        </div>
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-1 min-h-0">
            {/* No employee sidebar for employee view */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 overflow-hidden">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <TimelineGrid
                  view={view}
                  groupBy="area"
                  startDate={weekStart}
                  locations={empLocations}
                  employees={empEmployee}
                  shifts={[...empShifts, ...peerShifts].filter(s => empLocations.some(l => l.id === s.locationId))}
                  shiftClockStatuses={shiftClockStatuses}
                  shiftPlacementLocks={shiftPlacementLocks}
                  collapsed={areasCollapsed}
                  readOnly
                  onShiftClick={(shift) => {
                    setSelectedShift(shift);
                    setIsModalOpen(true);
                  }}
                  onAddShiftAtLocation={() => {}}
                  onAddShiftForEmployee={() => {}}
                  currentUserId={currentUserId}
                />
              )}
            </div>
          </div>
        </DndContext>
        <ShiftModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={() => {}}
          shift={selectedShift}
          employees={empEmployee}
          locations={empLocations}
          readOnly={true}
          onApply={handleApplyForShift}
          currentUserId={currentUserId}
        />
      </div>
    );
  }

  const exportScheduleExcel = () => {
    const escapeXml = (v: any) =>
      String(v ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const employeesById = new Map(employees.map(e => [e.id, e]));
    const locationsById = new Map(locations.map(l => [l.id, l]));

    const businessName = selectedBusiness?.name || 'Schedule';
    const rangeLabel = `${format(weekStart, 'd MMM yyyy')} – ${format(weekEnd, 'd MMM yyyy')}`;

    const header = ['Date', 'Day', 'Start', 'End', 'Employee', 'Site', 'Client', 'Notes'];
    const rows: Array<string[]> = [header];
    shifts
      .filter(s => String(s.status || '').toUpperCase() !== 'ARCHIVED')
      .forEach(s => {
        const start = new Date(s.startTime);
        const end = new Date(s.endTime || s.startTime);
        const statusUpper = String(s.status || '').toUpperCase();

        const employeeRecord = s.employee || (s.employeeId ? employeesById.get(s.employeeId) : undefined);
        const employee = employeeRecord
          ? `${employeeRecord.firstName} ${employeeRecord.lastName}`
          : statusUpper === 'OPEN'
            ? 'Open shift'
            : 'Unassigned';

        const locationRecord = s.location || locationsById.get(s.locationId);
        const site = locationRecord ? locationRecord.name : (s.locationId || 'Unknown');
        const client = (locationRecord as any)?.client?.name || '';

        rows.push([
          format(start, 'yyyy-MM-dd'),
          format(start, 'EEE'),
          format(start, 'HH:mm'),
          format(end, 'HH:mm'),
          employee,
          site,
          client,
          (s as any).notes || '',
        ]);
      });

    const sheetName = 'Schedule';
    const xml =
      `<?xml version="1.0"?>` +
      `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">` +
      `<Styles>` +
      `<Style ss:ID="Title"><Font ss:Bold="1" ss:Size="16"/><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>` +
      `<Style ss:ID="SubTitle"><Font ss:Bold="1" ss:Size="11" ss:Color="#475569"/><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>` +
      `<Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>` +
      `<Style ss:ID="Cell"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>` +
      `</Styles>` +
      `<Worksheet ss:Name="${escapeXml(sheetName)}">` +
      `<Table>` +
      `<Row><Cell ss:StyleID="Title" ss:MergeAcross="7"><Data ss:Type="String">${escapeXml(businessName)}</Data></Cell></Row>` +
      `<Row><Cell ss:StyleID="SubTitle" ss:MergeAcross="7"><Data ss:Type="String">${escapeXml(rangeLabel)}</Data></Cell></Row>` +
      `<Row></Row>` +
      rows
        .map((r, idx) => {
          const styleId = idx === 0 ? 'Header' : 'Cell';
          return (
            `<Row>` +
            r
              .map(v => `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`)
              .join('') +
            `</Row>`
          );
        })
        .join('') +
      `</Table>` +
      `</Worksheet>` +
      `</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    a.download = `${safeName || 'schedule'}_${format(weekStart, 'yyyy-MM-dd')}_${format(weekEnd, 'yyyy-MM-dd')}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openPrintView = () => {
    const url = `/dashboard/scheduling/print?start=${encodeURIComponent(weekStart.toISOString())}&end=${encodeURIComponent(
      weekEnd.toISOString()
    )}&clientId=${encodeURIComponent(selectedClientId || 'all')}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const exportICS = () => {
    const businessName = selectedBusiness?.name || 'Schedule';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'CALSCALE:GREGORIAN',
      `PRODID:-//${businessName.replaceAll('\n', ' ').replaceAll('\r', ' ')}//Schedule//EN`
    ];

    const eligible = shifts.filter(s => {
      const st = String(s.status || '').toUpperCase();
      if (st === 'ARCHIVED' || st === 'CANCELLED' || st === 'DRAFT') return false;
      return !!s.employeeId || !!s.employee;
    });
    if (eligible.length === 0) {
      toast.info('No published shifts to export');
      return;
    }

    eligible.forEach(s => {
      const start = new Date(s.startTime);
      const endStr = s.endTime ?? s.startTime;
      const end = new Date(endStr);
      const dtStart = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const dtEnd = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const summary = s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : 'Shift';
      const locationName = s.location ? s.location.name : '';
      const clientName = (s.location as any)?.client?.name || '';
      const notes = (s as any).notes || '';
      const uid = `${(s as any).groupId || s.id}@unitedlink`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${dtStart}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${summary}`);
      if (locationName) lines.push(`LOCATION:${locationName}`);
      const descParts = [`${businessName}`, `${clientName ? `Client: ${clientName}` : ''}`, `${locationName ? `Site: ${locationName}` : ''}`, `${notes ? `Notes: ${notes}` : ''}`].filter(Boolean);
      if (descParts.length) lines.push(`DESCRIPTION:${descParts.join(' | ')}`.replaceAll('\n', ' ').replaceAll('\r', ' '));
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    a.download = `${safeName || 'schedule'}_${format(weekStart, 'yyyy-MM-dd')}_${format(weekEnd, 'yyyy-MM-dd')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const duplicateWeek = async (range: 'one_week' | 'until_month_end' | 'until_year_end') => {
    try {
      setDuplicating(true);
      const baseWeekStart = weekStart;
      const baseWeekEnd = weekEnd;
      const baseShifts = shifts.filter(s => {
        const st = new Date(s.startTime);
        const status = String(s.status || '').toUpperCase();
        if (status === 'ARCHIVED') return false;
        return st >= baseWeekStart && st <= baseWeekEnd;
      });
      if (baseShifts.length === 0) {
        toast.info('No shifts to duplicate for this week');
        setDuplicateOpen(false);
        return;
      }
      let weeksToDuplicate: Date[] = [];
      if (range === 'one_week') {
        weeksToDuplicate = [addWeeks(baseWeekStart, 1)];
      } else if (range === 'until_month_end') {
        const monthEnd = endOfMonth(currentDate);
        let i = 1;
        while (addWeeks(baseWeekStart, i) <= monthEnd) {
          weeksToDuplicate.push(addWeeks(baseWeekStart, i));
          i++;
        }
      } else if (range === 'until_year_end') {
        const yearEnd = endOfYear(currentDate);
        let i = 1;
        while (addWeeks(baseWeekStart, i) <= yearEnd) {
          weeksToDuplicate.push(addWeeks(baseWeekStart, i));
          i++;
        }
      }
      if (weeksToDuplicate.length === 0) {
        toast.info('No target weeks found for duplication');
        setDuplicateOpen(false);
        return;
      }
      const requests: Promise<any>[] = [];
      for (let i = 0; i < weeksToDuplicate.length; i++) {
        for (const s of baseShifts) {
          const originalStart = new Date(s.startTime);
          const originalEnd = s.endTime ? new Date(s.endTime) : null;
          const newStart = addWeeks(originalStart, i + 1);
          const newEnd = originalEnd ? addWeeks(originalEnd, i + 1) : undefined;
          const location = locations.find(l => l.id === s.locationId);
          const payload: any = {
            startTime: newStart.toISOString(),
            endTime: newEnd?.toISOString(),
            notes: s.notes || '',
            breakMinutes: s.breakMinutes ?? 0,
            status: 'DRAFT',
            location: { connect: { id: s.locationId } },
          };
          if (s.employeeId) {
            payload.employee = { connect: { id: s.employeeId } };
          }
          if (location?.businessId) {
            payload.business = { connect: { id: location.businessId } };
          }
          requests.push(api.post('/scheduling/shifts', payload).catch(() => null));
        }
      }
      const results = await Promise.allSettled(requests);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.length - successCount;
      if (successCount > 0) {
        toast.success(`Duplicated ${successCount} shifts${failCount ? `, ${failCount} failed` : ''}`);
      } else {
        toast.error('Failed to duplicate shifts');
      }
      setDuplicateOpen(false);
      fetchData();
    } catch (error) {
      console.error('Duplicate failed', error);
      toast.error('Duplicate failed');
      setDuplicateOpen(false);
    } finally {
      setDuplicating(false);
    }
  };

  const openConfirm = (args: {
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    variant: 'danger' | 'primary';
    onConfirm: () => void;
  }) => {
    setActionConfirm({
      isOpen: true,
      title: args.title,
      message: args.message,
      confirmText: args.confirmText,
      cancelText: args.cancelText ?? 'Cancel',
      variant: args.variant,
      onConfirm: args.onConfirm,
    });
  };

  const markAllShiftsStatus = async (status: string) => {
    const next = shifts.map(s => ({ ...s, status }));
    setShifts(next);
    await Promise.all(shifts.map(s => api.put(`/scheduling/shifts/${s.id}`, { status }).catch(() => null)));
    toast.success(`Marked all shifts as ${status.toLowerCase()}`);
    fetchData();
  };

  const markEmptyAsOpen = async () => {
    // 1) Convert existing EMPTY shifts to DRAFT (unpublished coverage placeholders)
    const targets = shifts.filter(s => s.status === 'EMPTY');
    const next = shifts.map(s => s.status === 'EMPTY' ? { ...s, status: 'DRAFT' } : s);
    setShifts(next);
    await Promise.all(targets.map(s => api.put(`/scheduling/shifts/${s.id}`, { status: 'DRAFT' }).catch(() => null)));

    // 2) Auto-add DRAFT shifts to empty location-day cells for the current week
    const days: Date[] = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    const createRequests: Promise<any>[] = [];
    for (const loc of locations) {
      for (const day of days) {
        const hasShift = shifts.some(s => s.locationId === loc.id && isSameDay(new Date(s.startTime), day));
        if (!hasShift) {
          const start = new Date(day);
          const end = new Date(day);
          start.setHours(9, 0, 0, 0);
          end.setHours(17, 0, 0, 0);
          const payload: any = {
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            notes: 'Open shift',
            breakMinutes: 0,
            status: 'DRAFT',
            location: { connect: { id: loc.id } },
          };
          if (loc.businessId) {
            payload.business = { connect: { id: loc.businessId } };
          }
          createRequests.push(api.post('/scheduling/shifts', payload).catch(() => null));
        }
      }
    }
    const results = await Promise.allSettled(createRequests);
    const createdCount = results.filter(r => r.status === 'fulfilled').length;
    if (createdCount > 0) {
      toast.success(`Added ${createdCount} draft shifts to empty days`);
      fetchData();
    } else {
      toast.info('No empty days required draft shifts');
    }
  };

  const removeEmptyShifts = async () => {
    const targets = shifts.filter(s => s.status === 'EMPTY');
    setShifts(prev => prev.filter(s => s.status !== 'EMPTY'));
    await Promise.all(targets.map(s => api.delete(`/scheduling/shifts/${s.id}`).catch(() => null)));
    toast.success('Removed empty shifts');
  };

  const deleteAllShifts = async () => {
    const deletable = shifts.filter(s => !shiftPlacementLocks[s.id]);
    const locked = shifts.filter(s => shiftPlacementLocks[s.id]);
    if (deletable.length === 0) {
      toast.error('No shifts can be deleted because tracked shifts are locked in place');
      return;
    }
    setShifts(prev => prev.filter(s => shiftPlacementLocks[s.id]));
    await Promise.all(deletable.map(s => api.delete(`/scheduling/shifts/${s.id}`).catch(() => null)));
    if (locked.length > 0) {
      toast.success(`Deleted ${deletable.length} shifts. ${locked.length} tracked shift${locked.length === 1 ? '' : 's'} remained locked.`);
    } else {
      toast.success('Deleted all shifts for this week');
    }
  };

  const applyBulkUpdate = async () => {
    const field = bulkModal.field;
    const value = bulkModal.value;
    if (!value && field === 'notes') {
      setBulkModal({ open: false, field: 'notes', value: '' });
      return;
    }
    if (shifts.length === 0) {
      setBulkModal({ open: false, field: 'notes', value: '' });
      toast.info('No shifts to update');
      return;
    }
    const next = shifts.map(s => ({
      ...s,
      [field]: field === 'breakMinutes' ? parseInt(value || '0') || 0 : value
    }));
    setShifts(next);
    await Promise.all(shifts.map(s => api.put(`/scheduling/shifts/${s.id}`, { [field]: field === 'breakMinutes' ? parseInt(value || '0') || 0 : value }).catch(() => null)));
    setBulkModal({ open: false, field: 'notes', value: '' });
    toast.success('Bulk update applied');
    fetchData();
  };

  const publishWeek = async () => {
    try {
      setPublishing(true);
      await api.post('/scheduling/shifts/publish', {}, { params: { start: weekStart.toISOString(), end: weekEnd.toISOString(), businessId: selectedBusiness?.id } });
      toast.success('Schedule published for this week');
      await fetchData();
    } catch (error) {
      const msg = (error as any)?.response?.data?.message || 'Failed to publish schedule';
      toast.error(msg);
    } finally {
      setPublishing(false);
    }
  };

  const autoScheduleWeek = async () => {
    try {
      setAutoScheduling(true);
      const params: any = { start: weekStart.toISOString(), end: weekEnd.toISOString(), businessId: selectedBusiness?.id };
      if (selectedClientId && selectedClientId !== 'all') params.clientId = selectedClientId;
      const res = await api.post('/scheduling/auto-schedule', {}, { params });
      const assigned = res?.data?.assigned ?? 0;
      const unfilled = res?.data?.unfilled ?? 0;
      const total = res?.data?.total ?? 0;
      if (total === 0) {
        toast.info('No unassigned draft shifts to auto-schedule');
      } else if (assigned > 0) {
        toast.success(`Auto-scheduled ${assigned} shift${assigned === 1 ? '' : 's'}${unfilled ? `, ${unfilled} unfilled` : ''}`);
      } else {
        toast.info('No eligible employees found for auto-scheduling');
      }
      fetchData();
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Auto-schedule failed';
      toast.error(msg);
    } finally {
      setAutoScheduling(false);
    }
  };

  const handleImportShifts = async () => {
    if (!importFile) return;
    try {
      const text = await importFile.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      const records = lines.map(l => l.split(',').map(x => x.trim()));
      for (const rec of records) {
        const [employeeId, locationId, startTime, endTime, breakMinutes, notes] = rec;
        const payload: any = {
          startTime,
          endTime,
          notes: notes || '',
          breakMinutes: parseInt(breakMinutes || '0') || 0,
          employee: { connect: { id: employeeId } },
          location: { connect: { id: locationId } },
        };
        await api.post('/scheduling/shifts', payload).catch(() => null);
      }
      toast.success('Shifts imported');
      setImportModalOpen(false);
      setImportFile(null);
      fetchData();
    } catch {
      toast.error('Failed to import shifts');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-900">
      {/* Top Navigation Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between shrink-0 h-16">
        <div className="flex items-center gap-4">
            {/* Client Selector */}
            <div className="relative">
                <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="appearance-none bg-transparent text-sm font-medium text-slate-800 dark:text-white cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 pl-2 pr-8 py-1 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="all" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800">All Clients</option>
                    {clients.map(client => (
                        <option key={client.id} value={client.id} className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800">
                            {client.name}
                        </option>
                    ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
            </div>

            {/* Date Navigation */}
            <div className="flex items-center bg-purple-50 dark:bg-purple-900/20 rounded-lg p-0.5">
                <button onClick={handlePrevWeek} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-purple-700 dark:text-purple-300 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-sm font-semibold text-purple-700 dark:text-purple-300">
                    {format(weekStart, 'd MMM')} - {format(weekEnd, 'd MMM')}
                </span>
                <button onClick={handleNextWeek} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-purple-700 dark:text-purple-300 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* View Selector */}
            <div className="relative">
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                className="appearance-none bg-transparent text-sm font-semibold text-purple-700 dark:text-purple-300 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 pl-2 pr-8 py-1 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="area" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800">Week by Area</option>
                <option value="employee" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800">Week by Employee</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-purple-500" />
            </div>
        </div>

        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4 ml-4">
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400" title="Refresh" onClick={fetchData}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                openConfirm({
                  title: 'Auto-schedule',
                  message: `Auto-assign employees to unassigned draft shifts for ${format(weekStart, 'd MMM')} - ${format(weekEnd, 'd MMM')}? This will only affect draft shifts.`,
                  confirmText: 'Auto-schedule',
                  variant: 'primary',
                  onConfirm: () => autoScheduleWeek(),
                });
              }}
              disabled={autoScheduling}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded border border-slate-200 dark:border-slate-700 shadow-sm ${
                autoScheduling
                  ? 'text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 cursor-not-allowed'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 bg-white dark:bg-slate-800'
              }`}
            >
                Auto
            </button>
            <div className="relative">
              <button onClick={() => setDuplicateOpen(v => !v)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                <Copy className="w-4 h-4" />
                {duplicating ? 'Duplicating…' : 'Duplicate'}
              </button>
              {duplicateOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-30 overflow-hidden">
                  <div className="py-2">
                    <button
                      disabled={duplicating}
                      onClick={() => {
                        setDuplicateOpen(false);
                        openConfirm({
                          title: 'Duplicate schedule',
                          message: `Duplicate shifts for ${format(weekStart, 'd MMM')} - ${format(weekEnd, 'd MMM')} into the next week as draft shifts?`,
                          confirmText: 'Duplicate',
                          variant: 'primary',
                          onConfirm: () => duplicateWeek('one_week'),
                        });
                      }}
                      className={`w-full text-left px-3 py-2 text-sm ${duplicating ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                      Duplicate 1 week
                    </button>
                    <button
                      disabled={duplicating}
                      onClick={() => {
                        setDuplicateOpen(false);
                        openConfirm({
                          title: 'Duplicate until month end',
                          message: `This will create draft shifts for every week from next week up to the end of the month. Continue?`,
                          confirmText: 'Duplicate',
                          variant: 'primary',
                          onConfirm: () => duplicateWeek('until_month_end'),
                        });
                      }}
                      className={`w-full text-left px-3 py-2 text-sm ${duplicating ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                      Duplicate until month end
                    </button>
                    <button
                      disabled={duplicating}
                      onClick={() => {
                        setDuplicateOpen(false);
                        openConfirm({
                          title: 'Duplicate until year end',
                          message: `This will create draft shifts for every week from next week up to the end of the year. Continue?`,
                          confirmText: 'Duplicate',
                          variant: 'primary',
                          onConfirm: () => duplicateWeek('until_year_end'),
                        });
                      }}
                      className={`w-full text-left px-3 py-2 text-sm ${duplicating ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                      Duplicate until year end
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => router.push('/dashboard/time')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 shadow-sm">
                <BarChart className="w-4 h-4" />
                Insights
            </button>
            <div className="relative">
              <button onClick={() => setOptionsOpen(v => !v)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                <Settings className="w-4 h-4" />
                Options
              </button>
              {optionsOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-30 overflow-hidden">
                  <div className="py-2">
                    <button onClick={() => { openPrintView(); setOptionsOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Print / Save PDF</button>
                    <button onClick={() => { exportScheduleExcel(); setOptionsOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Export Excel</button>
                    <button onClick={() => { exportICS(); setOptionsOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Sync to calendar</button>
                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
                    <div className="px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Options</div>
                    <button onClick={() => { setImportModalOpen(true); setOptionsOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Add shifts from file</button>
                    <button onClick={() => { markAllShiftsStatus('EMPTY'); setOptionsOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Mark all shifts empty</button>
                    <button onClick={() => { removeEmptyShifts(); setOptionsOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Remove empty shifts</button>
                    <button
                      onClick={() => {
                        setOptionsOpen(false);
                        openConfirm({
                          title: 'Delete all shifts',
                          message: `Delete all ${shifts.length} shifts for ${format(weekStart, 'd MMM')} - ${format(weekEnd, 'd MMM')}? This cannot be undone.`,
                          confirmText: 'Delete all',
                          variant: 'danger',
                          onConfirm: () => deleteAllShifts(),
                        });
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Delete all shifts
                    </button>
                    <button onClick={() => { markEmptyAsOpen(); setOptionsOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Mark empty shifts as open</button>
                    <button onClick={() => { setBulkModal({ open: true, field: 'notes', value: '' }); setOptionsOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Bulk update</button>
                    <button onClick={() => { setAreasCollapsed(v => !v); setOptionsOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">{areasCollapsed ? 'Expand areas' : 'Collapse areas'}</button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                if (!hasUnpublishedChanges || publishing) return;
                openConfirm({
                  title: 'Publish schedule',
                  message: `Publish ${unpublishedCount} unpublished change${unpublishedCount === 1 ? '' : 's'} for ${format(weekStart, 'd MMM')} - ${format(weekEnd, 'd MMM')}? Employees will be notified.`,
                  confirmText: 'Publish',
                  variant: 'primary',
                  onConfirm: () => publishWeek(),
                });
              }}
              disabled={!hasUnpublishedChanges || publishing}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded border shadow-sm ${
                hasUnpublishedChanges && !publishing
                  ? 'text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                  : 'text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 cursor-not-allowed'
              } ${publishing ? 'opacity-70' : ''}`}
            >
              <CheckCircle className="w-4 h-4" />
              {publishing ? 'Publishing…' : isWeekPublished ? 'Published' : hasUnpublishedChanges ? `Publish (${unpublishedCount})` : 'Publish'}
            </button>
        </div>
      </div>

      {(userRole === 'BUSINESS_ADMIN' || userRole === 'SUPER_ADMIN') && pendingCallouts.length > 0 ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-rose-50 dark:from-amber-900/20 dark:via-slate-900 dark:to-rose-900/20 dark:border-amber-800/50 shadow-sm">
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-amber-100 dark:border-amber-900/30">
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">Call-Out Approvals</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Review employee call-outs before shifts are opened to the wider team.
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-3 py-1 text-sm font-semibold">
              <AlertCircle className="w-4 h-4" />
              {pendingCallouts.length} pending
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {pendingCallouts.map((callout) => (
                <div key={callout.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {callout.absentEmployee ? `${callout.absentEmployee.firstName} ${callout.absentEmployee.lastName}` : 'Employee'}
                      </div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {callout.shift?.startTime ? format(new Date(callout.shift.startTime), 'EEE d MMM • h:mm a') : 'Shift time unavailable'}
                        {callout.shift?.location?.name ? ` • ${callout.shift.location.name}` : ''}
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-2.5 py-1 text-xs font-semibold">
                      {String(callout.type || '').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-medium">Reason:</span> {String(callout.reasonCode || '').replace(/_/g, ' ')}
                  </div>
                  {callout.reasonNote ? (
                    <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{callout.reasonNote}</div>
                  ) : null}
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setCalloutRejectState({ isOpen: true, calloutId: callout.id, reason: '' })}
                      disabled={calloutActionLoadingId === callout.id}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/20 disabled:opacity-60"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveCallout(callout.id)}
                      disabled={calloutActionLoadingId === callout.id}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {calloutActionLoadingId === callout.id ? 'Processing…' : 'Approve & Open'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 min-h-0">
            {/* Sidebar - Employees */}
            <EmployeeSidebar
              employees={employees}
              shifts={visibleShifts}
              allShifts={shifts}
              statusFilter={statusFilter}
              onStatusFilterChange={(next) => setStatusFilter(prev => (prev === next ? 'ALL' : next))}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 overflow-hidden">
                {/* Timeline Grid */}
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    </div>
                ) : (
                    <TimelineGrid 
                      view={view}
                      groupBy={groupBy}
                      startDate={weekStart}
                      locations={locations}
                      employees={employees}
                      shifts={visibleShifts}
                      shiftClockStatuses={shiftClockStatuses}
                      shiftPlacementLocks={shiftPlacementLocks}
                      collapsed={areasCollapsed}
                      onShiftClick={(shift) => {
                        setSelectedShift(shift);
                        setIsModalOpen(true);
                      }}
                      onAddShiftAtLocation={(locationId, date) => {
                        setModalDefaults({ locationId, date });
                        setSelectedShift(null);
                        setIsModalOpen(true);
                      }}
                      onAddShiftForEmployee={(employeeId, date) => {
                        setModalDefaults({ employee: employees.find(e => e.id === employeeId), date });
                        setSelectedShift(null);
                        setIsModalOpen(true);
                      }}
                      currentUserId={currentUserId}
                    />
                )}

                <DragOverlay>
                    {activeDragItem?.type === 'employee' && (
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-purple-500 w-48 opacity-90 cursor-grabbing">
                        <div className="font-bold text-slate-900 dark:text-white">{activeDragItem.employee.firstName} {activeDragItem.employee.lastName}</div>
                        <div className="text-xs text-slate-500">{activeDragItem.employee.role}</div>
                    </div>
                    )}
                    {activeDragItem?.type === 'shift' && (
                    <div className="bg-purple-100 dark:bg-purple-900/40 border-l-4 border-purple-500 p-2 rounded shadow-xl w-32 h-14 opacity-90 cursor-grabbing">
                        <div className="font-semibold text-purple-900 dark:text-purple-100 truncate">
                        {activeDragItem.shift.employee?.firstName}
                        </div>
                        <div className="text-xs text-purple-700 dark:text-purple-300">
                        {format(new Date(activeDragItem.shift.startTime), 'h:mm a')}
                        </div>
                    </div>
                    )}
                </DragOverlay>
            </div>
        </div>
      </DndContext>

      {/* Footer Legend */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 overflow-x-auto">
          <div className="flex items-center gap-4 whitespace-nowrap px-4">
              <div className="flex items-center gap-1"><Circle className="w-3 h-3 text-slate-300" /> 0 empty</div>
              <div className="flex items-center gap-1"><Circle className="w-3 h-3 text-slate-300" /> 0 unpublished</div>
              <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> 0 published</div>
              <div className="flex items-center gap-1"><Circle className="w-3 h-3 text-green-500" /> 0 require confirmation</div>
              <div className="flex items-center gap-1"><Circle className="w-3 h-3 text-purple-500" /> 0 open shifts</div>
              <div className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-500" /> 0 warnings</div>
              <div className="flex items-center gap-1"><Circle className="w-3 h-3 text-red-300" /> 1 leave approved</div>
              <div className="flex items-center gap-1"><Circle className="w-3 h-3 text-red-300 border-dashed border-red-500" /> 0 leave pending</div>
              <div className="flex items-center gap-1"><Circle className="w-3 h-3 text-slate-200 bg-slate-100" /> 0 unavailable</div>
          </div>
          
          <div className="flex items-center gap-2 pr-4">
               <button className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 font-medium">
                   1/7 Setup tasks
               </button>
               <button className="p-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
                   <HelpCircle className="w-4 h-4 text-purple-600" />
               </button>
          </div>
      </div>

      {isModalOpen && (
        <ShiftModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveShift}
          onDelete={selectedShift && !shiftPlacementLocks[selectedShift.id] ? () => handleDeleteShift(selectedShift.id) : undefined}
          defaultDate={modalDefaults.date}
          defaultLocationId={modalDefaults.locationId}
          defaultEmployee={modalDefaults.employee}
          shift={selectedShift}
          shiftPlacementLocked={selectedShift ? !!shiftPlacementLocks[selectedShift.id] : false}
          employees={employees}
          locations={locations}
          onApproveApplication={handleApproveApplication}
          onDeclineApplication={handleDeclineApplication}
          currentUserId={currentUserId}
        />
      )}

      {bulkModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md p-6 shadow-xl">
            <div className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Bulk update</div>
            <div className="space-y-3">
              <select
                value={bulkModal.field}
                onChange={(e) => setBulkModal(prev => ({ ...prev, field: e.target.value as any }))}
                className="w-full border rounded px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              >
                <option value="notes">Notes</option>
                <option value="breakMinutes">Break minutes</option>
              </select>
              <input
                type="text"
                value={bulkModal.value}
                onChange={(e) => setBulkModal(prev => ({ ...prev, value: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                placeholder="Value"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setBulkModal({ open: false, field: 'notes', value: '' })} className="px-4 py-2 text-sm rounded border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">Cancel</button>
              <button onClick={applyBulkUpdate} className="px-4 py-2 text-sm rounded bg-indigo-600 text-white">Apply</button>
            </div>
          </div>
        </div>
      )}

      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md p-6 shadow-xl">
            <div className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Add shifts from file</div>
            <div className="space-y-3">
              <input type="file" accept=".csv,text/csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
              <div className="text-xs text-slate-500">CSV columns: employeeId,locationId,startTime,endTime,breakMinutes,notes</div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setImportModalOpen(false); setImportFile(null); }} className="px-4 py-2 text-sm rounded border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">Cancel</button>
              <button onClick={handleImportShifts} className="px-4 py-2 text-sm rounded bg-indigo-600 text-white" disabled={!importFile}>Upload</button>
            </div>
          </div>
        </div>
      )}

      {calloutRejectState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md p-6 shadow-xl">
            <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">Reject Call-Out</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Optionally add a reason before rejecting this call-out request.
            </div>
            <textarea
              value={calloutRejectState.reason}
              onChange={(e) => setCalloutRejectState(prev => ({ ...prev, reason: e.target.value }))}
              rows={4}
              className="w-full border rounded px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              placeholder="Reason for rejection"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setCalloutRejectState({ isOpen: false, calloutId: undefined, reason: '' })}
                className="px-4 py-2 text-sm rounded border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectCallout}
                disabled={!!calloutActionLoadingId}
                className="px-4 py-2 text-sm rounded bg-rose-600 text-white disabled:opacity-60"
              >
                {calloutActionLoadingId === calloutRejectState.calloutId ? 'Rejecting…' : 'Reject Call-Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LeaveConflictModal
        isOpen={conflictModalState.isOpen}
        onClose={() => setConflictModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
            setConflictModalState(prev => ({ ...prev, isOpen: false }));
            conflictModalState.pendingAction();
        }}
        employeeName={conflictModalState.employeeName}
        locationName={conflictModalState.locationName}
        date={conflictModalState.date}
      />

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, shiftId: undefined, isLoading: false })}
        onConfirm={performDeleteShift}
        title="Delete shift"
        message="Are you sure you want to delete this shift? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteConfirm.isLoading}
      />

      <ConfirmModal
        isOpen={actionConfirm.isOpen}
        onClose={() => setActionConfirm(prev => ({ ...prev, isOpen: false, onConfirm: null }))}
        onConfirm={() => {
          const fn = actionConfirm.onConfirm;
          setActionConfirm(prev => ({ ...prev, isOpen: false, onConfirm: null }));
          fn?.();
        }}
        title={actionConfirm.title}
        message={actionConfirm.message}
        confirmText={actionConfirm.confirmText}
        cancelText={actionConfirm.cancelText}
        variant={actionConfirm.variant}
        isLoading={publishing || duplicating || autoScheduling}
      />
    </div>
  );
}
