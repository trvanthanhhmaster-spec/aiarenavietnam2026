# V-Remix VPS deployment

Target: `v-remix.vietnamsir.com`, AlmaLinux 8, existing aaPanel Nginx and
an isolated PHP 8.3 Docker container. SSH uses port 8686; the website uses 443.
Do not change unrelated virtual hosts, PHP pools, containers or firewall rules.

- `/opt/vremix/releases/<git-sha>`: immutable source releases.
- `/opt/vremix/current`: atomic symlink to the active release.
- `/etc/vremix/app.env`: secrets, numeric owner 10001, mode 0600, private parent
  owned by root. Mounted read-only as the container's `.env`. Never print it.
- `/opt/vremix/compose.yml` and `release.env`: container configuration and
  release SHA (not credentials); image tag is the release SHA.
- `vremix-php`: separate PHP container as numeric UID 10001, read-only source,
  dropped capabilities, CPU/memory/PID limits. FastCGI is loopback-only 9183.
- `/var/lib/vremix/{cache,sessions,tmp}`: private writable runtime state.
- `/var/lib/vremix-acme`: HTTP certificate validation only.
- `/var/log/vremix`: dedicated logs; access logs omit query parameters.
- `/etc/logrotate.d/vremix`: this site's logs only, 12 rotations, weekly or
  at 20 MiB. Docker's separate container log also has a bounded 10 MiB × 3 policy.
- `/www/server/panel/vhost/nginx/v-remix.vietnamsir.com.conf`: this site only.

Keep the same Supabase project and encryption key as the existing application.
Override `SUPABASE_CACHE_FILE=/var/lib/vremix/cache/site-content.json` and
`GEMINI_WEB_LOCAL_ENABLED=false` for this deployment. Production uses the deployed
Supabase Edge gateway; provider configuration remains in Admin/Edge secrets.
Only after explicit account-owner permission, provision the two Google session
cookies into the separate `/etc/vremix/bridge.env` (UID 10002, mode 0600).
Never copy an entire browser profile, CLI access token or application `.env`.
Register `https://v-remix.vietnamsir.com/auth-callback.php` in Supabase Auth's
redirect allowlist before using OAuth or email confirmation from this domain.

## Release procedure

1. Archive the clean tracked commit, upload it over SSH, then unpack into a
   **new** release directory. Never unpack over an existing release.
2. Supply secrets privately; source stays read-only to PHP workers. Give only
   runtime/cache/session/log directories write access to UID 10001. The release
   needs an empty `.env` mount target **before** switching `current` and
   recreating the container. `git archive` omits this ignored file; create it
   explicitly in the new release. Docker mounts the private file over it.
   Do not copy secrets into the release. A missing target on the read-only
   source mount prevents PHP from starting and makes the gateway return 502.
3. Build the release's Dockerfile, then run PHP lint, validators and the
   transport unit test inside the image/container. Record the base image digest.
4. Validate the isolated FPM config and compose file before starting.
5. Back up this site's existing config, then install `nginx-http.conf` if this
   is the first deployment. Run `nginx -t` before a graceful Nginx reload.
6. Obtain this domain's Let's Encrypt certificate using webroot
   `/var/lib/vremix-acme`. Reuse the existing certificate renewal timer and
   persist a deploy hook that validates and gracefully reloads Nginx.
7. Switch `current` atomically, install `nginx.conf`, validate/reload, then test
   HTTPS without disabling certificate verification.
8. Check homepage, Studio, email login, collection isolation, private file
   denial, cookies, media range requests and existing sites. Do not call an AI
   provider merely to prove deployment; label synthetic tests separately.

For collection integration testing, use a disposable account and
`VREMIX_TEST_BASE_URL=https://v-remix.vietnamsir.com VREMIX_TEST_LOCAL_DISABLED=1` with
`php tests/studio-collections-live.php --live`. The script cleans its own
fixtures and must never use a real user's credentials. The production flag
expects the Mac-only endpoint to be denied entirely (403); the public Edge
gateway must still reject deleted/foreign jobs with 404, not merely any error.
Run `php tests/vps-smoke.php --live` to verify TLS, cookie policy, assets,
private file denial, authentication and range support without generating images.

Rollback: point `current` atomically to the previous retained release, set its
SHA in `release.env` and recreate **only** the `vremix-php` container. Restore
only this site's backed-up Nginx config
if needed, validate it before reloading Nginx. Keep runtime state and secrets.

## Private Gemini Web bridge

`Dockerfile.bridge` pins the upstream Gemini-API commit. `compose.bridge.yml`
runs as UID 10002 with a read-only filesystem and bounded temporary storage;
host port **127.0.0.1:8791** forwards to container port 8788. Host 8788 is
already used by another service and must not be changed. HTTPS `/private-gemini`
forwards only the two approved routes; every request requires a separate
constant-time-verified bridge key. Access logs are disabled for these routes.

`scripts/prepare-vps-bridge.php` emits credential JSON: run it **only through an
SSH stdin pipe** into `provision-bridge-secrets.php` in a disposable root PHP
container with `/etc/vremix` mounted at `/run/vremix`. Never run it directly in
a terminal or a tool whose stdout is displayed. Private deployment keys are
reused from the ignored mode-0600 `.env.bridge-vps`. Cookies never go to Edge.
Set only the three values in root-private `edge-bridge.env` using Supabase CLI.
Do not set all secrets from the application's `.env`.

PHP and Edge must share `VREMIX_GATEWAY_SECRET`: method, URL query, exact body,
owner and optional user ID are HMAC-signed with a three-minute clock window.
Edge fails closed without a valid signature. Session, CSRF and ownership checks
remain in PHP. Coordinate Edge deployment with the PHP release; an old PHP
release cannot call the new signed gateway, so rollback requires restoring the
paired Edge source as well, not weakening authentication.

Run `php deploy/vps/verify-bridge.php --live` with `/run/vremix` mounted read-only
to verify HTTPS, private auth, Google session readiness and signed Edge database
reads. It never calls image generation. Only then select image provider `webapi`
in Admin/shared runtime settings. Health readiness is not proof that the account
can generate an image. Session cookies may expire; refresh privately and recreate
only `vremix-bridge`. Do not repeatedly restart to bypass provider restrictions.

For an already provisioned VPS, `scripts/prepare-vps-session.php` emits only the
two Google session cookies. Pipe it directly over SSH into
`deploy/vps/refresh-bridge-session.php` in a disposable root PHP container with
only `/etc/vremix` mounted at `/run/vremix`. It preserves all gateway/bridge keys,
updates the bind-mounted inode in place and retains UID 10002/mode 0600. Do not
display the payload or use an entire browser profile. Restart only the bridge
once, then run the private readiness helper. This is a manual repair, not a
permanent solution to expiring Web cookies; use the official API for durable
production credentials.

`deploy/vps/diagnose-generation.php --live` reports safe categories for the latest
ten jobs, never prompts, account IDs, raw errors or secret values. After explicit
authorization for a quota-consuming test, `tests/vps-generation-once.php --live
--allow-one-image` submits one fresh anonymous request with no face references or
collection changes, and verifies the actual generated storage image. It never
resubmits POST on timeout. Do not run this test as a deployment health check.
