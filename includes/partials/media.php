<?php
declare(strict_types=1);

/** @var array<string, array{label: string, fwdGuard: float, revGuard: float, forwardUrl: string, reverseUrl: string, reverseShared: bool}> $branches */
/** @var array<string, mixed> $site */
// Only the opening clip competes for bandwidth at first paint.
$baseKey = array_key_first($branches);
foreach ($branches as $key => $branch) {
    if (!empty($branch['isBase'])) {
        $baseKey = $key;
        break;
    }
}
?>
<?php foreach ($branches as $key => $branch): ?>
    <video class="media" id="v-<?= htmlspecialchars($key, ENT_QUOTES, 'UTF-8') ?>-f" src="<?= htmlspecialchars($branch['forwardUrl'], ENT_QUOTES, 'UTF-8') ?>" muted playsinline preload="<?= $key === $baseKey ? 'auto' : 'none' ?>" aria-hidden="true"></video>
    <video class="media" id="v-<?= htmlspecialchars($key, ENT_QUOTES, 'UTF-8') ?>-r" src="<?= htmlspecialchars($branch['reverseUrl'], ENT_QUOTES, 'UTF-8') ?>" muted playsinline preload="none" aria-hidden="true"></video>
<?php endforeach; ?>

<div class="media-loading" id="mediaLoading" aria-hidden="true">
    <span class="media-loading__label"><?= htmlspecialchars((string) ($site['ui']['status_loading'] ?? ''), ENT_QUOTES, 'UTF-8') ?></span>
</div>
