'use client';

import { CalendarDays } from 'lucide-react';
import AmericanDateInput from './AmericanDateInput';

export default function ServiceDatePicker({ value, onChange, min, max, label, className }: {
  value: string; onChange: (value: string) => void; min?: string; max?: string; label: string; className?: string;
}) {
  return (
    <div className="relative">
      <AmericanDateInput aria-label={label} value={value} onChange={onChange} min={min} max={max} className={`${className || ''} pr-12`} />
      <span className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500 dark:text-indigo-300">
        <CalendarDays size={19} aria-hidden="true" />
        <input type="date" aria-label={`Choose ${label.toLowerCase()}`} value={value} min={min} max={max}
          onChange={event => onChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onClick={event => { try { event.currentTarget.showPicker?.(); } catch { /* Native picker remains available. */ } }} />
      </span>
    </div>
  );
}
