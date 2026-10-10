<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/Support/Env.php';
require_once __DIR__ . '/../src/Support/WebsiteMetadata.php';
require_once __DIR__ . '/../src/Infrastructure/BrandAssets.php';
require_once __DIR__ . '/../src/Infrastructure/SupabaseClient.php';
App\Support\Env::load(__DIR__ . '/../.env');
$websiteDatabase = require __DIR__ . '/../config/database.php';
$websiteCache = $websiteDatabase['cache_file'] . '.website';
$websiteStored = null;
if (is_file($websiteCache)) {
    $websiteStored = json_decode((string) file_get_contents($websiteCache), true);
}
if (!is_array($websiteStored) || (int) ($websiteStored['expires'] ?? 0) < time()) {
    try {
        $websiteRows = (new App\Infrastructure\SupabaseClient($websiteDatabase['url'], $websiteDatabase['anon_key'], 4))->select('pages', ['slug' => 'eq.' . $websiteDatabase['site_slug'], 'select' => 'ui,title,description', 'limit' => '1']);
        if (!is_array($websiteRows[0] ?? null) || !isset($websiteRows[0]['title'], $websiteRows[0]['description'])) throw new RuntimeException('Missing home page');
        $websiteStored = ['settings' => $websiteRows[0]['ui']['website'] ?? [], 'home' => ['title' => $websiteRows[0]['title'], 'description' => $websiteRows[0]['description']], 'expires' => time() + 30];
        if (is_dir(dirname($websiteCache)) || @mkdir(dirname($websiteCache), 0775, true)) @file_put_contents($websiteCache, json_encode($websiteStored, JSON_UNESCAPED_UNICODE), LOCK_EX);
    } catch (Throwable $error) { error_log('[V-Remix] Website metadata read unavailable.'); }
}
$websiteSettings = App\Support\WebsiteMetadata::normalize(is_array($websiteStored['settings'] ?? null) ? $websiteStored['settings'] : []);
$websiteHome = is_array($websiteStored['home'] ?? null) ? $websiteStored['home'] : [];
$websiteCanonicalHost = strtolower(explode(':', (string) ($_SERVER['HTTP_HOST'] ?? ''))[0]) === strtolower((string) parse_url($websiteSettings['seo']['base_url'], PHP_URL_HOST));
