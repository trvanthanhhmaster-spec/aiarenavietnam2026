<?php declare(strict_types=1); ?>
<a class="studio-skip" href="#studioStage">Đi tới không gian phối</a>
<nav class="workspace-sidebar" aria-label="Công cụ Studio">
    <div class="workspace-sidebar__tools">
        <button type="button" class="is-active" data-workspace-panel="catalog" aria-label="Phối đồ" title="Phối đồ" aria-pressed="true"><?= $studioIcon('sliders-horizontal') ?></button>
        <button type="button" data-workspace-mode="garment" aria-label="Chọn trang phục" title="Chọn trang phục"><?= $studioIcon('shirt') ?></button>
        <button type="button" data-workspace-variants aria-label="Xem ảnh đã tạo" title="Chưa có ảnh đã tạo" disabled><?= $studioIcon('images') ?></button>
        <button type="button" data-workspace-panel="heritage" aria-label="Về trang phục" title="Về trang phục" aria-pressed="false"><?= $studioIcon('book-open') ?></button>
        <button type="button" data-workspace-panel="places" aria-label="Nơi mua, thuê và chụp" title="Nơi mua, thuê và chụp" aria-pressed="false"><?= $studioIcon('map-pin') ?></button>
    </div>
    <a class="workspace-sidebar__home" href="index.php#stage" aria-label="Trở về Khám phá" title="Trở về Khám phá"><?= $studioIcon('house') ?></a>
</nav>
<header class="studio-masthead">
    <a class="workspace-wordmark" href="index.php#stage" aria-label="<?= $escape($brandAccessibleName) ?>"><?php $brandWordmarkClass = 'studio-brand__mark'; require __DIR__ . '/../components/brand-wordmark.php'; unset($brandWordmarkClass); ?></a>
    <nav class="workspace-topnav" aria-label="Điều hướng V-Remix">
        <a href="index.php#stage">Khám phá</a>
        <span aria-current="page">Studio</span>
        <button type="button" data-workspace-variants title="Ảnh sẽ xuất hiện sau khi bạn chọn dịp mặc" disabled>Ảnh đã tạo</button>
    </nav>
    <div class="workspace-utilities">
        <button type="button" id="workspaceFullscreen" aria-label="Mở toàn màn hình" title="Mở toàn màn hình"><?= $studioIcon('maximize') ?></button>
        <a class="workspace-profile" href="<?= $escape($studioData['auth']['loginUrl']) ?>" aria-label="<?= $escape($authUser !== null ? 'Tài khoản ' . $accountName : 'Đăng nhập') ?>" title="<?= $escape($authUser !== null ? $accountName : 'Đăng nhập') ?>">
            <span aria-hidden="true"><?= $escape($accountInitial) ?></span><small><?= $escape($authUser !== null ? $accountName : 'Đăng nhập') ?></small>
        </a>
    </div>
</header>
