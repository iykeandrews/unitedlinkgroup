'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../lib/api';

type Change = {
  classification: string; previousRate: number | null; newRate: number;
  previousPayType: string | null; payType: string; change: string;
  difference: number | null; percentage: number | null;
};
type Entry = { id: string; changedAt: string; changedBy: string; currencyCode: string; changes: Change[] };

export default function RateHistory({ employeeId, businessId, revision }: { employeeId: string; businessId?: string; revision: number }) {
  const [items, setItems] = useState<Entry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const load = useCallback(async (next?: string, expected = generation.current) => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get(`/employees/${employeeId}/rate-history`, {
        headers: businessId ? { 'x-business-id': businessId } : undefined,
        params: next ? { cursor: next } : undefined,
      });
      if (generation.current !== expected) return;
      setItems(old => next ? [...old, ...data.items] : data.items);
      setCursor(data.nextCursor);
    } catch {
      if (generation.current === expected) setError(true);
    } finally {
      if (generation.current === expected) setLoading(false);
    }
  }, [employeeId, businessId]);
  useEffect(() => {
    const expected = ++generation.current;
    setItems([]);
    setCursor(null);
    load(undefined, expected);
    return () => { generation.current++; };
  }, [load, revision]);
  const money = (rate: number | null, payType: string | null, currency: string) => rate === null ? 'Not set' :
    `${new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 6 }).format(rate)}${payType === 'SALARY' ? '/year' : '/hr'}`;
  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800" aria-label="Rate history">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Rate history</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Pay increases and other rate changes are recorded when saved. Earlier changes made before tracking was enabled are not available.</p>
      {items.length > 0 && <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-gray-500 dark:border-slate-600"><tr>
            {['Date', 'Pay profile', 'Previous rate', 'New rate', 'Change', 'Changed by'].map(label => <th key={label} scope="col" className="whitespace-nowrap px-3 py-3 font-semibold">{label}</th>)}
          </tr></thead>
          <tbody>{items.flatMap(entry => entry.changes.map((change, index) => <tr key={`${entry.id}-${index}`} className="border-b border-gray-100 dark:border-slate-700">
            <td className="whitespace-nowrap px-3 py-3">{new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).format(new Date(entry.changedAt))}</td>
            <td className="px-3 py-3">{change.classification === 'W2' ? 'W-2' : '1099 contractor'}</td>
            <td className="whitespace-nowrap px-3 py-3">{money(change.previousRate, change.previousPayType, entry.currencyCode)}</td>
            <td className="whitespace-nowrap px-3 py-3 font-semibold">{money(change.newRate, change.payType, entry.currencyCode)}</td>
            <td className="whitespace-nowrap px-3 py-3">
              {change.change === 'INITIAL' ? 'Initial rate' : change.change === 'PAY_TYPE_CHANGED' ? 'Pay type changed' :
                <><span className={change.change === 'INCREASE' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>{change.change === 'INCREASE' ? 'Increase' : 'Decrease'}</span>{change.percentage !== null && ` (${change.percentage > 0 ? '+' : ''}${change.percentage}%)`}</>}
            </td>
            <td className="px-3 py-3">{entry.changedBy}</td>
          </tr>))}</tbody>
        </table>
      </div>}
      <div className="mt-4 text-sm" aria-live="polite">
        {loading && <p className="text-gray-500">Loading rate history…</p>}
        {error && <p className="text-red-600 dark:text-red-400">Could not load rate history. <button type="button" onClick={() => load(items.length ? cursor || undefined : undefined)} className="font-semibold underline">Try again</button></p>}
        {!loading && !error && items.length === 0 && <p className="text-gray-500">No rate changes recorded yet.</p>}
      </div>
      {cursor && !error && <button type="button" disabled={loading} onClick={() => load(cursor)} className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-600">Load older changes</button>}
    </section>
  );
}
