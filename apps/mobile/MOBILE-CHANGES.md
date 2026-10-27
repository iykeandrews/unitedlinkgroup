# Mobile updates awaiting release

The implementation phase preserved the no-build instruction. Builds were subsequently authorized on 10/19/2026.

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

## Release authorized 10/19/2026

Backend changes are deployed. Signed Android APK (build 12), Android Play Store AAB (build 13), and iOS 1.0.1 IPA (build 15) finished successfully in Expo. APK/AAB download endpoints were verified. Apple upload submission 4a18dd9a-3f3e-4097-ab8d-32a53d74a26d is queued; the update is not yet published on the App Store. Google Play upload is left to the owner as requested. Android background push remains dependent on supplying Firebase google-services.json; in-app attendance alerts are available.

## Paystub download fix 10/27/2026

Native PDF validation now reads the five signature bytes using Base64. Expo's legacy file reader ignores position and length for UTF8, which made a valid complete PDF fail the previous exact-signature check. The download and original payroll records are unchanged.

Checks passed: mobile TypeScript; file regressions using complete PDF contents and the native reader's actual partial-read semantics on iOS and Android; session renewal; invalid-file rejection; and external-host credential isolation. Device Save/Share still needs verification after installing the new binary. This app does not have an OTA update mechanism.

Android store AAB build 14: d1ab6626-8129-46de-acca-b9dd355f7e86. Android direct-install APK build 15: 40b6d5b8-741b-4957-a0d0-64eab2e16f53. Both contain the fix. Google Play submission remains with the owner.

iOS version 1.0.2 build 17: 8aab1a84-153c-42e3-a46c-1c1e4aedfdb5. Apple upload submission: 42eccabe-9b2f-49a2-8e23-342a48ee640b. Version 1.0.1 build 16 is superseded and must not be submitted because 1.0.1 is already live. No new TestFlight tester group or invitation was created.

The signed iOS 1.0.2 build is complete. Android builds and the iOS upload were accepted but are waiting in Expo's Free-plan queues. A bounded release check in `tmp/mobile-paystub-fix/finish-testflight.cjs` links only build 17 to the pre-existing internal group after Apple reports it VALID. It does not invite testers or publish an App Store version. Current completion status is recorded privately in `tmp/mobile-paystub-fix/testflight-completion.json`.
