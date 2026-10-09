# Google login in Admin

Open **Admin → Accounts → Đăng nhập Google**. Only an authenticated Admin may
read or save this configuration; both methods require the session CSRF token.
The page changes the Google provider in the existing Supabase project, not a
parallel local database. Consequently localhost and production share changes.

## One-time server connection

Create a dedicated, expiring, project-scoped Supabase personal access token for
the one project used by this application. The current Management API requires
`auth_config_read` for GET and `auth_config_write` plus `project_admin_write`
for PATCH (Auth Config Read/Write and Project Settings Write in the token UI).
Avoid an organization-wide token and do not copy a developer's CLI token.

Set `SUPABASE_MANAGEMENT_TOKEN` privately in the server's environment file:
`/etc/vremix/app.env` on VPS, or the ignored `.env` for localhost. Preserve
ownership 10001 and mode 0600 on VPS. If replacing the file rather than editing
in place, recreate only the PHP container so the read-only bind mount sees it.
Never commit, print, send in chat, or put this token into browser JavaScript.
The service_role key is not a Management API token.

Without this token the page reads the public Google enabled flag, explains the
missing server connection, and disables saving. An expired or insufficient token
also disables writes. No success is claimed without a successful provider PATCH.

## Google client

1. In Google Auth Platform create a **Web application** OAuth client.
2. Register the website origin shown in Admin (production:
   `https://v-remix.vietnamsir.com`; local origin: `http://localhost`).
3. Google Authorized redirect URI must be Supabase's callback:
   `https://olruribsleltmafkdwuf.supabase.co/auth/v1/callback` for this deployment.
4. Enter Client ID and Client Secret in Admin and enable Google.
5. In Supabase's redirect allowlist permit the application's `auth-callback.php`.
   This is distinct from Google's redirect URI. Existing deployment already
   allows the production and local development application paths.
6. In Google's Testing mode add test users. Test real login separately, checking
   the final authenticated Studio page; a saved configuration alone is not proof.

Secrets are sent over HTTPS to PHP, then to the fixed Supabase Management API.
The application does not persist Google's secret itself. GET and POST responses
contain only a secret-configured boolean; upstream errors are sanitized. Blank
secret means retain the existing one; changing Client ID requires its matching
secret. Disabling Google retains credentials and does not alter email login.
Only Google enabled/client ID/secret fields are PATCHed; Site URL, redirects,
email, other providers and accounts are untouched.

A signed revision detects changes since loading before a save. Supabase does
not provide atomic compare-and-swap here; simultaneous external edits between
the final GET and PATCH remain possible. Do not retry ambiguous writes: reload
the authoritative state first. Refresh/navigation checks unsaved changes and
the secret input clears on submission, leaving the page or hiding it.

## Verification

`php tests/google-auth-settings.php` and `node tests/admin-google-auth.cjs` use
offline fixtures: no provider credentials, Auth writes or real Google login.
Browser checks of readiness/layout and guest HTTP 403 are separate live evidence.

Official references: [Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google),
[scoped tokens](https://supabase.com/docs/guides/platform/personal-access-tokens),
[read config](https://supabase.com/docs/reference/api/v1-get-auth-service-config),
[update config](https://supabase.com/docs/reference/api/v1-update-auth-service-config).
