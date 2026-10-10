<header class="site-header">
    <?php $brandVisibleName = trim((string) ($site['brand_mark'] ?? '') . ' ' . (string) ($site['brand_name'] ?? '')); ?>
    <a class="brand" href="#stage" aria-label="<?= htmlspecialchars($websiteSettings['brand']['name'] . ' — Khám phá', ENT_QUOTES, 'UTF-8') ?>">
        <?php if (!empty($websiteSettings['brand']['logo_dark'])): ?>
            <img class="brand__image" src="<?= htmlspecialchars($websiteSettings['brand']['logo_dark'], ENT_QUOTES, 'UTF-8') ?>" alt="<?= htmlspecialchars($websiteSettings['brand']['name'], ENT_QUOTES, 'UTF-8') ?>">
        <?php elseif (($websiteSettings['brand']['logo_light'] ?? '') !== 'assets/images/v-remix-leaf-logo.png' && !empty($websiteSettings['brand']['logo_light'])): ?>
            <img class="brand__image" src="<?= htmlspecialchars($websiteSettings['brand']['logo_light'], ENT_QUOTES, 'UTF-8') ?>" alt="<?= htmlspecialchars($websiteSettings['brand']['name'], ENT_QUOTES, 'UTF-8') ?>">
        <?php else: require __DIR__ . '/../components/brand-wordmark.php'; endif; ?>
    </a>
    <a class="try-now" id="exploreStudio" href="studio.php">
        <?= htmlspecialchars($site['cta_label'], ENT_QUOTES, 'UTF-8') ?>
    </a>
</header>
