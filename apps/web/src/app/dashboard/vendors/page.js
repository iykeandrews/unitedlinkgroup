"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = VendorsPage;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const api_1 = __importDefault(require("@/lib/api"));
const business_context_1 = require("@/context/business-context");
const Modal_1 = require("@/components/Modal");
const EMPTY_FORM = {
    companyName: '',
    contactFirstName: '',
    contactLastName: '',
    email: '',
    phone: '',
    website: '',
    serviceCategory: '',
    portalSlug: '',
    password: '',
    notes: '',
    agreementStartDate: '',
    agreementEndDate: '',
    accessReports: true,
    accessIncidentReports: false,
    accessTimeTracking: false,
    accessContracts: true,
    accessCompliance: true,
    accessAnnouncements: true,
};
const PRIVILEGES = [
    { key: 'accessReports', label: 'Reports overview', description: 'Allow vendor to see business reporting summaries, invoices, and payment activity.' },
    { key: 'accessIncidentReports', label: 'Incident reports', description: 'Allow vendor to see business incident report logs and operational incidents.' },
    { key: 'accessTimeTracking', label: 'Clock-in/out times', description: 'Allow vendor to see employee clock-in, clock-out, and attendance records.' },
    { key: 'accessContracts', label: 'Contracts', description: 'Allow vendor to see service agreements, SOWs, NDAs, and vendor-facing contracts.' },
    { key: 'accessCompliance', label: 'Documentation', description: 'Allow vendor to see compliance files, SOPs, and business documentation.' },
    { key: 'accessAnnouncements', label: 'Business updates', description: 'Allow vendor to see published operational updates and notices.' },
];
const SECTION_TABS = [
    { key: 'overview', label: 'Overview', description: 'Portfolio health, status, and key supplier metrics.' },
    { key: 'directory', label: 'Vendor Directory', description: 'Manage supplier identities, service lines, and contacts.' },
    { key: 'agreements', label: 'Contract Agreements', description: 'Track agreement windows, renewals, and service notes.' },
    { key: 'access', label: 'Access & Portal', description: 'Control portal links, privileges, and vendor visibility.' },
];
function formatDate(value) {
    if (!value)
        return 'Not set';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return 'Not set';
    return parsed.toLocaleDateString();
}
function getEnabledPermissionLabels(vendor) {
    return Object.entries(vendor.permissions || {})
        .filter(([, enabled]) => Boolean(enabled))
        .map(([key]) => String(key)
        .replace(/^access/, '')
        .replace(/([A-Z])/g, ' $1')
        .trim());
}
function getAgreementState(vendor) {
    const now = new Date();
    const start = (vendor === null || vendor === void 0 ? void 0 : vendor.agreementStartDate) ? new Date(vendor.agreementStartDate) : null;
    const end = (vendor === null || vendor === void 0 ? void 0 : vendor.agreementEndDate) ? new Date(vendor.agreementEndDate) : null;
    if (!start && !end) {
        return {
            label: 'Pending setup',
            tone: 'slate',
            detail: 'No agreement dates recorded yet.',
        };
    }
    if (end && end.getTime() < now.getTime()) {
        return {
            label: 'Expired',
            tone: 'red',
            detail: `Expired on ${formatDate(vendor.agreementEndDate)}.`,
        };
    }
    if (end) {
        const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
            return {
                label: 'Renewal due',
                tone: 'amber',
                detail: `Ends in ${Math.max(diffDays, 0)} day${Math.abs(diffDays) === 1 ? '' : 's'}.`,
            };
        }
    }
    return {
        label: 'Active',
        tone: 'emerald',
        detail: end ? `Runs until ${formatDate(vendor.agreementEndDate)}.` : 'Open-ended agreement.',
    };
}
function getAgreementBadgeClasses(tone) {
    switch (tone) {
        case 'red':
            return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200';
        case 'amber':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200';
        case 'emerald':
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200';
        default:
            return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
    }
}
function VendorsPage() {
    const { selectedBusiness, isLoading: businessLoading } = (0, business_context_1.useBusiness)();
    const [vendors, setVendors] = (0, react_1.useState)([]);
    const [form, setForm] = (0, react_1.useState)(EMPTY_FORM);
    const [editingId, setEditingId] = (0, react_1.useState)(null);
    const [isFormModalOpen, setIsFormModalOpen] = (0, react_1.useState)(false);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)('');
    const [search, setSearch] = (0, react_1.useState)('');
    const [activeSection, setActiveSection] = (0, react_1.useState)('overview');
    const load = (0, react_1.useCallback)(async () => {
        var _a, _b, _c;
        if (!(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id)) {
            setVendors([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const vendorsRes = await api_1.default.get('/vendors');
            setVendors(Array.isArray((_a = vendorsRes.data) === null || _a === void 0 ? void 0 : _a.vendors) ? vendorsRes.data.vendors : []);
            setError('');
        }
        catch (err) {
            setError(((_c = (_b = err.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || 'Unable to load vendors');
        }
        finally {
            setLoading(false);
        }
    }, [selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id]);
    (0, react_1.useEffect)(() => {
        load();
    }, [load]);
    const filteredVendors = (0, react_1.useMemo)(() => {
        const query = search.trim().toLowerCase();
        if (!query)
            return vendors;
        return vendors.filter((vendor) => {
            var _a;
            return [vendor.companyName, vendor.email, vendor.serviceCategory, (_a = vendor.business) === null || _a === void 0 ? void 0 : _a.name, vendor.portalSlug]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [search, vendors]);
    const summary = (0, react_1.useMemo)(() => {
        var _a, _b;
        const base = {
            total: filteredVendors.length,
            active: 0,
            expiring: 0,
            withPortalAccess: 0,
            withContractAccess: 0,
        };
        for (const vendor of filteredVendors) {
            if (String(vendor.status || '').toUpperCase() === 'ACTIVE')
                base.active += 1;
            if (((_b = (_a = vendor.permissions) === null || _a === void 0 ? void 0 : _a.accessContracts) !== null && _b !== void 0 ? _b : false) === true)
                base.withContractAccess += 1;
            if (getEnabledPermissionLabels(vendor).length > 0)
                base.withPortalAccess += 1;
            if (getAgreementState(vendor).label === 'Renewal due')
                base.expiring += 1;
        }
        return base;
    }, [filteredVendors]);
    const submit = async (e) => {
        var _a, _b;
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            if (editingId) {
                await api_1.default.patch(`/vendors/${editingId}`, form);
            }
            else {
                await api_1.default.post('/vendors', form);
            }
            setForm(EMPTY_FORM);
            setEditingId(null);
            setIsFormModalOpen(false);
            await load();
        }
        catch (err) {
            setError(((_b = (_a = err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Unable to save vendor');
        }
        finally {
            setSaving(false);
        }
    };
    const toggleVendor = async (vendor) => {
        var _a, _b;
        try {
            if (vendor.status === 'ACTIVE') {
                await api_1.default.post(`/vendors/${vendor.id}/deactivate`);
            }
            else {
                await api_1.default.post(`/vendors/${vendor.id}/activate`);
            }
            await load();
        }
        catch (err) {
            setError(((_b = (_a = err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Unable to update vendor status');
        }
    };
    const beginEdit = (vendor) => {
        var _a, _b, _c, _d, _e, _f;
        setEditingId(vendor.id);
        setError('');
        setForm({
            companyName: vendor.companyName || '',
            contactFirstName: vendor.contactFirstName || '',
            contactLastName: vendor.contactLastName || '',
            email: vendor.email || '',
            phone: vendor.phone || '',
            website: vendor.website || '',
            serviceCategory: vendor.serviceCategory || '',
            portalSlug: vendor.portalSlug || '',
            password: '',
            notes: vendor.notes || '',
            agreementStartDate: vendor.agreementStartDate ? String(vendor.agreementStartDate).slice(0, 10) : '',
            agreementEndDate: vendor.agreementEndDate ? String(vendor.agreementEndDate).slice(0, 10) : '',
            accessReports: ((_a = vendor.permissions) === null || _a === void 0 ? void 0 : _a.accessReports) !== false,
            accessIncidentReports: !!((_b = vendor.permissions) === null || _b === void 0 ? void 0 : _b.accessIncidentReports),
            accessTimeTracking: !!((_c = vendor.permissions) === null || _c === void 0 ? void 0 : _c.accessTimeTracking),
            accessContracts: ((_d = vendor.permissions) === null || _d === void 0 ? void 0 : _d.accessContracts) !== false,
            accessCompliance: ((_e = vendor.permissions) === null || _e === void 0 ? void 0 : _e.accessCompliance) !== false,
            accessAnnouncements: ((_f = vendor.permissions) === null || _f === void 0 ? void 0 : _f.accessAnnouncements) !== false,
        });
        setIsFormModalOpen(true);
    };
    const openCreateModal = () => {
        setEditingId(null);
        setError('');
        setForm(EMPTY_FORM);
        setIsFormModalOpen(true);
    };
    const closeFormModal = () => {
        if (saving)
            return;
        setIsFormModalOpen(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
    };
    const noBusinessSelected = !businessLoading && !(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id);
    return (<div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative p-6 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_28%)]"/>
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-4xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.28em] text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
                    <lucide_react_1.Store className="h-3.5 w-3.5"/>
                    Vendor Management
                  </div>
                  <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Professional Vendor Workspace
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Manage supplier onboarding, contract agreements, access permissions, and vendor portal readiness for the selected business from one professional workspace.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-200">
                    <lucide_react_1.Building2 className="h-4 w-4 text-indigo-500"/>
                    {(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.name) ? `Business Context: ${selectedBusiness.name}` : 'No business selected'}
                  </div>
                </div>

                <div className="flex flex-col items-stretch gap-3 sm:flex-row">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    <lucide_react_1.Search className="h-4 w-4"/>
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor, category, slug..." className="w-full bg-transparent outline-none placeholder:text-slate-400 sm:min-w-[260px]"/>
                  </div>
                  <button type="button" onClick={load} disabled={!(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">
                    <lucide_react_1.RefreshCw className="h-4 w-4"/>
                    Refresh
                  </button>
                  <button type="button" onClick={openCreateModal} disabled={!(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                    <lucide_react_1.Save className="h-4 w-4"/>
                    Create Vendor Workspace
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard icon={lucide_react_1.Users} label="Total vendors" value={String(summary.total)} hint={`${summary.active} currently active`}/>
                <SummaryCard icon={lucide_react_1.CalendarClock} label="Renewals due" value={String(summary.expiring)} hint="Agreements ending within 30 days"/>
                <SummaryCard icon={lucide_react_1.Globe} label="Portal ready" value={String(summary.withPortalAccess)} hint="Vendors with access enabled"/>
                <SummaryCard icon={lucide_react_1.FileBadge} label="Contract visibility" value={String(summary.withContractAccess)} hint="Can view contract documents"/>
              </div>
            </div>
          </div>
        </div>

        {noBusinessSelected ? (<div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
            <div className="flex items-start gap-3">
              <lucide_react_1.AlertCircle className="mt-0.5 h-5 w-5"/>
              <div>
                <div className="font-bold">Select a business first</div>
                <p className="mt-2 text-sm leading-6">
                  Vendor management is scoped to the opened business. Select a business from the dashboard, then manage suppliers, agreements, and portal access for that business.
                </p>
              </div>
            </div>
          </div>) : null}

        <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {SECTION_TABS.map((section) => (<button key={section.key} type="button" onClick={() => setActiveSection(section.key)} className={`rounded-2xl border px-4 py-4 text-left transition-colors ${activeSection === section.key
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800/60'}`}>
                <div className="text-sm font-bold">{section.label}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{section.description}</div>
              </button>))}
          </div>
        </div>

        {error ? (<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100">
            {error}
          </div>) : null}

        <div className="space-y-6">
            {activeSection === 'overview' ? (<>
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Vendor Portfolio Overview</h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        A leadership view of vendor status, agreement readiness, and access posture.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-950/70">
                          <tr className="text-left text-slate-500 dark:text-slate-400">
                            <th className="px-5 py-4 font-semibold">Vendor</th>
                            <th className="px-5 py-4 font-semibold">Category</th>
                            <th className="px-5 py-4 font-semibold">Agreement</th>
                            <th className="px-5 py-4 font-semibold">Portal Access</th>
                            <th className="px-5 py-4 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {loading ? (<tr>
                              <td colSpan={5} className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
                                Loading vendor portfolio...
                              </td>
                            </tr>) : filteredVendors.length === 0 ? (<tr>
                              <td colSpan={5} className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
                                No vendors found for this business.
                              </td>
                            </tr>) : (filteredVendors.map((vendor) => {
                const agreement = getAgreementState(vendor);
                const permissions = getEnabledPermissionLabels(vendor);
                return (<tr key={vendor.id} className="bg-white dark:bg-slate-900">
                                  <td className="px-5 py-4">
                                    <div className="font-semibold text-slate-900 dark:text-white">{vendor.companyName}</div>
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{vendor.email}</div>
                                  </td>
                                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{vendor.serviceCategory || 'Unspecified'}</td>
                                  <td className="px-5 py-4">
                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getAgreementBadgeClasses(agreement.tone)}`}>
                                      {agreement.label}
                                    </span>
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{agreement.detail}</div>
                                  </td>
                                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                                    {permissions.length ? `${permissions.length} enabled area${permissions.length === 1 ? '' : 's'}` : 'No access enabled'}
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${vendor.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                                      {vendor.status}
                                    </span>
                                  </td>
                                </tr>);
            }))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Agreement Watchlist</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Vendors needing contract attention or renewal planning.</p>
                    <div className="mt-5 space-y-4">
                      {filteredVendors
                .filter((vendor) => ['Renewal due', 'Expired', 'Pending setup'].includes(getAgreementState(vendor).label))
                .slice(0, 6)
                .map((vendor) => {
                const agreement = getAgreementState(vendor);
                return (<div key={vendor.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-white">{vendor.companyName}</div>
                                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{agreement.detail}</div>
                                </div>
                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getAgreementBadgeClasses(agreement.tone)}`}>
                                  {agreement.label}
                                </span>
                              </div>
                            </div>);
            })}
                      {!loading &&
                filteredVendors.filter((vendor) => ['Renewal due', 'Expired', 'Pending setup'].includes(getAgreementState(vendor).label)).length === 0 ? (<div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          All vendors currently look healthy from an agreement standpoint.
                        </div>) : null}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Portal Access Snapshot</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Quick view of which suppliers can access reports, contracts, and business updates.</p>
                    <div className="mt-5 space-y-4">
                      {filteredVendors.slice(0, 6).map((vendor) => {
                const permissions = getEnabledPermissionLabels(vendor);
                return (<div key={vendor.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white">{vendor.companyName}</div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{vendor.portalSlug}</div>
                              </div>
                              <a href={vendor.portalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300">
                                Open <lucide_react_1.ArrowUpRight className="h-4 w-4"/>
                              </a>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {permissions.length ? (permissions.map((permission) => (<span key={permission} className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
                                    {permission}
                                  </span>))) : (<span className="text-sm text-slate-500 dark:text-slate-400">No privileges enabled yet.</span>)}
                            </div>
                          </div>);
            })}
                    </div>
                  </div>
                </section>
              </>) : null}

            {activeSection === 'directory' ? (<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Vendor Directory</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    A clean directory of all suppliers, service contacts, and operating categories.
                  </p>
                </div>
                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {loading ? (<div className="text-sm text-slate-500 dark:text-slate-400">Loading vendor directory...</div>) : filteredVendors.length === 0 ? (<div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      No vendors found.
                    </div>) : (filteredVendors.map((vendor) => {
                const permissions = getEnabledPermissionLabels(vendor);
                return (<div key={vendor.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{vendor.companyName}</h3>
                                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${vendor.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                                    {vendor.status}
                                  </span>
                                </div>
                                <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{vendor.serviceCategory || 'No service category assigned'}</div>
                              </div>
                              <button type="button" onClick={() => beginEdit(vendor)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                                Edit vendor
                              </button>
                            </div>

                            <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                              <div className="inline-flex items-center gap-2">
                                <lucide_react_1.Mail className="h-4 w-4 text-slate-400"/>
                                {vendor.email}
                              </div>
                              <div className="inline-flex items-center gap-2">
                                <lucide_react_1.UserRound className="h-4 w-4 text-slate-400"/>
                                {[vendor.contactFirstName, vendor.contactLastName].filter(Boolean).join(' ') || 'No contact assigned'}
                              </div>
                              <div className="inline-flex items-center gap-2">
                                <lucide_react_1.Phone className="h-4 w-4 text-slate-400"/>
                                {vendor.phone || 'No phone number'}
                              </div>
                              <div className="inline-flex items-center gap-2">
                                <lucide_react_1.Globe className="h-4 w-4 text-slate-400"/>
                                {vendor.website || 'No website'}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {permissions.length ? (permissions.map((permission) => (<span key={permission} className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
                                    {permission}
                                  </span>))) : (<span className="text-sm text-slate-500 dark:text-slate-400">No enabled portal privileges.</span>)}
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <a href={vendor.portalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-slate-800">
                                <lucide_react_1.Link className="h-4 w-4"/>
                                Vendor portal
                              </a>
                              <button type="button" onClick={() => toggleVendor(vendor)} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white ${vendor.status === 'ACTIVE' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                                {vendor.status === 'ACTIVE' ? <lucide_react_1.PowerOff className="h-4 w-4"/> : <lucide_react_1.Power className="h-4 w-4"/>}
                                {vendor.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </div>
                        </div>);
            }))}
                </div>
              </section>) : null}

            {activeSection === 'agreements' ? (<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Contract Agreements</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Keep service agreements visible, identify renewals early, and maintain a clean audit trail.
                  </p>
                </div>
                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {loading ? (<div className="text-sm text-slate-500 dark:text-slate-400">Loading agreement records...</div>) : filteredVendors.length === 0 ? (<div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      No agreement records to display.
                    </div>) : (filteredVendors.map((vendor) => {
                var _a;
                const agreement = getAgreementState(vendor);
                return (<div key={vendor.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-lg font-bold text-slate-900 dark:text-white">{vendor.companyName}</div>
                              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{vendor.serviceCategory || 'Service category pending'}</div>
                            </div>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getAgreementBadgeClasses(agreement.tone)}`}>
                              {agreement.label}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <AgreementInfoCard label="Agreement start" value={formatDate(vendor.agreementStartDate)}/>
                            <AgreementInfoCard label="Agreement end" value={formatDate(vendor.agreementEndDate)}/>
                          </div>

                          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Agreement notes</div>
                            <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                              {vendor.notes || 'No contract notes captured yet. Use the vendor editor to document service terms, SOW reminders, or renewal comments.'}
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <button type="button" onClick={() => beginEdit(vendor)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                              Update agreement
                            </button>
                            <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-800">
                              <lucide_react_1.ShieldCheck className="h-4 w-4"/>
                              {((_a = vendor.permissions) === null || _a === void 0 ? void 0 : _a.accessContracts) ? 'Contract access enabled' : 'Contract access disabled'}
                            </div>
                          </div>
                        </div>);
            }))}
                </div>
              </section>) : null}

            {activeSection === 'access' ? (<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access & Portal Control</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Control what each vendor can see, verify portal configuration, and keep supplier access intentional.
                  </p>
                </div>
                <div className="mt-6 space-y-4">
                  {loading ? (<div className="text-sm text-slate-500 dark:text-slate-400">Loading portal settings...</div>) : filteredVendors.length === 0 ? (<div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      No portal records available.
                    </div>) : (filteredVendors.map((vendor) => {
                const permissions = getEnabledPermissionLabels(vendor);
                return (<div key={vendor.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="space-y-3">
                              <div>
                                <div className="text-lg font-bold text-slate-900 dark:text-white">{vendor.companyName}</div>
                                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                  Portal slug: <span className="font-semibold text-slate-700 dark:text-slate-200">{vendor.portalSlug}</span>
                                </div>
                              </div>

                              <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <div className="inline-flex items-center gap-2">
                                  <lucide_react_1.Link className="h-4 w-4 text-slate-400"/>
                                  <a href={vendor.portalUrl} target="_blank" rel="noreferrer" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300">
                                    {vendor.portalUrl}
                                  </a>
                                </div>
                                <div className="inline-flex items-center gap-2">
                                  <lucide_react_1.CircleAlert className="h-4 w-4 text-slate-400"/>
                                  {permissions.length ? `${permissions.length} privilege area${permissions.length === 1 ? '' : 's'} enabled` : 'No privilege areas enabled'}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {permissions.length ? (permissions.map((permission) => (<span key={permission} className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
                                      {permission}
                                    </span>))) : (<span className="text-sm text-slate-500 dark:text-slate-400">This vendor currently has no enabled portal modules.</span>)}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <button type="button" onClick={() => beginEdit(vendor)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                                Update access
                              </button>
                              <button type="button" onClick={() => toggleVendor(vendor)} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white ${vendor.status === 'ACTIVE' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                                {vendor.status === 'ACTIVE' ? <lucide_react_1.PowerOff className="h-4 w-4"/> : <lucide_react_1.Power className="h-4 w-4"/>}
                                {vendor.status === 'ACTIVE' ? 'Disable portal' : 'Enable portal'}
                              </button>
                            </div>
                          </div>
                        </div>);
            }))}
                </div>
              </section>) : null}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Workspace Actions</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Use the modal workflow to create or update vendors without crowding the main management views.
              </p>
            </div>
            <button type="button" onClick={openCreateModal} disabled={!(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
              <lucide_react_1.Save className="h-4 w-4"/>
              Create Vendor Workspace
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Contract readiness</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Keep agreement start and end dates current so renewals can be tracked properly.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Least privilege access</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Only enable the exact vendor areas required for the service relationship.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Portal quality</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use clear slugs and verified contact emails so supplier access is predictable and supportable.</div>
            </div>
          </div>
        </section>

        <Modal_1.Modal isOpen={isFormModalOpen} onClose={closeFormModal} title={editingId ? 'Edit Vendor Workspace' : 'Create Vendor Workspace'} maxWidth="max-w-4xl">
          <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Company & Contact</div>
                  <Field label="Vendor Company" required>
                    <input value={form.companyName} onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))} required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"/>
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First Name">
                      <input value={form.contactFirstName} onChange={(e) => setForm((prev) => ({ ...prev, contactFirstName: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"/>
                    </Field>
                    <Field label="Last Name">
                      <input value={form.contactLastName} onChange={(e) => setForm((prev) => ({ ...prev, contactLastName: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"/>
                    </Field>
                  </div>
                  <Field label="Email" required>
                    <input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"/>
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Phone">
                      <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"/>
                    </Field>
                    <Field label="Website">
                      <input value={form.website} onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"/>
                    </Field>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Portal & Service</div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Service Category">
                      <input value={form.serviceCategory} onChange={(e) => setForm((prev) => ({ ...prev, serviceCategory: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"/>
                    </Field>
                    <Field label="Portal Slug" required>
                      <input value={form.portalSlug} onChange={(e) => setForm((prev) => ({ ...prev, portalSlug: e.target.value }))} required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"/>
                    </Field>
                  </div>
                  <Field label={editingId ? 'Reset Password (optional)' : 'Initial Password'} required={!editingId}>
                    <input type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} required={!editingId} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"/>
                  </Field>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Contract Agreement</div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Agreement Start">
                      <input type="date" value={form.agreementStartDate} onChange={(e) => setForm((prev) => ({ ...prev, agreementStartDate: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"/>
                    </Field>
                    <Field label="Agreement End">
                      <input type="date" value={form.agreementEndDate} onChange={(e) => setForm((prev) => ({ ...prev, agreementEndDate: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"/>
                    </Field>
                  </div>
                  <Field label="Internal Notes">
                    <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} rows={5} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"/>
                  </Field>
                </div>

                <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center gap-2">
                    <lucide_react_1.ShieldCheck className="h-4 w-4 text-indigo-500"/>
                    <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-slate-700 dark:text-slate-200">Access Controls</h3>
                  </div>
                  <div className="space-y-3">
                    {PRIVILEGES.map((item) => (<label key={item.key} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                        <input type="checkbox" checked={Boolean(form[item.key])} onChange={(e) => setForm((prev) => ({ ...prev, [item.key]: e.target.checked }))} className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"/>
                        <div>
                          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                            <lucide_react_1.CheckSquare className="h-4 w-4 text-indigo-500"/>
                            {item.label}
                          </div>
                          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.description}</div>
                        </div>
                      </label>))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button type="button" onClick={closeFormModal} disabled={saving} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                Cancel
              </button>
              <button type="submit" disabled={saving || !(selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.id)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                <lucide_react_1.Save className="h-4 w-4"/>
                {saving ? 'Saving vendor workspace...' : editingId ? 'Update vendor' : 'Create vendor'}
              </button>
            </div>
          </form>
        </Modal_1.Modal>
      </div>
    </div>);
}
function SummaryCard({ icon: Icon, label, value, hint, }) {
    return (<div className="rounded-3xl border border-slate-200 bg-white/85 p-5 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{value}</div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint}</div>
        </div>
        <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
          <Icon className="h-5 w-5"/>
        </div>
      </div>
    </div>);
}
function AgreementInfoCard({ label, value }) {
    return (<div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>);
}
function Field({ label, children, required, }) {
    return (<label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>);
}
