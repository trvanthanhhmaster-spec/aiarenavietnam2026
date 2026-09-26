<?php
declare(strict_types=1);

/** @var array{name: string, title: string, description: string} $site */
?>
<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title><?= htmlspecialchars($site['title'], ENT_QUOTES, 'UTF-8') ?></title>
    <meta name="description" content="<?= htmlspecialchars($site['description'], ENT_QUOTES, 'UTF-8') ?>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&family=Lora:ital,wght@0,500;1,500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/app.css">
</head>
<body>
