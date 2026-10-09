# Studio person profile — 2026-10-09

The planner's time and person helper lines now have 12px clearance from the
preceding choices. The optional person disclosure uses a compact named heading
and chevron, with separate basic details, measurements and face-reference areas.
Mobile text/number inputs use 16px type to avoid focus zoom on iOS. Existing
explicit face consent and source-image privacy boundaries remain unchanged.

Gender is optional and self-described: empty (Không chọn), male (Nam), female
(Nữ), other (Khác). It belongs to each person, never shared by the outfit mode.
Changing persons restores their own values. Gender-only changes are committed
before navigation; removing people warns before discarding profile-only data.
Legacy plans without the field default to empty. JavaScript, PHP draft/plan
validators and the generation Edge function accept the same whitelist.

Drafts and result-selection metadata retain the field in existing JSON columns;
no database migration is needed. Generation prompts include the chosen value
or null, prohibit inference from names and preserve the selected garments.
Choosing gender does not filter the clothing catalog or trigger generation.

Regression coverage: `tests/studio-person-profile.cjs`, `tests/studio-plan.php`,
`tests/studio-draft.php` and `supabase/functions/generate-look/studio-plan_test.ts`.
Browser checks use a temporary in-memory fixture with the real partial, CSS and
planner UI; they do not change account drafts or consume image quota. Prompt
construction tests are not proof of a real generated image's appearance.

Verified at 1127px, 430px and 320px: both helper gaps measure 12px; no horizontal
overflow at mobile widths; profile fields have 46–48px height. Selecting different
genders for two people, switching back and clearing the value worked in the real
rendered UI. The temporary fixture was removed after QA. All 23 JavaScript test
scripts, six PHP checks and all 17 Deno tests passed; the full Edge entrypoint
also passed `deno check`. No real account selections were changed for QA.
