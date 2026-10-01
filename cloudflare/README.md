# Cloudflare 1.4.0

`worker-release-1.4.0.mjs` is the complete module to paste into the existing Cloudflare worker editor as worker.js. It embeds the 1.4 frontend, CSS, manifest and service worker; icons and legacy assets continue through the existing ASSETS binding. Keep the current DB/ASSETS bindings, domains and nodejs_compat configuration.

The backend is adapted from the supplied deployed 1.3 Worker. It keeps authentication, account roles, pagination, origin checks, historical archive and D1 persistence. No schema migration is needed: activity and finish reason use existing JSON data columns. Existing sessions fall back to last record or join time. Reminder: 10 minutes; finish: 20 minutes total. Session end records finish times for active participants.

Build: `python cloudflare/build-release.py`
Test (Node 24): `node cloudflare/test-worker.mjs`

Tests run against in-memory SQLite through a D1-compatible adapter. Real Cloudflare execution and deployment still require verification. After deployment, check /health reports 1.4.0 and cloudflare-d1, then check a new count on two devices. The previous Cloudflare deployment remains available for rollback.
