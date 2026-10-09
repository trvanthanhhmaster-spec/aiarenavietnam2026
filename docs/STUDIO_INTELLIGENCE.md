# Studio intelligence — 2026-10-10

This adds the five annotated gaps to the existing PHP Studio without replacing its four-step planner. No feature silently generates an image or text advice.

## Implemented contract

| Feature | Current scope | Important boundary |
| --- | --- | --- |
| Weather / locality | Eight manual Vietnamese city presets; opt-in browser geolocation rounded to 0.1 degrees before transmission; Open-Meteo current and up-to-16-day forecasts | Forecast dates are explicit. Partial ranges are labelled partial; unspecified/far-future dates never inherit today's weather. No IP tracking. |
| Festivals | Dated, sourced 2026 calendar: Tết and four Festival Huế seasons, plus the international festival dates | Initial curated calendar, not nationwide coverage. A festival season is not a daily event. No entry means unknown, not no festival. |
| AI Stylist | Explicit text-only advice through a separate HMAC-protected Edge endpoint using the configured private Gemini bridge | One confirmed text request; no image generation. Names, gender, body metrics and face images are stripped. Free-text preferences can still contain personal data if the user enters it; the UI warns against that. No automatic changes. |
| Cultural Guardrail | Immediate per-person source-linked rules distinguish modern remix from historical-reconstruction claims; Nhật Bình rank cannot be inferred from color | Bounded editorial rules, not universal cultural adjudication or an expert certificate. |
| Image construction review | Existing post-generation review now asks for one construction finding/reason per person, grounded in real garment samples and sourced structural facts | Missing/ambiguous checks cannot certify an image. A visible structural mismatch becomes a garment repair target. Modern shoes do not inherently fail cultural review. |
| Inspiration lookbook | Four credited editorial outfit recipes with photos, context, palette and notes; explicit per-person application | Reference photos are not AI renders. Visible accessories are not copied automatically. Group application switches to independent outfits after confirmation; other people are unchanged. |
| Cultural sources | Separate history/context/structure sources for all four garments, used in the passport, advice and Edge generation/review copy | Image licenses and historical evidence are separate. Each source has a claim scope and checked date; no claim of historian review. |

## Sources and maintenance

Single versioned source: `supabase/functions/_shared/studio-knowledge.json`, consumed by PHP and Edge. The catalog still governs published availability: missing/unpublished garments and variants are not selectable via recipes. Never add a historical claim merely because a photo is available. Ngũ thân and tứ thân recipe palettes are modern editorial choices, not colors verified from their photographs.

- Sở Văn hóa và Thể thao Huế: ngũ thân historical context and contemporary preservation.
- Cổng thông tin du lịch Huế: áo tấc terminology, five panels and wide sleeves.
- Khám phá Huế: Nhật Bình collar/court context and rank/color limitations.
- VTV *Nẻo về nguồn cội*: tứ thân/Kinh Bắc association only; not a founding date.
- Official Huế plan 500/KH-UBND: Festival Huế 2026 seasons and international dates.

Exact source links and permitted claim scopes are embedded in the JSON and rendered beside advice. Review the calendar before 2027 rather than extending lunar dates by a year.

## Privacy and spend controls

`studio-advisor.php` uses existing session CSRF and bounded JSON. Weather snapshots are session-local for 10 minutes, raw forecast cache for 5 minutes; approximate coordinates exist only in this session cache, not a saved outfit/job context. Only sanitized, dated session context can reach generation; a client cannot spoof `recommendationContext`. Changed dates invalidate the snapshot. No new database migration or public look sharing.

Text advice reserves before transport: five calls/session/day and 100 globally/day, with no automatic retry of uncertain requests. Weather cache misses are capped at 20/session/hour and 300 globally/hour. Private budget files live in `/var/lib/vremix` (local fallback: PHP temp directory). Edge refuses unsigned calls and returns generic provider errors. Existing bridge secrets remain server-side. Free-text preference is untrusted data in the system prompt. Model output is length-bounded and recommendation IDs must match server-provided recipes; the UI uses text nodes, never model HTML.

Open-Meteo's free endpoint is for **non-commercial** usage, appropriate to the audition demo assumption; a commercial launch requires reviewing its current license and configuring a licensed service. Data attribution is shown. No SLA is assumed. Weather errors do not disable the planner. See [official documentation](https://open-meteo.com/en/docs) and [usage terms/pricing](https://open-meteo.com/en/pricing).

## Verification boundaries

- Offline PHP/JavaScript: historical-remix misuse warns, modern remix remains allowed, no inferred court rank, personal data stripping, unpublished sample exclusion, date-bound context, forecast scope, spend caps, independent per-person recipe application.
- Deno: wrong wide sleeves override a claimed pass; occlusion stays uncertain; missing structural review cannot certify; stylist cannot return arbitrary recipe IDs.
- Browser QA: `tests/studio-catalog-preview.php` at a separate loopback origin with external writes/provider calls stubbed. Its dialog stub is confined to the synthetic fixture.
- `tests/studio-intelligence-live.php --live`: disposable anonymous session for real weather, recommendations, negative guardrail, CSRF and missing-consent tests. Never calls AI or writes a user draft.
- New live AI Stylist requests and post-change image-construction review need fresh quota authorization. Previous real image generation is not proof of the new contract.

```sh
php tests/studio-intelligence.php
node tests/studio-intelligence.cjs
deno test supabase/functions/generate-look/ supabase/functions/studio-advisor/
deno check supabase/functions/generate-look/index.ts supabase/functions/studio-advisor/index.ts
php tests/studio-intelligence-live.php --live
```
