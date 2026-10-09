# Studio panel scroll chaining — 2026-10-09

The catalog and information panels used `overflow-y: auto` together with
`overscroll-behavior: contain`. In the restored generated-result layout the
catalog grows with its content and has no internal overflow. Chromium still
treated it as a scroll container and swallowed wheel input instead of passing
it to the document. Moving the pointer outside the panel allowed page scrolling.

Both panels now use native `overscroll-behavior: auto`. Their internal scrolling
is unchanged when bounded, while input at either edge can reach the page. No
wheel listeners, synthetic forwarding, selection changes or generation calls
were added. History strips and modal-specific scroll policies are unchanged.

Live browser wheel checks on the actual restored Studio: old CSS left document
scrollY at 88 after deltaY +420; new CSS moved scrollY 0→420, then 420→120 with
deltaY -300. A temporary real-CSS bounded-panel fixture scrolled internally
0→380 with the page at 0, then the next downward wheel moved the page to 280
while the panel stayed at its maximum 380. The fixture was removed afterward.
All 23 JavaScript regression scripts passed, including the panel chaining CSS
contract in `tests/studio-preview-layout.cjs`.
