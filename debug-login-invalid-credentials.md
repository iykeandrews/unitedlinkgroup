[OPEN] Mobile login returns invalid credentials or server error

## Session
- Session ID: `login-invalid-credentials`
- Date: 2026-07-17
- Symptom: Mobile app login shows invalid credentials or server error.

## Hypotheses
1. The mobile app is calling the wrong API host or unreachable API environment.
2. The request payload differs from what the backend login endpoint expects.
3. The backend now requires `officialEmail`, but the entered email is not matching the employee's official email.
4. The backend throws an exception during login and the app surfaces it as a generic server error.
5. The app is receiving a real 401/500 response, but the current client handling obscures the underlying cause.

## Evidence
- Expo mobile app now opens successfully in Expo Go.
- Mobile API base URL is configured through `EXPO_PUBLIC_API_URL`.

## Next Steps
- Inspect current mobile auth request code and runtime logs.
- Verify the configured API URL and login request path.
- Observe live Metro logs during a reproduced login attempt.
