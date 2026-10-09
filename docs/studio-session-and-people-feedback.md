# Studio session and people feedback

## Confirmed faults

- `SupabaseAuth::refresh()` reused `storeSession()`'s sign-in behavior. That rotated both the PHP session ID and CSRF token during ordinary refresh, invalidating the configuration already held by open Studio tabs. Collections rejected these requests with HTTP 403.
- Collection sync treated 401/403 as retryable write failures. Retrying reused the invalid page credentials.
- The people picker highlighted only the 1/2-person presets; confirmed custom counts had neither a selected group card nor an inline summary.
- Selection changes claimed the displayed image was stale even when the user selected the same values again.
- Collection serialization omitted the optional per-person gender field.

## Changes

Same-identity token refresh preserves the existing session ID and CSRF token. Explicit sign-in, sign-out, and identity changes still invalidate old page credentials. No ownership or CSRF checks were removed.

Collection 401/403 responses enter an `auth` sync state. Dirty choices remain in the original account's per-tab recovery key; automatic writes and stale-credential retries stop. The styled notice offers **Tải lại Studio**, while actual network failures retain **Thử lưu lại** and revision conflicts retain their separate recovery actions. Generation is blocked until this state is resolved.

The people picker displays **Đã chọn X người**, highlights the group card for counts above two, and hides the custom count input when returning to a preset. Invalid counts leave the previous selection intact. No selection starts image generation.

## Verification

- `php tests/auth-refresh.php`: same-identity refresh continuity; explicit sign-in and different-identity token rotation. No live OAuth or provider request.
- `node tests/studio-collection-store.cjs`: 401/403, no stale retry, recovery after further edits, original-owner isolation, gender serialization, retryable initial network read, and existing revision/offline cases.
- `node tests/studio-people-feedback.cjs`: empty/restored/1/2/5/12 counts, group highlighting, live feedback, stale-image accuracy, auth notice/reload versus network retry.
- Browser QA uses real Studio rendering and scripts with a temporary no-write session adapter: desktop and 430px mobile, 5-person confirmation, invalid 13-person rejection, and return to 2-person preset. Auth notice is a simulated event, not a live account switch. No AI calls or real collection writes.
