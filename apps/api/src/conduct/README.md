# Complaints, officer queries and customer tickets

## Access and history

Business administrators, managers and super administrators manage cases under Insights. Employees can access only issued queries attached to their own employee record. Draft queries, complaints, customer contact details and internal investigation notes are excluded from the employee response payload using an explicit field allow-list.

Every action appends an event. Status changes use an optimistic version check inside the same transaction as the event, so concurrent updates cannot silently overwrite a decision. Issued allegations cannot be rewritten; updates are recorded as notes. Acknowledgement is receipt, not agreement. No case action changes payroll, deductions or employment status automatically.

Complaint resolutions and Customer Update events appear on the customer's private tracking page. Corrective actions, root causes, officer responses, disciplinary queries and internal notes do not appear there. Query decisions and shared notes appear on the employee's web/mobile view. There are no public case-number searches and no case deletion endpoint.

## Public complaint link and bot protection

The Customer Complaints page provides Get & copy complaint link. This creates one random portal key per business. Customers receive a unique ticket reference and an unguessable private tracking URL. Only a hash of the tracking capability is stored. Retries use a UUID submission key to prevent duplicate tickets and duplicate receipt emails.

Configure Render before sharing the form:

- `TURNSTILE_SITE_KEY`: the public Cloudflare Turnstile widget key.
- `TURNSTILE_SECRET_KEY`: the matching private key, kept only on the server.
- Register `www.unitedlinkgroup.com` for the widget.
- Optional `TURNSTILE_ALLOWED_HOSTNAMES`: comma-separated verified hostnames when supporting additional web domains.
- Optional `PUBLIC_WEB_URL`: canonical web origin; defaults to `https://www.unitedlinkgroup.com`.
- `JWT_SECRET` must already be configured. It is used to derive tracking capabilities; existing tracking links are verified against their persisted hashes.
- Existing SMTP settings power customer ticket acknowledgements, as they do invoice/report emails.

Submissions are closed until server-side verification is configured. Siteverify must approve the token for the expected hostname and `complaint` action. Expired or replayed challenges are rejected by the provider. Production does not enable universal Turnstile test keys. A honeypot, five submissions per IP per ten minutes, and a three-ticket-per-email-per-hour limit add abuse controls. No anti-bot service guarantees that every automated attempt can be prevented.

If the mail service fails after saving, the ticket remains saved and the customer is explicitly shown that email delivery failed, with the ticket number and private tracking link on screen. Receipt delivery is recorded in the internal case history; an HTTP retry never silently creates another case or sends another confirmation.

## Database and release

The schema change adds one nullable business portal-key column, two case/history tables and their indexes/foreign keys. `apps/api/tests/conduct-schema-additions.sql` is a reviewed schema diff, not a script executed by the feature. Existing production startup uses Prisma schema deployment. Existing business, employee, payroll and invoice values are not rewritten.

Web/API deployment does not publish the mobile app. The My Queries screen and notification navigation require a later authorized mobile release.
