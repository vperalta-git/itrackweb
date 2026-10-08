# I-TRACK

This repository contains the complete I-TRACK application:

- The repository root is the Next.js web app. Run `npm ci` and `npm run dev` here.
- `backend/` is the Express and MongoDB API. Run `npm ci` and `npm run dev` there. Configure its environment using `backend/.env.example`.
- `mobile/` is the Expo mobile app. Run `npm ci` and `npm run dev` there. See `mobile/README.md` for platform setup.

Web checks: `npm test`. Backend regression checks: `node backend/tests/accountAccess.test.js` and `node backend/tests/authFlow.test.js`. Built-server authentication smoke test: `npm run test:production`. Mobile type check: run `npx tsc --noEmit` in `mobile/`.

New accounts must change their initial password before accessing application APIs. Existing sessions issued before persistent API sessions were introduced must sign in again.

Active-trip GPS monitoring runs every minute. It alerts tracking users after five minutes without an update, or two minutes after trip start without any GPS update. Each outage triggers one alert; a fresh accepted GPS update rearms it.

Production login configuration and incident findings: [docs/auth-login-incident.md](docs/auth-login-incident.md).
