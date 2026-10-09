# VPS Gemini bridge readiness — 2026-10-09

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

No real image generation was executed. Health does not prove that the Google
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
