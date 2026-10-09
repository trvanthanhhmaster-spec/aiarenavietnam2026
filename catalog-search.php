<?php
declare(strict_types=1);

require __DIR__ . '/src/Support/Env.php';
require __DIR__ . '/src/Support/SupabaseAuth.php';
require __DIR__ . '/src/Infrastructure/SupabaseAdminClient.php';
require __DIR__ . '/src/Infrastructure/WikimediaCatalog.php';
require __DIR__ . '/src/Infrastructure/CatalogResearch.php';

use App\Infrastructure\SupabaseAdminClient;
use App\Infrastructure\WikimediaCatalog;
use App\Infrastructure\CatalogResearch;
use App\Support\Env;
use App\Support\SupabaseAuth;

Env::load(__DIR__ . '/.env');
$auth = new SupabaseAuth(
    (string) getenv('SUPABASE_URL'),
    (string) getenv('SUPABASE_ANON_KEY'),
    (string) getenv('SUPABASE_SERVICE_ROLE_KEY')
);
$auth->boot();
if ($auth->user() === null || !$auth->isAdmin()) {
    header('Location: auth.php?next=' . rawurlencode('catalog-search.php'));
    exit;
}

$escape = static fn (mixed $value): string => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
$plainText = static function (mixed $value): string {
    return trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags((string) $value), ENT_QUOTES | ENT_HTML5, 'UTF-8')) ?? '');
};
$slugify = static function (string $value): string {
    $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    $slug = strtolower((string) preg_replace('/[^a-z0-9]+/i', '-', (string) $ascii));
    return trim($slug, '-') ?: 'mau-catalog';
};
$isWikimediaUrl = static function (string $value): bool {
    $host = strtolower((string) parse_url($value, PHP_URL_HOST));
    return $host === 'commons.wikimedia.org'
        || $host === 'upload.wikimedia.org'
        || str_ends_with($host, '.wikimedia.org');
};

$client = new SupabaseAdminClient(
    rtrim((string) getenv('SUPABASE_URL'), '/'),
    (string) getenv('SUPABASE_SERVICE_ROLE_KEY')
);
$garments = $client->select('studio_garments', [
    'select' => 'id,name,slug',
    'is_active' => 'eq.true',
    'order' => 'sort_order.asc',
]);
$accessories = $client->select('studio_accessories', [
    'select' => 'id,name,slug',
    'is_active' => 'eq.true',
    'order' => 'sort_order.asc',
]);

$message = '';
$error = '';
$results = [];
$query = trim((string) ($_POST['q'] ?? $_GET['q'] ?? ''));
$entityType = in_array($_POST['type'] ?? $_GET['type'] ?? '', ['garment', 'accessory'], true)
    ? (string) ($_POST['type'] ?? $_GET['type'])
    : 'garment';
