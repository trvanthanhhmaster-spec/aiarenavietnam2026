<?php declare(strict_types=1); ?>
<a class="studio-skip" href="#studioStage">Đi tới không gian phối</a>
<nav class="workspace-sidebar" aria-label="Công cụ Studio">
    <div class="workspace-sidebar__tools">
        <button type="button" class="is-active" data-workspace-tooltip data-workspace-panel="catalog" aria-label="Phối đồ" aria-pressed="true"><?= $studioIcon('palette') ?></button>
        <button type="button" data-workspace-tooltip data-workspace-mode="garment" aria-label="Chọn trang phục"><?= $studioIcon('shirt') ?></button>
        <button type="button" data-workspace-tooltip data-workspace-collections aria-label="Bộ sưu tập của tôi"><?= $studioIcon('folder-image') ?></button>
        <button type="button" data-workspace-tooltip data-workspace-panel="heritage" aria-label="Về trang phục" aria-pressed="false"><?= $studioIcon('book-open') ?></button>
        <button type="button" data-workspace-tooltip data-workspace-panel="places" aria-label="Nơi mua, thuê và chụp" aria-pressed="false"><?= $studioIcon('map-pin') ?></button>
    </div>
    <a class="workspace-sidebar__home" data-workspace-tooltip href="index.php#stage" aria-label="Trở về Khám phá"><?= $studioIcon('house') ?></a>
</nav>
<header class="studio-masthead">
    <a class="workspace-logo" href="index.php#stage" aria-label="<?= $escape($brandAccessibleName) ?>"><img src="assets/images/v-remix-leaf-logo.png" alt="" width="1280" height="1280"></a>
    <nav class="workspace-topnav" aria-label="Điều hướng V-Remix">
        <a href="index.php#stage" aria-label="Khám phá" title="Khám phá"><?= $studioIcon('house') ?><span class="workspace-topnav__label">Khám phá</span></a>
        <span aria-current="page" aria-label="Studio" title="Studio"><?= $studioIcon('palette') ?><span class="workspace-topnav__label">Studio</span></span>
        <button type="button" data-workspace-collections aria-label="Bộ sưu tập của tôi" title="Bộ sưu tập của tôi" disabled><?= $studioIcon('folder-image') ?><span class="workspace-topnav__label">Bộ sưu tập của tôi</span></button>
        <button type="button" class="workspace-topnav__new" data-workspace-new-collection aria-label="Bộ sưu tập mới" title="Bộ sưu tập mới" disabled><svg class="workspace-icon" aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
    </nav>
    <div class="workspace-utilities">
        <button type="button" id="workspaceFullscreen" aria-label="Mở toàn màn hình" title="Mở toàn màn hình"><?= $studioIcon('maximize') ?></button>
        <a class="workspace-profile<?= $authUser === null ? ' workspace-profile--guest' : '' ?>" href="<?= $escape($studioData['auth']['loginUrl']) ?>" aria-label="<?= $escape($authUser !== null ? 'Tài khoản ' . $accountName : 'Đăng nhập') ?>" title="<?= $escape($authUser !== null ? $accountName : 'Đăng nhập') ?>">
            <?php if ($authUser !== null): ?>
                <span aria-hidden="true"><?= $escape($accountInitial) ?></span><small><?= $escape($accountName) ?></small>
            <?php else: ?>
                <svg class="workspace-profile__icon" aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>
                <strong>Đăng nhập</strong>
            <?php endif; ?>
        </a>
    </div>
</header>
