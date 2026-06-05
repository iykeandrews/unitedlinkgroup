"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = IncidentModal;
const react_1 = __importStar(require("react"));
const Modal_1 = require("../Modal");
const api_1 = __importDefault(require("../../lib/api"));
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
const types_1 = require("@unitedlinkgroup/types");
const INCIDENT_TYPES = [
    { value: 'THEFT', label: 'Theft' },
    { value: 'SUSPICIOUS_ACTIVITY', label: 'Suspicious Activity' },
    { value: 'UNAUTHORIZED_ACCESS', label: 'Unauthorized Access' },
    { value: 'ASSAULT', label: 'Assault' },
    { value: 'VANDALISM', label: 'Vandalism' },
    { value: 'FIRE', label: 'Fire' },
    { value: 'MEDICAL_EMERGENCY', label: 'Medical Emergency' },
    { value: 'EQUIPMENT_DAMAGE', label: 'Equipment Damage' },
    { value: 'TRESPASSING', label: 'Trespassing' },
    { value: 'OTHER', label: 'Other' },
];
const SEVERITIES = [
    { value: 'LOW', label: 'Low' },
    { value: 'MODERATE', label: 'Moderate' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' },
];
const STATUSES = [
    { value: 'REPORTED', label: 'Reported' },
    { value: 'UNDER_INVESTIGATION', label: 'Under Investigation' },
    { value: 'ESCALATED', label: 'Escalated' },
    { value: 'RESOLVED', label: 'Resolved' },
];
const SHIFTS = [
    { value: 'MORNING', label: 'Morning' },
    { value: 'AFTERNOON', label: 'Afternoon' },
    { value: 'NIGHT', label: 'Night' },
];
const RESPONSE_ACTIONS = [
    { value: 'VERBAL_WARNING', label: 'Verbal Warning' },
    { value: 'SUSPECT_ESCORTED_OUT', label: 'Suspect Escorted Out' },
    { value: 'ARREST_MADE', label: 'Arrest Made' },
    { value: 'POLICE_NOTIFIED', label: 'Police Notified' },
    { value: 'MEDICAL_ASSISTANCE_PROVIDED', label: 'Medical Assistance Provided' },
    { value: 'AREA_SECURED', label: 'Area Secured' },
    { value: 'INVESTIGATION_STARTED', label: 'Investigation Started' },
];
const EVIDENCE_TYPES = [
    { value: 'PHOTO', label: 'Photo' },
    { value: 'VIDEO', label: 'Video' },
    { value: 'DOCUMENT', label: 'Document' },
    { value: 'AUDIO', label: 'Audio Recording' },
    { value: 'NONE', label: 'None' },
];
function IncidentModal({ isOpen, onClose, onSuccess, initialData }) {
    const [locations, setLocations] = (0, react_1.useState)([]);
    const [profile, setProfile] = (0, react_1.useState)(null);
    const [meEmployee, setMeEmployee] = (0, react_1.useState)(null);
    const [employees, setEmployees] = (0, react_1.useState)([]);
    const [gps, setGps] = (0, react_1.useState)({});
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [files, setFiles] = (0, react_1.useState)([]);
    const [form, setForm] = (0, react_1.useState)(() => {
        const now = new Date();
        const incidentDate = now.toISOString().slice(0, 10);
        const incidentTime = now.toTimeString().slice(0, 5);
        return {
            reportingOfficerEmployeeId: '',
            assignedSupervisorId: '',
            locationId: '',
            buildingArea: 'Main Entrance',
            buildingAreaOther: '',
            shift: 'MORNING',
            incidentDate,
            incidentTime,
            type: 'SUSPICIOUS_ACTIVITY',
            severity: 'LOW',
            status: 'REPORTED',
            responseAction: 'INVESTIGATION_STARTED',
            witnessPresent: false,
            lawEnforcementInvolved: false,
            evidenceCollected: ['NONE'],
            title: '',
            narrative: '',
            persons: [{ role: 'WITNESS', name: '', contactInfo: '' }],
        };
    });
    const canSubmitOnBehalf = (0, react_1.useMemo)(() => {
        const role = profile === null || profile === void 0 ? void 0 : profile.role;
        return role === types_1.UserRole.SUPER_ADMIN || role === types_1.UserRole.BUSINESS_ADMIN || role === types_1.UserRole.MANAGER;
    }, [profile === null || profile === void 0 ? void 0 : profile.role]);
    const officerOptions = (0, react_1.useMemo)(() => {
        return employees
            .filter((e) => e.status === 'ACTIVE' && (e.role === 'SECURITY_OFFICER' || e.role === 'EMPLOYEE'))
            .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''));
    }, [employees]);
    const supervisorOptions = (0, react_1.useMemo)(() => {
        return employees
            .filter((e) => e.status === 'ACTIVE' && (e.role === 'MANAGER' || e.role === 'BUSINESS_ADMIN'))
            .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''));
    }, [employees]);
    (0, react_1.useEffect)(() => {
        if (!isOpen)
            return;
        const load = async () => {
            try {
                const [locRes, profileRes] = await Promise.all([api_1.default.get('/locations'), api_1.default.get('/auth/profile')]);
                setLocations(locRes.data || []);
                setProfile(profileRes.data || null);
            }
            catch {
                setLocations([]);
                setProfile(null);
            }
        };
        load();
    }, [isOpen]);
    (0, react_1.useEffect)(() => {
        if (!isOpen)
            return;
        const loadEmployees = async () => {
            if (!canSubmitOnBehalf)
                return;
            try {
                const res = await api_1.default.get('/employees?status=ACTIVE');
                setEmployees(res.data || []);
            }
            catch {
                setEmployees([]);
            }
        };
        loadEmployees();
    }, [isOpen, canSubmitOnBehalf]);
    (0, react_1.useEffect)(() => {
        if (!isOpen)
            return;
        const loadMe = async () => {
            try {
                const res = await api_1.default.get('/employees/me');
                setMeEmployee(res.data || null);
            }
            catch {
                setMeEmployee(null);
            }
        };
        loadMe();
    }, [isOpen]);
    (0, react_1.useEffect)(() => {
        if (!isOpen)
            return;
        if (typeof navigator === 'undefined' || !navigator.geolocation)
            return;
        navigator.geolocation.getCurrentPosition((pos) => setGps({ geoLat: pos.coords.latitude, geoLng: pos.coords.longitude }), () => setGps({}), { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 });
    }, [isOpen]);
    (0, react_1.useEffect)(() => {
        if (!isOpen)
            return;
        if (!initialData) {
            setFiles([]);
            setForm((prev) => {
                const locationId = (meEmployee === null || meEmployee === void 0 ? void 0 : meEmployee.defaultLocationId) ? String(meEmployee.defaultLocationId) : prev.locationId;
                const reportingOfficerEmployeeId = canSubmitOnBehalf ? prev.reportingOfficerEmployeeId : ((meEmployee === null || meEmployee === void 0 ? void 0 : meEmployee.id) || '');
                return { ...prev, locationId, reportingOfficerEmployeeId };
            });
            return;
        }
        const date = initialData.date ? new Date(initialData.date) : new Date();
        const incidentDate = date.toISOString().slice(0, 10);
        const incidentTime = date.toTimeString().slice(0, 5);
        let evidenceCollected = ['NONE'];
        try {
            if (typeof initialData.evidenceCollected === 'string') {
                const parsed = JSON.parse(initialData.evidenceCollected);
                if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string'))
                    evidenceCollected = parsed;
            }
        }
        catch { }
        setFiles([]);
        setForm({
            reportingOfficerEmployeeId: initialData.reportingOfficerEmployeeId || '',
            assignedSupervisorId: initialData.assignedSupervisorId || '',
            locationId: initialData.locationId || '',
            buildingArea: initialData.buildingArea || 'Main Entrance',
            buildingAreaOther: '',
            shift: initialData.shift || 'MORNING',
            incidentDate,
            incidentTime,
            type: initialData.type || 'SUSPICIOUS_ACTIVITY',
            severity: initialData.severity || 'LOW',
            status: initialData.status || 'REPORTED',
            responseAction: initialData.responseAction || 'INVESTIGATION_STARTED',
            witnessPresent: Boolean(initialData.witnessPresent),
            lawEnforcementInvolved: Boolean(initialData.lawEnforcementInvolved),
            evidenceCollected,
            title: initialData.title || '',
            narrative: initialData.description || '',
            persons: Array.isArray(initialData.persons) && initialData.persons.length
                ? initialData.persons.map((p) => ({ role: p.role || 'OTHER', name: p.name || '', contactInfo: p.contactInfo || '' }))
                : [{ role: 'WITNESS', name: '', contactInfo: '' }],
        });
    }, [isOpen, initialData, meEmployee === null || meEmployee === void 0 ? void 0 : meEmployee.id, meEmployee === null || meEmployee === void 0 ? void 0 : meEmployee.defaultLocationId, canSubmitOnBehalf]);
    const buildingAreaValue = form.buildingArea === 'OTHER' ? form.buildingAreaOther : form.buildingArea;
    const reportingOfficerLabel = (0, react_1.useMemo)(() => {
        if (canSubmitOnBehalf) {
            const match = officerOptions.find((e) => e.id === form.reportingOfficerEmployeeId);
            if (!match)
                return '';
            const badge = match.badgeNumber ? `Badge #${match.badgeNumber}` : `ID ${match.id.slice(0, 8)}`;
            return `${match.firstName} ${match.lastName} — ${badge}`;
        }
        if (!meEmployee)
            return '';
        const badge = meEmployee.badgeNumber ? `Badge #${meEmployee.badgeNumber}` : `ID ${meEmployee.id.slice(0, 8)}`;
        return `${meEmployee.firstName} ${meEmployee.lastName} — ${badge}`;
    }, [canSubmitOnBehalf, officerOptions, form.reportingOfficerEmployeeId, meEmployee]);
    const deviceInfo = (0, react_1.useMemo)(() => {
        if (typeof navigator === 'undefined')
            return '';
        return JSON.stringify({
            userAgent: navigator.userAgent || null,
            platform: navigator.platform || null,
            language: navigator.language || null,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        });
    }, []);
    const suggestedTitle = (0, react_1.useMemo)(() => {
        var _a, _b;
        const typeLabel = ((_a = INCIDENT_TYPES.find((t) => t.value === form.type)) === null || _a === void 0 ? void 0 : _a.label) || form.type;
        const locLabel = ((_b = locations.find((l) => l.id === form.locationId)) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown Site';
        return `${typeLabel} @ ${locLabel}`;
    }, [form.type, form.locationId, locations]);
    const submit = async (e) => {
        var _a, _b, _c, _d;
        e.preventDefault();
        const dt = new Date(`${form.incidentDate}T${form.incidentTime}:00`);
        if (Number.isNaN(dt.getTime())) {
            sonner_1.toast.error('Invalid incident date/time');
            return;
        }
        if (canSubmitOnBehalf && !form.reportingOfficerEmployeeId) {
            sonner_1.toast.error('Select a reporting officer');
            return;
        }
        const payload = {
            title: (form.title || suggestedTitle).trim(),
            type: form.type,
            severity: form.severity,
            status: form.status,
            shift: form.shift,
            buildingArea: buildingAreaValue || undefined,
            locationId: form.locationId || undefined,
            incidentAt: dt.toISOString(),
            responseAction: form.responseAction,
            witnessPresent: form.witnessPresent,
            lawEnforcementInvolved: form.lawEnforcementInvolved,
            evidenceCollected: form.evidenceCollected.includes('NONE') ? ['NONE'] : form.evidenceCollected,
            reportingOfficerEmployeeId: canSubmitOnBehalf ? form.reportingOfficerEmployeeId : undefined,
            assignedSupervisorId: form.assignedSupervisorId || undefined,
            persons: form.persons.filter((p) => p.name.trim().length > 0),
            description: form.narrative,
            deviceInfo,
            ...gps,
        };
        setLoading(true);
        try {
            let incidentId;
            if (initialData === null || initialData === void 0 ? void 0 : initialData.id) {
                const res = await api_1.default.patch(`/incident-reports/${initialData.id}`, payload);
                incidentId = ((_a = res.data) === null || _a === void 0 ? void 0 : _a.id) || initialData.id;
            }
            else {
                const res = await api_1.default.post('/incident-reports', payload);
                incidentId = (_b = res.data) === null || _b === void 0 ? void 0 : _b.id;
            }
            if (incidentId && files.length) {
                for (const f of files) {
                    const fd = new FormData();
                    fd.append('file', f);
                    try {
                        await api_1.default.post(`/incident-reports/${incidentId}/evidence`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                    }
                    catch {
                        sonner_1.toast.error(`Failed to upload: ${f.name}`);
                    }
                }
            }
            sonner_1.toast.success(initialData ? 'Incident report updated' : 'Incident report submitted');
            onSuccess();
            onClose();
        }
        catch (err) {
            const message = ((_d = (_c = err === null || err === void 0 ? void 0 : err.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || 'Failed to save incident report';
            sonner_1.toast.error(message);
        }
        finally {
            setLoading(false);
            setFiles([]);
        }
    };
    const toggleEvidence = (value) => {
        setForm((prev) => {
            const next = new Set(prev.evidenceCollected);
            if (value === 'NONE') {
                return { ...prev, evidenceCollected: ['NONE'] };
            }
            next.delete('NONE');
            if (next.has(value))
                next.delete(value);
            else
                next.add(value);
            return { ...prev, evidenceCollected: Array.from(next) };
        });
    };
    const addPerson = () => setForm((prev) => ({ ...prev, persons: [...prev.persons, { role: 'WITNESS', name: '', contactInfo: '' }] }));
    const removePerson = (idx) => setForm((prev) => ({ ...prev, persons: prev.persons.filter((_, i) => i !== idx) }));
    return (<Modal_1.Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Incident Report' : 'New Incident Report'} maxWidth="max-w-6xl" className="h-[70vh]" bodyClassName="p-0 overflow-hidden">
      <form onSubmit={submit} className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wider text-slate-500">Officer Accountability</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white break-words">{reportingOfficerLabel || '—'}</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <lucide_react_1.Clock className="h-4 w-4"/>
                  <span>{new Date().toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Reporting Officer
                  </label>
                  {canSubmitOnBehalf ? (<select className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={form.reportingOfficerEmployeeId} onChange={(e) => setForm((p) => ({ ...p, reportingOfficerEmployeeId: e.target.value }))}>
                      <option value="">Select active officer…</option>
                      {officerOptions.map((o) => {
                const badge = o.badgeNumber ? `Badge #${o.badgeNumber}` : `ID ${o.id.slice(0, 8)}`;
                return (<option key={o.id} value={o.id}>
                            {o.firstName} {o.lastName} — {badge}
                          </option>);
            })}
                    </select>) : (<div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                      {reportingOfficerLabel || 'Signed in user'}
                    </div>)}
                </div>

                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Supervisor
                  </label>
                  <select className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={form.assignedSupervisorId} onChange={(e) => setForm((p) => ({ ...p, assignedSupervisorId: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {supervisorOptions.map((s) => {
            const badge = s.badgeNumber ? `Badge #${s.badgeNumber}` : `ID ${s.id.slice(0, 8)}`;
            return (<option key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} — {badge}
                        </option>);
        })}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <lucide_react_1.Shield className="h-4 w-4 text-slate-500"/>
                Incident Details
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Incident Type</label>
                  <select className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                    {INCIDENT_TYPES.map((t) => (<option key={t.value} value={t.value}>
                        {t.label}
                      </option>))}
                  </select>
                </div>

                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Severity</label>
                  <select className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={form.severity} onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))}>
                    {SEVERITIES.map((s) => (<option key={s.value} value={s.value}>
                        {s.label}
                      </option>))}
                  </select>
                </div>

                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                    {STATUSES.map((s) => (<option key={s.value} value={s.value}>
                        {s.label}
                      </option>))}
                  </select>
                </div>

                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shift</label>
                  <select className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={form.shift} onChange={(e) => setForm((p) => ({ ...p, shift: e.target.value }))}>
                    {SHIFTS.map((s) => (<option key={s.value} value={s.value}>
                        {s.label}
                      </option>))}
                  </select>
                </div>

                <div className="min-w-0 sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location / Site</label>
                  <div className="relative">
                    <lucide_react_1.MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
                    <select className="pl-9 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={form.locationId} onChange={(e) => setForm((p) => ({ ...p, locationId: e.target.value }))}>
                      <option value="">Select site…</option>
                      {locations.map((l) => (<option key={l.id} value={l.id}>
                          {l.name}
                        </option>))}
                    </select>
                  </div>
                </div>

                <div className="min-w-0 sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Building / Area</label>
                  <select className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={form.buildingArea} onChange={(e) => setForm((p) => ({ ...p, buildingArea: e.target.value }))}>
                    {['Main Entrance', 'Lobby', 'Loading Dock', 'Parking Garage', 'Perimeter', 'Stairwell', 'Elevator', 'Office Floor', 'Rooftop', 'OTHER'].map((a) => (<option key={a} value={a}>
                        {a === 'OTHER' ? 'Other…' : a}
                      </option>))}
                  </select>
                  {form.buildingArea === 'OTHER' && (<input type="text" value={form.buildingAreaOther} onChange={(e) => setForm((p) => ({ ...p, buildingAreaOther: e.target.value }))} className="mt-3 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Specify area"/>)}
                </div>

                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Incident Date</label>
                  <div className="relative">
                    <lucide_react_1.Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
                    <input type="date" required className="pl-9 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={form.incidentDate} onChange={(e) => setForm((p) => ({ ...p, incidentDate: e.target.value }))}/>
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Incident Time</label>
                  <div className="relative">
                    <lucide_react_1.Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
                    <input type="time" required className="pl-9 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={form.incidentTime} onChange={(e) => setForm((p) => ({ ...p, incidentTime: e.target.value }))}/>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <lucide_react_1.AlertTriangle className="h-4 w-4 text-slate-500"/>
                Response & Evidence
              </div>
              <div className="mt-5 grid grid-cols-1 gap-5">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Security Response Taken</label>
                  <select className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={form.responseAction} onChange={(e) => setForm((p) => ({ ...p, responseAction: e.target.value }))}>
                    {RESPONSE_ACTIONS.map((r) => (<option key={r.value} value={r.value}>
                        {r.label}
                      </option>))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                    <input type="checkbox" checked={form.witnessPresent} onChange={(e) => setForm((p) => ({ ...p, witnessPresent: e.target.checked }))}/>
                    Witness Present
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                    <input type="checkbox" checked={form.lawEnforcementInvolved} onChange={(e) => setForm((p) => ({ ...p, lawEnforcementInvolved: e.target.checked }))}/>
                    Law Enforcement
                  </label>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Evidence Collected</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EVIDENCE_TYPES.map((t) => (<button type="button" key={t.value} onClick={() => toggleEvidence(t.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${form.evidenceCollected.includes(t.value)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}>
                      {t.label}
                    </button>))}
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Evidence Upload</label>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <lucide_react_1.Upload className="h-4 w-4 text-slate-500"/>
                    <span className="break-words">{files.length ? `${files.length} file(s) queued` : 'Add images, videos, documents, or audio'}</span>
                  </div>
                  <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} className="text-sm"/>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <lucide_react_1.Users className="h-4 w-4 text-slate-500"/>
                  Persons Involved
                </div>
                <button type="button" onClick={addPerson} className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600">
                  Add Person
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {form.persons.map((p, idx) => (<div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4">
                      <select className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={p.role} onChange={(e) => {
                const role = e.target.value;
                setForm((prev) => ({
                    ...prev,
                    persons: prev.persons.map((x, i) => (i === idx ? { ...x, role } : x)),
                }));
            }}>
                        <option value="SUSPECT">Suspect</option>
                        <option value="VICTIM">Victim</option>
                        <option value="WITNESS">Witness</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-4">
                      <input type="text" className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Name" value={p.name} onChange={(e) => {
                const name = e.target.value;
                setForm((prev) => ({
                    ...prev,
                    persons: prev.persons.map((x, i) => (i === idx ? { ...x, name } : x)),
                }));
            }}/>
                    </div>
                    <div className="md:col-span-4">
                      <input type="text" className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Contact Information" value={p.contactInfo} onChange={(e) => {
                const contactInfo = e.target.value;
                setForm((prev) => ({
                    ...prev,
                    persons: prev.persons.map((x, i) => (i === idx ? { ...x, contactInfo } : x)),
                }));
            }}/>
                    </div>
                    <div className="md:col-span-12 flex items-center justify-end">
                      <button type="button" onClick={() => removePerson(idx)} className="text-xs text-red-600 hover:text-red-700" disabled={form.persons.length <= 1}>
                        Remove
                      </button>
                    </div>
                  </div>))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Narrative</div>
              <div className="mt-2 text-xs text-slate-500">Incident Narrative / Detailed Description</div>
              <textarea required rows={16} className="mt-3 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3" value={form.narrative} onChange={(e) => setForm((p) => ({ ...p, narrative: e.target.value }))} placeholder="Provide a complete, chronological narrative. Include observations, actions taken, and outcomes."/>
              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Incident Summary</label>
                <input type="text" className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder={suggestedTitle}/>
              </div>
              <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                GPS: {typeof gps.geoLat === 'number' && typeof gps.geoLng === 'number' ? `${gps.geoLat.toFixed(6)}, ${gps.geoLng.toFixed(6)}` : 'Unavailable'}
              </div>
            </div>
          </div>
        </div>
        </div>

        <div className="shrink-0 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          <Modal_1.ModalActionButton kind="cancel" onClick={onClose}>
            Cancel
          </Modal_1.ModalActionButton>
          <Modal_1.ModalActionButton kind="submit" type="submit" disabled={loading}>
            {loading ? 'Submitting…' : initialData ? 'Update Report' : 'Submit Report'}
          </Modal_1.ModalActionButton>
        </div>
      </form>
    </Modal_1.Modal>);
}
