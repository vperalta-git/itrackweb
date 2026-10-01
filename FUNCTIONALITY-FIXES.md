# Functionality failure fixes

## Findings and changes

1. Preparation: the web page took the maximum of elapsed predicted time and checklist completion, and forced terminal statuses to 100%. The data mapper already derived checklist progress. All web progress displays, cached records, exports, and release eligibility now use the same checklist completion helper; empty lists produce 0%. ETA remains an estimate. Checklist editing stays with mobile dispatchers; existing role checks are unchanged. Backend status, timestamps and submitted progress are separate stored fields; no records or statuses were bulk changed.
2. Driver Allocation map: shared CDN loader cached rejected promises permanently and retained failed script elements. It now shares concurrent loads, removes failures, resets rejected promises, times out and supports retry. Map configuration is fetched again on retry. Constructor/resource failures have explicit errors, and owned map instances, markers and initialization timers are cleaned up.
3. Live Tracking map: uses the same fixed component. Missing/invalid coordinates are ignored. Only valid currentLocation coordinates are treated as GPS; dispatch pickup/destination coordinates are labelled as fallback rather than interpolated vehicle positions. No-active-route maps retain their default view.
4. Remaining distance: cards used Haversine current-to-destination distance or route-length times estimated remaining progress. Details independently fetched driving-route distance from /api/maps/route. Both now use one coordinate-keyed response in kilometres for each active route. Selection cannot reuse another route's distance; updates and Refresh invalidate requests, abort obsolete fetches and update both displays. Missing/failed distances are unavailable, never fabricated zero. Without GPS, the full pickup-to-destination driving distance is labelled dispatch route distance. Existing ETA/progress estimates retain their separate meanings.

## Map diagnosis evidence

The exact original browser download failure is unconfirmed. The old error is emitted by the script error event before map construction, not by token authorization. Direct external probes returned HTTP 200 for the exact v3.5.1 JavaScript URL, production root and map configuration, and the configured streets-v12 style with a production Referer. The deployed CSP permits api.mapbox.com scripts/styles/connections and blob workers, consistent with https://docs.mapbox.com/mapbox-gl-js/guides/security-and-testing/. Tokens were not printed or committed. The test browser's network/content restrictions and console need inspection if the initial download error persists; changing provider would not be evidence-based.

## Validation

- npm test: four regression tests pass (checklist cases; distance units, snapshot keys and unavailable values; shared loader failure/retry; timeout/missing-global handling).
- Production build: passes with process-spawning permission outside the sandbox. The existing configuration skips TypeScript build validation.
- TypeScript: 64 errors in committed baseline and 64 with changes, no new diagnostics in comparison. Existing unknown API response types and AuditAction errors remain.
- npm run lint: blocked because ESLint is neither installed nor declared/configured in this project.
- git diff --check: passes.
- No browser automation tool or installed browser harness was available. Authenticated record GGG3435, Bradd Pitt's delivery, and rendered maps were not visually retested. HTTP probes are not end-to-end verification.
- Live deployment and production retesting after push are not verified.

The backend is a separate checkout/repository (vperalta-git/i-track-backend). Its preparationsController normalizePreparationPayload persists submitted progress independently of dispatcherChecklist; server-side enforcement of checklist-derived stored progress would require a separate backend change. This frontend consistently uses checklist data and leaves server records and dispatcher/mobile permissions intact.
