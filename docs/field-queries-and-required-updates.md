# Field queries and required app updates

Managers and supervisors can issue employee queries from Team Operations. Access is checked against the database, scoped to the business and creator, and excludes customer complaints and internal notes. Retried submissions are idempotent. Existing officer response and audit workflows are preserved.

Published native apps check the public release metadata at launch, login, foreground, hourly and when an update notification is opened. A required update blocks navigation without a dismiss option. Cached requirements remain enforced offline. The separate private preview is exempt so local testing remains available.

Two nullable ExpoPushToken columns (platform and appVersion) enable targeted, deduplicated update notices. Only outdated devices with known installed versions are notified. Android metadata must identify an actually published Play release; iOS can use the public Apple lookup. No unpublished version should be advertised. Older installed clients cannot gain this gate until the next authorized mobile release.

Validation uses mocked employees and notification delivery; no production queries or notifications were created. Mobile changes remain unpublished. The central web Certifications document-view correction is included in the pending web/API release.
