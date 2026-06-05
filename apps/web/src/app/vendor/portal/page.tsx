'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Building2,
  FileCheck2,
  FileText,
  Globe,
  AlertTriangle,
  LogOut,
  Phone,
  Receipt,
  ShieldCheck,
  Clock3,
  Store,
  Wallet,
} from 'lucide-react';
import vendorApi from '@/lib/vendor-api';
import { resolveFileUrl } from '@/lib/file-url';

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
}

function formatMoney(value: number, currencyCode?: string | null) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode || 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function VendorPortalPage() {
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('vendor_token');
    if (!token) {
      router.replace('/vendor/login');
      return;
    }
    vendorApi
      .get('/vendors/me/portal')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [router]);

  const currencyCode = data?.business?.currencyCode || data?.reports?.summary?.currencyCode || 'USD';
  const permissions = data?.vendor?.permissions || {};
  const cards = useMemo(
    () =>
      permissions.accessReports
        ? [
      { label: 'Active Clients', value: data?.reports?.summary?.activeClients ?? 0, icon: Building2 },
      { label: 'Active Locations', value: data?.reports?.summary?.activeLocations ?? 0, icon: Store },
      { label: 'Total Invoiced', value: formatMoney(data?.reports?.summary?.totalInvoiced ?? 0, currencyCode), icon: Receipt },
      { label: 'Payments Received', value: formatMoney(data?.reports?.summary?.paymentsReceived ?? 0, currencyCode), icon: Wallet },
      { label: 'Outstanding', value: formatMoney(data?.reports?.summary?.outstandingInvoices ?? 0, currencyCode), icon: FileText },
    ]
        : [],
    [currencyCode, data, permissions.accessReports]
  );

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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-cyan-500/10 text-cyan-200">
                {data.business?.logoUrl ? (
                  <Image
                    src={resolveFileUrl(data.business.logoUrl)}
                    alt={data.business.name}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store className="h-8 w-8" />
                )}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">Vendor Portal</div>
                <h1 className="mt-2 text-3xl font-black tracking-tight">{data.vendor.companyName}</h1>
                <div className="mt-2 text-sm text-slate-300">{data.business?.name}</div>
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
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{card.label}</div>
                    <Icon className="h-4 w-4 text-cyan-200" />
                  </div>
                  <div className="mt-4 text-2xl font-black">{card.value}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {Object.entries(permissions)
              .filter(([, enabled]) => Boolean(enabled))
              .map(([key]) => (
                <span key={key} className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-100">
                  {String(key).replace(/^access/, '').replace(/([A-Z])/g, ' $1').trim()}
                </span>
              ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr,0.95fr]">
          <div className="space-y-6">
            {permissions.accessReports ? (
            <section className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-cyan-200" />
                <h2 className="text-lg font-bold">Operational Reports</h2>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Recent Invoices</div>
                  <div className="mt-4 space-y-3">
                    {(data.reports?.recentInvoices || []).slice(0, 6).map((invoice: any) => (
                      <div key={invoice.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
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
                      </div>
                    ))}
                    {(data.reports?.recentInvoices || []).length === 0 ? <div className="text-sm text-slate-400">No invoice activity available.</div> : null}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Recent Payments</div>
                  <div className="mt-4 space-y-3">
                    {(data.reports?.recentPayments || []).slice(0, 6).map((payment: any) => (
                      <div key={payment.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-white">{payment.reference || 'Payment'}</div>
                            <div className="text-xs text-slate-400">{formatDate(payment.paymentDate)}</div>
                          </div>
                          <div className="font-bold">{formatMoney(payment.amount || 0, currencyCode)}</div>
                        </div>
                      </div>
                    ))}
                    {(data.reports?.recentPayments || []).length === 0 ? <div className="text-sm text-slate-400">No payment activity available.</div> : null}
                  </div>
                </div>
              </div>
            </section>
            ) : null}

            {permissions.accessContracts ? (
            <section className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6">
              <div className="flex items-center gap-3">
                <FileCheck2 className="h-5 w-5 text-cyan-200" />
                <h2 className="text-lg font-bold">Contract Agreements</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {(data.contracts || []).map((contract: any) => (
                  <a
                    key={contract.id}
                    href={contract.fileUrl || '#'}
                    target={contract.fileUrl ? '_blank' : undefined}
                    rel="noreferrer"
                    className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 hover:border-cyan-500/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-white">{contract.title}</div>
                        <div className="mt-1 text-sm text-slate-400">{contract.type} • {contract.status}</div>
                      </div>
                      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
                        {contract.effectiveDate ? `Effective ${formatDate(contract.effectiveDate)}` : 'Agreement'}
                      </div>
                    </div>
                  </a>
                ))}
                {(data.contracts || []).length === 0 ? <div className="text-sm text-slate-400">No vendor-facing contracts available.</div> : null}
              </div>
            </section>
            ) : null}

            {permissions.accessIncidentReports ? (
            <section className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-cyan-200" />
                <h2 className="text-lg font-bold">Incident Reports</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {(data.incidentReports || []).map((incident: any) => (
                  <div key={incident.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
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
                  </div>
                ))}
                {(data.incidentReports || []).length === 0 ? <div className="text-sm text-slate-400">No incident reports available.</div> : null}
              </div>
            </section>
            ) : null}
          </div>

          <div className="space-y-6">
            {permissions.accessCompliance ? (
            <section className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-cyan-200" />
                <h2 className="text-lg font-bold">Compliance & Documents</h2>
              </div>
              <div className="mt-5 space-y-3">
                {(data.complianceDocuments || []).map((doc: any) => (
                  <a
                    key={doc.id}
                    href={doc.fileUrl || '#'}
                    target={doc.fileUrl ? '_blank' : undefined}
                    rel="noreferrer"
                    className="block rounded-3xl border border-slate-800 bg-slate-950/70 p-4 hover:border-cyan-500/30"
                  >
                    <div className="font-semibold text-white">{doc.title}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {doc.category} • Review {formatDate(doc.reviewDate)}
                    </div>
                  </a>
                ))}
                {(data.complianceDocuments || []).length === 0 ? <div className="text-sm text-slate-400">No compliance documents available.</div> : null}
              </div>
            </section>
            ) : null}

            {permissions.accessAnnouncements ? (
            <section className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-cyan-200" />
                <h2 className="text-lg font-bold">Business Updates</h2>
              </div>
              <div className="mt-5 space-y-3">
                {(data.announcements || []).map((announcement: any) => (
                  <div key={announcement.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="font-semibold text-white">{announcement.title}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{announcement.priority}</div>
                    <div className="mt-3 text-sm leading-6 text-slate-300">{announcement.content}</div>
                  </div>
                ))}
                {(data.announcements || []).length === 0 ? <div className="text-sm text-slate-400">No recent business updates.</div> : null}
              </div>
            </section>
            ) : null}

            {permissions.accessTimeTracking ? (
            <section className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-cyan-200" />
                <h2 className="text-lg font-bold">Clock-In / Clock-Out Times</h2>
              </div>
              <div className="mt-5 space-y-3">
                {(data.timeTracking || []).map((row: any) => (
                  <div key={row.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
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
                  </div>
                ))}
                {(data.timeTracking || []).length === 0 ? <div className="text-sm text-slate-400">No time tracking records available.</div> : null}
              </div>
            </section>
            ) : null}

            <section className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-cyan-200" />
                <h2 className="text-lg font-bold">Business Profile</h2>
              </div>
              <div className="mt-5 grid gap-4 text-sm text-slate-300">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Industry</div>
                  <div className="mt-2">{data.business?.industry || data.business?.businessType || 'N/A'}</div>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                    <Phone className="h-3.5 w-3.5" />
                    Contact
                  </div>
                  <div className="mt-2">{data.business?.mobile || data.vendor?.phone || 'N/A'}</div>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                    <Globe className="h-3.5 w-3.5" />
                    Address
                  </div>
                  <div className="mt-2">
                    {[data.business?.address, data.business?.city, data.business?.state, data.business?.country].filter(Boolean).join(', ') || 'N/A'}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Agreement Window</div>
                  <div className="mt-2">
                    {formatDate(data.vendor?.agreementStartDate)} - {formatDate(data.vendor?.agreementEndDate)}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
