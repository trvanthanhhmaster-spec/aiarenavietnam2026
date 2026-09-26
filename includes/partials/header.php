<header class="site-header">
    <a class="brand" href="#stage" aria-label="<?= htmlspecialchars($site['ui']['brand_aria_label'], ENT_QUOTES, 'UTF-8') ?>">
        <svg class="brand__wordmark" viewBox="0 0 212 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <text class="brand__v" x="1" y="47"><?= htmlspecialchars($site['brand_mark'], ENT_QUOTES, 'UTF-8') ?></text>
            <path class="brand__dash" d="M40 31.5h14" />
            <text class="brand__name" x="61" y="47"><?= htmlspecialchars($site['brand_name'], ENT_QUOTES, 'UTF-8') ?></text>
        </svg>
    </a>
    <a class="try-now" href="#controller">
        <?= htmlspecialchars($site['cta_label'], ENT_QUOTES, 'UTF-8') ?>
    </a>
</header>
