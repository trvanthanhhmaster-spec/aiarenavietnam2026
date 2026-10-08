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
- `/www/server/panel/vhost/nginx/v-remix.vietnamsir.com.conf`: this site only.

Keep the same Supabase project and encryption key as the existing application.
Override `SUPABASE_CACHE_FILE=/var/lib/vremix/cache/site-content.json` and
`GEMINI_WEB_LOCAL_ENABLED=false` for this deployment. Do not copy Mac browser
cookies or the Gemini Web bridge environment. Production uses the deployed
Supabase Edge gateway; provider configuration remains in Admin/Edge secrets.
Register `https://v-remix.vietnamsir.com/auth-callback.php` in Supabase Auth's
redirect allowlist before using OAuth or email confirmation from this domain.

## Release procedure

1. Archive the clean tracked commit, upload it over SSH, then unpack into a
   **new** release directory. Never unpack over an existing release.
2. Supply secrets privately; source stays read-only to PHP workers. Give only
   runtime/cache/session/log directories write access to UID 10001. The release
   has an empty mode-000 `.env` placeholder; Docker mounts the private file.
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
`VREMIX_TEST_BASE_URL=https://v-remix.vietnamsir.com` with
`php tests/studio-collections-live.php --live`. The script cleans its own
fixtures and must never use a real user's credentials.

Rollback: point `current` atomically to the previous retained release, set its
SHA in `release.env` and recreate **only** the `vremix-php` container. Restore
only this site's backed-up Nginx config
if needed, validate it before reloading Nginx. Keep runtime state and secrets.
