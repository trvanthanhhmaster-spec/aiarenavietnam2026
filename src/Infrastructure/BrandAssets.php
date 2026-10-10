<?php
declare(strict_types=1);
namespace App\Infrastructure;

use InvalidArgumentException;
use RuntimeException;

/** Public branding raster assets only. Separate from private generated-lookbooks. */
final class BrandAssets
{
    public static function directory(): string
    {
        return is_dir('/var/lib/vremix') ? '/var/lib/vremix/brand-assets' : dirname(__DIR__, 2) . '/storage/brand-assets';
    }
    public static function inspect(string $bytes, string $purpose): array
    {
        if (!in_array($purpose, ['logo_light', 'logo_dark', 'favicon', 'apple_icon', 'icon_192', 'icon_512', 'share_image', 'home_share', 'studio_share'], true)) throw new InvalidArgumentException('Loại ảnh không hợp lệ.');
        if ($bytes === '' || strlen($bytes) > 5_000_000) throw new InvalidArgumentException('Ảnh tối đa 5 MB.');
        $info = @getimagesizefromstring($bytes);
        $extensions = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp', 'image/vnd.microsoft.icon' => 'ico', 'image/x-icon' => 'ico'];
        if (!$info || !isset($extensions[$info['mime'] ?? '']) || $info[0] > 6000 || $info[1] > 6000 || $info[0] * $info[1] > 16_000_000) throw new InvalidArgumentException('Chỉ nhận PNG, JPG, WebP hoặc ICO hợp lệ; không nhận SVG/HTML.');
        $square = ['favicon' => 48, 'apple_icon' => 180, 'icon_192' => 192, 'icon_512' => 512];
        if (isset($square[$purpose]) && ($info[0] !== $info[1] || $info[0] < $square[$purpose])) throw new InvalidArgumentException('Icon cần ảnh vuông, tối thiểu ' . $square[$purpose] . ' px.');
        if (in_array($purpose, ['icon_192', 'icon_512'], true) && $info[0] !== $square[$purpose]) throw new InvalidArgumentException('Icon manifest cần đúng kích thước ' . $square[$purpose] . ' × ' . $square[$purpose] . ' px.');
        if (str_contains($purpose, 'share') && ($info['mime'] !== 'image/png' && $info['mime'] !== 'image/jpeg' && $info['mime'] !== 'image/webp' || $info[0] < 600 || $info[1] < 315)) throw new InvalidArgumentException('Ảnh chia sẻ cần PNG/JPG/WebP, tối thiểu 600 × 315 px; nên dùng 1200 × 630.');
        return ['id' => hash('sha256', $bytes) . '.' . $extensions[$info['mime']], 'mime' => $info['mime'], 'width' => $info[0], 'height' => $info[1]];
    }
    public static function store(string $bytes, string $purpose): array
    {
        $info = self::inspect($bytes, $purpose);
        $directory = self::directory();
        if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) throw new RuntimeException('Chưa tạo được kho ảnh thương hiệu.');
        $file = $directory . '/' . $info['id'];
        if (!is_file($file)) {
            $temp = tempnam($directory, '.upload-');
            if (!$temp) throw new RuntimeException('Kho ảnh thương hiệu chưa sẵn sàng.');
            try {
                if (file_put_contents($temp, $bytes, LOCK_EX) !== strlen($bytes) || !chmod($temp, 0644) || !rename($temp, $file)) throw new RuntimeException('Không thể lưu ảnh.');
            } finally { if (is_file($temp)) @unlink($temp); }
        }
        return $info + ['url' => 'brand-asset.php?id=' . $info['id']];
    }
}
