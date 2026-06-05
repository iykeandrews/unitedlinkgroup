"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeFormFill = EmployeeFormFill;
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
const api_1 = __importDefault(require("../../lib/api"));
const business_context_1 = require("../../context/business-context");
const Modal_1 = require("../Modal");
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
function EmployeeFormFill({ assignmentId }) {
    var _a, _b;
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [item, setItem] = (0, react_1.useState)(null);
    const [values, setValues] = (0, react_1.useState)({});
    const [signatureName, setSignatureName] = (0, react_1.useState)('');
    const [signatureData, setSignatureData] = (0, react_1.useState)('');
    const [agree, setAgree] = (0, react_1.useState)(false);
    const load = (0, react_1.useCallback)(async () => {
        var _a, _b;
        setLoading(true);
        try {
            const res = await api_1.default.get(`/employee-forms/my-assignments/${assignmentId}`);
            const a = res.data;
            setItem(a);
            const initial = safeParseValues(a.values);
            setValues(initial);
            setSignatureName(a.signatureName || `${a.employee.firstName} ${a.employee.lastName}`.trim());
            setSignatureData(String(a.signatureData || ''));
            setAgree(false);
        }
        catch (error) {
            const msg = ((_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to load form';
            sonner_1.toast.error(msg);
            setItem(null);
        }
        finally {
            setLoading(false);
        }
    }, [assignmentId]);
    (0, react_1.useEffect)(() => {
        load();
    }, [load]);
    const fields = (0, react_1.useMemo)(() => { var _a; return safeParseFields((_a = item === null || item === void 0 ? void 0 : item.template) === null || _a === void 0 ? void 0 : _a.fields); }, [(_a = item === null || item === void 0 ? void 0 : item.template) === null || _a === void 0 ? void 0 : _a.fields]);
    const bodyHtml = (0, react_1.useMemo)(() => { var _a; return (0, sanitize_html_1.sanitizeHtml)(((_a = item === null || item === void 0 ? void 0 : item.template) === null || _a === void 0 ? void 0 : _a.body) || ''); }, [(_b = item === null || item === void 0 ? void 0 : item.template) === null || _b === void 0 ? void 0 : _b.body]);
    const business = (item === null || item === void 0 ? void 0 : item.business) || selectedBusiness;
    const submit = async () => {
        var _a, _b;
        if (!item)
            return;
        if (!signatureName.trim()) {
            sonner_1.toast.error('Signature name is required');
            return;
        }
        if (!signatureData) {
            sonner_1.toast.error('Signature is required');
            return;
        }
        if (!agree) {
            sonner_1.toast.error('Please confirm and sign before submitting');
            return;
        }
        for (const f of fields) {
            if (!f.required)
                continue;
            const v = values[f.id];
            if (f.type === 'checkbox') {
                if (!v) {
                    sonner_1.toast.error(`${f.label} is required`);
                    return;
                }
            }
            else if (!String(v !== null && v !== void 0 ? v : '').trim()) {
                sonner_1.toast.error(`${f.label} is required`);
                return;
            }
        }
        setSaving(true);
        try {
            await api_1.default.post(`/employee-forms/my-assignments/${item.id}/submit`, {
                values: JSON.stringify(values),
                signatureData,
                signatureName: signatureName.trim(),
            });
            sonner_1.toast.success('Submitted');
            load();
        }
        catch (error) {
            const msg = ((_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Submit failed';
            sonner_1.toast.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    if (loading) {
        return (<div className="py-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-slate-500">
          Loading…
        </div>
      </div>);
    }
    if (!item) {
        return (<div className="py-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-slate-500">
          Form not found.
        </div>
      </div>);
    }
    const isSubmitted = item.status === 'SUBMITTED';
    const isSop = item.template.type === 'SOP';
    return (<div className="py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{item.template.title}</h1>
            <div className="text-slate-500 dark:text-slate-400 mt-1">
              {item.template.type === 'SOP' ? 'SOP acknowledgement' : 'Employment form'}
              {item.template.version ? ` • v${item.template.version}` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSubmitted && (<link_1.default href={`/dashboard/forms/${item.id}/print`} target="_blank" className="px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                Print / Save PDF
              </link_1.default>)}
            <link_1.default href="/dashboard/forms" className="px-3 py-2 text-sm font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white">
              Back
            </link_1.default>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <Letterhead business={business}/>
          </div>

          <div className="p-6 space-y-6">
            {item.template.description ? (<div className="text-sm text-slate-600 dark:text-slate-300">{item.template.description}</div>) : null}

            {item.template.fileUrl ? (<div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-4 py-3">
                <div className="flex items-center gap-3">
                  <lucide_react_1.FileText className="w-5 h-5 text-slate-600 dark:text-slate-300"/>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">File</div>
                    <div className="text-xs text-slate-500 break-all">{item.template.fileUrl}</div>
                  </div>
                </div>
                <button type="button" onClick={() => window.open(item.template.fileUrl, '_blank', 'noopener,noreferrer')} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold">
                  <lucide_react_1.ExternalLink className="w-4 h-4"/>
                  Open
                </button>
              </div>) : null}

            {item.template.body ? (<div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
                <div className="ql-snow">
                  <div className="ql-editor" dangerouslySetInnerHTML={{ __html: bodyHtml }}/>
                </div>
              </div>) : null}

            {!isSop && fields.length > 0 && (<div className="space-y-4">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Fill out</div>
                {fields.map(f => {
                var _a, _b, _c;
                return (<div key={f.id}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      {f.label}{f.required ? ' *' : ''}
                    </label>
                    {f.type === 'textarea' ? (<textarea value={String((_a = values[f.id]) !== null && _a !== void 0 ? _a : '')} onChange={(e) => setValues(prev => ({ ...prev, [f.id]: e.target.value }))} rows={4} disabled={isSubmitted} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"/>) : f.type === 'date' ? (<input type="date" value={String((_b = values[f.id]) !== null && _b !== void 0 ? _b : '')} onChange={(e) => setValues(prev => ({ ...prev, [f.id]: e.target.value }))} disabled={isSubmitted} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"/>) : f.type === 'checkbox' ? (<label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <input type="checkbox" checked={!!values[f.id]} onChange={(e) => setValues(prev => ({ ...prev, [f.id]: e.target.checked }))} disabled={isSubmitted} className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"/>
                        Confirm
                      </label>) : (<input value={String((_c = values[f.id]) !== null && _c !== void 0 ? _c : '')} onChange={(e) => setValues(prev => ({ ...prev, [f.id]: e.target.value }))} disabled={isSubmitted} className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"/>)}
                  </div>);
            })}
              </div>)}

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 bg-slate-50 dark:bg-slate-900/40">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Signature</div>
              <div className="text-xs text-slate-500 mt-1">
                By signing, you confirm the information provided is accurate.
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Full name</label>
                  <input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} disabled={isSubmitted} className="mt-1 w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Date</label>
                  <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                    {isSubmitted && item.signedAt ? (0, date_fns_1.format)(new Date(item.signedAt), 'd MMM yyyy, HH:mm') : (0, date_fns_1.format)(new Date(), 'd MMM yyyy')}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Draw signature</div>
                <div className="mt-2">
                  <SignaturePad value={signatureData} onChange={setSignatureData} disabled={isSubmitted}/>
                </div>
              </div>

              {!isSubmitted && (<label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"/>
                  {isSop ? 'I acknowledge I have read and understood this SOP and I sign to confirm' : 'I confirm and sign this document'}
                </label>)}

              <div className="mt-5 flex items-center justify-end">
                {isSubmitted ? (<div className="text-sm font-semibold text-green-700 dark:text-green-300">
                    Submitted {item.submittedAt ? (0, date_fns_1.format)(new Date(item.submittedAt), 'd MMM yyyy') : ''}
                  </div>) : (<Modal_1.ModalActionButton kind="submit" onClick={() => submit()} disabled={saving}>
                    {saving ? 'Submitting…' : 'Submit'}
                  </Modal_1.ModalActionButton>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
function SignaturePad({ value, onChange, disabled }) {
    const canvasRef = (0, react_1.useRef)(null);
    const drawingRef = (0, react_1.useRef)(false);
    const lastRef = (0, react_1.useRef)(null);
    const initCanvas = (0, react_1.useCallback)(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));
        canvas.width = Math.floor(w * ratio);
        canvas.height = Math.floor(h * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#111827';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
    }, []);
    const drawFromValue = (0, react_1.useCallback)(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
        if (!value)
            return;
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = value;
    }, [value]);
    (0, react_1.useEffect)(() => {
        initCanvas();
        drawFromValue();
    }, [drawFromValue, initCanvas]);
    const getPoint = (e) => {
        const canvas = canvasRef.current;
        if (!canvas)
            return null;
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onPointerDown = (e) => {
        if (disabled)
            return;
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        canvas.setPointerCapture(e.pointerId);
        drawingRef.current = true;
        lastRef.current = getPoint(e);
    };
    const onPointerMove = (e) => {
        if (disabled)
            return;
        if (!drawingRef.current)
            return;
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        const p = getPoint(e);
        const last = lastRef.current;
        if (!p || !last)
            return;
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        lastRef.current = p;
    };
    const commit = (e) => {
        if (disabled)
            return;
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        drawingRef.current = false;
        lastRef.current = null;
        const dataUrl = canvas.toDataURL('image/png');
        onChange(dataUrl);
        try {
            canvas.releasePointerCapture(e.pointerId);
        }
        catch { }
    };
    const clear = () => {
        if (disabled)
            return;
        onChange('');
        initCanvas();
    };
    return (<div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
          Signature pad
        </div>
        <button type="button" onClick={clear} disabled={disabled} className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-60">
          Clear
        </button>
      </div>
      <div className="p-3">
        <canvas ref={canvasRef} className={`w-full h-[140px] rounded-lg bg-white ${disabled ? 'opacity-80' : 'cursor-crosshair'}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={commit} onPointerCancel={commit}/>
      </div>
    </div>);
}
function Letterhead({ business }) {
    const name = (business === null || business === void 0 ? void 0 : business.name) || 'Business';
    const lines = [];
    const address = [business === null || business === void 0 ? void 0 : business.address, business === null || business === void 0 ? void 0 : business.city, business === null || business === void 0 ? void 0 : business.state, business === null || business === void 0 ? void 0 : business.zip, business === null || business === void 0 ? void 0 : business.country].filter(Boolean).join(', ');
    if (address)
        lines.push(address);
    const contact = [business === null || business === void 0 ? void 0 : business.mobile].filter(Boolean).join(' • ');
    if (contact)
        lines.push(contact);
    return (<div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <div className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{name}</div>
        {lines.map((l, idx) => (<div key={idx} className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {l}
          </div>))}
      </div>
      <div className="text-right">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Employment Document</div>
      </div>
    </div>);
}
