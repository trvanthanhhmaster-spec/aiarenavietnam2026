<?php
declare(strict_types=1);
require __DIR__ . '/includes/website-bootstrap.php';
use App\Support\WebsiteMetadata;
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD'], true)) { http_response_code(405); header('Allow: GET, HEAD'); exit; }
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=30');
$kind = ['robots.txt' => 'robots', 'sitemap.xml' => 'sitemap', 'site.webmanifest' => 'manifest', 'favicon.ico' => 'favicon'][basename((string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH))] ?? (string) ($_GET['kind'] ?? '');
$base = $websiteSettings['seo']['base_url'];
if ($kind === 'favicon') {
    header('Cache-Control: public, max-age=30');
    // Relative redirect keeps local deployments on their own origin.
    header('Location: ' . ($websiteSettings['brand']['favicon'] ?: 'assets/media/favicon.svg'), true, 302); exit;
}
if ($kind === 'robots') {
    header('Content-Type: text/plain; charset=utf-8');
    echo "User-agent: *\n";
    if (!$websiteCanonicalHost || !$websiteSettings['seo']['indexable']) echo "Disallow: /\n";
    else {
        echo "Allow: /\n";
        foreach (['admin.php', 'admin-api.php', 'auth.php', 'auth-google.php', 'auth-callback.php', 'catalog-search.php', 'generation-edge.php', 'studio-history.php', 'look-api.php', 'studio-draft.php', 'studio-collections-api.php', 'studio-advisor.php'] as $route) echo 'Disallow: /' . $route . "\n";
        echo 'Sitemap: ' . $base . "/sitemap.xml\n";
    }
} elseif ($kind === 'sitemap') {
    header('Content-Type: application/xml; charset=utf-8');
    echo '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    if ($websiteCanonicalHost && $websiteSettings['seo']['indexable']) foreach (['home' => '/', 'studio' => '/studio.php'] as $key => $path) {
        if ($websiteSettings['seo']['pages'][$key]['indexable']) echo '<url><loc>' . htmlspecialchars($base . $path, ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</loc></url>';
    }
    echo '</urlset>';
} elseif ($kind === 'manifest') {
    header('Content-Type: application/manifest+json; charset=utf-8');
    $icons = [];
    foreach ([192, 512] as $size) {
        $icon = $websiteSettings['brand']['icon_' . $size] ?: 'assets/media/brand/icon-' . $size . '.png';
        $icons[] = ['src' => $icon, 'sizes' => $size . 'x' . $size, 'purpose' => 'any'];
    }
    echo json_encode(['name' => $websiteSettings['brand']['name'], 'short_name' => mb_substr($websiteSettings['brand']['name'], 0, 12), 'lang' => 'vi', 'start_url' => './', 'scope' => './', 'display' => 'standalone', 'theme_color' => $websiteSettings['brand']['theme_color'], 'background_color' => '#f2f0f8', 'icons' => $icons], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} else { http_response_code(404); }
