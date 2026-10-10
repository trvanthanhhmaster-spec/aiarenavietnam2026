<?php
declare(strict_types=1);
// CLI-only deterministic template fixture. No sessions, Supabase, AI or imports.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$root = dirname(__DIR__);
require_once $root . '/src/Support/WebsiteMetadata.php';
function renderCatalogPreview(string $state): string {
    global $root;
    $websiteSettings = App\Support\WebsiteMetadata::defaults();
    $websiteHome = [];
    $websiteCanonicalHost = false;
    $auth = new class { public function csrfToken(): string { return 'offline-csrf'; } };
    $research = new class { public function ready(): bool { return false; } };
    $escape = static fn ($value): string => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
    $garments = [['id'=>'11111111-1111-4111-8111-111111111111','name'=>'Áo tấc'], ['id'=>'22222222-2222-4222-8222-222222222222','name'=>'Nhật Bình']];
    $accessories = [['id'=>'33333333-3333-4333-8333-333333333333','name'=>'Khăn vấn']];
    $entityType = $state === 'accessory' ? 'accessory' : 'garment';
    $selectedParent = $entityType === 'garment' ? $garments[0]['id'] : $accessories[0]['id'];
    $query = $state === 'idle' ? '' : 'Áo tấc <script>alert(1)</script>';
    $message = $state === 'filtered' ? 'Dữ liệu minh họa · không gọi AI, không nhập nguồn.' : '';
    $error = $state === 'error' ? 'Không đọc được nguồn lúc này. Hãy thử lại.' : '';
    $researchFiltered = $state === 'filtered';
    $results = [];
    if (in_array($state, ['results', 'filtered', 'accessory', 'broken'], true)) {
        foreach (['Áo tấc · ảnh tham khảo', 'Nhật Bình · tư liệu có nguồn'] as $index => $title) {
            $results[] = ['title'=>$title, 'thumbnail_url'=>$state === 'broken' ? 'missing-preview.jpg' : 'assets/images/v-remix-leaf-logo.png', 'source_url'=>'https://commons.wikimedia.org/wiki/File:Preview.jpg', 'external_id'=>'File:Preview.jpg', 'license'=>'CC BY-SA 4.0', 'creator'=>'Tác giả <img src=x onerror=alert(1)>', 'description'=>'Dữ liệu QA minh họa. Ảnh chỉ dùng kiểm tra bố cục, không phải kết quả tìm kiếm trực tiếp.', 'research_note'=>'Ghi chú minh họa; vẫn cần duyệt nguồn.'];
        }
    }
    ob_start();
    require $root . '/includes/catalog/search-page.php';
    return (string) ob_get_clean();
}
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    $destination = $argv[1] ?? '';
    if (!is_dir($destination) || !str_starts_with(realpath($destination) ?: '', '/private/tmp/')) { fwrite(STDERR, "Pass an existing temporary output directory.\n"); exit(1); }
    foreach (['idle','results','filtered','empty','error','accessory','broken'] as $state) file_put_contents($destination . '/' . $state . '.html', renderCatalogPreview($state));
    echo "Synthetic catalog states rendered; no remote calls or writes.\n";
}
