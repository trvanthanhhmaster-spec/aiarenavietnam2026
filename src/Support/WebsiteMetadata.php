<?php
declare(strict_types=1);
namespace App\Support;

use InvalidArgumentException;

/** Public configuration only: no credentials, arbitrary HTML or user look data. */
final class WebsiteMetadata
{
    public static function defaults(): array
    {
        return [
            'brand' => ['name' => 'V-Remix', 'logo_light' => 'assets/images/v-remix-leaf-logo.png',
                'logo_dark' => '', 'favicon' => 'assets/media/brand/favicon.png',
                'apple_icon' => 'assets/media/brand/apple-touch-icon.png',
                'icon_192' => 'assets/media/brand/icon-192.png', 'icon_512' => 'assets/media/brand/icon-512.png',
                'theme_color' => '#f2f0f8'],
            'seo' => ['base_url' => 'https://v-remix.vietnamsir.com', 'indexable' => true,
                'share_image' => 'assets/media/brand/share-default.png', 'share_alt' => 'V-Remix — Việt phục, theo cách bạn.',
                'google_verification' => '', 'bing_verification' => '', 'social_urls' => [],
                'pages' => [
                    'home' => ['title' => '', 'description' => '', 'share_image' => '', 'indexable' => true],
                    'studio' => ['title' => 'Studio — V-Remix', 'description' => 'Phối Việt phục theo dịp mặc, dáng áo, màu sắc và phong cách của bạn. Khám phá nguồn gốc trang phục và tạo ảnh bản phối.', 'share_image' => '', 'indexable' => true],
                ]],
        ];
    }

    public static function normalize(array $stored): array
    {
        $defaults = self::defaults();
        foreach (['brand', 'seo'] as $section) {
            if (is_array($stored[$section] ?? null)) {
                foreach ($defaults[$section] as $key => $fallback) {
                    if ($key !== 'pages' && array_key_exists($key, $stored[$section])) $defaults[$section][$key] = $stored[$section][$key];
                }
            }
        }
        foreach (['home', 'studio'] as $page) {
            if (is_array($stored['seo']['pages'][$page] ?? null)) {
                $defaults['seo']['pages'][$page] = array_intersect_key($stored['seo']['pages'][$page], $defaults['seo']['pages'][$page]) + $defaults['seo']['pages'][$page];
            }
        }
        return $defaults;
    }

    public static function validateSection(string $section, mixed $input): array
    {
        if (!in_array($section, ['brand', 'seo'], true) || !is_array($input)) throw new InvalidArgumentException('Cấu hình không hợp lệ.');
        $known = self::defaults()[$section];
        if (array_diff_key($input, $known) !== [] || array_diff_key($known, $input) !== []) throw new InvalidArgumentException('Cấu hình thiếu trường hoặc có trường không hỗ trợ. Hãy làm mới.');
        $text = static function (mixed $value, int $max, string $label): string {
            if (!is_string($value) || mb_strlen($value) > $max || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f<>]/u', $value)) throw new InvalidArgumentException($label . ' không hợp lệ.');
            return trim($value);
        };
        if ($section === 'brand') {
            $input['name'] = $text($input['name'], 80, 'Tên website');
            if ($input['name'] === '') throw new InvalidArgumentException('Tên website không được trống.');
            foreach (['logo_light', 'logo_dark', 'favicon', 'apple_icon', 'icon_192', 'icon_512'] as $field) {
                $input[$field] = self::asset($input[$field]);
                if ($input[$field] !== '' && in_array($field, ['favicon', 'apple_icon', 'icon_192', 'icon_512'], true) && !str_ends_with($input[$field], '.svg')) self::inspectAsset($input[$field], $field);
            }
            if (!is_string($input['theme_color']) || !preg_match('/^#[0-9a-f]{6}$/iD', $input['theme_color'])) throw new InvalidArgumentException('Màu thương hiệu cần dạng #RRGGBB.');
            return $input;
        }
        $base = $text($input['base_url'], 220, 'Địa chỉ website');
        $parts = parse_url($base);
        if (!$parts || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host'])
            || !filter_var($parts['host'], FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME)
            || !str_contains($parts['host'], '.') || filter_var($parts['host'], FILTER_VALIDATE_IP)
            || isset($parts['user'], $parts['pass']) || isset($parts['user']) || isset($parts['port'])
            || isset($parts['query']) || isset($parts['fragment']) || ($parts['path'] ?? '') !== '' && ($parts['path'] ?? '') !== '/') {
            throw new InvalidArgumentException('Địa chỉ chuẩn cần là domain HTTPS, không chứa đường dẫn, port hoặc tham số.');
        }
        $input['base_url'] = rtrim($base, '/');
        if (!is_bool($input['indexable'])) throw new InvalidArgumentException('Trạng thái lập chỉ mục không hợp lệ.');
        $input['share_image'] = self::asset($input['share_image'], false);
        if ($input['share_image'] !== '') self::inspectAsset($input['share_image'], 'share_image');
        $input['share_alt'] = $text($input['share_alt'], 300, 'Mô tả ảnh chia sẻ');
        foreach (['google_verification', 'bing_verification'] as $field) {
            $input[$field] = $text($input[$field], 180, 'Mã xác minh');
            if ($input[$field] !== '' && !preg_match('/^[A-Za-z0-9_.=-]+$/D', $input[$field])) throw new InvalidArgumentException('Chỉ nhập giá trị mã xác minh, không dán thẻ HTML.');
        }
        if (!is_array($input['social_urls']) || ($input['social_urls'] !== [] && array_keys($input['social_urls']) !== range(0, count($input['social_urls']) - 1)) || count($input['social_urls']) > 8) throw new InvalidArgumentException('Tối đa 8 liên kết mạng xã hội.');
        foreach ($input['social_urls'] as &$url) {
            $url = $text($url, 500, 'Liên kết xã hội');
            if (!filter_var($url, FILTER_VALIDATE_URL) || parse_url($url, PHP_URL_SCHEME) !== 'https' || parse_url($url, PHP_URL_USER) !== null) throw new InvalidArgumentException('Liên kết xã hội cần HTTPS.');
        }
        unset($url);
        if (!is_array($input['pages']) || array_keys($input['pages']) !== ['home', 'studio']) throw new InvalidArgumentException('Chỉ cấu hình các trang công khai Khám phá và Studio.');
        foreach ($input['pages'] as &$page) {
            if (!is_array($page) || array_diff_key($page, $known['pages']['home']) || array_diff_key($known['pages']['home'], $page)) throw new InvalidArgumentException('SEO từng trang không hợp lệ.');
            $page['title'] = $text($page['title'], 150, 'Tiêu đề');
            $page['description'] = $text($page['description'], 500, 'Mô tả');
            $page['share_image'] = self::asset($page['share_image'], false);
            if ($page['share_image'] !== '') self::inspectAsset($page['share_image'], 'share_image');
            if (!is_bool($page['indexable'])) throw new InvalidArgumentException('Trạng thái trang không hợp lệ.');
        }
        unset($page);
        return $input;
    }

