<?php
declare(strict_types=1);

/** @var array<string, mixed> $site */
/** @var string|null $brandWordmarkClass */
$wordmarkClass = trim('brand__wordmark ' . ($brandWordmarkClass ?? ''));
?>
<svg class="<?= htmlspecialchars($wordmarkClass, ENT_QUOTES, 'UTF-8') ?>" viewBox="0 0 212 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <text class="brand__v" x="1" y="47"><?= htmlspecialchars((string) ($site['brand_mark'] ?? ''), ENT_QUOTES, 'UTF-8') ?></text>
    <path class="brand__dash" d="M40 31.5h14" />
    <text class="brand__name" x="61" y="47"><?= htmlspecialchars((string) ($site['brand_name'] ?? ''), ENT_QUOTES, 'UTF-8') ?></text>
</svg>
