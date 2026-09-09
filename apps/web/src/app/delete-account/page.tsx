'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, Mail, ShieldAlert, Trash2, Printer } from 'lucide-react';

type Section = {
  id: string;
  number: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

const quickFacts = [
  { label: 'Request Method', value: 'Email request only' },
  { label: 'Response Channel', value: 'Support via email' },
  { label: 'Data Retention', value: 'Employment records retained as required' },
];

const sections: Section[] = [
  {
    id: 'overview',
    number: '01',
    title: 'Overview',
    paragraphs: [
      'The United Link Group mobile application is an employment and workforce management platform used by authorized officers and employees to access employment-related information, clock in and out, and manage employment documentation.',
    ],
  },
  {
    id: 'requesting-account-deletion',
    number: '02',
    title: 'Requesting Account Deletion',
    paragraphs: [
      'Users may request that their application account be deactivated or deleted by contacting the email address below.',
      'Please include the email address associated with your account and state that you are requesting account deletion.',
    ],
  },
  {
    id: 'employment-records',
    number: '03',
    title: 'Employment Records and Data Retention',
    paragraphs: [
      'Because United Link Group is used to maintain employment and workforce records, requesting account deletion does not necessarily result in the deletion of all employment-related records.',
      'Certain records may need to be retained for legitimate business, employment, payroll, legal, regulatory, security, compliance, audit, or recordkeeping purposes.',
      'Where appropriate, the user\'s application access and account credentials may be deactivated while necessary employment records are retained.',
      'Records that are no longer required will be securely deleted or disposed of in accordance with applicable retention requirements and company policies.',
    ],
    bullets: [
      'Employment records',
      'Clock-in and clock-out records',
      'Attendance and scheduling records',
      'Training and certification records',
      'Employment-related documentation',
      'Incident or disciplinary records',
      'Other records required for legitimate business or legal purposes',
    ],
  },
  {
    id: 'contact',
    number: '04',
    title: 'Contact',
    paragraphs: [
      'For questions about account deletion, data retention, or personal information, please contact:',
      'United Link Security Agency LLC',
    ],
  },
];

export default function DeleteAccountPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white print:bg-white print:text-slate-950">
      {/* Background gradients and grid overlay - matches the premium dark theme aesthetic */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_25%_30%,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_32%)] print:hidden" />
      <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:42px_42px] print:hidden" />

      {/* Animated ambient blobs for visual depth */}
      <motion.div
        aria-hidden="true"
        className="absolute -left-16 top-14 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl print:hidden"
        animate={{ x: [0, 18, 0], y: [0, -20, 0], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute right-0 top-40 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl print:hidden"
        animate={{ x: [0, -22, 0], y: [0, 24, 0], opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12 print:max-w-none print:px-0 print:py-0">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_30px_120px_rgba(15,23,42,0.65)] backdrop-blur-xl print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none sm:p-7 lg:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
            {/* Sticky sidebar with summary, nav, and quick actions */}
            <motion.aside
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="print:hidden lg:sticky lg:top-8 lg:h-fit lg:w-80"
            >
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5 shadow-2xl shadow-black/30">
                <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  United Link Security Agency LLC
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Account Deletion Request</h1>
                <p className="mt-3 text-sm leading-6 text-white/72">
                  Request account deactivation or deletion for the United Link Group mobile workforce platform.
                </p>

                {/* Quick facts summary cards */}
                <div className="mt-5 grid gap-3">
                  {quickFacts.map((fact) => (
                    <div key={fact.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">{fact.label}</div>
                      <div className="mt-1 text-sm font-semibold text-white/88">{fact.value}</div>
                    </div>
                  ))}
                </div>

                {/* Primary action buttons */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    Back to login
                  </Link>
                  <a
                    href="mailto:info@unitedlinksecurity.com?subject=Account%20Deletion%20Request"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                  >
                    <Mail className="h-4 w-4" />
                    Request deletion
                  </a>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/82 transition hover:bg-white/10 hover:text-white"
                  >
                    <Printer className="h-4 w-4" />
                    Print page
                  </button>
                </div>

                {/* Important notice panel */}
                <div className="mt-6 rounded-[1.5rem] border border-amber-300/15 bg-gradient-to-br from-amber-400/12 via-white/5 to-rose-400/12 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 text-amber-200">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/80">Important</div>
                      <div className="mt-2 text-sm font-bold text-white">Employment records are retained</div>
                      <p className="mt-2 text-sm leading-6 text-white/68">
                        Account deletion does not remove employment, payroll, or compliance records required for legal,
                        regulatory, or legitimate business purposes.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick navigation */}
                <div className="mt-7 border-t border-white/10 pt-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Quick Navigation</div>
                  <nav className="mt-3 space-y-1 pr-1">
                    {sections.map((section) => (
                      <a
                        key={section.id}
                        href={`#${section.id}`}
                        className="flex items-start gap-3 rounded-2xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                      >
                        <span className="mt-0.5 text-[11px] font-semibold text-cyan-200/80">{section.number}</span>
                        <span>{section.title}</span>
                      </a>
                    ))}
                  </nav>
                </div>
              </div>
            </motion.aside>

            {/* Main content area */}
            <div className="min-w-0 flex-1">
              {/* Hero / intro banner */}
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
                className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-950/70 to-sky-950/60 p-6 shadow-2xl shadow-black/20 print:rounded-none print:border-b print:border-slate-200 print:bg-white print:p-0 print:pb-8 print:shadow-none sm:p-8"
              >
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                  <div className="max-w-3xl">
                    <div className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200/75">Account Deletion &amp; Data Retention</div>
                    <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-4xl">
                      How to request account deletion and what happens to your records
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-white/72 sm:text-base">
                      Follow the steps below to request account deactivation or deletion. Certain employment records
                      must be retained to comply with legal, regulatory, payroll, and audit requirements.
                    </p>
                  </div>

                  {/* Summary stat cards */}
                  <div className="grid gap-3 sm:grid-cols-3 xl:w-[340px] xl:grid-cols-1">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 print:border print:border-slate-200 print:bg-slate-50">
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">How to request</div>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white/85">
                        <Mail className="h-4 w-4 text-cyan-300" />
                        Email request only
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 print:border print:border-slate-200 print:bg-slate-50">
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Contact email</div>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white/85">
                        <Building2 className="h-4 w-4 text-cyan-300" />
                        info@unitedlinksecurity.com
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 print:border print:border-slate-200 print:bg-slate-50">
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">What to include</div>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white/85">
                        <Trash2 className="h-4 w-4 text-cyan-300" />
                        Account email + deletion request
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* Policy sections */}
              <section id="policy-sections" className="mt-6 space-y-5">
                {sections.map((section, index) => (
                  <motion.article
                    id={section.id}
                    key={section.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05 + index * 0.02, ease: 'easeOut' }}
                    className="group break-inside-avoid rounded-[1.6rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.22)] backdrop-blur-sm transition hover:border-cyan-300/20 hover:bg-white/[0.06] print:rounded-none print:border print:border-slate-200 print:bg-white print:shadow-none sm:p-7"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-400/10 text-sm font-black text-cyan-200">
                          {section.number}
                        </div>
                        <div>
                          <h3 className="text-xl font-black tracking-tight text-white">{section.title}</h3>
                          <div className="mt-1 h-px w-16 bg-gradient-to-r from-cyan-300/70 to-transparent" />
                        </div>
                      </div>
                      <a
                        href={`#${section.id}`}
                        className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40 transition group-hover:text-cyan-200"
                      >
                        Link
                      </a>
                    </div>

                    {/* Render paragraphs with special handling for contact email links */}
                    {section.paragraphs?.length ? (
                      <div className="mt-5 space-y-4">
                        {section.paragraphs.map((paragraph, pIndex) => (
                          <p key={pIndex} className="text-sm leading-7 text-white/74 sm:text-[15px]">
                            {paragraph === 'United Link Security Agency LLC' ? (
                              <span className="font-bold text-white">{paragraph}</span>
                            ) : paragraph.includes('not necessarily result in the deletion') ? (
                              <>
                                Because United Link Group is used to maintain employment and workforce records, requesting account deletion does{' '}
                                <strong className="text-white">not necessarily result in the deletion of all employment-related records</strong>.
                              </>
                            ) : (
                              paragraph
                            )}
                          </p>
                        ))}

                        {/* Inline call-to-action for the Requesting Deletion section */}
                        {section.id === 'requesting-account-deletion' && (
                          <div className="mt-5 rounded-2xl border border-cyan-300/15 bg-gradient-to-br from-cyan-400/10 via-white/5 to-fuchsia-400/10 p-5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/80">Contact</div>
                            <div className="mt-2 text-sm font-bold text-white">Email</div>
                            <a
                              href="mailto:info@unitedlinksecurity.com?subject=Account%20Deletion%20Request"
                              className="mt-1 inline-flex items-center gap-2 text-base font-semibold text-cyan-200 hover:text-white"
                            >
                              <Mail className="h-4 w-4" />
                              info@unitedlinksecurity.com
                            </a>
                          </div>
                        )}

                        {/* Inline contact block for the Contact section */}
                        {section.id === 'contact' && (
                          <div className="mt-5 rounded-2xl border border-cyan-300/15 bg-gradient-to-br from-cyan-400/10 via-white/5 to-fuchsia-400/10 p-5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/80">United Link Security Agency LLC</div>
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                              <a
                                href="mailto:info@unitedlinksecurity.com?subject=Account%20Deletion%20Question"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white"
                              >
                                <Mail className="h-4 w-4" />
                                info@unitedlinksecurity.com
                              </a>
                              <a
                                href="https://www.unitedlinksecurity.com"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white"
                              >
                                <Building2 className="h-4 w-4" />
                                www.unitedlinksecurity.com
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Bulleted list of retained records */}
                    {section.bullets?.length ? (
                      <div className="mt-5 grid gap-3">
                        {section.bullets.map((bullet, bIndex) => (
                          <div
                            key={bIndex}
                            className="flex gap-3 rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-3 text-sm leading-6 text-white/78 print:border-slate-200 print:bg-slate-50 print:text-slate-700"
                          >
                            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan-300" />
                            <span>{bullet}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </motion.article>
                ))}
              </section>

              {/* Final CTA section */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.22, ease: 'easeOut' }}
                className="mt-6 rounded-[1.75rem] border border-white/10 bg-gradient-to-r from-cyan-400/10 via-white/5 to-fuchsia-400/10 p-6 print:rounded-none print:border-t print:border-slate-200 print:bg-white print:px-0 print:pb-0 sm:p-7"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/75">Ready to request deletion?</div>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Send your deletion request by email</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                      Include the email address associated with your account and state that you are requesting account deletion.
                      We will respond through the appropriate business or compliance channel.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <a
                      href="mailto:info@unitedlinksecurity.com?subject=Account%20Deletion%20Request&body=Please%20delete%20my%20United%20Link%20Group%20account.%0A%0AAccount%20email%3A%20(your%20account%20email%20here)%0A%0AThank%20you."
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                    >
                      <Mail className="h-4 w-4" />
                      Email deletion request
                    </a>
                    <a
                      href="/privacy-policy"
                      className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/82 transition hover:bg-white/10 hover:text-white"
                    >
                      View privacy policy
                    </a>
                  </div>
                </div>
              </motion.section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
