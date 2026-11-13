'use client';

import { useEffect, useMemo, useState } from 'react';
import { endOfMonth, format } from 'date-fns';
import { ArrowUpRight, CalendarDays, ClipboardCheck, Clock3, Download, FileSpreadsheet, Search, TriangleAlert } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Modal } from '../../../../components/Modal';
import { useBusiness } from '../../../../context/business-context';
import api from '../../../../lib/api';
import { recordPeriodBounds, startsInWorkPeriod } from '../../../../lib/time/calendar-history';
import { formatRecordTime } from '../../../../lib/time/record-zone';
import { assessmentEntries, calloutHeaders, calloutRow, displayDate, hours, label, name, officerTotals, punchHeaders, punchMinutes, punchRow, summaryHeaders, summaryRow, type Officer, type Person, type Report, type Site } from './attendance-data';

const panel = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';
const control = 'h-11 w-full min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:[color-scheme:dark]';
const filterLabel = 'flex min-w-0 flex-col gap-2 text-sm font-semibold';
const button = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-40';
const primary = button + ' bg-indigo-600 text-white hover:bg-indigo-700';
const secondary = button + ' border border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800';
const muted = 'text-sm text-slate-600 dark:text-slate-400';

function ReportTable({ headers, rows, empty, onOpen }: {
  headers: string[]; rows: string[][]; empty: string; onOpen?: (index: number) => void;
}) {
  if (!rows.length) return <p className={muted + ' p-5'}>{empty}</p>;
  return <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <tr>{headers.map(heading => <th key={heading} scope="col" className="whitespace-nowrap px-4 py-3">{heading}</th>)}
          {onOpen && <th scope="col" className="px-4 py-3">Record</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((row, index) => <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
          {row.map((value, column) => <td key={column} className={'px-4 py-3 align-top ' + (column === 0 ? 'font-semibold' : '')}>{value}</td>)}
          {onOpen && <td className="px-4 py-2"><button type="button" aria-label={'View record for ' + row[0]} onClick={() => onOpen(index)} className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-indigo-700 hover:underline dark:text-indigo-300">View record <ArrowUpRight size={14} /></button></td>}
        </tr>)}
      </tbody>
    </table>
  </div>;
}

function Trend({ data, exceptions = false }: {
  data: { day: string; worked: number; approved: number; callouts: number; incomplete: number }[]; exceptions?: boolean;
}) {
  const common = <>
    <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.25} />
    <XAxis dataKey="day" tickFormatter={day => displayDate(day).slice(0, 5)} minTickGap={20} tick={{ fontSize: 11, fill: '#64748b' }} />
    <YAxis width={42} allowDecimals={!exceptions} tick={{ fontSize: 11, fill: '#64748b' }} />
    <Tooltip labelFormatter={displayDate} contentStyle={{ color: '#1e293b', borderRadius: 10 }} />
  </>;
  return <div className="mt-4 h-56 min-w-0">
    <ResponsiveContainer width="100%" height="100%">
      {exceptions
        ? <BarChart data={data}>{common}<Bar dataKey="callouts" name="Call-outs / no-shows" fill="#d97706" radius={[4, 4, 0, 0]} /><Bar dataKey="incomplete" name="Incomplete punches" fill="#64748b" radius={[4, 4, 0, 0]} /></BarChart>
        : <AreaChart data={data}>{common}<Area type="monotone" dataKey="worked" name="Worked hours" stroke="#6366f1" fill="#818cf8" fillOpacity={0.22} strokeWidth={2} /><Area type="monotone" dataKey="approved" name="Approved hours" stroke="#0f766e" fill="none" strokeWidth={2} /></AreaChart>}
    </ResponsiveContainer>
  </div>;
}

