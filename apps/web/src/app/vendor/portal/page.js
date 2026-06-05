"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = VendorPortalPage;
const react_1 = require("react");
const image_1 = __importDefault(require("next/image"));
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
const vendor_api_1 = __importDefault(require("@/lib/vendor-api"));
const file_url_1 = require("@/lib/file-url");
function formatDate(value) {
    if (!value)
        return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return 'N/A';
    return date.toLocaleDateString();
}
function formatMoney(value, currencyCode) {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode || 'USD',
        maximumFractionDigits: 2,
    }).format(Number(value || 0));
}
function VendorPortalPage() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
    const router = (0, navigation_1.useRouter)();
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        const token = localStorage.getItem('vendor_token');
        if (!token) {
            router.replace('/vendor/login');
            return;
        }
        vendor_api_1.default
            .get('/vendors/me/portal')
            .then((res) => setData(res.data))
            .finally(() => setLoading(false));
    }, [router]);
    const currencyCode = ((_a = data === null || data === void 0 ? void 0 : data.business) === null || _a === void 0 ? void 0 : _a.currencyCode) || ((_c = (_b = data === null || data === void 0 ? void 0 : data.reports) === null || _b === void 0 ? void 0 : _b.summary) === null || _c === void 0 ? void 0 : _c.currencyCode) || 'USD';
    const permissions = ((_d = data === null || data === void 0 ? void 0 : data.vendor) === null || _d === void 0 ? void 0 : _d.permissions) || {};
    const cards = (0, react_1.useMemo)(() => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        return permissions.accessReports
            ? [
                { label: 'Active Clients', value: (_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.reports) === null || _a === void 0 ? void 0 : _a.summary) === null || _b === void 0 ? void 0 : _b.activeClients) !== null && _c !== void 0 ? _c : 0, icon: lucide_react_1.Building2 },
                { label: 'Active Locations', value: (_f = (_e = (_d = data === null || data === void 0 ? void 0 : data.reports) === null || _d === void 0 ? void 0 : _d.summary) === null || _e === void 0 ? void 0 : _e.activeLocations) !== null && _f !== void 0 ? _f : 0, icon: lucide_react_1.Store },
                { label: 'Total Invoiced', value: formatMoney((_j = (_h = (_g = data === null || data === void 0 ? void 0 : data.reports) === null || _g === void 0 ? void 0 : _g.summary) === null || _h === void 0 ? void 0 : _h.totalInvoiced) !== null && _j !== void 0 ? _j : 0, currencyCode), icon: lucide_react_1.Receipt },
                { label: 'Payments Received', value: formatMoney((_m = (_l = (_k = data === null || data === void 0 ? void 0 : data.reports) === null || _k === void 0 ? void 0 : _k.summary) === null || _l === void 0 ? void 0 : _l.paymentsReceived) !== null && _m !== void 0 ? _m : 0, currencyCode), icon: lucide_react_1.Wallet },
                { label: 'Outstanding', value: formatMoney((_q = (_p = (_o = data === null || data === void 0 ? void 0 : data.reports) === null || _o === void 0 ? void 0 : _o.summary) === null || _p === void 0 ? void 0 : _p.outstandingInvoices) !== null && _q !== void 0 ? _q : 0, currencyCode), icon: lucide_react_1.FileText },
            ]
            : [];
    }, [currencyCode, data, permissions.accessReports]);
    const logout = () => {
        localStorage.removeItem('vendor_token');
        localStorage.removeItem('vendor_portal_slug');
        router.push('/vendor/login');
    };
    if (loading) {
        return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">Loading vendor portal...</div>;
    }
    if (!data) {
        return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">Unable to load vendor portal.</div>;
    }
    return (<div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-cyan-500/10 text-cyan-200">
                {((_e = data.business) === null || _e === void 0 ? void 0 : _e.logoUrl) ? (<image_1.default src={(0, file_url_1.resolveFileUrl)(data.business.logoUrl)} alt={data.business.name} width={64} height={64} className="h-full w-full object-cover"/>) : (<lucide_react_1.Store className="h-8 w-8"/>)}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">Vendor Portal</div>
                <h1 className="mt-2 text-3xl font-black tracking-tight">{data.vendor.companyName}</h1>
                <div className="mt-2 text-sm text-slate-300">{(_f = data.business) === null || _f === void 0 ? void 0 : _f.name}</div>
                <div className="mt-1 text-sm text-slate-400">
                  {data.vendor.contactFirstName || data.vendor.contactLastName
            ? `${data.vendor.contactFirstName || ''} ${data.vendor.contactLastName || ''}`.trim()
            : data.vendor.email}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-100">
                {data.vendor.status}
              </div>
              <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900">
                <lucide_react_1.LogOut className="h-4 w-4"/>
                Logout
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {cards.map((card) => {
            const Icon = card.icon;
            return (<div key={card.label} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{card.label}</div>
                    <Icon className="h-4 w-4 text-cyan-200"/>
                  </div>
                  <div className="mt-4 text-2xl font-black">{card.value}</div>
                </div>);
        })}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {Object.entries(permissions)
            .filter(([, enabled]) => Boolean(enabled))
            .map(([key]) => (<span key={key} className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-100">
                  {String(key).replace(/^access/, '').replace(/([A-Z])/g, ' $1').trim()}
                </span>))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr,0.95fr]">
          <div className="space-y-6">
            {permissions.accessReports ? (<section className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6">
              <div className="flex items-center gap-3">
                <lucide_react_1.Receipt className="h-5 w-5 text-cyan-200"/>
                <h2 className="text-lg font-bold">Operational Reports</h2>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Recent Invoices</div>
                  <div className="mt-4 space-y-3">
                    {(((_g = data.reports) === null || _g === void 0 ? void 0 : _g.recentInvoices) || []).slice(0, 6).map((invoice) => (<div key={invoice.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-white">{invoice.invoiceNumber || 'Invoice'}</div>
                            <div className="text-xs text-slate-400">{invoice.clientName}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatMoney(invoice.total || 0, currencyCode)}</div>
                            <div className="text-xs text-slate-400">{invoice.status}</div>
                          </div>
                        </div>
                      </div>))}
                    {(((_h = data.reports) === null || _h === void 0 ? void 0 : _h.recentInvoices) || []).length === 0 ? <div className="text-sm text-slate-400">No invoice activity available.</div> : null}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Recent Payments</div>
                  <div className="mt-4 space-y-3">
                    {(((_j = data.reports) === null || _j === void 0 ? void 0 : _j.recentPayments) || []).slice(0, 6).map((payment) => (<div key={payment.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-white">{payment.reference || 'Payment'}</div>
                            <div className="text-xs text-slate-400">{formatDate(payment.paymentDate)}</div>
                          </div>
                          <div className="font-bold">{formatMoney(payment.amount || 0, currencyCode)}</div>
                        </div>
                      </div>))}
                    {(((_k = data.reports) === null || _k === void 0 ? void 0 : _k.recentPayments) || []).length === 0 ? <div className="text-sm text-slate-400">No payment activity available.</div> : null}
                  </div>
                </div>
              </div>
            </section>) : null}

            {permissions.accessContracts ? (<section className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6">
              <div className="flex items-center gap-3">
                <lucide_react_1.FileCheck2 className="h-5 w-5 text-cyan-200"/>
                <h2 className="text-lg font-bold">Contract Agreements</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {(data.contracts || []).map((contract) => (<a key={contract.id} href={contract.fileUrl || '#'} target={contract.fileUrl ? '_blank' : undefined} rel="noreferrer" className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 hover:border-cyan-500/30">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-white">{contract.title}</div>
                        <div className="mt-1 text-sm text-slate-400">{contract.type} • {contract.status}</div>
                      </div>
                      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
                        {contract.effectiveDate ? `Effective ${formatDate(contract.effectiveDate)}` : 'Agreement'}
                      </div>
                    </div>
                  </a>))}
                {(data.contracts || []).length === 0 ? <div className="text-sm text-slate-400">No vendor-facing contracts available.</div> : null}
              </div>
            </section>) : null}

            {permissions.accessIncidentReports ? (<section className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6">
              <div className="flex items-center gap-3">
                <lucide_react_1.AlertTriangle className="h-5 w-5 text-cyan-200"/>
                <h2 className="text-lg font-bold">Incident Reports</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {(data.incidentReports || []).map((incident) => (<div key={incident.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">{incident.title}</div>
                        <div className="mt-1 text-sm text-slate-400">
                          {incident.reportNumber || 'Incident'} • {incident.type} • {incident.severity}
                        </div>
                      </div>
                      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{incident.status}</div>
                    </div>
                    <div className="mt-3 text-sm text-slate-300">
                      {incident.locationName || 'No location'}
                      {incident.reportingOfficerName ? ` • Officer: ${incident.reportingOfficerName}` : ''}
                      {incident.assignedSupervisorName ? ` • Supervisor: ${incident.assignedSupervisorName}` : ''}
                    </div>
                  </div>))}
                {(data.incidentReports || []).length === 0 ? <div className="text-sm text-slate-400">No incident reports available.</div> : null}
              </div>
            </section>) : null}
          </div>

          <div className="space-y-6">
            {permissions.accessCompliance ? (<section className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6">
              <div className="flex items-center gap-3">
                <lucide_react_1.ShieldCheck className="h-5 w-5 text-cyan-200"/>
                <h2 className="text-lg font-bold">Compliance & Documents</h2>
              </div>
              <div className="mt-5 space-y-3">
                {(data.complianceDocuments || []).map((doc) => (<a key={doc.id} href={doc.fileUrl || '#'} target={doc.fileUrl ? '_blank' : undefined} rel="noreferrer" className="block rounded-3xl border border-slate-800 bg-slate-950/70 p-4 hover:border-cyan-500/30">
                    <div className="font-semibold text-white">{doc.title}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {doc.category} • Review {formatDate(doc.reviewDate)}
                    </div>
                  </a>))}
                {(data.complianceDocuments || []).length === 0 ? <div className="text-sm text-slate-400">No compliance documents available.</div> : null}
              </div>
            </section>) : null}

            {permissions.accessAnnouncements ? (<section className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6">
              <div className="flex items-center gap-3">
                <lucide_react_1.Bell className="h-5 w-5 text-cyan-200"/>
                <h2 className="text-lg font-bold">Business Updates</h2>
              </div>
              <div className="mt-5 space-y-3">
                {(data.announcements || []).map((announcement) => (<div key={announcement.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="font-semibold text-white">{announcement.title}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{announcement.priority}</div>
                    <div className="mt-3 text-sm leading-6 text-slate-300">{announcement.content}</div>
                  </div>))}
                {(data.announcements || []).length === 0 ? <div className="text-sm text-slate-400">No recent business updates.</div> : null}
              </div>
            </section>) : null}

            {permissions.accessTimeTracking ? (<section className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6">
              <div className="flex items-center gap-3">
                <lucide_react_1.Clock3 className="h-5 w-5 text-cyan-200"/>
                <h2 className="text-lg font-bold">Clock-In / Clock-Out Times</h2>
              </div>
              <div className="mt-5 space-y-3">
                {(data.timeTracking || []).map((row) => (<div key={row.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">{row.employeeName || 'Employee'}</div>
                        <div className="mt-1 text-sm text-slate-400">{row.locationName || 'No location'} • {row.status}</div>
                      </div>
                      <div className="text-right text-sm text-slate-300">
                        <div>In: {formatDate(row.startTime)} {new Date(row.startTime).toLocaleTimeString()}</div>
                        <div>Out: {row.endTime ? `${formatDate(row.endTime)} ${new Date(row.endTime).toLocaleTimeString()}` : 'Active'}</div>
                      </div>
                    </div>
                  </div>))}
                {(data.timeTracking || []).length === 0 ? <div className="text-sm text-slate-400">No time tracking records available.</div> : null}
              </div>
            </section>) : null}

            <section className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6">
              <div className="flex items-center gap-3">
                <lucide_react_1.Building2 className="h-5 w-5 text-cyan-200"/>
                <h2 className="text-lg font-bold">Business Profile</h2>
              </div>
              <div className="mt-5 grid gap-4 text-sm text-slate-300">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Industry</div>
                  <div className="mt-2">{((_l = data.business) === null || _l === void 0 ? void 0 : _l.industry) || ((_m = data.business) === null || _m === void 0 ? void 0 : _m.businessType) || 'N/A'}</div>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                    <lucide_react_1.Phone className="h-3.5 w-3.5"/>
                    Contact
                  </div>
                  <div className="mt-2">{((_o = data.business) === null || _o === void 0 ? void 0 : _o.mobile) || ((_p = data.vendor) === null || _p === void 0 ? void 0 : _p.phone) || 'N/A'}</div>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                    <lucide_react_1.Globe className="h-3.5 w-3.5"/>
                    Address
                  </div>
                  <div className="mt-2">
                    {[(_q = data.business) === null || _q === void 0 ? void 0 : _q.address, (_r = data.business) === null || _r === void 0 ? void 0 : _r.city, (_s = data.business) === null || _s === void 0 ? void 0 : _s.state, (_t = data.business) === null || _t === void 0 ? void 0 : _t.country].filter(Boolean).join(', ') || 'N/A'}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Agreement Window</div>
                  <div className="mt-2">
                    {formatDate((_u = data.vendor) === null || _u === void 0 ? void 0 : _u.agreementStartDate)} - {formatDate((_v = data.vendor) === null || _v === void 0 ? void 0 : _v.agreementEndDate)}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>);
}
