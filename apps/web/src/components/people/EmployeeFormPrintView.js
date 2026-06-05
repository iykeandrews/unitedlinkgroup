"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeFormPrintView = EmployeeFormPrintView;
const react_1 = require("react");
const date_fns_1 = require("date-fns");
const api_1 = __importDefault(require("../../lib/api"));
const business_context_1 = require("../../context/business-context");
const sanitize_html_1 = require("../../lib/sanitize-html");
require("react-quill-new/dist/quill.snow.css");
function safeParseFields(value) {
    if (!value)
        return [];
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed))
            return [];
        return parsed
            .map((f) => ({
            id: String((f === null || f === void 0 ? void 0 : f.id) || crypto.randomUUID()),
            label: String((f === null || f === void 0 ? void 0 : f.label) || ''),
            type: String((f === null || f === void 0 ? void 0 : f.type) || 'text'),
            required: !!(f === null || f === void 0 ? void 0 : f.required),
        }))
            .filter((f) => !!f.label);
    }
    catch {
        return [];
    }
}
function safeParseValues(value) {
    if (!value)
        return {};
    try {
        const parsed = JSON.parse(value);
        if (!parsed || typeof parsed !== 'object')
            return {};
        return parsed;
    }
    catch {
        return {};
    }
}
function escapeText(v) {
    return String(v !== null && v !== void 0 ? v : '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
function EmployeeFormPrintView({ assignmentId }) {
    var _a, _b;
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [item, setItem] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const load = async () => {
            setLoading(true);
            try {
                try {
                    const admin = await api_1.default.get(`/employee-forms/assignments/${assignmentId}`);
                    setItem(admin.data);
                    return;
                }
                catch {
                    const mine = await api_1.default.get(`/employee-forms/my-assignments/${assignmentId}`);
                    setItem(mine.data);
                }
            }
            finally {
                setLoading(false);
            }
        };
        load();
    }, [assignmentId]);
    const fields = (0, react_1.useMemo)(() => { var _a; return safeParseFields((_a = item === null || item === void 0 ? void 0 : item.template) === null || _a === void 0 ? void 0 : _a.fields); }, [(_a = item === null || item === void 0 ? void 0 : item.template) === null || _a === void 0 ? void 0 : _a.fields]);
    const values = (0, react_1.useMemo)(() => safeParseValues(item === null || item === void 0 ? void 0 : item.values), [item === null || item === void 0 ? void 0 : item.values]);
    const bodyHtml = (0, react_1.useMemo)(() => { var _a; return (0, sanitize_html_1.sanitizeHtml)(((_a = item === null || item === void 0 ? void 0 : item.template) === null || _a === void 0 ? void 0 : _a.body) || ''); }, [(_b = item === null || item === void 0 ? void 0 : item.template) === null || _b === void 0 ? void 0 : _b.body]);
    const business = (item === null || item === void 0 ? void 0 : item.business) || selectedBusiness;
    if (loading) {
        return (<div className="min-h-screen bg-white text-slate-900 px-8 py-8">
        <div className="text-slate-500">Loading…</div>
      </div>);
    }
    if (!item) {
        return (<div className="min-h-screen bg-white text-slate-900 px-8 py-8">
        <div className="text-slate-500">Document not found.</div>
      </div>);
    }
    const address = [business === null || business === void 0 ? void 0 : business.address, business === null || business === void 0 ? void 0 : business.city, business === null || business === void 0 ? void 0 : business.state, business === null || business === void 0 ? void 0 : business.zip, business === null || business === void 0 ? void 0 : business.country].filter(Boolean).join(', ');
    const employeeName = `${item.employee.firstName} ${item.employee.lastName}`.trim();
    const signedAt = item.signedAt ? new Date(item.signedAt) : null;
    const generatedAt = new Date();
    return (<div className="min-h-screen bg-white text-slate-900">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <div className="font-semibold">Document</div>
        <button type="button" onClick={() => window.print()} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">
          Print / Save PDF
        </button>
      </div>

      <div className="px-10 py-8">
        <div className="flex items-start justify-between gap-8">
          <div className="flex items-start gap-4">
            {(business === null || business === void 0 ? void 0 : business.logoUrl) ? (<img src={business.logoUrl} alt="Logo" className="h-14 w-14 object-contain rounded"/>) : null}
            <div>
              <div className="text-2xl font-bold tracking-tight">{escapeText((business === null || business === void 0 ? void 0 : business.name) || 'Business')}</div>
              {address ? <div className="text-sm text-slate-600 mt-1">{escapeText(address)}</div> : null}
              {(business === null || business === void 0 ? void 0 : business.mobile) ? <div className="text-sm text-slate-600 mt-1">{escapeText(business.mobile)}</div> : null}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">{escapeText(item.template.title)}</div>
            <div className="text-xs text-slate-500 mt-1">Generated {(0, date_fns_1.format)(generatedAt, 'd MMM yyyy, HH:mm')}</div>
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

        {item.template.body ? (<div className="mt-6 rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
              <div className="text-sm font-semibold">Document</div>
            </div>
            <div className="px-5 py-4">
              <div className="ql-snow">
                <div className="ql-editor" dangerouslySetInnerHTML={{ __html: bodyHtml }}/>
              </div>
            </div>
          </div>) : null}

        {item.template.fileUrl ? (<div className="mt-6 rounded-xl border border-slate-200 px-5 py-4">
            <div className="text-sm font-semibold">File</div>
            <div className="mt-2 text-sm text-slate-700 break-all">{escapeText(item.template.fileUrl)}</div>
          </div>) : null}

        {fields.length > 0 && (<div className="mt-6 rounded-xl border border-slate-200 overflow-hidden">
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
                const rendered = f.type === 'checkbox' ? (v ? 'Yes' : 'No') : String(v !== null && v !== void 0 ? v : '');
                return (<tr key={f.id} className="border-t border-slate-100">
                      <td className="px-5 py-3 w-[40%] font-semibold text-slate-800">{escapeText(f.label)}</td>
                      <td className="px-5 py-3 text-slate-700">{escapeText(rendered)}</td>
                    </tr>);
            })}
              </tbody>
            </table>
          </div>)}

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
              <div className="font-semibold">{signedAt ? (0, date_fns_1.format)(signedAt, 'd MMM yyyy, HH:mm') : ''}</div>
            </div>
            {item.signatureData ? (<div className="md:col-span-2">
                <div className="text-slate-500">Signature</div>
                <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
                  <img src={item.signatureData} alt="Signature" className="h-20 w-full object-contain"/>
                </div>
              </div>) : null}
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-500">
          This document was generated by the United Link Group platform.
        </div>
      </div>
    </div>);
}
