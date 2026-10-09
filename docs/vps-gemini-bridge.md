# VPS Gemini bridge readiness and recovery — 2026-10-09

## Current recovery: production image verified

Application and bridge release `d8c6c7f`; Edge `generate-look` version 53 ACTIVE.
The previous seven failed jobs reported bridge HTTP 502. Authenticated private
health returned 503: the Web account session was no longer AVAILABLE, despite
the container remaining running without restarts. This was not a Studio layout
or collection error.

The owner's previously authorized two-cookie transfer was refreshed privately
from the configured local session, which initialized AVAILABLE. Only the two
Google cookies in `/etc/vremix/bridge.env` changed; gateway and bridge keys were
preserved. No entire profile, OAuth secret or Management token was transferred.
Authenticated health returned 200 after the refresh and after deployment.

Bridge now fails before generation when a renewed session is still unavailable;
known failures carry allowlisted codes through Edge to friendly Studio messages.
No raw provider output is persisted for bridge failures. Ambiguous timeouts are
not automatically retried; temporary source references still get removed.

After the owner explicitly authorized **one** real generation test in chat,
`tests/vps-generation-once.php --live --allow-one-image` exercised the public
anonymous PHP gateway, signed Edge request, bridge, generation and Storage.
Job `d155779a-4f80-4d58-968c-700d34771e6c` completed with one real generated image,
1376 × 768, verified by decoding Storage's HTTP-200 image response. No face image
was uploaded and no collection/account was changed. The anonymous QA job and
its generated asset remain as evidence; no user's earlier jobs were retried.

20 Deno tests/check, all CJS suites, bridge group/framing/readiness tests, PHP
lint/plan/HMAC tests and production gateway/TLS/private-route/media smoke tests
passed. Edge still has `verify_jwt=false` paired with the independent HMAC guard;
missing and tampered signatures remain rejected. Only this app's PHP and bridge
containers were recreated; unrelated VPS services were untouched.

This verifies the current one-person/no-face production path, not every outfit,
multi-person identity preservation, cultural correctness, or guaranteed provider
uptime. Web cookies still expire. Private manual renewal is an operational
repair, not permanent production authentication; use an official provider API
with provisioned quota/billing for durable credentials.

## Initial deployment record (historical)

Deployed application release: `0ab555d`; Supabase `generate-look` version 51,
ACTIVE, retaining `verify_jwt=false` and enforcing the separate HMAC gateway.
Project: `olruribsleltmafkdwuf`. Shared runtime image provider changed from
`env` to `webapi`; generation remains enabled. Other models, video settings,
budgets, catalog, accounts and collections were not changed.

The account owner explicitly authorized transferring the two existing Google
session cookies from the Mac bridge to this VPS. Cookies are only in private
`/etc/vremix/bridge.env`, UID/GID 10002, mode 0600. No browser profile or CLI
Management token was transferred. Edge received only the dedicated gateway
secret, bridge secret and bridge HTTPS URL. No credential values are recorded
here, in source control, or in bridge/access logs.

`vremix-bridge` uses a pinned Python base digest and Gemini-API commit, runs
non-root with a read-only filesystem, and binds host `127.0.0.1:8791` only.
Existing host port 8788 belongs to `nidez-telegram-bot` and was preserved.
The separate bridge compose project is `vremix-bridge`. Existing containers
were left untouched; only `vremix-php` was recreated for this application.

## Verified evidence

- 16 Deno tests and TypeScript checks passed, including the PHP/Edge fixed
  HMAC vector, tamper rejection and the three-minute clock window.
- PHP gateway test, affected PHP lint, bridge group/temporary-file contract,
  and HTTP authentication/framing tests passed offline.
- Bridge authenticated health over verified HTTPS returned authenticated true;
  calls without a bridge key returned 401. Container remained running with
  zero restarts during readiness checks.
- Signed Edge GET for a nonexistent fixture job returned 404 `Job not found`,
  proving the guard and database read work. Missing/tampered signatures returned
  403; invalid POST returned 400 before any generation job could be created.
- `tests/vps-gateway-smoke.php --live` used an anonymous Studio session, its CSRF
  token, and intentionally invalid planning. The real public PHP gateway reached
  Edge validation (400), while missing CSRF was denied (403). No AI calls.
- `tests/vps-smoke.php --live` passed HTTPS, pages/assets, Edge route selection,
  cookie flags, private-file denial, collection authentication and media ranges.
- This site's Nginx configuration validated before reload. Secret file modes
  and loopback-only listening were checked without printing values.

At this initial deployment, no real image generation was executed. Health does not prove that the Google
account can generate images, that its quota is available, or that provider
output meets the requested canvas/identity requirements. Real generation still
needs a separately authorized user action/test. Cookies may expire and are not
a permanent production credential; refresh privately, or use the official
provider API with its own billing/quota.

## Operational handoff

Run the private readiness helper using a disposable root PHP container,
mounting `/etc/vremix` read-only at `/run/vremix`, as described in
`deploy/vps/README.md`. Never print the mounted environment files. Retained
root-private backups for the prior app environment and this site's Nginx
configuration have the suffix `before-97686bb`. Prior application release
`a5fb10f` is retained. Application/Edge rollback must be coordinated because
the old PHP source cannot create HMAC signatures for the new Edge guard.

Google Auth Admin writes still require a separate Supabase Management token;
that token was not provisioned by this bridge task. Google OAuth login and
image-provider session authentication are different systems.
