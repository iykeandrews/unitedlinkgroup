'use client';

import {useEffect, useState, type FormEvent} from 'react';
import {Modal} from '../Modal';
import api from '../../lib/api';
import {enteredBreakRange, formatRecordTime, recordInputDate} from '../../lib/time/record-zone';
import {toast} from 'sonner';

type ClockInput = {date: string; time: string};
type BreakInput = {startTime: string; endTime: string; type: string};
function ClockFields({label, value, onChange}: {label: string; value: ClockInput; onChange: (value: ClockInput) => void}) {
  return <div className="grid grid-cols-2 gap-3">
    <label className="text-sm font-medium">{label} date<input required type="date" aria-label={`${label} date`} value={value.date} onChange={e => onChange({...value, date: e.target.value})} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label>
    <label className="text-sm font-medium">{label} time<input required type="time" aria-label={`${label} time`} value={value.time} onChange={e => onChange({...value, time: e.target.value})} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label>
  </div>;
}

export function ManualTimesheetModal({businessId, isOpen, onClose, employees, locations, workerType, onSaved}: {
  businessId?: string; isOpen: boolean; onClose: () => void; employees: any[]; locations: any[];
  workerType: 'W2' | 'CONTRACTOR_1099'; onSaved: (record: any) => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [start, setStart] = useState<ClockInput>({date: '', time: ''});
  const [end, setEnd] = useState<ClockInput>({date: '', time: ''});
  const [breaks, setBreaks] = useState<BreakInput[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [allShifts, setAllShifts] = useState<any[]>([]);
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const validRange = !!dateFrom && !!dateTo && dateFrom <= dateTo;
  const rangeShifts = validRange ? allShifts.filter(shift => {
    const day = formatRecordTime(shift.startTime, 'yyyy-MM-dd', shift.timeZone);
    return day >= dateFrom && day <= dateTo;
  }) : [];
  const shifts = rangeShifts.filter(shift => shift.employeeId === employeeId);
  const eligibleEmployees = employees.filter(employee => rangeShifts.some(shift => shift.employeeId === employee.id));
  const employeeLabel = (employee: any) => [employee.firstName + ' ' + employee.lastName, employee.badgeNumber].filter(Boolean).join(' · ');
  const filteredEmployees = eligibleEmployees.filter(employee => employeeLabel(employee).toLowerCase().includes(employeeQuery.trim().toLowerCase()));
  const selectedEmployee = eligibleEmployees.find(employee => employee.id === employeeId);
  const [shiftId, setShiftId] = useState('');
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [shiftError, setShiftError] = useState('');
  const selectedShift = shifts.find(shift => shift.id === shiftId);
  const timeZone = selectedShift?.timeZone || locations.find(location => location.id === locationId)?.timeZone || 'America/New_York';
  useEffect(() => {
    if (!isOpen) return;
    const date = formatRecordTime(new Date(), 'yyyy-MM-dd', 'America/New_York');
    setDateFrom(''); setDateTo(''); setEmployeeOpen(false); setEmployeeId(''); setEmployeeQuery(''); setLocationId(''); setStart({date, time: ''}); setEnd({date, time: ''}); setBreaks([]); setNote('');
  }, [isOpen]);
  useEffect(() => {
    let active = true;
    setAllShifts([]); setEmployeeId(''); setEmployeeQuery(''); setShiftId(''); setLocationId(''); setBreaks([]); setShiftError('');
    setStart({date: '', time: ''}); setEnd({date: '', time: ''});
    if (!isOpen || !businessId) { setLoadingShifts(false); return; }
    setLoadingShifts(true);
    api.get('/time-tracking/untracked-shifts', {params: {businessId}}).then(response => {
      if (active) setAllShifts(response.data);
    }).catch(() => { if (active) setShiftError('Unable to load scheduled employees. Close and reopen this form to retry.'); })
      .finally(() => { if (active) setLoadingShifts(false); });
    return () => { active = false; };
  }, [businessId, isOpen]);
  useEffect(() => {
    setEmployeeId(''); setEmployeeQuery(''); setEmployeeOpen(false); setShiftId(''); setLocationId(''); setBreaks([]);
    setStart({date: '', time: ''}); setEnd({date: '', time: ''});
  }, [dateFrom, dateTo]);
  const chooseEmployee = (id: string | null) => {
    setEmployeeOpen(false); setEmployeeId(id || ''); setEmployeeQuery(''); setShiftId(''); setLocationId(''); setBreaks([]);
    setStart({date: '', time: ''}); setEnd({date: '', time: ''});
  };
  const chooseShift = (id: string) => {
    setShiftId(id); setBreaks([]);
    const shift = shifts.find(entry => entry.id === id);
    setLocationId(shift?.locationId || '');
    const fields = (value: string) => ({date: formatRecordTime(value, 'yyyy-MM-dd', shift.timeZone), time: formatRecordTime(value, 'HH:mm', shift.timeZone)});
    setStart(shift ? fields(shift.startTime) : {date: '', time: ''});
    setEnd(shift ? fields(shift.endTime) : {date: '', time: ''});
    if (shift) {
      const breakStart = new Date(Date.parse(shift.startTime) + 4 * 60 * 60 * 1000);
      const breakMinutes = shift.breakMinutes === 15 ? 15 : 30;
      const breakEnd = new Date(+breakStart + breakMinutes * 60 * 1000);
      if (+breakEnd <= Date.parse(shift.endTime)) setBreaks([{
        startTime: formatRecordTime(breakStart, 'HH:mm', shift.timeZone),
        endTime: formatRecordTime(breakEnd, 'HH:mm', shift.timeZone),
        type: 'UNPAID',
      }]);
    }
  };
  useEffect(() => {
    const from = recordInputDate(start.date + "T" + start.time, timeZone);
    const until = recordInputDate(end.date + "T" + end.time, timeZone);
    if (Number.isFinite(+from) && Number.isFinite(+until) && +until > +from && +until - +from < 4*3600000)
      setBreaks(previous => previous.length ? [] : previous);
  }, [start.date,start.time,end.date,end.time,timeZone]);
  const instant = (input: ClockInput) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date);
    if (!match || !/^\d{2}:\d{2}$/.test(input.time)) throw Error('Enter dates as MM/DD/YYYY and complete every time field');
    const result = recordInputDate(`${input.date}T${input.time}`, timeZone);
    if (!Number.isFinite(+result) || formatRecordTime(result, 'yyyy-MM-dd', timeZone) !== input.date || formatRecordTime(result, 'HH:mm', timeZone) !== input.time) throw Error('Enter a valid date and time at the work location');
    return result.toISOString();
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    try {
      if (!validRange || loadingShifts || !selectedEmployee || !selectedShift) throw Error('Choose a scheduled shift without a clock-in record');
      const startTime = instant(start), endTime = instant(end);
      if (Date.parse(endTime) <= Date.parse(startTime) || Date.parse(endTime) > Date.now()) throw Error('Clock-out must be after clock-in and cannot be in the future');
      const entries = breaks.map(entry => {
        if (!entry.endTime) throw Error('Every break needs an end time');
        const range = enteredBreakRange(new Date(startTime), new Date(endTime), entry.startTime, entry.endTime, timeZone);
        return {type: entry.type, startTime: range.start.toISOString(), endTime: range.end!.toISOString()};
      });
      setBusy(true);
      const response = await api.post('/time-tracking/timesheets', {employeeId, locationId, shiftId, startTime, endTime, timeZone, workerType, employeeNote: note, breaks: entries});
      toast.success('Timesheet added and awaiting approval'); onSaved(response.data); onClose();
    } catch (error: any) { toast.error(error?.response?.data?.message || error?.message || 'Unable to add timesheet'); }
    finally { setBusy(false); }
  };
  const changeBreak = (index: number, update: Partial<BreakInput>) => setBreaks(previous => previous.map((entry, i) => i === index ? {...entry, ...update} : entry));
  return <Modal isOpen={isOpen} onClose={() => {if (!busy) onClose();}} title="Add timesheet" maxWidth="max-w-3xl">
    <form onSubmit={save} className="space-y-5">
      <p className="text-sm text-slate-500">Record the actual worked times at the location. Dates use MM/DD/YYYY. For overnight work, use the following date for clock-out.</p>
      <fieldset disabled={busy} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Schedule from<input required type="date" aria-label="Schedule from" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label>
          <label className="text-sm font-medium">Schedule to<input required type="date" aria-label="Schedule to" min={dateFrom || undefined} value={dateTo} onChange={event => setDateTo(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label>
        </div>
        <p className="text-xs text-slate-500">Choose a date range to find employees with completed scheduled shifts missing a clock-in. Both dates are included, using each work location’s local date.</p>
        {dateFrom && dateTo && !validRange && <p role="alert" className="text-sm text-red-600">The end date must be on or after the start date.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setEmployeeOpen(false); }} onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); setEmployeeOpen(false); event.currentTarget.querySelector<HTMLButtonElement>('[aria-haspopup]')?.focus(); }
          }}>
            <span id="manual-timesheet-employee-label" className="text-sm font-medium">Employee</span>
            <button type="button" aria-labelledby="manual-timesheet-employee-label manual-timesheet-employee-value" aria-haspopup="listbox" aria-expanded={employeeOpen} aria-controls="manual-timesheet-employees" disabled={!validRange || loadingShifts || !!shiftError} onClick={() => { setEmployeeQuery(''); setEmployeeOpen(previous => !previous); }} className="mt-1 flex w-full items-center justify-between rounded-lg border p-2 text-left disabled:opacity-50 dark:bg-slate-800">
              <span id="manual-timesheet-employee-value">{loadingShifts ? 'Loading scheduled employees…' : selectedEmployee ? employeeLabel(selectedEmployee) : 'Choose employee'}</span><span aria-hidden="true">⌄</span>
            </button>
            {employeeOpen && <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white p-2 shadow-lg dark:bg-slate-800">
              <input autoFocus type="search" aria-label="Search scheduled employees" placeholder="Search employees by name or badge" value={employeeQuery} onChange={event => setEmployeeQuery(event.target.value)} onKeyDown={event => {
                if (event.key === 'Enter') event.preventDefault();
                if (event.key === 'ArrowDown') { event.preventDefault(); event.currentTarget.parentElement?.querySelector<HTMLButtonElement>('[role="option"]')?.focus(); }
              }} className="mb-2 w-full rounded border p-2 dark:bg-slate-900" />
              <div id="manual-timesheet-employees" role="listbox" aria-label="Scheduled employees" className="max-h-52 overflow-auto" onKeyDown={event => {
                const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
                const index = options.indexOf(event.target as HTMLButtonElement);
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus(); }
              }}>
                {filteredEmployees.map(employee => <button type="button" role="option" aria-selected={employee.id === employeeId} key={employee.id} onClick={() => chooseEmployee(employee.id)} className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-purple-50 focus:bg-purple-100 focus:outline-none aria-selected:font-semibold dark:hover:bg-slate-700 dark:focus:bg-slate-700">{employeeLabel(employee)}</button>)}
                {filteredEmployees.length === 0 && <p className="p-2 text-sm text-slate-500">{employeeQuery ? 'No matching employees.' : 'No employees with shifts missing a clock-in in this date range.'}</p>}
              </div>
            </div>}
          </div>
          <label className="text-sm font-medium">Scheduled shift<select required disabled={!employeeId || loadingShifts} value={shiftId} onChange={e => chooseShift(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"><option value="">{loadingShifts ? 'Loading shifts…' : 'Choose day and location'}</option>{shifts.map(shift => <option key={shift.id} value={shift.id}>{formatRecordTime(shift.startTime, 'MM/dd/yyyy', shift.timeZone)} · {shift.locationName} · {formatRecordTime(shift.startTime, 'h:mm a', shift.timeZone)} – {formatRecordTime(shift.endTime, 'MM/dd/yyyy h:mm a', shift.timeZone)}</option>)}</select></label>
        </div>
        {shiftError && <p role="alert" className="text-sm text-red-600">{shiftError}</p>}
        {employeeId && !loadingShifts && !shiftError && shifts.length === 0 && <p className="text-sm text-slate-500">No past scheduled shifts without clock-in records were found for this employee.</p>}
        {selectedShift && <p className="text-sm text-slate-500">Location: <strong>{selectedShift.locationName}</strong>. Scheduled times are filled in below; edit them to reflect the actual time worked.{selectedShift.breakMinutes > 0 ? ` Scheduled break: ${selectedShift.breakMinutes} minutes. Enter the actual break times below.` : ''}</p>}
        <ClockFields label="Clock-in" value={start} onChange={setStart} />
        <ClockFields label="Clock-out" value={end} onChange={setEnd} />
        <p className="text-xs text-slate-500">Default unpaid break: {selectedShift?.breakMinutes === 15 ? 15 : 30} minutes, starting four hours after the scheduled shift begins. Adjust or remove it to reflect the actual break. No unpaid break is deducted for shifts under four hours.</p>
        <div className="flex items-center justify-between"><h3 className="font-semibold">Breaks</h3><button type="button" className="text-sm font-semibold text-purple-600" onClick={() => setBreaks(previous => [...previous, {startTime: '', endTime: '', type: 'UNPAID'}])}>Add break</button></div>
        {breaks.map((entry, index) => <div key={index} className="space-y-3 rounded-lg border p-3">
          <div className="flex justify-between gap-3"><label className="text-sm">Break {index + 1}<select value={entry.type} onChange={e => changeBreak(index, {type: e.target.value})} className="ml-3 rounded border p-1 dark:bg-slate-800"><option value="UNPAID">Unpaid</option><option value="PAID">Paid</option></select></label><button type="button" aria-label={`Remove break ${index + 1}`} onClick={() => setBreaks(previous => previous.filter((_, i) => i !== index))} className="text-sm text-red-600">Remove</button></div>
          <div className="grid grid-cols-2 gap-3">{(['startTime', 'endTime'] as const).map(field => <label key={field} className="text-sm">{field === 'startTime' ? 'Break start' : 'Break end'}<input required type="time" value={entry[field]} onChange={e => changeBreak(index, {[field]: e.target.value})} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label>)}</div>
        </div>)}
        <label className="block text-sm font-medium">Notes<textarea value={note} onChange={e => setNote(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label>
      </fieldset>
      <p className="text-xs text-slate-500">Saved as Pending for normal timesheet approval. Manual entries are recorded in the audit history.</p>
      <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button><button type="submit" disabled={busy || loadingShifts || !selectedShift} className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save timesheet'}</button></div>
    </form>
  </Modal>;
}
