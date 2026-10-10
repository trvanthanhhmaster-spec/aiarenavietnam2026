<?php
declare(strict_types=1);
namespace App\Infrastructure {
    // Deliberate in-memory transport double; no network or production credentials.
    final class SupabaseAdminClient {
        public array $row = ['id' => 'row-id', 'ui' => ['button_copy' => 'Giữ nguyên'], 'updated_at' => 'revision-1', 'title' => 'Trang chủ', 'description' => 'Mô tả'];
        public bool $race = false;
        public function select(string $table, array $query): array { return [$this->row]; }
        public function update(string $table, array $filters, array $values): array {
            if ($this->race || $filters['updated_at'] !== 'eq.' . $this->row['updated_at']) return [];
            $this->row = array_replace($this->row, $values); $this->row['updated_at'] = 'revision-' . random_int(2, 100000); return [$this->row];
        }
    }
}
namespace {
    require __DIR__ . '/../src/Support/WebsiteMetadata.php';
    require __DIR__ . '/../src/Infrastructure/BrandAssets.php';
    require __DIR__ . '/../src/Infrastructure/WebsiteSettings.php';
    use App\Support\WebsiteMetadata as M;
    use App\Infrastructure\BrandAssets as A;
    function check(bool $ok, string $label): void { if (!$ok) throw new RuntimeException($label); }
    function rejects(callable $fn): void { try { $fn(); } catch (InvalidArgumentException|RuntimeException $error) { return; } throw new RuntimeException('Expected rejection'); }
    $defaults = M::defaults();
    check(M::validateSection('brand', $defaults['brand']) === $defaults['brand'], 'Valid brand defaults');
    check(M::validateSection('seo', $defaults['seo']) === $defaults['seo'], 'Valid SEO defaults');
    foreach (['javascript:alert(1)', 'https://example.com/private-signed-image?token=secret', '../.env', 'data:image/svg+xml,x', 'assets/../.env', 'brand-asset.php?id=../../.env'] as $value) rejects(fn () => M::asset($value));
    $bad = $defaults['seo']; $bad['base_url'] = 'https://v-remix.vietnamsir.com"/><script>'; rejects(fn () => M::validateSection('seo', $bad));
    foreach (['http://example.com', 'https://user:pass@example.com', 'https://127.0.0.1', 'https://example.com/path', 'https://example.com?x=1', 'https://localhost'] as $url) { $bad = $defaults['seo']; $bad['base_url'] = $url; rejects(fn () => M::validateSection('seo', $bad)); }
    $bad = $defaults['seo']; $bad['google_verification'] = '<meta name="x">'; rejects(fn () => M::validateSection('seo', $bad));
    $bad = $defaults['seo']; $bad['indexable'] = 'false'; rejects(fn () => M::validateSection('seo', $bad));
    $bad = $defaults['seo']; $bad['pages']['admin'] = $bad['pages']['home']; rejects(fn () => M::validateSection('seo', $bad));
    check(!M::page($defaults, 'private')['indexable'], 'Admin always noindex');
    check(!M::page($defaults, 'studio', [], false)['indexable'], 'Localhost noindex');
    check(M::page($defaults, 'home')['canonical'] === 'https://v-remix.vietnamsir.com/', 'Clean home canonical');
    $disabled = $defaults; $disabled['seo']['indexable'] = false; check(!M::page($disabled, 'home')['indexable'], 'Global noindex');
    $client = new App\Infrastructure\SupabaseAdminClient();
    $settings = new App\Infrastructure\WebsiteSettings($client, 'home', sys_get_temp_dir() . '/website-test-nonexistent-cache');
    $brand = $defaults['brand']; $brand['name'] = 'V-Remix kiểm thử';
    $saved = $settings->save('brand', $brand, 'revision-1');
    check($client->row['ui']['button_copy'] === 'Giữ nguyên', 'Preserve UI copy');
    check($saved['settings']['brand']['name'] === 'V-Remix kiểm thử', 'Brand saved');
    $seo = $defaults['seo']; $seo['pages']['studio']['title'] = 'Tiêu đề thử';
    $saved = $settings->save('seo', $seo, $saved['revision']);
    check($saved['settings']['brand']['name'] === $brand['name'], 'SEO save preserves brand');
    rejects(fn () => $settings->save('brand', $brand, 'revision-1'));
    $client->race = true; rejects(fn () => $settings->save('brand', $brand, $saved['revision']));
    $image = (string) file_get_contents(__DIR__ . '/../assets/media/brand/share-default.png');
    $info = A::inspect($image, 'share_image'); check($info['width'] === 1200 && $info['height'] === 630, 'OG raster dimensions');
    rejects(fn () => A::inspect('<svg><script>alert(1)</script></svg>', 'logo_light'));
    rejects(fn () => A::inspect(str_repeat('x', 5000001), 'share_image'));
    rejects(fn () => A::inspect($image, 'favicon'));
    rejects(fn () => A::inspect($image, 'private-face'));
    $stored = $defaults; $stored['seo']['pages']['home']['title'] = 'Thử "quoted" & title';
    $websiteSettings = $stored; $websiteHome = ['description' => 'Mô tả']; $websiteCanonicalHost = true; $websitePage = 'home';
    ob_start(); require __DIR__ . '/../includes/partials/website-meta.php'; $html = ob_get_clean();
    check(str_contains($html, 'Thử &quot;quoted&quot; &amp; title'), 'HTML escaped');
    check(substr_count($html, '<title>') === 1 && str_contains($html, 'og:image') && str_contains($html, 'twitter:card'), 'Complete metadata');
    preg_match('#<script type="application/ld\+json">(.*?)</script>#s', $html, $match);
    check(json_decode($match[1], true)['@graph'][0]['@type'] === 'WebSite', 'Valid structured data');
    echo "Website settings: validation, safe public assets, CAS concurrency, UI preservation, noindex, escaping, schema and raster defaults passed offline.\n";
}
