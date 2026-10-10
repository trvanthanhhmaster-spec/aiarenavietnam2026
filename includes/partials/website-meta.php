<?php
declare(strict_types=1);
if (!isset($websiteSettings)) require __DIR__ . '/../website-bootstrap.php';
$websitePage = $websitePage ?? 'private';
$websiteMeta = App\Support\WebsiteMetadata::page($websiteSettings, $websitePage, $websiteHome, $websiteCanonicalHost);
$websiteEscape = static fn (string $text): string => htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$websitePrivate = !in_array($websitePage, ['home', 'studio'], true);
$websiteImageInfo = App\Support\WebsiteMetadata::imageInfo(($websiteSettings['seo']['pages'][$websitePage]['share_image'] ?? '') ?: ($websiteSettings['seo']['share_image'] ?: App\Support\WebsiteMetadata::defaults()['seo']['share_image']));
?>
<title><?= $websiteEscape($websitePrivate ? ($websitePrivateTitle ?? 'V-Remix') : $websiteMeta['title']) ?></title>
<meta name="description" content="<?= $websiteEscape($websiteMeta['description']) ?>">
<meta name="robots" content="<?= $websiteMeta['indexable'] ? 'index,follow,max-image-preview:large' : 'noindex,follow' ?>">
<?php if (!$websitePrivate): ?><meta name="theme-color" content="<?= $websiteEscape($websiteSettings['brand']['theme_color']) ?>"><?php endif; ?>
<link rel="icon" href="<?= $websiteEscape($websiteSettings['brand']['favicon'] ?: 'assets/media/favicon.svg') ?>">
<link rel="apple-touch-icon" href="<?= $websiteEscape($websiteSettings['brand']['apple_icon'] ?: 'assets/media/brand/apple-touch-icon.png') ?>">
<?php if (!$websitePrivate): ?>
<link rel="canonical" href="<?= $websiteEscape($websiteMeta['canonical']) ?>">
<link rel="manifest" href="site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:locale" content="vi_VN">
<meta property="og:site_name" content="<?= $websiteEscape($websiteSettings['brand']['name']) ?>">
<meta property="og:title" content="<?= $websiteEscape($websiteMeta['title']) ?>">
<meta property="og:description" content="<?= $websiteEscape($websiteMeta['description']) ?>">
<meta property="og:url" content="<?= $websiteEscape($websiteMeta['canonical']) ?>">
<meta property="og:image" content="<?= $websiteEscape($websiteMeta['image']) ?>">
<?php if ($websiteImageInfo): ?>
<meta property="og:image:width" content="<?= (int) $websiteImageInfo['width'] ?>">
<meta property="og:image:height" content="<?= (int) $websiteImageInfo['height'] ?>">
<meta property="og:image:type" content="<?= $websiteEscape($websiteImageInfo['mime']) ?>">
<?php endif; ?>
<meta property="og:image:alt" content="<?= $websiteEscape($websiteSettings['seo']['share_alt']) ?>">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="<?= $websiteEscape($websiteMeta['title']) ?>">
<meta name="twitter:description" content="<?= $websiteEscape($websiteMeta['description']) ?>">
<meta name="twitter:image" content="<?= $websiteEscape($websiteMeta['image']) ?>">
<meta name="twitter:image:alt" content="<?= $websiteEscape($websiteSettings['seo']['share_alt']) ?>">
<?php foreach (['google_verification' => 'google-site-verification', 'bing_verification' => 'msvalidate.01'] as $key => $tag): if ($websiteSettings['seo'][$key] !== ''): ?>
<meta name="<?= $tag ?>" content="<?= $websiteEscape($websiteSettings['seo'][$key]) ?>">
<?php endif; endforeach; ?>
<?php if ($websitePage === 'home'): ?>
<script type="application/ld+json"><?= json_encode(['@context' => 'https://schema.org', '@graph' => [
    ['@type' => 'WebSite', '@id' => $websiteSettings['seo']['base_url'] . '/#website', 'url' => $websiteSettings['seo']['base_url'] . '/', 'name' => $websiteSettings['brand']['name'], 'inLanguage' => 'vi'],
    ['@type' => 'Organization', '@id' => $websiteSettings['seo']['base_url'] . '/#organization', 'name' => $websiteSettings['brand']['name'], 'url' => $websiteSettings['seo']['base_url'] . '/', 'logo' => App\Support\WebsiteMetadata::absolute($websiteSettings['brand']['logo_light'] ?: 'assets/images/v-remix-leaf-logo.png', $websiteSettings), 'sameAs' => $websiteSettings['seo']['social_urls']],
]], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?></script>
<?php endif; endif; ?>
