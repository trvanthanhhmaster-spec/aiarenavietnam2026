<?php
// Decorative, consistent 24px icons; accessible names live on their controls.
$adminIcon = static function (string $name): string {
    $paths = [
        'ai' => '<rect x="5" y="5" width="14" height="14" rx="4"/><path d="M9 9h6v6H9zM9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3"/>',
        'catalog' => '<path d="m8 3-5 4 3 4 2-1v11h8V10l2 1 3-4-5-4c-1 3-7 3-8 0Z"/>',
        'editorial' => '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7h8M8 11h8M8 15h5"/>',
        'accounts' => '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-15a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5"/>',
        'operations' => '<path d="M4 19h16M6 15V9m6 6V4m6 11v-5"/><circle cx="6" cy="7" r="1"/><circle cx="18" cy="8" r="1"/>',
        'search' => '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
        'refresh' => '<path d="M20 7v5h-5M4 17v-5h5m-4-5a8 8 0 0 1 14-2l1 2M4 17l1 2a8 8 0 0 0 14-2"/>',
        'logout' => '<path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4m6-14 6 6-6 6m6-6H9"/>',
        'menu' => '<path d="M5 6h14M5 12h14M5 18h14"/>',
    ];
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . ($paths[$name] ?? '') . '</svg>';
};
$adminGroups = ['ai' => 'AI & chi phí', 'catalog' => 'Catalog', 'editorial' => 'Nội dung', 'accounts' => 'Tài khoản', 'operations' => 'Vận hành'];
?>
<nav class="admin-rail" aria-label="Nhóm quản trị">
    <a class="admin-rail__brand" href="index.php#stage" aria-label="<?= $escape($websiteSettings['brand']['name'] ?? 'V-Remix') ?> — Khám phá"><img src="<?= $escape($websiteSettings['brand']['logo_light'] ?? 'assets/images/v-remix-leaf-logo.png') ?>" width="44" height="44" alt=""></a>
    <div class="admin-rail__groups">
        <?php foreach ($adminGroups as $key => $label): ?>
            <button class="admin-rail__button<?= $key === 'ai' ? ' is-active' : '' ?>" type="button" data-admin-group="<?= $key ?>" aria-label="<?= $label ?>" aria-pressed="<?= $key === 'ai' ? 'true' : 'false' ?>" title="<?= $label ?>"><?= $adminIcon($key) ?><span><?= $label ?></span></button>
        <?php endforeach; ?>
        <button class="admin-rail__button admin-rail__menu" id="adminMenuToggle" type="button" aria-label="Mở menu quản trị" aria-controls="adminNavigation" aria-expanded="false"><?= $adminIcon('menu') ?><span>Menu</span></button>
    </div>
    <a class="admin-rail__back" href="studio.php" title="Về Studio" aria-label="Về Studio">↗</a>
</nav>
<button class="admin-menu-backdrop" id="adminMenuBackdrop" type="button" aria-label="Đóng menu quản trị" hidden></button>