    public static function asset(mixed $value, bool $svg = true): string
    {
        if (!is_string($value) || strlen($value) > 1000) throw new InvalidArgumentException('Địa chỉ ảnh không hợp lệ.');
        $value = trim($value);
        if ($value === '') return '';
        // Only durable public local assets. No signed private URLs, remote fetches, data URLs or SVG uploads.
        if (preg_match('#^brand-asset\.php\?id=([a-f0-9]{64})\.(png|jpg|webp' . ($svg ? '|ico' : '') . ')$#D', $value)) {
            if (!is_file(\App\Infrastructure\BrandAssets::directory() . '/' . substr($value, strlen('brand-asset.php?id=')))) throw new InvalidArgumentException('Ảnh đã tải lên không còn tồn tại trên máy chủ.');
            return $value;
        }
        $extension = $svg ? '(png|jpg|jpeg|webp|ico|svg)' : '(png|jpg|jpeg|webp)';
        if (!preg_match('#^assets/[A-Za-z0-9_/-]+\.' . $extension . '$#D', $value) || str_contains($value, '..')
            || !is_file(dirname(__DIR__, 2) . '/' . $value)) throw new InvalidArgumentException('Ảnh cần là tệp công khai đã tải lên hoặc asset có sẵn.');
        return $value;
    }

    public static function absolute(string $asset, array $settings): string
    {
        return rtrim($settings['seo']['base_url'], '/') . '/' . ltrim($asset, '/');
    }

    private static function inspectAsset(string $asset, string $purpose): void
    {
        $file = str_starts_with($asset, 'brand-asset.php?id=')
            ? \App\Infrastructure\BrandAssets::directory() . '/' . substr($asset, strlen('brand-asset.php?id='))
            : dirname(__DIR__, 2) . '/' . $asset;
        \App\Infrastructure\BrandAssets::inspect((string) file_get_contents($file), $purpose);
    }

    public static function imageInfo(string $asset): array
    {
        try {
            $asset = self::asset($asset, false);
            if ($asset === '') return [];
            $file = str_starts_with($asset, 'brand-asset.php?id=') ? \App\Infrastructure\BrandAssets::directory() . '/' . substr($asset, strlen('brand-asset.php?id=')) : dirname(__DIR__, 2) . '/' . $asset;
            $info = @getimagesize($file);
            return $info ? ['width' => $info[0], 'height' => $info[1], 'mime' => $info['mime']] : [];
        } catch (InvalidArgumentException $error) { return []; }
    }

    public static function page(array $settings, string $key, array $site = [], bool $canonicalHost = true): array
    {
        $private = !in_array($key, ['home', 'studio'], true);
        $page = $settings['seo']['pages'][$key] ?? [];
        $title = $page['title'] ?? '';
        $description = $page['description'] ?? '';
        if ($title === '') $title = (string) ($site['title'] ?? 'V-Remix — Việt phục, theo cách bạn.');
        if ($description === '') $description = (string) ($site['description'] ?? 'Khám phá và phối Việt phục theo cách của bạn.');
        $route = $key === 'home' ? '/' : '/studio.php';
        return ['title' => $title, 'description' => $description,
            'canonical' => rtrim($settings['seo']['base_url'], '/') . $route,
            'image' => self::absolute(($page['share_image'] ?? '') ?: ($settings['seo']['share_image'] ?: self::defaults()['seo']['share_image']), $settings),
            'indexable' => !$private && $canonicalHost && $settings['seo']['indexable'] && ($page['indexable'] ?? false)];
    }
}
