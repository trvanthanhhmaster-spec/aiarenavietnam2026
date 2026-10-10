<?php
declare(strict_types=1);
// Read-only: no login, uploads, writes, tracking or AI calls.
if (($argv[1] ?? '') !== '--live') exit("Use --live for read-only HTTPS SEO verification.\n");
$base = 'https://v-remix.vietnamsir.com';
function seoCheck(bool $ok, string $label): void { if (!$ok) throw new RuntimeException($label); }
function seoRequest(string $route): array {
    global $base;
    $headers = '';
    $handle = curl_init($base . $route);
    curl_setopt_array($handle, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_HEADERFUNCTION => static function ($h, string $line) use (&$headers): int { $headers .= $line; return strlen($line); }]);
    $body = curl_exec($handle); $code = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE); curl_close($handle);
    seoCheck(is_string($body), 'HTTPS transport failed'); return ['body' => $body, 'code' => $code, 'headers' => $headers];
}
foreach (['/' => 'home', '/studio.php' => 'studio'] as $route => $key) {
    $result = seoRequest($route); seoCheck($result['code'] === 200, $key . ' not available');
    seoCheck(substr_count($result['body'], '<title>') === 1, 'Duplicate title');
    foreach (['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'twitter:card', 'google'] as $tag) {
        if ($tag !== 'google') seoCheck(str_contains($result['body'], $tag), 'Missing ' . $tag);
    }
    seoCheck(str_contains($result['body'], 'rel="canonical" href="' . $base . $route . '"'), 'Incorrect canonical');
    seoCheck(str_contains($result['body'], 'index,follow,max-image-preview:large'), 'Public indexing policy');
    preg_match('/property="og:image" content="([^"]+)"/', $result['body'], $match);
    $imageUrl = html_entity_decode($match[1] ?? '');
    seoCheck(str_starts_with($imageUrl, $base . '/'), 'OG image not a durable own-origin asset');
    $image = seoRequest(substr($imageUrl, strlen($base))); seoCheck($image['code'] === 200 && getimagesizefromstring($image['body']) !== false, 'OG raster inaccessible');
    if ($key === 'home') {
        preg_match('#<script type="application/ld\+json">(.*?)</script>#s', $result['body'], $match);
        $schema = json_decode($match[1] ?? '', true, 64, JSON_THROW_ON_ERROR);
        seoCheck($schema['@graph'][0]['@type'] === 'WebSite' && $schema['@graph'][1]['@type'] === 'Organization', 'Structured data missing');
    }
}
foreach (['/admin.php', '/auth.php'] as $route) seoCheck(str_contains(seoRequest($route)['body'], 'noindex,follow'), 'Private page indexed');
$robots = seoRequest('/robots.txt'); seoCheck($robots['code'] === 200 && str_contains($robots['body'], 'Sitemap: ' . $base . '/sitemap.xml'), 'Robots route');
$sitemap = seoRequest('/sitemap.xml'); seoCheck($sitemap['code'] === 200 && substr_count($sitemap['body'], '<loc>') === 2 && !str_contains($sitemap['body'], 'admin.php'), 'Public-only sitemap');
$manifest = seoRequest('/site.webmanifest'); $data = json_decode($manifest['body'], true, 64, JSON_THROW_ON_ERROR);
seoCheck($manifest['code'] === 200 && count($data['icons']) === 2, 'Manifest route');
foreach ($data['icons'] as $icon) { $image = seoRequest('/' . $icon['src']); $info = @getimagesizefromstring($image['body']); seoCheck($image['code'] === 200 && $info && $icon['sizes'] === $info[0] . 'x' . $info[1], 'Manifest dimension mismatch'); }
seoCheck(seoRequest('/favicon.ico')['code'] === 302, 'Root favicon not redirected');
foreach (['brand', 'seo'] as $resource) seoCheck(seoRequest('/admin-api.php?resource=' . $resource)['code'] === 403, 'Guest can read/write admin settings');
foreach (['../../.env', 'invalid.png'] as $id) seoCheck(seoRequest('/brand-asset.php?id=' . rawurlencode($id))['code'] === 404, 'Unsafe asset lookup');
echo "Production SEO: HTTPS metadata/canonical/schema, public raster images, noindex admin/auth, robots, two-page sitemap, manifest dimensions, favicon and protected configuration passed. No writes or AI calls.\n";
