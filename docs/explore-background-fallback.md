# Explore background fallback

The fullscreen opening used an opaque white loading layer. Its dark-copy override applied only until `media-ready`; no independent image remained beneath the video. A missing/unpainted video after readiness could therefore leave white cinematic copy without its background.

The page now has a 155 KiB opening poster, extracted from the configured base clip's first frame. It is an eager, high-priority decorative image beneath every video. The base video also has a native `poster`. The stage has a dark solid fallback if both media requests fail, plus a modest permanent contrast scrim. Loading/error controls stay readable and do not cover the page with white.

The opening has a 12-second deadline and an explicit retry; failure of a previously visible opening returns to the poster. Pending paint callbacks cannot clear an error. Deferred branch loading and existing user-triggered transitions remain intact. No database/provider configuration was changed.

Run `node tests/home-loading.cjs` and `node tests/mobile-controller.cjs`. The former executes real app code with synthetic media/timers for cached/slow/error/timeout/retry cases, plus markup/CSS/asset contracts. Browser verification must additionally cover the actual rendered loading/error fallback and normal loaded video on desktop/mobile. No AI generation is needed.

If the admin replaces the base video, regenerate this local poster to match the new clip. The independent poster is intentionally available even when the video host is down.

Browser QA: a tab-scoped network block prevented all MP4 requests; the real opening deadline showed the retry notice over the poster. Blocking the poster as well produced a readable dark stage, without a broken-image icon. Removing the block and clicking Retry recovered both poster and all eight video elements to `readyState=4`. At 430px the page did not overflow horizontally. These checks used ordinary media downloads, not AI generation.
