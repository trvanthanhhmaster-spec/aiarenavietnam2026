# V-Remix Gemini web bridge

This service installs [HanaokaYuzu/Gemini-API](https://github.com/HanaokaYuzu/Gemini-API) at a pinned commit and exposes a small private image-generation endpoint for local development.

Important: the upstream library uses the Gemini web application, not the Gemini Developer API. It requires Google web-session cookies (`__Secure-1PSID` and optionally `__Secure-1PSIDTS`). The API key stored in Supabase does not authenticate this bridge.

## Install

```sh
cd services/gemini-webapi-bridge
uv sync
cp .env.example .env
# Fill the cookie values and a local bridge secret in .env.
uv run python server.py
```

On macOS, set `GEMINI_WEB_AUTO_COOKIE_SYNC=true` and
`GEMINI_WEB_CHROME_PROFILE=Default` to refresh `__Secure-1PSID` and
`__Secure-1PSIDTS` from the local Chrome cookie store at startup and after a
session reconnect. Cookie values are written only to the ignored local `.env`
file and are never logged or returned by the bridge. The upstream library's
background cookie refresh is disabled by default because it can invalidate an
otherwise usable short-lived generation session.

The default listener is `127.0.0.1:8788`. Test it without exposing credentials:

```sh
curl -H "x-vremix-bridge-secret: $GEMINI_WEB_BRIDGE_SECRET" \
  http://127.0.0.1:8788/health
```

The generation contract is `POST /v1/images/generate` with a JSON body containing `prompt`, optional `sourceImage` (`mimeType`, base64 `data`), `aspectRatio`, `targetResolution`, and `changeScope`.

Studio uses `operation: group` for the first complete image and `operation: group-edit` when editing a selected version. For `group-edit`, `sourceImage` is the previous composition; optional `referenceImages` contains one additional numbered face-reference sheet. Each image is bounded to 8 MB. Restart the bridge after changing its code. History records keep selection metadata, never the uploaded face-sheet bytes.

Do not commit `.env`, browser cookies, or generated images. Do not expose this loopback bridge directly to the public internet; if it must serve Supabase Edge Functions, put it behind an authenticated HTTPS service and rotate the bridge secret.
