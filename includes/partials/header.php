<header class="site-header">
    <a class="brand" href="#stage" aria-label="<?= htmlspecialchars($site['ui']['brand_aria_label'], ENT_QUOTES, 'UTF-8') ?>">
        <?php require __DIR__ . '/../components/brand-wordmark.php'; ?>
    </a>
    <a class="try-now" href="studio.php">
        <?= htmlspecialchars($site['cta_label'], ENT_QUOTES, 'UTF-8') ?>
    </a>
</header>
