# Cloudflare 1.4.0

`worker-release-1.4.0.mjs` is the complete module to paste into the existing Cloudflare worker editor as worker.js. It embeds the 1.4 frontend, CSS, manifest and service worker; icons and legacy assets continue through the existing ASSETS binding. Keep the current DB/ASSETS bindings, domains and nodejs_compat configuration.

The backend is adapted from the supplied deployed 1.3 Worker. It keeps authentication, account roles, pagination, origin checks, historical archive and D1 persistence. No schema migration is needed: activity and finish reason use existing JSON data columns. Existing sessions fall back to last record or join time. Reminder: 10 minutes; finish: 20 minutes total. Session end records finish times for active participants.

Build: `python cloudflare/build-release.py`
Test (Node 24): `node cloudflare/test-worker.mjs`

Tests run against in-memory SQLite through a D1-compatible adapter. Real Cloudflare execution and deployment still require verification. After deployment, check /health reports 1.4.0 and cloudflare-d1, then check a new count on two devices. The previous Cloudflare deployment remains available for rollback.

## Payroll release 2026-10-02
Expected health marker: `build: "v1.4.0-payroll-20261002"`. The embedded final screen and Excel share work-summary.js. Join, manual finish and session end use server timestamps; repeated finish requests preserve the first result. Inactivity is reconciled on requests at last activity + 20 minutes, including session reads without a participant heartbeat. A sleeping Worker has no periodic timer; reconciliation persists the exact deadline on the next request.

Validation: syntax check, SQLite/D1 adapter regression tests (including stored session ends before/after inactivity deadlines), and all 10 Node/frontend/Excel tests passed. The existing Render test verified the shared frontend earlier; this does not validate Cloudflare production.

Production deployment: Workers Builds is connected to cloudflare-1.4.0. The root wrangler.jsonc targets the existing scitani-dopravy-candidate-v130 Worker and the existing DB UUID supplied from its dashboard. The default deploy command is npx wrangler deploy. No D1 migration or historical data rewrite is performed. Routes are intentionally omitted so dashboard-managed domains remain unchanged. Only the two public icons are staged as ASSETS; application assets are embedded in the reviewed release. Runtime variables are preserved with keep_vars. Verify /health build v1.4.0-payroll-20261002 after each deployment; a commit alone is not proof of deployment.

Deployment validation: pinned Wrangler 4.146.0; wrangler deploy --dry-run successfully bundles the Worker and reports the existing DB plus the ASSETS binding. No credentials are stored in this repository.
