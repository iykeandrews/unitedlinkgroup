'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import api from '../../lib/api';
import { useBusiness } from '../../context/business-context';
import { sanitizeHtml } from '../../lib/sanitize-html';
import 'react-quill-new/dist/quill.snow.css';

type FieldType = 'text' | 'textarea' | 'date' | 'checkbox';
type FieldDef = { id: string; label: string; type: FieldType; required: boolean };

interface Assignment {
  id: string;
  status: string;
  assignedAt: string;
  dueAt?: string | null;
  submittedAt?: string | null;
  values?: string | null;
  signatureName?: string | null;
  signatureData?: string | null;
  signedAt?: string | null;
  employee: { id: string; firstName: string; lastName: string; email?: string | null };
  business: { id: string; name: string; logoUrl?: string | null; address?: string | null; city?: string | null; state?: string | null; zip?: string | null; country?: string | null; mobile?: string | null };
  template: { id: string; type: string; title: string; description?: string | null; body?: string | null; fields?: string | null; fileUrl?: string | null; version?: string | null };
}

function safeParseFields(value: string | null | undefined): FieldDef[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((f: any) => ({
        id: String(f?.id || crypto.randomUUID()),
        label: String(f?.label || ''),
        type: (String(f?.type || 'text') as FieldType),
        required: !!f?.required,
      }))
      .filter((f: FieldDef) => !!f.label);
  } catch {
    return [];
  }
}

function safeParseValues(value: string | null | undefined): Record<string, any> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
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

export function EmployeeFormPrintView({ assignmentId }: { assignmentId: string }) {
  const { selectedBusiness } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<Assignment | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        try {
          const admin = await api.get(`/employee-forms/assignments/${assignmentId}`);
          setItem(admin.data);
          return;
        } catch {
          const mine = await api.get(`/employee-forms/my-assignments/${assignmentId}`);
          setItem(mine.data);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [assignmentId]);

  const fields = useMemo(() => safeParseFields(item?.template?.fields), [item?.template?.fields]);
  const values = useMemo(() => safeParseValues(item?.values), [item?.values]);
  const bodyHtml = useMemo(() => sanitizeHtml(item?.template?.body || ''), [item?.template?.body]);
  const business = item?.business || selectedBusiness;

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 px-8 py-8">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-white text-slate-900 px-8 py-8">
        <div className="text-slate-500">Document not found.</div>
      </div>
    );
  }

  const address = [business?.address, business?.city, business?.state, business?.zip, business?.country].filter(Boolean).join(', ');
  const employeeName = `${item.employee.firstName} ${item.employee.lastName}`.trim();
  const signedAt = item.signedAt ? new Date(item.signedAt) : null;
  const generatedAt = new Date();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <div className="font-semibold">Document</div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
        >
          Print / Save PDF
        </button>
      </div>

      <div className="px-10 py-8">
        <div className="flex items-start justify-between gap-8">
          <div className="flex items-start gap-4">
            {business?.logoUrl ? (
              <img src={business.logoUrl} alt="Logo" className="h-14 w-14 object-contain rounded" />
            ) : null}
            <div>
              <div className="text-2xl font-bold tracking-tight">{escapeText(business?.name || 'Business')}</div>
              {address ? <div className="text-sm text-slate-600 mt-1">{escapeText(address)}</div> : null}
              {business?.mobile ? <div className="text-sm text-slate-600 mt-1">{escapeText(business.mobile)}</div> : null}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">{escapeText(item.template.title)}</div>
            <div className="text-xs text-slate-500 mt-1">Generated {format(generatedAt, 'd MMM yyyy, HH:mm')}</div>
            {item.template.version ? <div className="text-xs text-slate-500 mt-1">Version {escapeText(item.template.version)}</div> : null}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
            <div className="text-sm font-semibold">Employee</div>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-500">Name</div>
              <div className="font-semibold">{escapeText(employeeName)}</div>
            </div>
            <div>
              <div className="text-slate-500">Email</div>
              <div className="font-semibold">{escapeText(item.employee.email || '')}</div>
            </div>
          </div>
        </div>

        {item.template.body ? (
          <div className="mt-6 rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
              <div className="text-sm font-semibold">Document</div>
            </div>
            <div className="px-5 py-4">
              <div className="ql-snow">
                <div className="ql-editor" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
              </div>
            </div>
          </div>
        ) : null}

        {item.template.fileUrl ? (
          <div className="mt-6 rounded-xl border border-slate-200 px-5 py-4">
            <div className="text-sm font-semibold">File</div>
            <div className="mt-2 text-sm text-slate-700 break-all">{escapeText(item.template.fileUrl)}</div>
          </div>
        ) : null}

        {fields.length > 0 && (
          <div className="mt-6 rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
              <div className="text-sm font-semibold">Responses</div>
            </div>
            <table className="w-full text-sm">
              <thead className="sr-only">
                <tr>
                  <th>Field</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {fields.map(f => {
                  const v = values[f.id];
                  const rendered = f.type === 'checkbox' ? (v ? 'Yes' : 'No') : String(v ?? '');
                  return (
                    <tr key={f.id} className="border-t border-slate-100">
                      <td className="px-5 py-3 w-[40%] font-semibold text-slate-800">{escapeText(f.label)}</td>
                      <td className="px-5 py-3 text-slate-700">{escapeText(rendered)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
            <div className="text-sm font-semibold">Signature</div>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-500">Signed by</div>
              <div className="font-semibold">{escapeText(item.signatureName || '')}</div>
            </div>
            <div>
              <div className="text-slate-500">Signed at</div>
              <div className="font-semibold">{signedAt ? format(signedAt, 'd MMM yyyy, HH:mm') : ''}</div>
            </div>
            {item.signatureData ? (
              <div className="md:col-span-2">
                <div className="text-slate-500">Signature</div>
                <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
                  <img src={item.signatureData} alt="Signature" className="h-20 w-full object-contain" />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-500">
          This document was generated by the United Link Group platform.
        </div>
      </div>
    </div>
  );
}
