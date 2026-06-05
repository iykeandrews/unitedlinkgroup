import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Send, Save, Calendar, Users, FileText, Bold, Italic, Underline, List, ListOrdered, Link2, Paperclip, Eraser } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface EmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EmailComposerModal({ isOpen, onClose, onSuccess }: EmailComposerModalProps) {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState('ALL');
  const [targetValue, setTargetValue] = useState('');
  const [specificEmployeeIds, setSpecificEmployeeIds] = useState<string[]>([]);
  const [specificEmailsRaw, setSpecificEmailsRaw] = useState('');
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [attachments, setAttachments] = useState<Array<{ filename: string; contentType: string; contentBase64: string; size: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [step, setStep] = useState<'compose' | 'confirm'>('compose');

  const looksHtml = (s: string) => /<([a-z][\s\S]*?)>/i.test(String(s || ''));
  const toEditorHtml = (s: string) => {
    const raw = String(s || '');
    if (looksHtml(raw)) return raw;
    const escaped = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return escaped.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('<br/>');
  };

  const contentIsEmpty = useMemo(() => {
    const html = String(content || '').trim();
    if (!html) return true;
    const txt = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    return !txt;
  }, [content]);

  useEffect(() => {
    if (isOpen) {
      fetchMetadata();
      setStep('compose');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const el = editorRef.current;
    if (!el) return;
    const html = toEditorHtml(content);
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [content, isOpen]);

  const fetchMetadata = async () => {
    try {
      const [deptRes, roleRes, tmplRes, empRes] = await Promise.all([
        api.get('/departments'),
        api.get('/roles'),
        api.get('/email-templates'),
        api.get('/employees', { params: { status: 'ACTIVE' } })
      ]);
      setDepartments(deptRes.data);
      setRoles(roleRes.data);
      setTemplates(tmplRes.data);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
    } catch (error) {
      console.error('Failed to fetch metadata', error);
    }
  };

  const handleTemplateSelect = (id: string) => {
    if (!id) return;
    const tmpl = templates.find(t => t.id === id);
    if (tmpl) {
      setSubject(tmpl.subject);
      setContent(toEditorHtml(tmpl.content));
    }
  };

  const handleSaveTemplate = async () => {
    if (!subject || !content) {
      alert('Please fill in subject and content to save as template');
      return;
    }
    const name = prompt('Enter template name:');
    if (!name) return;

    try {
      await api.post('/email-templates', { name, subject, content });
      alert('Template saved successfully!');
      fetchMetadata(); // Refresh list
    } catch (error) {
      console.error('Failed to save template', error);
      alert('Failed to save template');
    }
  };

  const handleSendClick = () => {
    if (!subject || contentIsEmpty) {
      alert('Please fill in subject and content');
      return;
    }
    if (targetType === 'DEPARTMENT' && !targetValue) {
      alert('Please select a department');
      return;
    }
    if (targetType === 'ROLE' && !targetValue) {
      alert('Please select a role');
      return;
    }
    if (targetType === 'SPECIFIC') {
      const emails = specificEmailsRaw
        .split(/[;,]/g)
        .map((s) => s.trim())
        .filter(Boolean);
      if (!specificEmployeeIds.length && !emails.length) {
        alert('Please select at least one recipient');
        return;
      }
    }
    setStep('confirm');
  };

  const handleSubmit = async (action: 'SEND' | 'DRAFT') => {
    setLoading(true);
    try {
      const emails = specificEmailsRaw
        .split(/[;,]/g)
        .map((s) => s.trim())
        .filter(Boolean);
      const specificTargetValue =
        targetType === 'SPECIFIC'
          ? JSON.stringify({
              employeeIds: specificEmployeeIds,
              emails,
            })
          : null;

      const payload = {
        subject,
        content,
        attachments: attachments.length
          ? attachments.map(({ filename, contentType, contentBase64 }) => ({ filename, contentType, contentBase64 }))
          : undefined,
        targetType,
        targetValue: targetType === 'ALL' ? null : targetType === 'SPECIFIC' ? specificTargetValue : targetValue,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: action === 'SEND' ? (scheduledAt ? 'SCHEDULED' : 'DRAFT') : 'DRAFT'
      };

      const res = await api.post('/email-campaigns', payload);
      
      if (action === 'SEND' && !scheduledAt) {
        // Trigger immediate send
        await api.post(`/email-campaigns/${res.data.id}/send`);
      }

      onSuccess();
      onClose();
      // Reset
      setSubject('');
      setContent('');
      setTargetType('ALL');
      setTargetValue('');
      setSpecificEmployeeIds([]);
      setSpecificEmailsRaw('');
      setEmployeeQuery('');
      setAttachments([]);
      setScheduledAt('');
      setStep('compose');
    } catch (error) {
      const message =
        (error as any)?.response?.data?.message ||
        (error as any)?.message ||
        'Failed to save campaign';
      toast.error(String(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                  <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 dark:text-white">
                    {step === 'compose' ? 'New Email Campaign' : 'Confirm Campaign'}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {step === 'compose' ? (
                  <div className="space-y-4">
                     {/* Template Selection */}
                     <div className="flex justify-end mb-2">
                        <select
                          onChange={(e) => handleTemplateSelect(e.target.value)}
                          className="text-sm border-none bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors focus:ring-0"
                          defaultValue=""
                        >
                          <option value="" disabled>Load Template...</option>
                          {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                     </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">To</label>
                            <select
                              value={targetType}
                              onChange={(e) => setTargetType(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            >
                              <option value="ALL">All Employees</option>
                              <option value="DEPARTMENT">Specific Department</option>
                              <option value="ROLE">Specific Role</option>
                              <option value="SPECIFIC">Specific People</option>
                            </select>
                          </div>

                          {targetType === 'DEPARTMENT' && (
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Department</label>
                              <select
                                value={targetValue}
                                onChange={(e) => setTargetValue(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              >
                                <option value="">Select...</option>
                                {departments.map(dept => (
                                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {targetType === 'ROLE' && (
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Role</label>
                              <select
                                value={targetValue}
                                onChange={(e) => setTargetValue(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              >
                                <option value="">Select...</option>
                                {roles.map(r => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {targetType === 'SPECIFIC' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Recipients</label>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {specificEmployeeIds.length} selected
                              </div>
                            </div>
                            <input
                              type="text"
                              value={employeeQuery}
                              onChange={(e) => setEmployeeQuery(e.target.value)}
                              placeholder="Search employees…"
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                            <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                              {employees
                                .filter((emp) => {
                                  const q = employeeQuery.trim().toLowerCase();
                                  if (!q) return true;
                                  const hay = `${emp.firstName || ''} ${emp.lastName || ''} ${emp.email || ''} ${emp.badgeNumber || ''}`.toLowerCase();
                                  return hay.includes(q);
                                })
                                .slice(0, 200)
                                .map((emp) => {
                                  const id = String(emp.id);
                                  const checked = specificEmployeeIds.includes(id);
                                  const label = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email || id;
                                  return (
                                    <label
                                      key={id}
                                      className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-slate-800 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/40"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          setSpecificEmployeeIds((prev) => (checked ? prev.filter((x) => x !== id) : [...prev, id]));
                                        }}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                      />
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{label}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{emp.email || ''}</div>
                                      </div>
                                    </label>
                                  );
                                })}
                              {employees.length === 0 ? (
                                <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">No employees found</div>
                              ) : null}
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Emails (optional)</label>
                              <input
                                type="text"
                                value={specificEmailsRaw}
                                onChange={(e) => setSpecificEmailsRaw(e.target.value)}
                                placeholder="email1@company.com, email2@company.com"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                              />
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Separate multiple emails with commas.
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                          <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Email subject line"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Attachments (optional)</label>
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/70 transition-colors">
                              <Paperclip className="w-4 h-4" />
                              Add files
                              <input
                                type="file"
                                multiple
                                className="hidden"
                                onChange={async (e) => {
                                  const files = Array.from(e.target.files || []);
                                  e.target.value = '';
                                  const next: Array<{ filename: string; contentType: string; contentBase64: string; size: number }> = [];
                                  for (const f of files) {
                                    if (f.size > 10 * 1024 * 1024) {
                                      toast.error(`"${f.name}" is too large (max 10MB)`);
                                      continue;
                                    }
                                    const base64 = await new Promise<string>((resolve, reject) => {
                                      const reader = new FileReader();
                                      reader.onload = () => resolve(String(reader.result || ''));
                                      reader.onerror = () => reject(new Error('Failed to read file'));
                                      reader.readAsDataURL(f);
                                    });
                                    next.push({
                                      filename: f.name,
                                      contentType: f.type || 'application/octet-stream',
                                      contentBase64: base64,
                                      size: f.size,
                                    });
                                  }
                                  setAttachments((prev) => {
                                    const combined = [...prev, ...next];
                                    const seen = new Set<string>();
                                    return combined.filter((a) => {
                                      const key = `${a.filename}:${a.size}`;
                                      if (seen.has(key)) return false;
                                      seen.add(key);
                                      return true;
                                    });
                                  });
                                }}
                              />
                            </label>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Max 10MB each.
                            </div>
                          </div>
                          {attachments.length ? (
                            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-slate-800">
                              {attachments.map((a, idx) => (
                                <div key={`${a.filename}-${idx}`} className="flex items-center justify-between gap-3 px-4 py-2">
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.filename}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{Math.round(a.size / 1024)} KB</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                                    className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Schedule (Optional)</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                              type="datetime-local"
                              value={scheduledAt}
                              onChange={(e) => setScheduledAt(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
                        <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              document.execCommand('bold');
                              editorRef.current?.focus();
                            }}
                            className="p-2 rounded-lg hover:bg-white/70 dark:hover:bg-slate-700/40 text-gray-700 dark:text-gray-200"
                          >
                            <Bold className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              document.execCommand('italic');
                              editorRef.current?.focus();
                            }}
                            className="p-2 rounded-lg hover:bg-white/70 dark:hover:bg-slate-700/40 text-gray-700 dark:text-gray-200"
                          >
                            <Italic className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              document.execCommand('underline');
                              editorRef.current?.focus();
                            }}
                            className="p-2 rounded-lg hover:bg-white/70 dark:hover:bg-slate-700/40 text-gray-700 dark:text-gray-200"
                          >
                            <Underline className="w-4 h-4" />
                          </button>
                          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700" />
                          <button
                            type="button"
                            onClick={() => {
                              document.execCommand('insertUnorderedList');
                              editorRef.current?.focus();
                            }}
                            className="p-2 rounded-lg hover:bg-white/70 dark:hover:bg-slate-700/40 text-gray-700 dark:text-gray-200"
                          >
                            <List className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              document.execCommand('insertOrderedList');
                              editorRef.current?.focus();
                            }}
                            className="p-2 rounded-lg hover:bg-white/70 dark:hover:bg-slate-700/40 text-gray-700 dark:text-gray-200"
                          >
                            <ListOrdered className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt('Enter link URL:');
                              if (url) document.execCommand('createLink', false, url);
                              editorRef.current?.focus();
                            }}
                            className="p-2 rounded-lg hover:bg-white/70 dark:hover:bg-slate-700/40 text-gray-700 dark:text-gray-200"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700" />
                          <button
                            type="button"
                            onClick={() => {
                              document.execCommand('removeFormat');
                              editorRef.current?.focus();
                            }}
                            className="p-2 rounded-lg hover:bg-white/70 dark:hover:bg-slate-700/40 text-gray-700 dark:text-gray-200"
                          >
                            <Eraser className="w-4 h-4" />
                          </button>
                        </div>
                        <div
                          ref={editorRef}
                          contentEditable
                          onInput={() => setContent(editorRef.current?.innerHTML || '')}
                          className="min-h-[420px] w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                        />
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Sent from info@unitedlinkgroup.com. Replies go to info@unitedlinkgroup.com.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                     <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
                        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Confirm Campaign Details</h4>
                        <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
                           <p>
                             <span className="font-medium">To:</span>{' '}
                             {targetType === 'ALL'
                               ? 'All Employees'
                               : targetType === 'SPECIFIC'
                                 ? `Specific People (${specificEmployeeIds.length} selected${specificEmailsRaw.trim() ? ' + extra emails' : ''})`
                                 : `${targetType} - ${targetValue}`}
                           </p>
                           <p><span className="font-medium">Subject:</span> {subject}</p>
                           <p><span className="font-medium">Schedule:</span> {scheduledAt ? new Date(scheduledAt).toLocaleString() : 'Send Immediately'}</p>
                           <p><span className="font-medium">Attachments:</span> {attachments.length ? `${attachments.length} file(s)` : 'None'}</p>
                        </div>
                     </div>
                     <p className="text-gray-600 dark:text-gray-400">
                        Are you sure you want to {scheduledAt ? 'schedule' : 'send'} this campaign? This action cannot be undone.
                     </p>
                  </div>
                )}

                <div className="mt-8 flex justify-end gap-3">
                  {step === 'compose' ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveTemplate}
                        className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save as Template
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmit('DRAFT')}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        onClick={handleSendClick}
                        className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all hover:shadow-md"
                      >
                        Review & Send
                      </button>
                    </>
                  ) : (
                    <>
                       <button
                        type="button"
                        onClick={() => setStep('compose')}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmit('SEND')}
                        disabled={loading}
                        className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all hover:shadow-md flex items-center gap-2"
                      >
                        {loading ? 'Processing...' : (scheduledAt ? 'Schedule Campaign' : 'Send Now')}
                        {!loading && <Send className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
