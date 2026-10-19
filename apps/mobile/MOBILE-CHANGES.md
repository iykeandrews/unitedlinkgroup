# Mobile updates awaiting release

No mobile build, export, publication, or deployment was performed.

These changes require the matching API release and the additive MobileSession database table before a future mobile release. The normal server startup applies the canonical Prisma schema; do not release the new mobile login against the previous API. Existing web authentication remains unchanged. SecureStore and the Face ID permission plugin require a future native build.

Implemented: validated session restoration, securely stored rotating refresh tokens, optional biometric unlock, account-specific attendance history with approved hours and estimated gross earnings, server-published announcements and SOPs, profile error recovery and removal of Lock controls, and authenticated PDF download/share with file validation.

Attendance earnings are estimates before taxes using approved timesheets, unpaid breaks, weekly overtime and available historical rate records. Salary or unavailable rate information links the worker to final payslips. Final pay always uses persisted paid payroll records. SOP reading does not replace legally required signed acknowledgements.

Checks: API and mobile TypeScript checks with no output; API mobile_regression.ts covering session rotation, replay, inactive accounts, expiry, password changes, revocation and attendance calculations; mobile files-regression.cjs covering PDF validation, native sharing mocks, download renewal and external-host credential isolation.

Before release, test on real iOS and Android devices: cold launch, offline resume, biometric success/cancel/unavailable, password change and sign-out, announcements/SOP publication, overnight attendance, and PDF Save/Share. No real-device testing has been performed in this session.

## Team operations

Admins and superadmins open Team operations from Schedule. Supervisors, managers and lieutenants open the team icon on their personal Schedule. The server checks current database roles rather than trusting a mobile label. Field-leader titles are recognized from assigned roles or departments, including Lieutenant / Leutenant. Their view is read-only and limited to locations on their published/completed shifts for the selected work-site date; overnight assignments cover both dates. Draft schedules remain visible only to administrators.

Operations offers a date picker, location / name / worker-ID / attendance-status filters, running attendance, clock-in and clock-out for any active officer in the selected business, paid/unpaid break controls, time corrections with reasons, and approval of completed pending attendance. Attendance corrections preserve the recorded work-site time zone and existing seconds. Invalid, overlapping or future attendance is rejected; already paid payroll and externally paid history are protected. Clock-out no longer truncates the planned schedule.

Clock-in, clock-out, break-start and break-return events create administrator inbox and native/web push notifications. Missing clock-in alerts begin after a five-minute grace period, run every minute and use deterministic notification IDs to prevent duplicate alerts for the same shift/recipient. Administrators receive events for their business; superadmins receive events across businesses. Supervisor access does not grant attendance-writing or payroll access. Mobile data refreshes every 15 seconds while the screen is open, and on foreground. Push taps open operations after authentication, including a cold launch. Device registration is awaited, and sign-out unregisters only the current device where connectivity permits.

Additional checks: mobile_operations_regression.ts for access scope, notifications, paid-time protection and attendance correction; operations-time-regression.cjs for time-zone and daylight-saving cases; existing 31 Time/Sites/Attendance checks. Native notification delivery, lock-screen behavior, picker behavior and touch workflows still require real iOS/Android verification before release. No build or deployment was performed.
