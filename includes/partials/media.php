<?php
declare(strict_types=1);

/** @var array<string, array{label: string, fwdGuard: float, revGuard: float}> $branches */
/** @var string $mediaUrl */
?>
<?php foreach (array_keys($branches) as $branch): ?>
    <video class="media" id="v-<?= htmlspecialchars($branch, ENT_QUOTES, 'UTF-8') ?>-f" src="<?= htmlspecialchars($mediaUrl, ENT_QUOTES, 'UTF-8') ?>" muted playsinline preload="auto" aria-hidden="true"></video>
    <video class="media" id="v-<?= htmlspecialchars($branch, ENT_QUOTES, 'UTF-8') ?>-r" src="<?= htmlspecialchars($mediaUrl, ENT_QUOTES, 'UTF-8') ?>" muted playsinline preload="auto" aria-hidden="true"></video>
<?php endforeach; ?>