export default function AttendanceReportsPage() {
  const { selectedBusiness } = useBusiness();
  const businessId = selectedBusiness?.id;
  const [from, setFrom] = useState(() => format(new Date(), 'yyyy-MM-01'));
  const [to, setTo] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [location, setLocation] = useState('all');
  const [query, setQuery] = useState('');
  const [record, setRecord] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'officers' | 'callouts' | null>(null);
  const [request, retry] = useState(0);
  const [result, setResult] = useState<{ key: string; report?: Report; error?: string }>();
  const [exporting, setExporting] = useState(false);
  const valid = Boolean(from && to && from <= to);
  const key = JSON.stringify([businessId, from, to, request]);
  const current = result?.key === key ? result : undefined;
  const data = current?.report;

  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    const period = recordPeriodBounds(from, to);
    api.get('/reports/attendance', {
      signal: controller.signal,
      headers: businessId ? { 'x-business-id': businessId } : undefined,
      params: { startDate: period.start.toISOString(), endDate: period.end.toISOString(), includeAssessments: true },
    }).then(({ data: response }) => {
      if (controller.signal.aborted) return;
      setResult({ key, report: {
        timesheets: (Array.isArray(response?.timesheets) ? response.timesheets : []).filter((p: Report['timesheets'][number]) => Number.isFinite(Date.parse(p.startTime)) && startsInWorkPeriod(p, from, to)),
        callouts: Array.isArray(response?.callouts) ? response.callouts : [],
        assessments: Array.isArray(response?.assessments) ? response.assessments : [],
      } });
    }).catch(error => {
      if (controller.signal.aborted) return;
      const message = error.response?.data?.message;
      setResult({ key, error: typeof message === 'string' ? message : 'The attendance report could not be loaded.' });
    });
    return () => controller.abort();
  }, [valid, from, to, businessId, key]);

  const sites = useMemo(() => {
    const available = new Map<string, Site>();
    for (const site of [
      ...(data?.timesheets ?? []).map(p => p.location),
      ...(data?.callouts ?? []).map(c => c.shift?.location),
      ...(data?.assessments ?? []).map(a => a.location),
    ]) if (site) available.set(site.id, site);
    return Array.from(available.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);
  const siteFilter = sites.find(site => site.id === location);
  const officers = useMemo(() => {
    const groups = new Map<string, Officer>();
    const search = query.trim().toLowerCase();
    const group = (employee: Person | null | undefined, site?: Site | null) => {
      if (siteFilter && siteFilter.id !== site?.id) return;
      if (search && ![name(employee), label(employee?.role)].some(value => value.toLowerCase().includes(search))) return;
      const person = employee ?? { id: 'unassigned' };
      let officer = groups.get(person.id);
      if (!officer) {
        officer = { employee: person, punches: [], callouts: [], assessments: [] };
        groups.set(person.id, officer);
      }
      return officer;
    };
    for (const p of data?.timesheets ?? []) group(p.employee, p.location)?.punches.push(p);
    for (const c of data?.callouts ?? []) group(c.employee, c.shift?.location)?.callouts.push(c);
    for (const a of data?.assessments ?? []) group(a.employee, a.location)?.assessments.push(a);
    return Array.from(groups.values()).sort((a, b) => name(a.employee).localeCompare(name(b.employee)));
  }, [data, query, siteFilter]);
  const selected = officers.find(officer => officer.employee.id === record);
  const punches = officers.flatMap(officer => officer.punches);
  const calls = officers.flatMap(officer => officer.callouts.map(entry => ({ officer, entry })));
  const totals = officerTotals(punches);
  const chart = useMemo(() => {
    const days = new Map<string, { day: string; worked: number; approved: number; callouts: number; incomplete: number }>();
    const day = (key: string) => {
      if (!days.has(key)) days.set(key, { day: key, worked: 0, approved: 0, callouts: 0, incomplete: 0 });
      return days.get(key)!;
    };
    for (const officer of officers) {
      for (const p of officer.punches) {
        const row = day(formatRecordTime(p.startTime, 'yyyy-MM-dd', p.timeZone));
        const worked = punchMinutes(p).worked;
        if (worked === null) row.incomplete++;
        else {
          row.worked += worked / 60;
          if (p.status === 'APPROVED' || p.status === 'PAID') row.approved += worked / 60;
        }
      }
      for (const c of officer.callouts) day(formatRecordTime(c.noticeAt, 'yyyy-MM-dd')).callouts++;
    }
    return Array.from(days.values()).sort((a, b) => a.day.localeCompare(b.day)).map(row => ({ ...row, worked: +row.worked.toFixed(2), approved: +row.approved.toFixed(2) }));
  }, [officers]);

  async function downloadPdf(officer?: Officer) {
    setExporting(true);
    try {
      const { buildAttendancePdf } = await import('./attendance-pdf');
      const doc = buildAttendancePdf(officer ? [officer] : officers, {
        business: selectedBusiness?.name || 'United Link Security Agency',
        period: displayDate(from) + ' – ' + displayDate(to),
        location: siteFilter?.name || 'All locations',
      }, officer);
      doc.save((officer ? name(officer.employee).replace(/[^\w-]+/g, '_') + '_Assessment_' : 'Attendance_Report_') + from + '_' + to + '.pdf');
    } catch { toast.error('Could not create the PDF. Please try again.'); }
    finally { setExporting(false); }
  }

  function downloadCsv() {
    const rows = [['Record type', 'Officer', 'Date / time', 'Location', 'Clock in', 'Clock out', 'Unpaid break (min)', 'Worked (h)', 'Status', 'Details'],
      ...officers.flatMap(officer => [
        ...officer.punches.map(p => ['Attendance', name(officer.employee), ...punchRow(p), '']),
        ...officer.callouts.map(c => {
          const [day, site, type, status, reason] = calloutRow(c);
          return [type, name(officer.employee), day, site, '', '', '', '', status, reason];
        }),
      ]),
    ];
    const csv = rows.map(row => row.map(value => '"' + (/^[\s]*[=+@-]/.test(value) ? "'" : '') + value.replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Attendance_Report_' + from + '_' + to + '.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <main className="mx-auto w-full max-w-[1680px] space-y-6 p-4 text-slate-900 sm:p-7 dark:text-slate-100">
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Attendance Reports</h1>
        <p className={muted + ' mt-2'}>Review recorded hours, attendance exceptions, and supervisor assessments.</p></div>
      <div className="flex flex-wrap gap-2">
        <button className={secondary} disabled={!officers.length} onClick={downloadCsv}><FileSpreadsheet size={16} /> Export CSV</button>
        <button className={primary} disabled={!officers.length || exporting} onClick={() => void downloadPdf()}><Download size={16} /> Download report PDF</button>
      </div>
    </header>

    <section aria-label="Report filters" className={panel + ' grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4'}>
      <label className={filterLabel}><span>Period from</span><input className={control} type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label className={filterLabel}><span>Period to</span><input className={control} type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      <label className={filterLabel}><span>Location</span><select className={control} value={siteFilter?.id || 'all'} onChange={e => setLocation(e.target.value)}>
        <option value="all">All locations</option>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
      </select></label>
      <label className={filterLabel}><span>Find officer</span><span className="relative block"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="search" className={control.replace('px-3', 'pl-9 pr-3')} placeholder="Search by name or role" value={query} onChange={e => setQuery(e.target.value)} /></span></label>
    </section>

    {!valid ? <p role="alert" className="text-sm text-amber-700 dark:text-amber-300">Choose a start date on or before the end date.</p>
      : current?.error ? <div role="alert" className={panel + ' flex flex-wrap items-center justify-between gap-3 p-5'}><p>{current.error}</p><button className={secondary} onClick={() => retry(value => value + 1)}>Try again</button></div>
      : !data ? <p role="status" className={muted}>Loading attendance records…</p>
      : !officers.length ? <p role="status" className={panel + ' p-8 text-center ' + muted}>No records match the selected filters.</p>
      : <>
        <section aria-label="Attendance totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { title: 'Worked hours', value: hours(totals.worked), icon: Clock3, detail: 'Completed punches after unpaid breaks' },
            { title: 'Approved hours', value: hours(totals.approved), icon: ClipboardCheck, detail: 'Approved and paid attendance' },
            { title: 'Officers with punches', value: officers.filter(officer => officer.punches.length).length, icon: CalendarDays, detail: totals.open + ' incomplete punches' },
            { title: 'Call-outs / no-shows', value: calls.length, icon: TriangleAlert, detail: 'Recorded in the selected period' },
          ].map(({ title, value, icon: Icon, detail }) => <article className={panel + ' p-4 sm:p-5'} key={title}>
            <div className="flex items-center justify-between gap-2"><h2 className={muted + ' font-semibold'}>{title}</h2><Icon size={18} className="shrink-0 text-indigo-600 dark:text-indigo-400" /></div>
            <p className="my-2 text-3xl font-semibold tabular-nums">{value}</p><p className="text-xs text-slate-500 dark:text-slate-400">{detail}</p>
          </article>)}
        </section>
        {chart.length > 0 && <section aria-label="Attendance charts" className="grid gap-4 xl:grid-cols-2">
          <article className={panel + ' min-w-0 p-5'}><h2 className="font-semibold">Hours by work date</h2><p className={muted}>Worked hours <span className="text-indigo-600">●</span> · Approved hours <span className="text-teal-600">●</span></p><Trend data={chart} /></article>
          <article className={panel + ' min-w-0 p-5'}><h2 className="font-semibold">Attendance exceptions by date</h2><p className={muted}>Call-outs / no-shows <span className="text-amber-600">●</span> · Incomplete punches <span className="text-slate-500">●</span></p><Trend data={chart} exceptions /></article>
        </section>}
        <section aria-label="Attendance details" className="grid gap-4 sm:grid-cols-2">
          {([
            { id: 'officers', title: 'Officer records', count: officers.length },
            { id: 'callouts', title: 'Call-outs and no-shows', count: calls.length },
          ] as const).map(item => (
            <button key={item.id} type="button" aria-haspopup="dialog" onClick={() => setDialog(item.id)}
              className={panel + ' flex items-center justify-between gap-4 p-5 text-left hover:border-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500'}>
              <span><span className="block font-semibold">{item.title}</span><span className={muted}>{item.count} records</span></span>
              <ArrowUpRight size={16} className="shrink-0" />
            </button>
          ))}
        </section>
      </>}

    <Modal isOpen={dialog !== null} onClose={() => { setDialog(null); setRecord(null); }} maxWidth="max-w-5xl"
      title={selected ? name(selected.employee) + ' · Officer record' : dialog === 'callouts' ? 'Call-outs and no-shows' : 'Officer records'}>
      {dialog === 'officers' && !selected && (
        <ReportTable headers={summaryHeaders} rows={officers.map(summaryRow)} empty="No officer records." onOpen={index => setRecord(officers[index].employee.id)} />
      )}
      {dialog === 'callouts' && (
        <ReportTable headers={['Officer', ...calloutHeaders]} rows={calls.map(({ officer, entry }) => [name(officer.employee), ...calloutRow(entry)])} empty="No call-outs or no-shows in the selected period." />
      )}
      {selected && <div className="space-y-5">
        <button type="button" className={secondary} onClick={() => setRecord(null)}>Back to officer records</button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={muted}>{displayDate(from)} – {displayDate(to)} · {siteFilter?.name || 'All locations'}</p>
          <button className={primary} disabled={exporting} onClick={() => void downloadPdf(selected)}><Download size={16} /> Download officer PDF</button>
        </div>
        <div className={panel + ' overflow-hidden'}><ReportTable headers={summaryHeaders} rows={[summaryRow(selected)]} empty="No records." /></div>
        <section className={panel + ' overflow-hidden'}><h3 className="p-4 font-semibold">Recorded punches</h3><ReportTable headers={punchHeaders} rows={selected.punches.map(punchRow)} empty="No punches in this period." /></section>
        {selected.callouts.length > 0 && <section className={panel + ' overflow-hidden'}><h3 className="p-4 font-semibold">Call-outs and no-shows</h3><ReportTable headers={calloutHeaders} rows={selected.callouts.map(calloutRow)} empty="No call-outs." /></section>}
        <section className="space-y-3"><h3 className="font-semibold">Supervisor assessments</h3>
          {!selected.assessments.length && <p className={muted}>No assessments in the selected period and location.</p>}
          {selected.assessments.map(assessment => <details className={panel + ' p-4'} key={assessment.id}>
            <summary className="cursor-pointer font-semibold">{formatRecordTime(assessment.observedAt, 'MM/dd/yyyy')} · {assessment.location.name} · {assessment.score}%</summary>
            <p className={muted + ' mt-3'}>Evaluator · {name(assessment.evaluator)}</p>
            <dl className="my-3 grid gap-2 text-sm sm:grid-cols-2">
              {assessmentEntries(assessment.ratings).map(([criterion, value]) => <div key={criterion}><dt className="font-semibold">{criterion}</dt><dd>{Number(value) > 0 ? value + '/5' : 'Not observed'}</dd></div>)}
              {assessmentEntries(assessment.checklist).map(([criterion, value]) => <div key={criterion}><dt className="font-semibold">{criterion}</dt><dd>{label(String(value))}</dd></div>)}
            </dl>
            <p className="whitespace-pre-wrap break-words text-sm">{assessment.notes}</p>
            <p className="mt-2 text-sm font-semibold">{assessment.action}{assessment.followUpAt && ' · Follow-up ' + formatRecordTime(assessment.followUpAt, 'MM/dd/yyyy')}</p>
          </details>)}
        </section>
      </div>}
    </Modal>
  </main>;
}
