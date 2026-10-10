# Fashion shop network foundation — 2026-10-10

- Active PHP/source release: `76bab15`; bridge remains `2cedf30`. Migration
  `20261010150000_fashion_network.sql` is applied to the linked Supabase project.
- Public `shops.php`, authenticated merchant submissions and admin-only review
  are live. Admin's Catalog navigation and Studio's sourcing panel link to them.
  Products, variants, media permissions and buy/rent/made-to-order offers are
  separate records. Nothing is seeded or promoted from legacy shop links.
- The new route was added narrowly to this site's Nginx PHP allowlist (source
  commit `d4fc736`). `nginx -t` passed before graceful reload; backup retained at
  `/opt/vremix/backups/nginx.pre-fashion-network.conf`. All private path denials
  and unrelated virtual hosts remain unchanged.
- Schema trial and post-migration integration tests used temporary users/shop/
  products inside rolled-back transactions. Checks covered owner isolation,
  admin review, stale revisions, atomic child replacement, private permission
  evidence, unknown prices, published reads and archived-parent RLS. No fixtures
  remain. CLI's local Docker catalog-cache warning did not prevent the remote
  migration; its schema and RPC behavior were verified afterward.
- All existing 32 CJS suites, new network UI tests, targeted PHP validation/view/
  auth/plan/settings/transport checks and network-disabled release-image checks
  passed. Browser QA tested explicit synthetic product/forms/review states and
  production directory/merchant/review views, including 390px without horizontal
  overflow. Guest merchant/review requests redirect to the existing login.
- Production directory is genuinely empty (zero shop records). No real merchant
  registration, product publication, image upload, AI call, stock verification,
  partner outreach or payment was performed. Actual web form mutations remain
  untested end-to-end; database transactions and input/view contracts are verified.
- VPS public/security/media and SEO smoke passed after the route change. Screenshot
  proof is ignored under `artifacts/network-qa/production-directory.png`.
- Previous `d1bb0b6` release and `/opt/vremix/release.env.pre-76bab15` are retained.
  Rolling PHP back leaves the additive, empty network schema in place; do not drop
  network tables if merchant data has since been submitted. See
  `docs/fashion-network.md` for the scope and next integration slices.

---

# Catalog source search synchronized with Admin — 2026-10-10 (historical)

- Active PHP/source release: `d1bb0b6`; bridge remains `2cedf30`. Only the PHP container was recreated. No provider keys, Edge functions, Nginx configuration, database schema or owner settings changed.
- Source search now shares the blue Admin theme and configured brand logo. A compact heading and immediate search form replace the oversized cream editorial layout. Optional paid AI filtering is in its own disclosure; source cards retain creator/license links, explicit draft import and CSRF. Import requires choosing a destination instead of silently assigning the first garment.
- The controller's search/research/import logic is unchanged. Its view lives in `includes/catalog/search-page.php`; the tiny UI script only handles loading feedback, repeat-submit prevention, back/forward restoration and failed thumbnails. It does not fetch providers or submit automatically.
- All 32 CJS suites and targeted PHP catalog/research/settings contracts passed offline; the final view also passed in an isolated network-disabled production image. Deterministic browser fixtures covered empty/error states, unavailable AI, escaped metadata, failed thumbnails and 320px/390px layouts.
- Authenticated production search for áo tấc returned two real Wikimedia sources with attribution and licensing. Both portrait photos decoded and were verified against their constrained viewport dimensions (280px desktop / 250px mobile), without clipping; 390px production layout had no horizontal overflow. No AI filtering or actual draft import was run, so mutation/provider success is not claimed by this UI follow-up.
- Read-only VPS security/media and public SEO smoke passed on the final release. Prior `ce53b2d`, intermediate releases and release-env backups are retained for rollback. Ignored screenshots: `artifacts/website-settings-qa/production-catalog-search.png` and `production-catalog-results.png`.

---

# Branding asset previews and discoverable sharing-image editor — 2026-10-10 (historical)

- Active PHP/source release: `ce53b2d`; bridge remains `2cedf30`. Only the PHP container was recreated; no Nginx, Edge, credentials or settings data was changed by this follow-up.
- Removed duplicate text below the rail wordmark. Brand entry now shows the current logo and saved sharing image, with a guarded shortcut to the existing SEO editor. Every upload control includes an image preview; local file previews are labelled not uploaded, pending files block silent saves, and uploading one image retains other selected files.
- All CJS suites, website-settings PHP checks and affected lints passed. The account-profile fixture now supplies offline page metadata in a disposable isolated cache instead of depending on an expired shared metadata cache. Browser QA verified current/selected previews, pending-file save feedback, real SEO navigation and a 390px layout with no horizontal overflow; guard cancellation is covered by the VM test.
- Authenticated production browser verified the empty rail caption, current logo, the owner's saved sharing image, the shortcut opening the real SEO resource, and successful raster decoding (1672×941). No owner configuration was overwritten or real upload/AI call made in this follow-up. Read-only production SEO and VPS security/media smoke passed.
- Prior `b4524b7` release and `/opt/vremix/release.env.pre-ce53b2d` are retained for rollback. Local ignored proof: `artifacts/website-settings-qa/production-brand-assets.png`.

---

# Managed website identity and SEO — 2026-10-10 (historical)

- Active PHP/source release: `b4524b7`, `/opt/vremix/current` points to `/opt/vremix/releases/b4524b7`. Bridge remains `2cedf30`; no Edge function, provider credential or database schema change.
- Admin → Nội dung now has Thương hiệu · Logo & icon and SEO & chia sẻ, with authenticated uploads, revision-safe saves and previews. Public metadata uses the saved values; private pages remain noindex.
- Nginx routes for robots, sitemap, manifest, favicon and narrow public branding assets were installed, validated with `nginx -t`, and gracefully reloaded. Persistent uploaded assets live in `/var/lib/vremix/brand-assets`, separate from private lookbooks.
- All JavaScript suites, targeted PHP tests and lint passed. Read-only production SEO checks verified real HTML, schema, canonical URLs, raster images, private-page noindex, sitemap, manifest sizes, favicon and protected admin endpoints. VPS security/media smoke passed.
- Authenticated production UI successfully uploaded the existing public 1200×630 sharing image, saved SEO, saved unchanged brand defaults, then read the saved configuration. Public HTML references the uploaded hash asset with matching dimensions and actual MIME. No personal image, AI call or private collection was involved.
- Only `vremix-php` was recreated. Previous `cb0f0bc` release, `/opt/vremix/release.env.pre-b4524b7` and `/opt/vremix/backups/nginx.pre-b4524b7.conf` remain for rollback.
- Search Console/Bing account verification and sitemap submission were not performed. These are separate external steps, not implied by adding configuration fields.

---

# Contextual Studio assistance and recipe feedback — 2026-10-10 (historical)

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
