<p class="preview-note" id="previewNote"><?= htmlspecialchars($site['preview_note'], ENT_QUOTES, 'UTF-8') ?></p>
<p class="sr-only" id="status" role="status" aria-live="polite"></p>
<div class="notice" id="notice">
    <span id="noticeText"></span>
    <button type="button" id="retryBtn"><?= htmlspecialchars($site['ui']['retry_label'], ENT_QUOTES, 'UTF-8') ?></button>
</div>
