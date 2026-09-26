<?php
declare(strict_types=1);

/** @var array<string, array{label: string, fwdGuard: float, revGuard: float, forwardUrl: string, reverseUrl: string, reverseShared: bool}> $branches */
/** @var array<string, mixed> $site */
?>
<?php foreach ($branches as $key => $branch): ?>
    <video class="media" id="v-<?= htmlspecialchars($key, ENT_QUOTES, 'UTF-8') ?>-f" src="<?= htmlspecialchars($branch['forwardUrl'], ENT_QUOTES, 'UTF-8') ?>" muted playsinline preload="auto" aria-hidden="true"></video>
    <video class="media" id="v-<?= htmlspecialchars($key, ENT_QUOTES, 'UTF-8') ?>-r" src="<?= htmlspecialchars($branch['reverseUrl'], ENT_QUOTES, 'UTF-8') ?>" muted playsinline preload="auto" aria-hidden="true"></video>
<?php endforeach; ?>

<div class="media-loading" id="mediaLoading" aria-hidden="true">
    <div class="media-loading__texture"></div>
    <div class="media-loading__halo"></div>
    <div class="media-loading__content">
        <?php
        $brandWordmarkClass = 'media-loading__brand';
        require __DIR__ . '/../components/brand-wordmark.php';
        unset($brandWordmarkClass);
        ?>
        <span class="media-loading__line"></span>
        <span class="media-loading__label"><?= htmlspecialchars((string) ($site['ui']['status_loading'] ?? ''), ENT_QUOTES, 'UTF-8') ?></span>
    </div>
</div>
