# Preview corners and version switching — 2026-10-09

The output image now fits by intrinsic aspect ratio with both dimensions bounded
by the preview frame. A 16px radius follows the actual bitmap rather than a
letterboxed 100%-sized image box. `object-fit: contain` remains; no cropping or
image-file changes occur. Once output is shown the idle poster is hidden, so
fitted-image margins reveal a neutral surface, not an unrelated illustration.

Previously every `resultsApi.open` emitted a history reload. The chosen image
source changed locally, but its active thumbnail waited for the endpoint to
query and re-sign the whole history. Reloading also replaced cached image URLs,
thumbnail nodes and focus. Choosing a known version in the current scoped
collection now updates only its highlight synchronously, without fetching the
history again. Mutations, explicit retry, unseen versions and changed collection
scopes still reload. Stale in-flight history responses cannot replace that local
selection. A preview already on screen is not scrolled into view again.

All 23 JavaScript test scripts passed. History tests cover immediate highlighting,
stable nodes, rapid choices, late responses, pending-generation guards and
unsaved-edit confirmation. An in-memory browser fixture using the real history
script kept its history fetch count at one after 2→3→2 choices, with Bản 02 active
and keyboard focus preserved. Actual restored output showed a 1376×768 image at
623.59×348.05 with rounded corners. The fixture also verified tall and landscape
images at desktop and 430px without distortion, cropping or horizontal overflow.
The temporary fixture was removed; no real selection was changed for QA and no
AI generation was called. An uncached image can still take time to download;
these changes remove the avoidable history round-trip, not network latency.
