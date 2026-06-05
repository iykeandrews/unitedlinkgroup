'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import api from '../../lib/api';
import { useBusiness } from '../../context/business-context';
import { Employee, LeaveRequest, Location, Shift } from './types';

function safeParseISO(value: string | null) {
  if (!value) return null;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
}

function escapeText(v: any) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default function SchedulePrintView() {
  const searchParams = useSearchParams();
  const { selectedBusiness } = useBusiness();
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const clientId = searchParams.get('clientId');

  const start = useMemo(() => safeParseISO(startParam), [startParam]);
  const end = useMemo(() => safeParseISO(endParam), [endParam]);

  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!start || !end) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const locationParams: any = { status: 'ACTIVE' };
        if (clientId && clientId !== 'all') locationParams.clientId = clientId;
        const [locRes, empRes, shiftRes, leaveRes] = await Promise.allSettled([
          api.get('/locations', { params: locationParams }),
          api.get('/employees', { params: { status: 'ACTIVE' } }),
          api.get('/scheduling/shifts', { params: { start: start.toISOString(), end: end.toISOString() } }),
          api.get('/leave/requests', { params: { status: 'APPROVED' } })
        ]);
        if (locRes.status === 'fulfilled') setLocations(locRes.value.data || []);
        if (empRes.status === 'fulfilled') setEmployees(empRes.value.data || []);
        if (shiftRes.status === 'fulfilled') setShifts(shiftRes.value.data || []);
        if (leaveRes.status === 'fulfilled') setLeaveRequests(leaveRes.value.data || []);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [clientId, startParam, endParam, start, end]);

  const businessName = selectedBusiness?.name || 'Schedule';
  const dateRange = start && end ? `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}` : '';

  const locationById = useMemo(() => new Map(locations.map(l => [l.id, l])), [locations]);
  const employeeById = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  const normalized = useMemo(() => {
    const rows = shifts
      .map(s => {
        const st = String(s.status || '').toUpperCase();
        const startTime = new Date(s.startTime);
        const endTime = new Date(s.endTime || s.startTime);
        const location = s.location || locationById.get(s.locationId);
        const employee = s.employee || (s.employeeId ? employeeById.get(s.employeeId) : undefined);
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : st === 'OPEN' ? 'Open shift' : 'Unassigned';
        const clientName = (location as any)?.client?.name || '';
        const siteName = (location as any)?.name || 'Unknown site';
        const areaName = (location as any)?.areaName || '';
        return {
          id: s.id,
          status: st,
          startTime,
          endTime,
          employeeName,
          siteName,
          clientName,
          areaName,
          notes: (s as any).notes || '',
        };
      })
      .filter(r => r.status !== 'ARCHIVED');

    rows.sort((a, b) => {
      const d = a.startTime.getTime() - b.startTime.getTime();
      if (d !== 0) return d;
      const s = a.siteName.localeCompare(b.siteName);
      if (s !== 0) return s;
      return a.employeeName.localeCompare(b.employeeName);
    });
    return rows;
  }, [shifts, locationById, employeeById]);

  const totals = useMemo(() => {
    const countBy = (st: string) => normalized.filter(r => r.status === st).length;
    const unpublished = normalized.filter(r => r.status === 'DRAFT' || r.status === 'CANCELLED').length;
    return {
      total: normalized.length,
      unpublished,
      published: countBy('PUBLISHED'),
      open: countBy('OPEN'),
      completed: countBy('COMPLETED'),
    };
  }, [normalized]);

  const leaveSummary = useMemo(() => {
    if (!start || !end) return [];
    const from = start.getTime();
    const to = end.getTime();
    return leaveRequests
      .map(r => {
        const employee = employeeById.get(r.employeeId);
        if (!employee) return null;
        const startDate = safeParseISO((r as any).startDate || null);
        const endDate = safeParseISO((r as any).endDate || null);
        if (!startDate || !endDate) return null;
        const overlap = !(endDate.getTime() < from || startDate.getTime() > to);
        if (!overlap) return null;
        return {
          id: r.id,
          name: `${employee.firstName} ${employee.lastName}`,
          range: `${format(startDate, 'd MMM')} – ${format(endDate, 'd MMM')}`,
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; range: string }>;
  }, [leaveRequests, employeeById, start, end]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          .no-print { display: none !important; }
          .print-break { break-before: page; }
        }
      `}</style>

      <div className="no-print px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <div className="font-semibold">Schedule export</div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
        >
          Print / Save PDF
        </button>
      </div>

      <div className="px-8 py-6">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-tight">{escapeText(businessName)}</div>
            <div className="text-sm text-slate-600 mt-1">{escapeText(dateRange)}</div>
            <div className="text-xs text-slate-500 mt-1">Generated {format(new Date(), 'd MMM yyyy, HH:mm')}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs min-w-[320px]">
            <div className="rounded-lg border border-slate-200 px-3 py-2">
              <div className="text-slate-500">Total shifts</div>
              <div className="font-semibold text-slate-900">{totals.total}</div>
            </div>
            <div className="rounded-lg border border-slate-200 px-3 py-2">
              <div className="text-slate-500">Unpublished</div>
              <div className="font-semibold text-slate-900">{totals.unpublished}</div>
            </div>
            <div className="rounded-lg border border-slate-200 px-3 py-2">
              <div className="text-slate-500">Published</div>
              <div className="font-semibold text-slate-900">{totals.published}</div>
            </div>
            <div className="rounded-lg border border-slate-200 px-3 py-2">
              <div className="text-slate-500">Open</div>
              <div className="font-semibold text-slate-900">{totals.open}</div>
            </div>
          </div>
        </div>

        {leaveSummary.length > 0 && (
          <div className="mt-6 rounded-xl border border-slate-200 px-5 py-4">
            <div className="text-sm font-semibold">Approved leave (week)</div>
            <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {leaveSummary.slice(0, 10).map(r => (
                <div key={r.id} className="flex items-center justify-between gap-4">
                  <div className="font-medium truncate">{escapeText(r.name)}</div>
                  <div className="text-slate-600">{escapeText(r.range)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <div className="text-sm font-semibold">Shifts</div>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Site</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-slate-500">Loading…</td>
                  </tr>
                )}
                {!loading && normalized.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-slate-500">No shifts found.</td>
                  </tr>
                )}
                {!loading && normalized.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 whitespace-nowrap">{format(r.startTime, 'EEE, d MMM')}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(r.startTime, 'HH:mm')} – {format(r.endTime, 'HH:mm')}
                    </td>
                    <td className="px-4 py-3">{escapeText(r.employeeName)}</td>
                    <td className="px-4 py-3">{escapeText(r.siteName)}</td>
                    <td className="px-4 py-3">{escapeText(r.clientName)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.status === 'PUBLISHED'
                          ? 'bg-green-100 text-green-800'
                          : r.status === 'OPEN'
                          ? 'bg-blue-100 text-blue-800'
                          : r.status === 'DRAFT'
                          ? 'bg-slate-200 text-slate-800'
                          : r.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {escapeText(r.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{escapeText(r.notes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Draft and cancelled shifts are not visible to employees until published.
          </div>
        </div>
      </div>
    </div>
  );
}
