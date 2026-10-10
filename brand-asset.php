<?php
declare(strict_types=1);
require __DIR__ . '/src/Infrastructure/BrandAssets.php';
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD'], true)) { http_response_code(405); header('Allow: GET, HEAD'); exit; }
$id = (string) ($_GET['id'] ?? '');
if (!preg_match('/^[a-f0-9]{64}\.(png|jpg|webp|ico)$/D', $id, $match)) { http_response_code(404); exit; }
$file = App\Infrastructure\BrandAssets::directory() . '/' . $id;
if (!is_file($file)) { http_response_code(404); exit; }
header('Content-Type: ' . ['png' => 'image/png', 'jpg' => 'image/jpeg', 'webp' => 'image/webp', 'ico' => 'image/x-icon'][$match[1]]);
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=31536000, immutable');
header('Content-Length: ' . filesize($file));
if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') readfile($file);
