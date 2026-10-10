<?php
declare(strict_types=1);
$catalogRoot = dirname(__DIR__, 2);
$catalogParents = $entityType === 'garment' ? $garments : $accessories;
?>
<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f0f8fc">
    <?php $websitePage = 'private'; $websitePrivateTitle = 'Tìm tư liệu — V-Remix Admin'; require $catalogRoot . '/includes/partials/website-meta.php'; ?>
    <link rel="stylesheet" href="assets/css/admin.css?v=<?= (int) filemtime($catalogRoot . '/assets/css/admin.css') ?>">
    <link rel="stylesheet" href="assets/css/admin-dashboard.css?v=<?= (int) filemtime($catalogRoot . '/assets/css/admin-dashboard.css') ?>">
    <link rel="stylesheet" href="assets/css/catalog-search.css?v=<?= (int) filemtime($catalogRoot . '/assets/css/catalog-search.css') ?>">
    <script src="assets/js/catalog-search.js?v=<?= (int) filemtime($catalogRoot . '/assets/js/catalog-search.js') ?>" defer></script>
</head>
<body class="admin-page catalog-import-page">
<a class="catalog-skip" href="#catalogSearch">Đến ô tìm kiếm</a>
<div class="catalog-shell">
    <header class="catalog-header">
        <div class="catalog-header__identity">
            <a class="catalog-brand" href="index.php#stage" aria-label="<?= $escape($websiteSettings['brand']['name']) ?> — Khám phá"><img src="<?= $escape($websiteSettings['brand']['logo_light'] ?: 'assets/images/v-remix-leaf-logo.png') ?>" alt="<?= $escape($websiteSettings['brand']['name']) ?>" width="64" height="64"></a>
            <span>V-Remix / Admin / Catalog</span>
        </div>
        <nav class="catalog-header__actions" aria-label="Điều hướng quản trị">
            <a class="admin-button" href="admin.php">← Quay lại Admin</a>
            <a class="admin-button admin-button--solid" href="studio.php">Mở Studio ↗</a>
        </nav>
    </header>
    <main class="catalog-import" id="catalogMain">
        <section class="catalog-import__intro" aria-labelledby="catalogTitle">
            <div><p class="admin-eyebrow">Thư viện / Nguồn tham khảo</p><h1 id="catalogTitle">Tìm tư liệu.</h1><p>Tìm ảnh trang phục và phụ kiện có nguồn. Duyệt trước khi đưa vào Studio.</p></div>
            <ol class="catalog-workflow" aria-label="Quy trình xuất bản"><li>Tìm nguồn</li><li>Nhập bản nháp</li><li>Biên tập & xuất bản</li></ol>
        </section>
        <?php if ($message !== ''): ?><p class="catalog-notice" role="status"><?= $escape($message) ?></p><?php endif; ?>
        <?php if ($error !== ''): ?><p class="catalog-notice catalog-notice--error" role="alert"><?= $escape($error) ?></p><?php endif; ?>
        <section class="catalog-search-panel" aria-label="Tìm ảnh từ Wikimedia Commons">
            <form class="catalog-search-form" method="get" action="catalog-search.php" data-search-form>
                <label for="catalogSearch"><span>Từ khóa tìm kiếm</span><input id="catalogSearch" type="search" name="q" value="<?= $escape($query) ?>" placeholder="Áo Nhật Bình, khăn vấn…" required minlength="2" maxlength="100"></label>
                <label for="catalogType"><span>Nhóm tư liệu</span><select id="catalogType" name="type"><option value="garment"<?= $entityType === 'garment' ? ' selected' : '' ?>>Trang phục</option><option value="accessory"<?= $entityType === 'accessory' ? ' selected' : '' ?>>Phụ kiện</option></select></label>
                <button class="admin-button admin-button--solid" type="submit" data-busy-label="Đang tìm nguồn…"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>Tìm nguồn</button>
            </form>
            <p class="catalog-search-panel__note">Wikimedia Commons · Giữ tác giả, giấy phép và liên kết nguồn. Nhập ảnh chỉ tạo bản nháp, không tự xuất bản.</p>
        </section>
        <?php if ($query !== '' && $results !== []): ?>
        <details class="catalog-research"<?= $researchFiltered ? ' open' : '' ?>>
            <summary><span>Lọc thêm bằng AI <small>Tùy chọn · 1 lượt khi bấm</small></span><span class="catalog-chevron" aria-hidden="true">›</span></summary>
            <form method="post" action="catalog-search.php" class="catalog-research-form">
                <input type="hidden" name="csrf" value="<?= $escape($auth->csrfToken()) ?>"><input type="hidden" name="action" value="research"><input type="hidden" name="q" value="<?= $escape($query) ?>"><input type="hidden" name="type" value="<?= $escape($entityType) ?>">
                <label><span>Loại áo / phụ kiện cần đối chiếu</span><select name="parent_id" required><option value="">Chọn loại phù hợp</option><?php foreach ($catalogParents as $parent): ?><option value="<?= $escape($parent['id']) ?>"<?= $parent['id'] === $selectedParent ? ' selected' : '' ?>><?= $escape($parent['name']) ?></option><?php endforeach; ?></select></label>
                <p>AI chỉ lọc theo mô tả nguồn, chưa kiểm chứng chi tiết ảnh. Kết quả lưu tạm 1 giờ; vẫn cần tự duyệt trước khi dùng.<?= !$research->ready() ? ' Kết nối AI chưa được cấu hình; tìm và nhập thủ công vẫn dùng được.' : '' ?></p>
                <button class="admin-button admin-button--solid" type="submit" data-busy-label="AI đang lọc…"<?= !$research->ready() ? ' disabled' : '' ?>>AI lọc tư liệu · 1 lượt</button>
            </form>
        </details>
        <?php endif; ?>
        <?php if ($query !== ''): ?>
        <div class="catalog-results-heading"><div><h2>Kết quả tìm kiếm <span><?= count($results) ?></span></h2><p><?= $escape($query) ?> · <?= $researchFiltered ? 'Đã lọc theo mô tả bằng AI' : 'Nguồn Wikimedia Commons' ?></p></div><?php if ($researchFiltered): ?><a class="admin-button" href="catalog-search.php?<?= $escape(http_build_query(['q'=>$query,'type'=>$entityType,'parent'=>$selectedParent,'all'=>'1'])) ?>">Xem toàn bộ nguồn ↗</a><?php endif; ?></div>
        <?php endif; ?>
        <section class="catalog-results" aria-label="Kết quả nguồn Wikimedia">
            <?php foreach ($results as $result): ?>
            <article class="catalog-source-card">
                <div class="catalog-source-card__image"><img src="<?= $escape($result['thumbnail_url']) ?>" alt="Tư liệu <?= $escape($result['title']) ?>" loading="lazy"><p class="catalog-image-error" hidden>Không tải được ảnh xem trước. Mở nguồn để kiểm tra.</p></div>
                <div class="catalog-source-card__copy">
                    <span class="catalog-license"><?= $escape($result['license'] ?: 'Chưa rõ giấy phép') ?></span>
                    <h3><?= $escape($result['title']) ?></h3>
                    <p><?= $escape($result['description'] ?: 'Chưa có mô tả tiếng Việt; cần biên tập sau khi nhập.') ?></p>
                    <p class="catalog-creator">Tác giả: <?= $escape($result['creator'] ?: 'Chưa rõ tác giả') ?></p>
                    <?php if (isset($result['research_note'])): ?><p class="catalog-research-note"><strong>AI hỗ trợ · cần duyệt:</strong> <?= $escape($result['research_note']) ?></p><?php endif; ?>
                </div>
                <form method="post" action="catalog-search.php" class="catalog-source-card__action">
                    <input type="hidden" name="csrf" value="<?= $escape($auth->csrfToken()) ?>"><input type="hidden" name="type" value="<?= $escape($entityType) ?>"><input type="hidden" name="q" value="<?= $escape($query) ?>">
                    <input type="hidden" name="candidate" value="<?= $escape(base64_encode(json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR))) ?>">
                    <label><span>Nhập mẫu cho</span><select name="parent_id" required><?php foreach ($catalogParents as $parent): ?><option value="<?= $escape($parent['id']) ?>"<?= $parent['id'] === $selectedParent ? ' selected' : '' ?>><?= $escape($parent['name']) ?></option><?php endforeach; ?></select></label>
                    <a class="admin-button" href="<?= $escape($result['source_url']) ?>" target="_blank" rel="noopener noreferrer">Xem nguồn ↗</a>
                    <button class="admin-button admin-button--solid" type="submit" data-busy-label="Đang nhập bản nháp…">Nhập làm nháp</button>
                </form>
            </article>
            <?php endforeach; ?>
            <?php if ($results === []): ?>
            <div class="catalog-results__empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/></svg>
                <h2><?= $query === '' ? 'Bắt đầu từ một mẫu bạn cần.' : ($error !== '' ? 'Chưa tải được tư liệu.' : 'Chưa tìm thấy ảnh phù hợp.') ?></h2>
                <p><?= $query === '' ? 'Tìm tên trang phục, họa tiết hoặc phụ kiện. Có thể thử tên tiếng Anh để mở rộng nguồn.' : ($error !== '' ? 'Kiểm tra thông báo phía trên, rồi thử tìm lại. Trang không tự gọi AI hoặc tự nhập ảnh.' : ($researchFiltered ? 'AI chưa chọn được tư liệu phù hợp. Mở toàn bộ nguồn để tự đối chiếu; không tự gọi lại AI.' : 'Thử từ khóa tiếng Anh hoặc tên trang phục rộng hơn.')) ?></p>
                <?php if ($query === ''): ?><nav class="catalog-examples" aria-label="Từ khóa gợi ý"><a href="catalog-search.php?q=<?= rawurlencode('áo Nhật Bình') ?>&type=garment">Áo Nhật Bình ↗</a><a href="catalog-search.php?q=<?= rawurlencode('áo tấc') ?>&type=garment">Áo tấc ↗</a><a href="catalog-search.php?q=<?= rawurlencode('khăn vấn') ?>&type=accessory">Khăn vấn ↗</a></nav><?php endif; ?>
            </div>
            <?php endif; ?>
        </section>
    </main>
</div>
</body>
</html>
