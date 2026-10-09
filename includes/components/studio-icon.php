<?php
declare(strict_types=1);

// Local SVGs: Lucide plus purpose-specific workspace drawings, no client dependency.
$studioIcon = static function (string $name): string {
    $workspaceIcons = ['palette', 'folder-image'];
    $allowed = ['house', 'sliders-horizontal', 'shirt', 'book-open', 'map-pin',
        'image', 'images', 'upload', 'sparkles', 'maximize', 'arrow-left',
        'chevron-right', 'check', 'x'];
    if (!in_array($name, $allowed, true) && !in_array($name, $workspaceIcons, true)) {
        return '';
    }
    $folder = in_array($name, $workspaceIcons, true) ? 'workspace' : 'lucide';
    $svg = file_get_contents(__DIR__ . '/../../assets/icons/' . $folder . '/' . $name . '.svg');
    return str_replace('<svg', '<svg class="workspace-icon" aria-hidden="true" focusable="false"', (string) $svg);
};
