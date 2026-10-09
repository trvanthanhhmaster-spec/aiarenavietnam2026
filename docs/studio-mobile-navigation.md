# Studio mobile navigation — 2026-10-09

Application release `11cd6a4` is deployed on v-remix.vietnamsir.com.
Below 768px, the existing top navigation uses three local SVG icons with short
labels, 56px-high targets and the current Studio highlight. The account control
is 44px wide; guests see a named account icon, signed-in users keep their initial.
Desktop keeps its full text labels and existing layout. No duplicate mobile
navigation, new library, collection mutation or automatic image generation.

Verified in the browser: localhost at 320/375/430px and desktop at 1280px;
production at 320/430px with a signed-in account. No horizontal overflow.
Collections opened from the new tab control. The guest account icon opened the
existing login dialog. All 21 JavaScript test scripts and affected PHP lint
passed. Production HTTPS/assets/auth/privacy/media smoke checks and the signed
PHP-to-Edge invalid-planning check passed without generation calls; the bridge
remained running with zero restarts.

The earlier private-env helper made the XAMPP environment unreadable to Apache.
Its existing file mode/ACL is now preserved; the local file has read permission
only for its owner plus the Apache `daemon` account, not world-readable access.
Local Studio returned HTTP 200 after that repair. VPS secret modes are unchanged.
