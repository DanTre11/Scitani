# Cloudflare production 1.5.0

Production uses the existing `scitani-dopravy-candidate-v130` Worker and D1 database configured in root `wrangler.jsonc`. The historical name is intentional. Do not replace the database binding or import a development database.

Workers Builds is currently connected to `cloudflare-1.4.0`. For this release, merge the reviewed Develop-1.5.0 changes into main, then fast-forward the connected deployment branch to the same tested commit. The release includes the previous production branch in its ancestry. No schema migration or account/history rewrite is required: categories and direction modes use the existing session JSON. Old sessions retain the four road categories.

The root configuration preserves dashboard-managed domains and environment variables. Only explicitly listed images, the font and its license are staged into `.cloudflare-assets`; frontend text assets are embedded in the Worker. The Worker allowlist blocks source, test, database and configuration files.

Build: `node cloudflare/prepare-deploy.mjs` (also run automatically before Wrangler deployment).
Test: `node cloudflare/test-worker.mjs` (Node 24 SQLite adapter); `node --test tests/*.test.js`.
Browser: `WORKER_TEST=1 BROWSER_CHANNEL=msedge node tests/browser-v1.5.cjs` with Playwright available. This starts an isolated in-memory D1 adapter, with real production Worker routing, validation and pagination.

Expected `/health`: version `1.5.0`, storage `cloudflare-d1`, build `v1.5.0-school-20261002`.
After deployment, verify health, official school assets, an isolated road/tram session with two participants, admin statistics, Excel, and preserved accounts/archive. Close the release test session afterward. A successful commit alone is not proof of deployment.

Local validation: all 18 Node tests and the D1 regression suite passed, covering category subsets/tram-only, legacy sessions, roles, two participants, record retries/undo, pagination, payroll and 10/20 minute inactivity. The production Worker browser suite passed with offline queue, Excel and cached branding/PWA. Wrangler 4.138.0 available on the workstation passed a dry run; Workers Builds uses the pinned 4.146.0 dependency.

Rollback: the previous production deployment/commit is `d4400936bb175d10084b63ebd2f4cff17c195d3b`. Prefer Cloudflare deployment rollback for operational faults. Since 1.4 cannot accept tram records, do not roll back during active 1.5 tram sessions without coordinating their completion. Existing data must never be reset.
