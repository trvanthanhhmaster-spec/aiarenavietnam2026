# Studio authentication return — 2026-10-09

The embedded login/logout return used to render an unstyled “Đang mở Studio…”
paragraph. The parent only listened for iframe load and reloaded without closing
the dialog or clearing its retained callback document.

The return now renders no visible intermediate content, is marked no-store and
sends a completion message to the same origin. Studio validates both origin and
the sending iframe, hides the frame, closes the dialog, clears its source and
reloads once. The iframe load handler remains a fallback for the explicit
same-origin authReturn=1 URL. Normal Studio links are not completion signals.
Closing and reopening account access loads a fresh form. Top-level OAuth returns
still replace the callback URL with Studio. Full reload intentionally rebuilds
server-authenticated state and collection/session scope, not just the avatar.

Verified: all 22 JavaScript scripts, affected PHP lint, message/load race and
wrong-origin/wrong-frame regression checks. A temporary localhost browser fixture
loaded the real callback inside an iframe and confirmed dialog closure and cleared
source twice; direct top-level callback returned to Studio. The mobile login form
closed and reopened normally. No credentials were submitted, no login/logout was
performed and no image generation was called. Full provider login remains a user
verification step. The temporary fixture was removed after QA.
