'use client';
import { useEffect, useState } from 'react';
import api from '../../lib/api';

export function LicenseExpiryReminders() {
  const [licenses, setLicenses] = useState<any[]>([]);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const { data } = await api.get('/employees/qualifications/expiring');
        if (active) setLicenses(data.filter((q: any) => q.type === 'LICENSE' && q.expiryDate));
      } catch { if (active) setLicenses([]); }
    };
    void refresh();
    const timer = setInterval(refresh, 60000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  if (!licenses.length) return null;
  return <section aria-label="License renewal reminders" className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
    <h2 className="text-lg font-semibold">License renewal reminders</h2>
    <p className="text-sm mb-3">Licenses expiring within 90 days or already expired.</p>
    <ul className="space-y-2">{licenses.map(q => {
      const date = String(q.expiryDate).slice(0, 10).split('-');
      return <li key={q.id} className="text-sm"><strong>{q.employee?.firstName} {q.employee?.lastName}</strong> — {q.name}: {q.status === 'EXPIRED' ? 'Expired' : 'Expires'} {date[1]}/{date[2]}/{date[0]}</li>;
    })}</ul>
  </section>;
}