$selectedParent = (string) ($_POST['parent_id'] ?? $_GET['parent'] ?? '');
$sources = new WikimediaCatalog();
// Dedicated server-only mount, never provider cookies or credentials in HTML.
Env::load('/run/vremix/catalog-research.env');
$research = new CatalogResearch((string) getenv('VREMIX_CATALOG_BRIDGE_URL'), (string) getenv('VREMIX_CATALOG_BRIDGE_SECRET'));
$researchRequested = $_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'research';
$cacheKey = hash('sha256', $entityType . '|' . $query . '|' . $selectedParent);
$researchFiltered = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if (!$auth->verifyCsrf((string) ($_POST['csrf'] ?? ''))) {
            throw new RuntimeException('Phiên quản trị đã hết hạn. Hãy tải lại trang.');
        }
        if (!$researchRequested) {
        $entityType = in_array($_POST['type'] ?? '', ['garment', 'accessory'], true)
            ? (string) $_POST['type']
            : '';
        $parentId = (string) ($_POST['parent_id'] ?? '');
        $candidate = json_decode(base64_decode((string) ($_POST['candidate'] ?? ''), true) ?: '', true, 32, JSON_THROW_ON_ERROR);
        if ($entityType === '' || !is_array($candidate) || preg_match('/^[0-9a-f-]{36}$/i', $parentId) !== 1) {
            throw new RuntimeException('Dữ liệu nhập catalog không hợp lệ.');
        }
        $parents = $entityType === 'garment' ? $garments : $accessories;
        $parent = null;
        foreach ($parents as $item) {
            if (($item['id'] ?? '') === $parentId) {
                $parent = $item;
                break;
            }
        }
        if ($parent === null) {
            throw new RuntimeException('Loại catalog cha không tồn tại.');
        }

        $sourceUrl = (string) ($candidate['source_url'] ?? '');
        $imageUrl = (string) ($candidate['image_url'] ?? '');
        $thumbnailUrl = (string) ($candidate['thumbnail_url'] ?? '');
        if (!$isWikimediaUrl($sourceUrl) || !$isWikimediaUrl($imageUrl) || !$isWikimediaUrl($thumbnailUrl)) {
            throw new RuntimeException('Chỉ nhận URL trực tiếp từ Wikimedia trong provider này.');
        }
        $title = mb_substr($plainText($candidate['title'] ?? ''), 0, 220);
        $description = mb_substr($plainText($candidate['description'] ?? ''), 0, 2000);
        $creator = mb_substr($plainText($candidate['creator'] ?? ''), 0, 500);
        $license = mb_substr($plainText($candidate['license'] ?? ''), 0, 180);
        $externalId = mb_substr((string) ($candidate['external_id'] ?? ''), 0, 100);
        if ($title === '' || $externalId === '') {
            throw new RuntimeException('Nguồn thiếu tên hoặc ID Wikimedia.');
        }
        // Re-read authoritative metadata. A form cannot substitute another
        // file URL/license/description while retaining a trusted provider host.
        $candidate = $sources->file($externalId);
        $title = $candidate['title']; $description = $candidate['description'];
        $creator = $candidate['creator']; $license = $candidate['license'];
        $sourceUrl = $candidate['source_url']; $imageUrl = $candidate['image_url']; $thumbnailUrl = $candidate['thumbnail_url'];
        if ($license === '') throw new RuntimeException('Nguồn chưa có giấy phép rõ ràng. Hãy kiểm tra trước khi nhập.');

        $sourceRows = $client->insert('cultural_sources', [
            'title' => 'Wikimedia: ' . $title,
            'source_url' => $sourceUrl,
            'license' => $license,
            'curator_note' => trim('Tác giả: ' . $creator . '. Cần biên tập và kiểm chứng trước khi xuất bản.'),
            'review_status' => 'draft',
        ]);
        $sourceId = (string) ($sourceRows[0]['id'] ?? '');
        $baseRecord = [
            'slug' => $slugify($title) . '-' . $externalId,
            'name' => $title,
            'description' => $description,
            'material' => '',
            'color_palette' => [],
            'image_url' => $imageUrl,
            'thumbnail_url' => $thumbnailUrl,
            'prompt_descriptor' => '',
            'source_id' => $sourceId !== '' ? $sourceId : null,
            'source_url' => $sourceUrl,
            'source_provider' => 'wikimedia',
            'source_external_id' => $externalId,
            'review_status' => 'draft',
            'sort_order' => 100,
            'is_active' => false,
        ];
        if ($entityType === 'garment') {
            $client->insert('studio_garment_variants', $baseRecord + [
                'garment_id' => $parentId,
                'silhouette' => '',
                'pattern_notes' => '',
                'negative_descriptor' => '',
            ]);
        } else {
            $client->insert('studio_accessory_variants', $baseRecord + [
                'accessory_id' => $parentId,
            ]);
        }
        $message = 'Đã nhập “' . $title . '” làm bản nháp. Hãy mở mục Mẫu catalog để biên tập và xuất bản.';
        }
    } catch (Throwable $exception) {
        $error = $exception->getMessage();
    }
}

