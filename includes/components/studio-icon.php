<?php
declare(strict_types=1);

// Local, official Lucide SVGs: no CDN or client-side icon dependency.
$studioIcon = static function (string $name): string {
    $allowed = ['house', 'sliders-horizontal', 'shirt', 'book-open', 'map-pin',
        'image', 'images', 'upload', 'sparkles', 'maximize', 'arrow-left',
        'chevron-right', 'check', 'x'];
    if (!in_array($name, $allowed, true)) {
        return '';
    }
    $svg = file_get_contents(__DIR__ . '/../../assets/icons/lucide/' . $name . '.svg');
    return str_replace('<svg', '<svg class="workspace-icon" aria-hidden="true" focusable="false"', (string) $svg);
};
