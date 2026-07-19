'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, Printer, ShieldCheck } from 'lucide-react';

type PolicySection = {
  id: string;
  number: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

const quickFacts = [
  { label: 'Effective Date', value: 'July 19, 2026' },
  { label: 'Last Updated', value: 'July 19, 2026' },
  { label: 'Coverage', value: 'Website, mobile app, and related services' },
];

const sections: PolicySection[] = [
  {
    id: 'introduction',
    number: '01',
    title: 'Introduction',
    paragraphs: [
      `United Link Security Agency LLC ("United Link Security Agency," "Company," "we," "our," or "us") is committed to protecting your privacy and safeguarding your personal information. This Privacy Policy explains how we collect, use, disclose, store, and protect your information when you access or use our website, mobile application, and related services (collectively, the "Services").`,
      'Our Services are designed to support security operations, workforce management, incident reporting, scheduling, communication, and other related business functions. We process personal information only as necessary to provide these Services and in accordance with applicable laws and industry standards.',
      'By accessing or using our Services, you acknowledge that you have read and understood this Privacy Policy.',
    ],
  },
  {
    id: 'information-we-collect',
    number: '02',
    title: 'Information We Collect',
    paragraphs: ['Depending on how you use our Services, we may collect the following information:'],
    bullets: [
      'Personal Information: Full name, email address, telephone number, username, encrypted password, profile photograph, employee identification information, company or client information, and emergency contact information where applicable.',
      'Account Information: Login credentials, account preferences, user roles and permissions, and security settings.',
      'Operational Information: Shift schedules, attendance records, incident reports, patrol logs, status reports, check-in and check-out records, training records, certifications and licenses, and uploaded documents and images.',
      'Device Information: Device model, device operating system, browser type, application version, IP address, device identifiers, crash logs, performance diagnostics, usage statistics, and date and time of access.',
    ],
  },
  {
    id: 'location-information',
    number: '03',
    title: 'Location Information',
    paragraphs: [
      'With your permission, our Services may collect your precise or approximate location to support features including:',
      'Location information is collected only when necessary for authorized business purposes.',
      'You may disable location services through your device settings; however, some application features may not function correctly.',
    ],
    bullets: [
      'Officer check-in and check-out',
      'Patrol verification',
      'Site attendance',
      'Assignment verification',
      'GPS activity logging',
      'Emergency response',
      'Security reporting',
    ],
  },
  {
    id: 'camera-access',
    number: '04',
    title: 'Camera Access',
    paragraphs: [
      "Our application may request access to your device's camera to enable you to:",
      'Camera access is requested only when required and only after your permission has been granted.',
    ],
    bullets: [
      'Capture incident photographs',
      'Upload identification documents',
      'Submit site evidence',
      'Scan documents',
      'Update profile photographs',
    ],
  },
  {
    id: 'photo-library-access',
    number: '05',
    title: 'Photo Library Access',
    paragraphs: [
      'The application may request access to your photo library to allow you to:',
      'Access is provided only with your permission.',
    ],
    bullets: [
      'Upload incident images',
      'Upload supporting documentation',
      'Select profile pictures',
      'Attach files to reports',
    ],
  },
  {
    id: 'microphone-access',
    number: '06',
    title: 'Microphone Access',
    paragraphs: [
      'If voice recording or communication features are available, the application may request access to your microphone.',
      'Microphone access is requested only when necessary and only after your consent.',
    ],
  },
  {
    id: 'push-notifications',
    number: '07',
    title: 'Push Notifications',
    paragraphs: [
      'With your permission, we may send notifications relating to:',
    ],
    bullets: [
      'Shift assignments',
      'Schedule changes',
      'Emergency alerts',
      'Incident updates',
      'Company announcements',
      'System maintenance',
      'Security alerts',
      'Account notifications',
      'You may disable notifications through your device settings at any time.',
    ],
  },
  {
    id: 'how-we-use-information',
    number: '08',
    title: 'How We Use Your Information',
    paragraphs: ['We use your information to:'],
    bullets: [
      'Create and manage user accounts',
      'Verify user identity',
      'Authenticate access',
      'Manage employee scheduling',
      'Record attendance',
      'Process incident reports',
      'Track patrol activities',
      'Communicate with users',
      'Respond to customer support requests',
      'Improve application functionality',
      'Monitor application performance',
      'Detect fraud and unauthorized activity',
      'Protect users and company assets',
      'Comply with legal and regulatory requirements',
      'We use personal information only for legitimate business purposes.',
    ],
  },
  {
    id: 'information-sharing',
    number: '09',
    title: 'Information Sharing',
    paragraphs: [
      'United Link Security Agency LLC does not sell, rent, or trade your personal information.',
      'We may share information with:',
    ],
    bullets: [
      'Cloud hosting providers',
      'Payment processors',
      'Technology service providers',
      'Identity verification providers',
      'Analytics providers',
      'Law enforcement agencies where required by law',
      'Government regulatory agencies',
      'Legal advisors',
      'Auditors',
      'Information is shared only when necessary to provide our Services or comply with applicable legal obligations.',
    ],
  },
  {
    id: 'data-security',
    number: '10',
    title: 'Data Security',
    paragraphs: [
      'We maintain appropriate administrative, technical, and physical safeguards to protect your information.',
      'These safeguards include:',
    ],
    bullets: [
      'HTTPS encryption',
      'Secure cloud infrastructure',
      'Password hashing',
      'Role-based access controls',
      'Multi-factor authentication where available',
      'Database encryption',
      'Security monitoring',
      'Routine software updates',
      'Access logging',
      'Although we employ industry-standard security measures, no system can guarantee absolute security.',
    ],
  },
  {
    id: 'data-retention',
    number: '11',
    title: 'Data Retention',
    paragraphs: ['We retain personal information only for as long as necessary to:'],
    bullets: [
      'Provide our Services',
      'Maintain business records',
      'Meet contractual obligations',
      'Resolve disputes',
      'Comply with legal requirements',
      'Protect against fraud',
      'Enforce our agreements',
      'When information is no longer required, it is securely deleted or anonymized.',
    ],
  },
  {
    id: 'cookies',
    number: '12',
    title: 'Cookies and Similar Technologies',
    paragraphs: ['Our website may use cookies and similar technologies to:'],
    bullets: [
      'Maintain login sessions',
      'Remember user preferences',
      'Improve website functionality',
      'Analyze website traffic',
      'Enhance security',
      'Improve user experience',
      'You may manage cookies through your browser settings.',
    ],
  },
  {
    id: 'third-party-services',
    number: '13',
    title: 'Third-Party Services',
    paragraphs: ['Our Services may integrate with trusted third-party providers, including providers of:'],
    bullets: [
      'Cloud hosting',
      'Authentication',
      'Payment processing',
      'Push notifications',
      'Analytics',
      'File storage',
      'Mapping and location services',
      'These providers operate under their own privacy policies.',
    ],
  },
  {
    id: 'children-privacy',
    number: '14',
    title: "Children's Privacy",
    paragraphs: [
      'Our Services are intended for business use and are not directed to children under the age of 13.',
      'We do not knowingly collect personal information from children. If we become aware that such information has been collected, we will promptly delete it.',
    ],
  },
  {
    id: 'privacy-rights',
    number: '15',
    title: 'Your Privacy Rights',
    paragraphs: ['Subject to applicable law, you may have the right to:'],
    bullets: [
      'Access your personal information',
      'Correct inaccurate information',
      'Update your account information',
      'Request deletion of your information',
      'Withdraw consent where applicable',
      'Restrict certain processing activities',
      'Request a copy of your personal information',
      'Requests may be submitted using the contact information provided below.',
    ],
  },
  {
    id: 'account-deletion',
    number: '16',
    title: 'Account Deletion',
    paragraphs: [
      'You may request deletion of your account by contacting us at:',
      'Email: info@unitedlinksecurity.com',
      'Certain records may be retained where required by law, contractual obligations, regulatory requirements, fraud prevention, security investigations, or legitimate business purposes.',
    ],
  },
  {
    id: 'international-data-transfers',
    number: '17',
    title: 'International Data Transfers',
    paragraphs: [
      'Your information may be processed or stored in countries other than your country of residence. Where required by law, we implement appropriate safeguards to protect personal information transferred internationally.',
    ],
  },
  {
    id: 'changes',
    number: '18',
    title: 'Changes to This Privacy Policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time to reflect changes in our Services, legal requirements, or business practices.',
      'When material changes are made, we will update the "Last Updated" date and provide notice through our website, mobile application, or other appropriate communication channels where required.',
      'Continued use of our Services after changes become effective constitutes acceptance of the updated Privacy Policy.',
    ],
  },
  {
    id: 'contact-information',
    number: '19',
    title: 'Contact Information',
    paragraphs: [
      'If you have any questions regarding this Privacy Policy or our privacy practices, please contact us:',
      'United Link Security Agency LLC',
      'Email: info@unitedlinksecurity.com',
      'Website: https://www.unitedlinksecurity.com',
      'Mailing Address: United Link Security Agency LLC, #13811 Heatherstone Dr, Bowie, MD 20720, USA',
    ],
  },
  {
    id: 'app-store-compliance',
    number: '20',
    title: 'Apple App Store and Google Play Compliance',
    paragraphs: [
      'Our mobile application requests access only to the device permissions necessary to provide requested features. These permissions may include:',
    ],
    bullets: [
      'Location: Officer attendance verification, patrol monitoring, site check-ins, emergency response, and assignment tracking.',
      'Camera: Incident reporting, document capture, profile photographs, and evidence submission.',
      'Photo Library: Uploading images and documents.',
      'Microphone: Voice recording or communication features when used.',
      'Notifications: Shift assignments, emergency alerts, company announcements, and account notifications.',
      'Permissions are requested only when required and only after your consent. You may revoke permissions at any time through your device settings, although doing so may limit certain functionality.',
      'United Link Security Agency LLC does not sell personal information, does not engage in undisclosed data collection, and does not use personal information for purposes inconsistent with this Privacy Policy.',
      'We collect only the information necessary to provide, maintain, secure, improve, and support our Services. Personal information is handled responsibly and in accordance with applicable privacy laws and platform requirements.',
      'By using our website or mobile application, you consent to the collection, use, and disclosure of your information as described in this Privacy Policy.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white print:bg-white print:text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_25%_30%,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_32%)] print:hidden" />
      <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:42px_42px] print:hidden" />
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
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Privacy Policy</h1>
                <p className="mt-3 text-sm leading-6 text-white/72">
                  Privacy terms for our workforce platform, security operations services, and mobile application
                  permissions.
                </p>

                <div className="mt-5 grid gap-3">
                  {quickFacts.map((fact) => (
                    <div key={fact.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">{fact.label}</div>
                      <div className="mt-1 text-sm font-semibold text-white/88">{fact.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    Back to login
                  </Link>
                  <a
                    href="#policy-sections"
                    className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Read policy
                  </a>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/82 transition hover:bg-white/10 hover:text-white"
                  >
                    <Printer className="h-4 w-4" />
                    Print policy
                  </button>
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-cyan-300/15 bg-gradient-to-br from-cyan-400/12 via-white/5 to-fuchsia-400/12 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 text-cyan-200">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">Company Seal</div>
                      <div className="mt-2 text-sm font-bold text-white">Trusted privacy and operational data handling</div>
                      <p className="mt-2 text-sm leading-6 text-white/68">
                        United Link Security Agency LLC handles platform data for security operations, employee workflow,
                        and compliance-sensitive processes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-7 border-t border-white/10 pt-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Quick Navigation</div>
                  <nav className="mt-3 max-h-[420px] space-y-1 overflow-auto pr-1">
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

            <div className="min-w-0 flex-1">
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
                className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-950/70 to-sky-950/60 p-6 shadow-2xl shadow-black/20 print:rounded-none print:border-b print:border-slate-200 print:bg-white print:p-0 print:pb-8 print:shadow-none sm:p-8"
              >
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                  <div className="max-w-3xl">
                    <div className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200/75">Privacy, permissions, and data handling</div>
                    <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-4xl">
                      Clear privacy terms for workforce operations and mobile access
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-white/72 sm:text-base">
                      This page outlines how United Link Security Agency LLC collects, uses, protects, and discloses
                      information across scheduling, patrol operations, reporting, communication, attendance, and
                      mobile device features.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:w-[340px] xl:grid-cols-1">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 print:border print:border-slate-200 print:bg-slate-50">
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Core Promise</div>
                      <div className="mt-2 text-sm font-semibold text-white/85">We do not sell personal information.</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 print:border print:border-slate-200 print:bg-slate-50">
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Permissions</div>
                      <div className="mt-2 text-sm font-semibold text-white/85">Requested only when needed and with consent.</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 print:border print:border-slate-200 print:bg-slate-50">
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Support</div>
                      <div className="mt-2 text-sm font-semibold text-white/85">info@unitedlinksecurity.com</div>
                    </div>
                  </div>
                </div>
              </motion.section>

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

                    {section.paragraphs?.length ? (
                      <div className="mt-5 space-y-4">
                        {section.paragraphs.map((paragraph) => (
                          <p key={paragraph} className="text-sm leading-7 text-white/74 sm:text-[15px]">
                            {paragraph.startsWith('Website: https://') ? (
                              <>
                                Website:{' '}
                                <a
                                  href="https://www.unitedlinksecurity.com"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-cyan-200 hover:text-white"
                                >
                                  https://www.unitedlinksecurity.com
                                </a>
                              </>
                            ) : paragraph.startsWith('Email: info@unitedlinksecurity.com') ? (
                              <>
                                Email:{' '}
                                <a
                                  href="mailto:info@unitedlinksecurity.com"
                                  className="font-semibold text-cyan-200 hover:text-white"
                                >
                                  info@unitedlinksecurity.com
                                </a>
                              </>
                            ) : (
                              paragraph
                            )}
                          </p>
                        ))}
                      </div>
                    ) : null}

                    {section.bullets?.length ? (
                      <div className="mt-5 grid gap-3">
                        {section.bullets.map((bullet) => (
                          <div
                            key={bullet}
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

              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.22, ease: 'easeOut' }}
                className="mt-6 rounded-[1.75rem] border border-white/10 bg-gradient-to-r from-cyan-400/10 via-white/5 to-fuchsia-400/10 p-6 print:rounded-none print:border-t print:border-slate-200 print:bg-white print:px-0 print:pb-0 sm:p-7"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/75">Contact</div>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Questions about privacy?</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                      Reach out for privacy requests, account deletion requests, or policy questions. We will respond
                      through the appropriate business or compliance channel.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <a
                      href="mailto:info@unitedlinksecurity.com"
                      className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                    >
                      Email support
                    </a>
                    <a
                      href="https://www.unitedlinksecurity.com"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/82 transition hover:bg-white/10 hover:text-white"
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      Visit website
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
