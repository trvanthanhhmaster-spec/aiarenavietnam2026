# Verified deployment — 2026-10-09

- Public URL: https://v-remix.vietnamsir.com/
- Studio: https://v-remix.vietnamsir.com/studio.php
- Runtime release: `a5fb10f`; immutable source under
  `/opt/vremix/releases/a5fb10f`, active symlink `/opt/vremix/current`.
- Host: 160.30.160.101, SSH port 8686. No credentials are recorded here.
- Isolated Docker container `vremix-php`, UID/GID 10001, PHP 8.3.35,
  read-only source, capabilities dropped, 384 MiB RAM limit.
- FastCGI listens only on host loopback 127.0.0.1:9183. Existing hosting PHP
  pools and application containers were not modified.
- Base image pinned to
  `php@sha256:454b11c8907e32878ce92e87b13c14e1bbe6e1b10f4f96d4a19c9b62ec675d41`.
- Let's Encrypt certificate expires 2027-01-06; existing renewal timer is
  enabled, and certificate deploy hooks validate/reload Nginx.
- Supabase project remains `olruribsleltmafkdwuf`. Auth's canonical Site URL
  changed from `http://localhost:3000` to the public HTTPS origin. Redirect
  allowlist includes this origin plus the existing localhost development origins.
- Server secrets are mounted read-only from `/etc/vremix/app.env` (0600,
  private parent directory). Mac-only Gemini Web secrets/cookies were not copied.
- Nginx configuration backup retained at
  `/opt/vremix/backups/nginx-before-20261008T221633Z.tar.gz` (root-only).

## Verified

- Real HTTPS validation, HTTP-to-HTTPS redirect, homepage/Studio/auth pages,
  local media and video byte ranges.
- Secure + HttpOnly + SameSite=Lax session cookie attributes.
- Public access denied to `.env`, Git metadata, source/config/test/deploy paths;
  local-only generation route returns 403.
- PHP lint, draft/plan validators and transport unit tests inside production PHP.
- Full collection integration using disposable Supabase users: normal email
  login, private ownership, CSRF, per-collection revisions, independent writes,
  atomic rollback, stale-tab conflicts, guest-chain claim, deleted versions and
  collections, RLS and service-only RPC. Fixtures/accounts were cleaned.
- All 21 JavaScript test files passed locally; public Studio was visually checked
  in the browser with its idle illustration and four-step flow.
- Generating state now uses the supplied 10-second muted loading video. It is
  lazy-loaded, paused on completion/error or backgrounding, and respects reduced
  motion with a static poster. Local browser playback/pause/stop and all loading
  lifecycle tests passed with a simulated state, without calling an AI provider.
- Result toolbar keeps save/original download as primary actions. Story-card
  export and version deletion live in a compact disclosure menu. Desktop and
  390px browser checks verified placement, outside/Escape dismissal and focus
  return; original export handlers and permissions remain unchanged.
- Admin now has Accounts → Đăng nhập Google, with provider status, write-only
  secret entry and copyable Google / website callbacks. Authenticated production
  browser verified the Google-disabled state and missing-token lock; desktop and
  390px checks showed no horizontal overflow. Local guest API returns 403.
  Offline PHP/JS tests cover narrow provider PATCH, secret redaction, validation,
  stale-state rejection and uncertain-write safety. Real Auth settings were not
  modified during these checks.
- Existing `chatgpt.vietnamsir.com`, `shop.vietnamsir.com` and `vietnamsir.com`
  still return HTTP 200. The new container has no restart loop.

## Deliberately not claimed

- A real image provider was **not** called. The public Studio uses
  `generation-edge.php` and existing Edge secrets/settings; no image quota was
  consumed by deployment tests. Synthetic fixtures are not provider evidence.
- Google OAuth is disabled in Supabase (`external_google_enabled=false`). Email
  login works; enabling Google requires the owner's OAuth client configuration.
  VPS has no `SUPABASE_MANAGEMENT_TOKEN`; Admin saving remains disabled until a
  dedicated project-scoped token is privately provisioned server-side. No CLI
  personal token was copied. See `docs/google-auth-admin.md` for setup.
- Renewing the certificate against staging was not run; timer and hooks were
  inspected, and the actual certificate was issued and verified.
