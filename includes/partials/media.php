<?php
declare(strict_types=1);

/** @var array<string, array{label: string, fwdGuard: float, revGuard: float, forwardUrl: string, reverseUrl: string, reverseShared: bool}> $branches */
?>
<?php foreach ($branches as $key => $branch): ?>
    <video class="media" id="v-<?= htmlspecialchars($key, ENT_QUOTES, 'UTF-8') ?>-f" src="<?= htmlspecialchars($branch['forwardUrl'], ENT_QUOTES, 'UTF-8') ?>" muted playsinline preload="auto" aria-hidden="true"></video>
    <video class="media" id="v-<?= htmlspecialchars($key, ENT_QUOTES, 'UTF-8') ?>-r" src="<?= htmlspecialchars($branch['reverseUrl'], ENT_QUOTES, 'UTF-8') ?>" muted playsinline preload="auto" aria-hidden="true"></video>
<?php endforeach; ?>
