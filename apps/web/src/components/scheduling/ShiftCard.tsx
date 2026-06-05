import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { AlertCircle, Clock, PauseCircle, LogOut, UserRoundCheck, UserRoundX } from 'lucide-react';
import { EmployeeClockStatus, Shift } from './types';
import { differenceInMinutes, format } from 'date-fns';

interface ShiftCardProps {
  shift: Shift;
  onEdit: (shift: Shift) => void;
  draggable?: boolean;
  isMine?: boolean;
  employeeClockStatus?: EmployeeClockStatus;
}

export function ShiftCard({ shift, onEdit, draggable = true, isMine = false, employeeClockStatus }: ShiftCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `shift-${shift.id}`,
    data: {
      type: 'shift',
      shift
    },
    disabled: !draggable
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999,
  } : undefined;

  const start = new Date(shift.startTime);
  const end = shift.endTime ? new Date(shift.endTime) : null;
  // const duration = differenceInMinutes(end, start) / 60; // hours -> We don't use this variable in the snippet provided, but safe to keep or remove if used elsewhere.
  const isEmpty = !shift.employeeId || !shift.employee || shift.status === 'EMPTY' || shift.status === 'OPEN';
  const hasPendingApps = shift.status === 'OPEN' && shift.applications?.some(a => a.status === 'PENDING');
  const hasCallout = !!shift.callout;
  const calloutNoticeAt = shift.callout?.noticeAt ? new Date(shift.callout.noticeAt) : null;
  const minutesNoticeBeforeStart = calloutNoticeAt ? differenceInMinutes(start, calloutNoticeAt) : null;
  const isLateNotice = typeof minutesNoticeBeforeStart === 'number' ? minutesNoticeBeforeStart < 120 : false;
  const isCalloutOpen = hasCallout && isEmpty;
  const isCoveredShift = hasCallout && !!shift.employeeId && Array.isArray(shift.coverages) && shift.coverages.some(c => c.replacementEmployeeId === shift.employeeId);
  const isReassigned = hasCallout && !!shift.employeeId && !isCoveredShift;
  const statusUpper = String(shift.status || '').toUpperCase();
  const isCompleted = statusUpper === 'COMPLETED';
  const isDraft = statusUpper === 'DRAFT' || statusUpper === 'CANCELLED';
  const clockStatusLabel =
    employeeClockStatus?.status === 'ON_BREAK'
      ? 'On Break'
      : employeeClockStatus?.status === 'CLOCKED_IN'
        ? 'Clocked In'
        : employeeClockStatus?.status === 'CLOCKED_OUT'
          ? 'Ended'
          : null;
  const ClockStatusIcon =
    employeeClockStatus?.status === 'ON_BREAK'
      ? PauseCircle
      : employeeClockStatus?.status === 'CLOCKED_IN'
        ? Clock
        : employeeClockStatus?.status === 'CLOCKED_OUT'
          ? LogOut
          : null;
  const clockStatusTone =
    employeeClockStatus?.status === 'ON_BREAK'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
      : employeeClockStatus?.status === 'CLOCKED_IN'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200';

  let containerColors = 'bg-blue-100 dark:bg-blue-900/40 border-l-4 border-blue-500 dark:border-blue-400';
  let nameColors = 'text-blue-900 dark:text-blue-100';
  let timeColors = 'text-blue-700 dark:text-blue-300';
  let extraClasses = '';

  if (isCalloutOpen) {
    containerColors = 'bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-400';
    nameColors = 'text-red-900 dark:text-red-100';
    timeColors = 'text-red-700 dark:text-red-300';
  } else if (isDraft) {
    containerColors = 'bg-slate-100 dark:bg-slate-900/40 border-l-4 border-slate-400 dark:border-slate-500';
    nameColors = 'text-slate-900 dark:text-slate-100';
    timeColors = 'text-slate-700 dark:text-slate-300';
    extraClasses = 'border border-dashed border-slate-300 dark:border-slate-700';
  } else if (isCoveredShift) {
    containerColors = 'bg-sky-100 dark:bg-sky-900/30 border-l-4 border-sky-500 dark:border-sky-400';
    nameColors = 'text-sky-900 dark:text-sky-100';
    timeColors = 'text-sky-700 dark:text-sky-300';
  } else if (isReassigned) {
    containerColors = 'bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 dark:border-yellow-400';
    nameColors = 'text-yellow-900 dark:text-yellow-100';
    timeColors = 'text-yellow-700 dark:text-yellow-300';
  } else if (isCompleted) {
    containerColors = 'bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500 dark:border-green-400';
    nameColors = 'text-green-900 dark:text-green-100';
    timeColors = 'text-green-700 dark:text-green-300';
  } else if (isMine) {
    containerColors = 'bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500 dark:border-green-400';
    nameColors = 'text-green-900 dark:text-green-100';
    timeColors = 'text-green-700 dark:text-green-300';
  } else if (hasPendingApps) {
    containerColors = 'bg-orange-100 dark:bg-orange-900/30 border-l-4 border-orange-500 dark:border-orange-400';
    nameColors = 'text-orange-900 dark:text-orange-100';
    timeColors = 'text-orange-700 dark:text-orange-300';
  } else if (isEmpty) {
    containerColors = 'bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 dark:border-yellow-400';
    nameColors = 'text-yellow-900 dark:text-yellow-100';
    timeColors = 'text-yellow-700 dark:text-yellow-300';
  }

  // Calculate width based on duration (assuming 1 hour = certain pixel width, handled by parent, but here we just fill container if needed or styling)
  // Actually, the parent grid cell will handle positioning if we use absolute, but if we drop into a cell, it might just fill it.
  // For the Deputy-style timeline, shifts usually float on a timeline.
  // We'll assume the parent renders this in the correct position.

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(shift);
      }}
      className={`relative group ${containerColors} ${extraClasses} rounded pl-2 pr-1 py-1 text-xs cursor-pointer hover:brightness-95 overflow-hidden h-full min-h-[40px] w-full flex flex-col justify-center ${isDragging ? 'opacity-50 z-50 shadow-xl' : ''}`}
    >
      {isDraft && (
        <div className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100 font-semibold tracking-wide">
          DRAFT
        </div>
      )}
      {(hasCallout || isLateNotice) && (
        <div className="absolute top-1 right-1 flex items-center gap-1">
          {hasCallout && (isCalloutOpen ? <UserRoundX className="w-3 h-3 text-red-700 dark:text-red-300" /> : <UserRoundCheck className="w-3 h-3 text-slate-700 dark:text-slate-200" />)}
          {isLateNotice && <AlertCircle className="w-3 h-3 text-red-700 dark:text-red-300" />}
        </div>
      )}
      <div className={`font-semibold ${nameColors} break-words whitespace-normal leading-snug`}>
        {isMine ? (shift.employee ? `${shift.employee.firstName} ${shift.employee.lastName}`.trim() : 'Me') : (isEmpty ? 'Open shift' : `${shift.employee?.firstName || ''} ${shift.employee?.lastName || ''}`.trim())}
      </div>
      <div className={`${timeColors} flex items-center gap-1 text-[10px]`}>
        {format(start, 'h:mm a')} - {end ? format(end, 'h:mm a') : 'In Progress'}
      </div>
      {clockStatusLabel && ClockStatusIcon && !isEmpty ? (
        <div className="mt-1">
          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${clockStatusTone}`}>
            <ClockStatusIcon className="w-3 h-3" />
            {clockStatusLabel}
          </span>
        </div>
      ) : null}
      
      {/* Resize handles - visual only for now */}
      <div className="absolute top-0 bottom-0 left-0 w-1 cursor-ew-resize hover:bg-blue-600/50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 cursor-ew-resize hover:bg-blue-600/50" />
    </div>
  );
}
