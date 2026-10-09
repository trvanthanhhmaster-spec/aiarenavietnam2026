# Garment-reference pipeline

Studio resolves each person's published concrete garment sample on the server,
loads its actual JPG/PNG/WebP bytes, and sends them to generation AND post-image
review. Samples are deduplicated with explicit per-person assignments. Attachment
order is previous image/face sheet, optional new face sheet, then garment samples.
Sample model identities, accessories and backgrounds are never requested as part
of the outfit. Explicit color/pattern overrides still take priority.

Only HTTPS images from this project's public Supabase storage, Wikimedia upload
storage, or `/assets/media/catalog/` on the configured public origin may be loaded.
No redirects are followed. Each sample is bounded to 2 MB and the complete set to
6 MB, with a maximum of 12 unique samples. HTML/unsupported bytes are rejected.
If a selected sample cannot be loaded, generation fails before calling the model;
it does not silently pretend that text-only generation used a photograph.
No sample bytes are persisted in job metadata. `garmentReferences` output holds
only IDs/person mappings and attachment status. `VREMIX_CATALOG_ORIGIN` can change
the source origin; the default is the existing V-Remix production origin.

## Review and repair

The same provider path performs a JSON-only review. It compares the GENERATED
first image against the final garment sample images and per-person selections,
including unselected-accessory absence, variant pattern and occasion background.
Overall status is derived by the parser, not accepted as a free-form model pass.
Review failure leaves `not-assessed`, a null score and safe `reviewStatus` metadata.
403/session failures are not hidden as a successful review. No automatic retry.

Displayed story, guardrail and styling tip use deterministic selected-catalog
copy; a model cannot describe unselected accessories as chosen. Cultural Score,
when available, remains a tentative AI assessment, not historical certification.

“Sửa chi tiết chưa khớp” is an explicit additional image job. The backend resolves
the owned prior job, derives ONLY mismatch targets from its stored assessment,
rejects stale selections, preserves matched/uncertain fields and re-reviews the
result. Scene mismatch overrides background preservation. There is no unbounded
auto-repair loop or quota-consuming repair triggered by a selector change.

## History, sources and vertical output

History keeps each version's original copy, assessment and reference provenance;
only signed image URLs refresh. Generated/fallback copy is bound to the submit
snapshot BEFORE rendering, including when polling/resuming a job.

Wikimedia File pages are labeled visual evidence, not substantiation of all
historical claims. Scholarly/heritage references still require curator review;
this implementation does not fabricate them or assert catalog historical accuracy.

“Xuất thẻ chia sẻ” preserves the complete original image inside a 1080x1920 card.
“Tạo ảnh dọc 9:16” explicitly requests a NEW AI image at that aspect, reframing the
previous photograph with complete subjects. It is not a download or free crop.
Actual output dimensions remain provider-dependent; do not claim guaranteed
resolution or perfect fidelity from the requested target.

## Verification

Offline tests cover sample resolution, byte attachments, role ordering, SSRF,
size limits, redirect refusal, selected-only copy, review parser and targeted
repair ownership/scope. `tests/vps-generation-once.php --live --allow-one-image`
requires authorization per run and creates ONE fictional-adult image without
faces or collection mutations. `--save-artifacts` saves only the generated test
image and safe evidence, not cookies, secrets, prompts or signed storage URLs.
