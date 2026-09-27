<header class="site-header">
    <?php $brandVisibleName = trim((string) ($site['brand_mark'] ?? '') . ' ' . (string) ($site['brand_name'] ?? '')); ?>
    <a class="brand" href="#stage" aria-label="<?= htmlspecialchars(trim($brandVisibleName . ' — ' . (string) ($site['ui']['brand_aria_label'] ?? 'Trang chủ V-Remix')), ENT_QUOTES, 'UTF-8') ?>">
        <?php require __DIR__ . '/../components/brand-wordmark.php'; ?>
    </a>
    <a class="try-now" href="studio.php">
        <?= htmlspecialchars($site['cta_label'], ENT_QUOTES, 'UTF-8') ?>
    </a>
</header>
