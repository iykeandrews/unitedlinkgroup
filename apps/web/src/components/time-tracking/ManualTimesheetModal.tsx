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
    <label className="text-sm font-medium">{label} date<input required placeholder="MM/DD/YYYY" aria-label={`${label} date`} value={value.date} onChange={e => onChange({...value, date: e.target.value})} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label>
    <label className="text-sm font-medium">{label} time<input required type="time" aria-label={`${label} time`} value={value.time} onChange={e => onChange({...value, time: e.target.value})} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label>
  </div>;
}

export function ManualTimesheetModal({isOpen, onClose, employees, locations, workerType, onSaved}: {
  isOpen: boolean; onClose: () => void; employees: any[]; locations: any[];
  workerType: 'W2' | 'CONTRACTOR_1099'; onSaved: (record: any) => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [start, setStart] = useState<ClockInput>({date: '', time: ''});
  const [end, setEnd] = useState<ClockInput>({date: '', time: ''});
  const [breaks, setBreaks] = useState<BreakInput[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const timeZone = locations.find(location => location.id === locationId)?.timeZone || 'America/New_York';
  useEffect(() => {
    if (!isOpen) return;
    const date = formatRecordTime(new Date(), 'MM/dd/yyyy', 'America/New_York');
    setEmployeeId(''); setLocationId(''); setStart({date, time: ''}); setEnd({date, time: ''}); setBreaks([]); setNote('');
  }, [isOpen]);
  const instant = (input: ClockInput) => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.date);
    if (!match || !/^\d{2}:\d{2}$/.test(input.time)) throw Error('Enter dates as MM/DD/YYYY and complete every time field');
    const result = recordInputDate(`${match[3]}-${match[1]}-${match[2]}T${input.time}`, timeZone);
    if (!Number.isFinite(+result) || formatRecordTime(result, 'MM/dd/yyyy', timeZone) !== input.date || formatRecordTime(result, 'HH:mm', timeZone) !== input.time) throw Error('Enter a valid date and time at the work location');
    return result.toISOString();
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    try {
      const startTime = instant(start), endTime = instant(end);
      if (Date.parse(endTime) <= Date.parse(startTime) || Date.parse(endTime) > Date.now()) throw Error('Clock-out must be after clock-in and cannot be in the future');
      const entries = breaks.map(entry => {
        if (!entry.endTime) throw Error('Every break needs an end time');
        const range = enteredBreakRange(new Date(startTime), new Date(endTime), entry.startTime, entry.endTime, timeZone);
        return {type: entry.type, startTime: range.start.toISOString(), endTime: range.end!.toISOString()};
      });
      setBusy(true);
      const response = await api.post('/time-tracking/timesheets', {employeeId, locationId, startTime, endTime, timeZone, workerType, employeeNote: note, breaks: entries});
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
          <label className="text-sm font-medium">Employee<select required value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"><option value="">Choose employee</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select></label>
          <label className="text-sm font-medium">Location<select required value={locationId} onChange={e => setLocationId(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"><option value="">Choose location</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
        </div>
        <ClockFields label="Clock-in" value={start} onChange={setStart} />
        <ClockFields label="Clock-out" value={end} onChange={setEnd} />
        <p className="text-xs text-slate-500">Break dates follow the worked period automatically, including overnight shifts.</p>
        <div className="flex items-center justify-between"><h3 className="font-semibold">Breaks</h3><button type="button" className="text-sm font-semibold text-purple-600" onClick={() => setBreaks(previous => [...previous, {startTime: '', endTime: '', type: 'UNPAID'}])}>Add break</button></div>
        {breaks.map((entry, index) => <div key={index} className="space-y-3 rounded-lg border p-3">
          <div className="flex justify-between gap-3"><label className="text-sm">Break {index + 1}<select value={entry.type} onChange={e => changeBreak(index, {type: e.target.value})} className="ml-3 rounded border p-1 dark:bg-slate-800"><option value="UNPAID">Unpaid</option><option value="PAID">Paid</option></select></label><button type="button" aria-label={`Remove break ${index + 1}`} onClick={() => setBreaks(previous => previous.filter((_, i) => i !== index))} className="text-sm text-red-600">Remove</button></div>
          <div className="grid grid-cols-2 gap-3">{(['startTime', 'endTime'] as const).map(field => <label key={field} className="text-sm">{field === 'startTime' ? 'Break start' : 'Break end'}<input required type="time" value={entry[field]} onChange={e => changeBreak(index, {[field]: e.target.value})} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label>)}</div>
        </div>)}
        <label className="block text-sm font-medium">Notes<textarea value={note} onChange={e => setNote(e.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label>
      </fieldset>
      <p className="text-xs text-slate-500">Saved as Pending for normal timesheet approval. Manual entries are recorded in the audit history.</p>
      <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button><button type="submit" disabled={busy} className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save timesheet'}</button></div>
    </form>
  </Modal>;
}
