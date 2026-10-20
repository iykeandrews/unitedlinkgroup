'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { formatRecordTime } from '../../lib/time/record-zone';

type Officer = { id: string; firstName: string; lastName: string };
type Shift = { id: string; employeeId: string | null; employee: Officer | null; startTime: string; endTime: string; timeZone?: string; location?: { name: string } | null; state: string; status: string };
type Roster = { canManage: boolean; shifts: Shift[]; officers: Officer[]; active: Array<{ employeeId: string; startTime: string }> };

export function DailyRoster({ businessId, onAttendanceChange }: { businessId?: string; onAttendanceChange?: () => void }) {
  const [data, setData] = useState<Roster | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const inFlight = useRef(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = await api.get('/time-tracking/operations/roster', businessId ? { headers: { 'x-business-id': businessId } } : undefined);
      if (current !== generation.current) return;
      setData(result.data);
      setError(false);
    } catch {
      if (current === generation.current) setError(true);
    }
  }, [businessId]);
  useEffect(() => {
    setData(null);
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => { clearInterval(timer); generation.current++; };
  }, [load]);
  const clock = async (employeeId: string, clockOut: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(employeeId);
    try {
      await api.post(`/time-tracking/admin/${clockOut ? 'clock-out' : 'clock-in'}`, { employeeId }, businessId ? { headers: { 'x-business-id': businessId } } : undefined);
      toast.success(clockOut ? 'Officer clocked out' : 'Officer clocked in');
      await load();
      onAttendanceChange?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Unable to update attendance. Please try again.');
      await load();
    } finally { inFlight.current = false; setBusy(null); }
  };
  const shifts = (data?.shifts || []).filter(s => s.employeeId && s.employee);
  const count = new Set(shifts.map(s => s.employeeId)).size;
  return <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
    <div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="text-lg font-bold">Today's scheduled officers</h2><p className="text-sm text-slate-500">{count} officers · All locations · Work location times</p></div><button type="button" onClick={() => void load()} className="text-sm font-medium text-purple-600">Refresh</button></div>
    {data?.canManage && <div className="flex flex-wrap gap-3 items-center mb-4"><label className="text-sm font-medium">Manual attendance <select aria-label="Officer for manual attendance" value={selectedOfficer} onChange={e => setSelectedOfficer(e.target.value)} className="ml-2 rounded-lg border p-2 dark:bg-slate-800"><option value="">Select officer</option>{data.officers.map(o => <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>)}</select></label><button type="button" disabled={!selectedOfficer || !!busy} onClick={() => void clock(selectedOfficer, data.active.some(t => t.employeeId === selectedOfficer))} className="rounded-lg bg-purple-600 text-white px-3 py-2 text-sm disabled:opacity-50">{busy ? 'Saving…' : data.active.some(t => t.employeeId === selectedOfficer) ? 'Clock out officer' : 'Clock in officer'}</button></div>}
    {error ? <p role="alert" className="text-sm text-red-600">Unable to load today's schedule. Select Refresh to try again.</p> : !data ? <p className="text-sm text-slate-500">Loading schedule…</p> : !shifts.length ? <p className="text-sm text-slate-500">No officers scheduled for today.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b dark:border-slate-800 text-slate-500"><th className="py-3 pr-4">Officer</th><th className="pr-4">Location</th><th className="pr-4">Scheduled time</th><th className="pr-4">Status</th>{data.canManage && <th>Attendance</th>}</tr></thead><tbody>{shifts.map(s => {
      const active = data.active.some(t => t.employeeId === s.employeeId);
      return <tr key={s.id} className="border-b last:border-0 dark:border-slate-800"><td className="py-3 pr-4 font-medium">{s.employee!.firstName} {s.employee!.lastName}</td><td className="pr-4">{s.location?.name || 'Unassigned'}</td><td className="pr-4 whitespace-nowrap">{formatRecordTime(s.startTime, 'MM/dd h:mm a', s.timeZone)} – {formatRecordTime(s.endTime, 'MM/dd h:mm a', s.timeZone)}</td><td className="pr-4">{active ? 'Clocked in' : s.state.toLowerCase().replaceAll('_', ' ')}</td>{data.canManage && <td><button type="button" disabled={!!busy} onClick={() => void clock(s.employeeId!, active)} className="whitespace-nowrap rounded-lg px-3 py-2 font-medium bg-purple-600 text-white disabled:opacity-50">{busy === s.employeeId ? 'Saving…' : active ? 'Clock out' : 'Clock in'}</button></td>}</tr>;
    })}</tbody></table></div>}
  </section>;
}
