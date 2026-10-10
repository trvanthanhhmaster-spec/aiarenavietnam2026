# Contextual Studio assistance and recipe feedback — 2026-10-10

- Active PHP/source release: `cb0f0bc`, `/opt/vremix/current` points to `/opt/vremix/releases/cb0f0bc`. The bridge remains `2cedf30`; Edge functions were not changed by this UI follow-up.
- The all-in-one advice block no longer precedes the four-step planner. Optional weather is in the time step; optional recipe/AI advice is after garment photos, with separate views. Event/people and review stay focused on their own tasks.
- Applying a recipe captures its resolved sample into the actual plan, keeps other people unchanged, and opens review/next incomplete step with explicit selected-choice feedback. Repeated choices, cancellation, pending generation and missing-count cases are handled. Application/navigation do not generate an image.
- All JavaScript suites and affected PHP/plan/intelligence tests/lints passed. Browser QA verified the real template with provider/write stubs, contextual placement, repeated/different recipe application, inline failure, separate advice views and 390px layout without horizontal overflow.
- Production browser verified weather/style parent steps, collapsed defaults, the actual optional-garment disclosure and no captured warning/error. No live user's outfit was changed to test application; no AI request was made. HTTPS, private route/cookie/media and real weather/consent/negative-rule smoke passed.
- Only `vremix-php` was recreated. `release.env.pre-cb0f0bc` and the previous `cd0941f` release are retained for rollback. No secrets, unrelated containers, database schema or provider credentials changed.
- Local ignored evidence: `artifacts/studio-intelligence-qa/production-contextual-advice.png`; additional synthetic mobile screenshots are labelled QA evidence, not production AI results.

---

# Garment-reference upgrade — 2026-10-10 (historical)

- Active source release: `2cedf30`, `/opt/vremix/current` points to
  `/opt/vremix/releases/2cedf30`. PHP and bridge containers both use this tag.
- `generate-look` Edge Function deployed to the existing project. Gateway HMAC,
  secret mounts, provider dependency pin and network isolation remain unchanged.
- HTTPS/page/assets/private-route/video smoke checks and signed gateway checks
  passed. Authenticated bridge readiness passed without generating an image.
- Exactly ONE owner-authorized anonymous Studio image job completed:
  `df78ab4b-ca86-42c5-a278-d63019422446`. One published áo tấc sample was attached;
  no personal face reference was uploaded and no collection was changed.
- Stored image decoded at 1376×768, HTTP 200. The review completed, reporting
  one person and matched garment, variant, color, pattern, accessories and scene.
  Cultural Score was 85/100 (tentative AI assessment, not cultural certification).
- Visual inspection found the red garment, wide sleeves and courtyard; sample
  fan and necklace were not copied. One successful sample is not proof of perfect
  reconstruction, model-identity separation or consistency across all garments.
- Production menu visibly distinguishes original-image share-card export from
  a new paid 9:16 generation. No repair or vertical-image job was run.
- Offline checks passed: 29 Deno tests, 30 JavaScript suites, five bridge contract
  suites, PHP validators/history/targeted-repair checks and source lint/type checks.
- Scholarly historical-source curation is still outstanding. See
  `docs/garment-reference-pipeline.md` for behavior and verification boundaries.
- Previous releases and `/opt/vremix/release.env.pre-2cedf30` are retained for rollback.
  Local QA image/evidence/screenshots are ignored by Git; no secrets are recorded.

---

# Historical deployment — 2026-10-09

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
