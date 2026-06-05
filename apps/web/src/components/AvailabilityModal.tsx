'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';

type RepeatOption = 'does_not_repeat' | 'weekly';
type EndOption = 'no_end' | 'ends_on';

export interface AvailabilitySlotInput {
  day?: string;
  isAvailable: boolean;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  repeat: RepeatOption;
  repeatDays: string[];
  endOption: EndOption;
  endOn?: string;
  comment?: string;
  recordId?: string;
}

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'edit' | 'add';
  employeeName: string;
  initial?: AvailabilitySlotInput;
  onSave: (slot: AvailabilitySlotInput) => void;
  onDelete?: () => void;
  saving?: boolean;
}

export default function AvailabilityModal({
  isOpen,
  onClose,
  mode,
  employeeName,
  initial,
  onSave,
  onDelete,
  saving = false
}: AvailabilityModalProps) {
  const [tab, setTab] = useState<'available' | 'unavailable'>(initial?.isAvailable ? 'available' : 'unavailable');
  const [startDate, setStartDate] = useState<string>(initial?.startDate || new Date().toISOString().slice(0,16));
  const [endDate, setEndDate] = useState<string>(initial?.endDate || startDate);
  const [allDay, setAllDay] = useState<boolean>(initial?.allDay ?? true);
  const [repeat, setRepeat] = useState<RepeatOption>(initial?.repeat || (mode === 'edit' ? 'weekly' : 'does_not_repeat'));
  const [repeatDays, setRepeatDays] = useState<string[]>(initial?.repeatDays || (initial?.day ? [initial.day.slice(0,3).toLowerCase()] : []));
  const [endOption, setEndOption] = useState<EndOption>(initial?.endOption || 'no_end');
  const [endOn, setEndOn] = useState<string>(initial?.endOn || startDate);
  const [comment, setComment] = useState<string>(initial?.comment || (initial?.isAvailable ? '' : 'Reason for unavailability'));

  const title = useMemo(() => (mode === 'edit' ? 'Edit availability' : 'Add availability'), [mode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab(initial?.isAvailable ? 'available' : 'unavailable');
  }, [initial]);
  
  useEffect(() => {
    const ns = initial?.startDate || new Date().toISOString().slice(0,16);
    const ne = initial?.endDate || ns;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartDate(ns);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEndDate(ne);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllDay(initial?.allDay ?? true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRepeat(initial?.repeat || (mode === 'edit' ? 'weekly' : 'does_not_repeat'));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRepeatDays(initial?.repeatDays || (initial?.day ? [initial.day.slice(0,3).toLowerCase()] : []));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEndOption(initial?.endOption || 'no_end');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEndOn(initial?.endOn || ns);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setComment(initial?.comment || (initial?.isAvailable ? '' : 'Reason for unavailability'));
  }, [isOpen, initial, mode]);

  const weekdays = [
    { key: 'mon', label: 'Mon' },
    { key: 'tue', label: 'Tue' },
    { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' },
    { key: 'fri', label: 'Fri' },
    { key: 'sat', label: 'Sat' },
    { key: 'sun', label: 'Sun' },
  ];

  const dayLabel = useMemo(() => {
    if (initial?.day) return initial.day;
    if (repeatDays.length === 1) {
      const map: Record<string,string> = { mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday', fri:'Friday', sat:'Saturday', sun:'Sunday' };
      return map[repeatDays[0]] || '';
    }
    return '';
  }, [initial, repeatDays]);

  const handleToggleDay = (key: string) => {
    setRepeatDays(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };

  const saveText = tab === 'available' ? 'Save Availability' : 'Save Unavailability';

  const handleSave = () => {
    const slot: AvailabilitySlotInput = {
      isAvailable: tab === 'available',
      startDate,
      endDate: !allDay ? endDate : undefined,
      allDay,
      repeat,
      repeatDays,
      endOption,
      endOn: endOption === 'ends_on' ? endOn : undefined,
      comment,
      day: dayLabel || initial?.day,
    };
    onSave(slot);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-4xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">{employeeName}</div>
            <div className="flex rounded-full bg-slate-100 dark:bg-slate-700 p-1">
              <button
                className={`px-4 py-1.5 text-sm rounded-full ${tab === 'available' ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-200'}`}
                onClick={() => setTab('available')}
              >
                Available
              </button>
              <button
                className={`px-4 py-1.5 text-sm rounded-full ${tab === 'unavailable' ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-200'}`}
                onClick={() => setTab('unavailable')}
              >
                Unavailable
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {mode === 'edit' && onDelete && (
              <button onClick={onDelete} disabled={saving} className={`font-medium ${saving ? 'opacity-50 cursor-not-allowed' : 'text-red-600 hover:text-red-700'}`}>Delete</button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${saving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {saving ? 'Saving...' : saveText}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Day and time</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start</label>
                  <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-3 py-2 border" />
                </div>
                {!allDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End</label>
                    <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-3 py-2 border" />
                  </div>
                )}
              </div>
              <label className="inline-flex items-center gap-2 mt-3 text-sm">
                <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
                All day
              </label>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Repeat</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">One-off availabilities are prioritised over recurring ones but only apply to selected dates.</p>
              <select
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as RepeatOption)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white border"
              >
                {mode === 'edit' ? (
                  <>
                    <option value="weekly">{`Every week${dayLabel ? ` on ${dayLabel}` : ''}`}</option>
                    <option value="does_not_repeat">Doesn&apos;t repeat</option>
                  </>
                ) : (
                  <>
                    <option value="does_not_repeat">Doesn&apos;t repeat</option>
                    <option value="weekly">Every week</option>
                  </>
                )}
              </select>

              {repeat === 'weekly' && (
                <div className="mt-4 space-y-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Repeat on days</div>
                  <div className="flex flex-wrap gap-3">
                    {weekdays.map(wd => (
                      <label key={wd.key} className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={repeatDays.includes(wd.key)} onChange={() => handleToggleDay(wd.key)} />
                        {wd.label}
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="radio" name="endOption" checked={endOption === 'no_end'} onChange={() => setEndOption('no_end')} />
                      Doesn&apos;t end
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="radio" name="endOption" checked={endOption === 'ends_on'} onChange={() => setEndOption('ends_on')} />
                      Ends on
                    </label>
                    {endOption === 'ends_on' && (
                      <input type="datetime-local" value={endOn} onChange={(e) => setEndOn(e.target.value)} className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-3 py-2 border" />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Comment (optional)</div>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2"
                placeholder="Reason for availability or unavailability"
              />
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Summary</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {tab === 'available' ? 'Mark as available' : 'Mark as unavailable'} {repeat === 'weekly' ? 'weekly' : 'for the selected period'}.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