if ($query !== '') {
    try {
        if (mb_strlen($query) < 2 || mb_strlen($query) > 100) {
            throw new RuntimeException('Từ khoá cần từ 2 đến 100 ký tự.');
        }
        $results = $sources->search($query);
    } catch (Throwable $exception) {
        $error = $exception->getMessage();
    }
}
// No AI work on GET, no automatic retries, and cached ranking for an hour.
if ($error === '' && $query !== '') {
    $cached = $_SESSION['catalog_research_cache'] ?? null;
    if (($researchRequested || ($_GET['all'] ?? '') !== '1') && is_array($cached) && ($cached['key'] ?? '') === $cacheKey && ($cached['at'] ?? 0) > time() - 3600) {
        $results = $cached['rows'];
        $researchFiltered = true;
        if ($message === '') $message = 'Đang dùng kết quả AI đã lưu tạm; không gọi lại provider. Kiểm tra ảnh và nguồn trước khi nhập nháp.';
    } elseif ($researchRequested) {
        try {
            if (!$auth->verifyCsrf((string) ($_POST['csrf'] ?? ''))) throw new RuntimeException('Phiên quản trị đã hết hạn. Hãy tải lại trang.');
            $parent = null;
            foreach ($entityType === 'garment' ? $garments : $accessories as $row) if ($row['id'] === $selectedParent) $parent = $row;
            if ($parent === null) throw new RuntimeException('Chọn đúng loại áo hoặc phụ kiện để AI lọc tư liệu.');
            if (($_SESSION['catalog_research_at'] ?? 0) > time() - 60) throw new RuntimeException('Hãy chờ một phút trước lượt AI tiếp theo.');
            if (!$research->ready()) throw new RuntimeException('Kết nối AI tìm tư liệu chưa được cấu hình. Vẫn có thể nhập nguồn thủ công.');
            $_SESSION['catalog_research_at'] = time();
            $results = $research->rank($parent['name'], $results);
            $researchFiltered = true;
            $_SESSION['catalog_research_cache'] = ['key' => $cacheKey, 'at' => time(), 'rows' => $results];
            $message = 'AI đã lọc theo mô tả nguồn, chưa kiểm chứng chi tiết trong ảnh. Nhập mẫu làm nháp, biên tập màu/họa tiết rồi xuất bản để Studio dùng lại.';
        } catch (Throwable $exception) {
            $error = $exception instanceof RuntimeException ? $exception->getMessage() : 'Không đọc được kết quả AI. Không tự gọi lại; nguồn thủ công vẫn được giữ.';
        }
    }
}
?>
<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f3efe7">
    <title>Tìm nguồn catalog — V-Remix</title>
    <link rel="icon" href="assets/media/favicon.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&family=Lora:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/admin.css') ?>">
    <link rel="stylesheet" href="assets/css/catalog-search.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/catalog-search.css') ?>">
</head>
<body class="admin-page catalog-import-page">
<header class="admin-header">
    <div><a class="admin-wordmark" href="index.php#stage">V<span>/</span>REMIX</a><span class="admin-header__label">/ Source desk</span></div>
    <div class="admin-header__actions"><a href="admin.php">Quay lại Admin <span>←</span></a><a href="studio.php">Mở Studio <span>↗</span></a></div>
