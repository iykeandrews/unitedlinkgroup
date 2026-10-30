# Mobile release reminders

The mobile app checks `/api/mobile-release?platform=ios|android` when opened or brought to the foreground. Checks fail quietly offline and never block sign-in. A reminder appears once per app session for a newer released version, with Update and Later actions.

iOS defaults to the public Apple App Store version for bundle `com.unitedlinkgroup.mobile`. TestFlight and unpublished builds are not advertised automatically.

For Android, or a deliberately distributed TestFlight release, configure these Render API environment variables **after the build is available to the intended users**:

- `MOBILE_ANDROID_LATEST_VERSION`: published semantic version, such as `1.0.3`
- `MOBILE_ANDROID_UPDATE_URL`: the HTTPS Google Play or approved installation link
- Optional iOS overrides: `MOBILE_IOS_LATEST_VERSION` and `MOBILE_IOS_UPDATE_URL`

Both version and URL are required for an override. Missing or invalid release metadata produces no reminder. Never set the latest version to a local development version or a queued build. Installing the mobile code containing this reminder is necessary before that installation can check future releases.

This change does not build, upload, or publish a mobile binary.
