# Production login incident: 2026-10-08

## Evidence and root cause

Production `/login` was reachable (HTTP 200). Backend `/api/health` reported a connected database. The configured production backend `https://i-track-backend-b72a.onrender.com/api/auth/me` returned HTTP 404 with `Route GET /api/auth/me was not found.` at 2026-10-08T04:50:44.557Z.

Commit `889d739` added a second server-side `/auth/me` verification call in `app/api/auth/session/route.ts`, after `/auth/login` had already succeeded. Every unsuccessful response was converted to HTTP 401 `Please sign in again`, so the client reported successful authentication followed by failed session initialization. The changes were pushed into the web repository's `backend/` directory, while the local workspace has a separate backend repository (`vperalta-git/i-track-backend`). The deployed API still lacks the added endpoint; the separate deployment target explains how these versions could diverge, though hosting configuration itself was not accessible. The observed endpoint absence confirms incompatible frontend/backend deployments; hosting settings were not accessible for inspection.

This is session creation failure, before the HttpOnly cookie is set. The evidence does not implicate credentials, browser cookies, CORS, or password-change routing.

## Fix

- `/api/auth/login` performs a server-to-server backend login and signs the HttpOnly web cookie from that trusted response in the same request. Initial login does not depend on `/auth/me`. Client-supplied identity, role, and password-change flags cannot mint a session.
- All server-side API forwarding resolves the same backend URL.
- Session refresh after password change continues to verify `/auth/me`; backend errors retain their distinction from rejected credentials.
- Logout uses the backend token stored in the signed HttpOnly cookie, revokes the API session before clearing the cookie, and reports retryable service failures.
- Production signing requires a configured secret; the public hard-coded fallback was removed. Unknown roles cannot fall back to administrator access.
- Existing API account guards, GPS monitoring, outage notifications, and mandatory password changes remain. The API initializes the persistent session collection at startup.

## Deployment configuration

Frontend service:

- Deploy `vperalta-git/itrackweb`, branch `main`, root directory `.`. Build `npm ci && npm run build`; start `npm start` (hosting provider supplies its port).
- Set `AUTH_SESSION_SECRET` to a strong randomly generated secret (at least 32 random bytes), identical across frontend instances and stable across restarts. `NEXTAUTH_SECRET` is an accepted existing alternative. Never commit or publish its value. Rotating it invalidates existing web cookies.
- Set `BACKEND_URL` to `https://i-track-backend-b72a.onrender.com/api` or the actual deployed API URL. Keep `NEXT_PUBLIC_API_URL` pointed at the same API.

Backend service:

- Deploy the existing `vperalta-git/i-track-backend` service from its `main` branch, root directory `.`; alternatively explicitly configure the web repository with root directory `backend`. Copying source into the web repository alone does not redeploy the existing service.
- Preserve its existing `MONGODB_URI` and `MONGODB_DB_NAME` configuration. The database user must be allowed to create/read/write the `authsessions` collection and indexes. `MONGODB_AUTO_CREATE_COLLECTIONS=true` enables startup collection creation (the default). Do not enable `MONGODB_AUTO_SEED` in production.
- Keep `CLIENT_ORIGIN` allowing `https://itrackpasig.site` and the supported mobile clients as required by their existing configuration. The web login uses same-origin requests and server-to-server API calls.
- Verify `GET /api/auth/me` without a token returns **401**, rather than 404; with a valid token it must return the active authenticated user, even when a password change is required.

Deploy both services and have existing users sign in again after the update. Do not create new production accounts for testing without authorization.

## Verification limits

Automated tests use isolated backend/database fixtures and the real controller, route, cookie-signing, and routing code. They do not use production credentials. All six implemented backend roles authenticate; only admin, supervisor, manager, and sales_agent have web dashboards. Driver and dispatcher remain mobile roles.

Production credentials and hosting administration access were not supplied. Successful real-account production login, deployment completion, and production environment settings cannot be claimed from unit tests or a git push. GitHub Actions reported no workflow runs during investigation.


## Local validation results

- `npm test`: 19 passing tests, covering all six backend roles, web-role admission, cookie creation/signature verification, first-login password change, refresh persistence, API restrictions, logout, invalid credentials, and GPS outage notification regression.
- `npm run build`: passed. The existing Next.js configuration skips TypeScript validation; the separate `npx tsc --noEmit` run reports unrelated existing type errors in allocation/audit and API data adapters. No errors were reported in the modified authentication files.
- `npm run test:production`: passed against the actual built Next.js production server and a local backend fixture. Tested successful login even when `/auth/me` is absent, rejected credentials, Secure/HttpOnly/SameSite cookies, dashboard refresh, cross-role redirection, first-login profile access, logout, and anonymous denial.
- Backend tests also passed from the existing backend deployment checkout. Backend syntax checks and `git diff --check` passed.

Modified web files: `app/(auth)/login/page.tsx`, `app/api/auth/login/route.ts`, `app/api/auth/session/route.ts`, `app/api/backend/[...path]/route.ts`, `components/app-navbar.tsx`, `lib/api-base-url.ts`, `lib/backend-auth.ts`, `lib/server-auth-session.ts`, `lib/session.ts`, `package.json`, `tests/auth.test.cjs`, `tests/production-auth-smoke.cjs`, `README.md`, and this report. Included backend updates: `backend/src/server.js` and `backend/tests/authFlow.test.js`.