</header>
<main class="catalog-import">
    <section class="catalog-import__intro">
        <div><p class="admin-eyebrow">Wikimedia Commons / provider 01</p><h1>Tìm tư liệu.<br><em>Duyệt trước khi dùng.</em></h1></div>
        <p>Kết quả tìm kiếm không đi thẳng ra Studio. Mỗi ảnh được nhập thành mẫu nháp, giữ tác giả, giấy phép và URL nguồn để Admin biên tập trước khi xuất bản.</p>
    </section>
    <?php if ($message !== ''): ?><p class="admin-alert"><?= $escape($message) ?></p><?php endif; ?>
    <?php if ($error !== ''): ?><p class="admin-alert admin-alert--error"><?= $escape($error) ?></p><?php endif; ?>
    <?php if ($researchFiltered): ?><p><a href="catalog-search.php?<?= $escape(http_build_query(['q'=>$query,'type'=>$entityType,'parent'=>$selectedParent,'all'=>'1'])) ?>">Xem toàn bộ nguồn, không lọc AI ↗</a></p><?php endif; ?>
    <form class="catalog-search-form" method="get">
        <label><span>Tìm loại trang phục, họa tiết hoặc phụ kiện</span><input type="search" name="q" value="<?= $escape($query) ?>" placeholder="Ví dụ: áo Nhật Bình, khăn vấn, traditional Vietnamese dress" required minlength="2" maxlength="100"></label>
        <label><span>Nhập cho nhóm</span><select name="type"><option value="garment"<?= $entityType === 'garment' ? ' selected' : '' ?>>Trang phục</option><option value="accessory"<?= $entityType === 'accessory' ? ' selected' : '' ?>>Phụ kiện</option></select></label>
        <button class="admin-button admin-button--solid" type="submit">Tìm nguồn <span>↗</span></button>
    </form>
    <?php if ($query !== '' && $results !== []): ?>
    <form method="post" class="catalog-search-form">
        <input type="hidden" name="csrf" value="<?= $escape($auth->csrfToken()) ?>">
        <input type="hidden" name="action" value="research"><input type="hidden" name="q" value="<?= $escape($query) ?>"><input type="hidden" name="type" value="<?= $escape($entityType) ?>">
        <label><span>AI lọc ảnh theo đúng loại</span><select name="parent_id" required>
            <option value="">Chọn loại áo / phụ kiện</option>
            <?php foreach ($entityType === 'garment' ? $garments : $accessories as $parent): ?>
            <option value="<?= $escape($parent['id']) ?>"<?= $parent['id'] === $selectedParent ? ' selected' : '' ?>><?= $escape($parent['name']) ?></option>
            <?php endforeach; ?>
        </select></label>
        <p>Chỉ lọc tư liệu có sẵn theo mô tả, chưa phân tích chi tiết ảnh. Một lượt AI khi bấm; kết quả lưu tạm 1 giờ. Mẫu đã xuất bản được dùng lại trong Studio.</p>
        <button class="admin-button admin-button--solid" type="submit"<?= !$research->ready() ? ' disabled' : '' ?>>AI lọc tư liệu</button>
    </form>
    <?php endif; ?>
    <section class="catalog-results" aria-label="Kết quả nguồn Wikimedia">
        <?php foreach ($results as $result): ?>
            <article class="catalog-source-card">
                <img src="<?= $escape($result['thumbnail_url']) ?>" alt="Tư liệu <?= $escape($result['title']) ?>" loading="lazy">
                <div class="catalog-source-card__copy">
                    <p class="admin-eyebrow"><?= $escape($result['license'] ?: 'Chưa rõ license') ?></p>
                    <h2><?= $escape($result['title']) ?></h2>
                    <p><?= $escape($result['description'] ?: 'Chưa có mô tả tiếng Việt; cần biên tập sau khi nhập.') ?></p>
                    <small><?= $escape($result['creator'] ?: 'Chưa rõ tác giả') ?></small>
                    <?php if (isset($result['research_note'])): ?><p><strong>AI hỗ trợ · cần duyệt:</strong> <?= $escape($result['research_note']) ?></p><?php endif; ?>
                </div>
                <form method="post" class="catalog-source-card__action">
                    <input type="hidden" name="csrf" value="<?= $escape($auth->csrfToken()) ?>">
                    <input type="hidden" name="type" value="<?= $escape($entityType) ?>">
                    <input type="hidden" name="q" value="<?= $escape($query) ?>">
                    <input type="hidden" name="candidate" value="<?= $escape(base64_encode(json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR))) ?>">
                    <label><span>Loại cha</span><select name="parent_id" required>
                        <?php foreach ($entityType === 'garment' ? $garments : $accessories as $parent): ?>
                            <option value="<?= $escape($parent['id']) ?>"<?= $parent['id'] === $selectedParent ? ' selected' : '' ?>><?= $escape($parent['name']) ?></option>
                        <?php endforeach; ?>
                    </select></label>
                    <a href="<?= $escape($result['source_url']) ?>" target="_blank" rel="noopener noreferrer">Xem nguồn ↗</a>
                    <button class="admin-button admin-button--solid" type="submit">Nhập làm nháp</button>
                </form>
            </article>
        <?php endforeach; ?>
        <?php if ($query !== '' && $results === [] && $error === ''): ?><p class="catalog-results__empty"><?= $researchFiltered ? 'AI chưa chọn được tư liệu phù hợp. Mở toàn bộ nguồn để tự đối chiếu; không tự gọi lại AI.' : 'Không tìm thấy ảnh phù hợp. Hãy thử từ khóa tiếng Anh hoặc tên trang phục rộng hơn.' ?></p><?php endif; ?>
    </section>
</main>
</body>
</html>
