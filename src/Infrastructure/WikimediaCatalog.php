<?php
declare(strict_types=1);
namespace App\Infrastructure;

use RuntimeException;

/** Real files and license metadata only. Never trust URLs submitted by a form. */
final class WikimediaCatalog
{
    public function __construct(private $transport = null) {}

    public function search(string $query): array
    {
        if (mb_strlen($query) < 2 || mb_strlen($query) > 100) throw new RuntimeException('Từ khóa cần từ 2 đến 100 ký tự.');
        return $this->read(['generator' => 'search', 'gsrsearch' => '"' . str_replace('"', '', $query) . '"', 'gsrnamespace' => '6', 'gsrlimit' => '18']);
    }

    public function file(string $id): array
    {
        if (preg_match('/^[1-9][0-9]{0,14}$/D', $id) !== 1) throw new RuntimeException('ID nguồn không hợp lệ.');
        $rows = $this->read(['pageids' => $id]);
        foreach ($rows as $row) if ($row['external_id'] === $id) return $row;
        throw new RuntimeException('Nguồn ảnh không còn khả dụng.');
    }

    public static function safeUrl(string $value): bool
    {
        $host = strtolower((string) parse_url($value, PHP_URL_HOST));
        return parse_url($value, PHP_URL_SCHEME) === 'https' && in_array($host, ['commons.wikimedia.org', 'upload.wikimedia.org'], true);
    }

    private function read(array $query): array
    {
        $url = 'https://commons.wikimedia.org/w/api.php?' . http_build_query($query + [
            'action' => 'query', 'prop' => 'imageinfo', 'iiprop' => 'url|mime|extmetadata', 'iiurlwidth' => '720', 'format' => 'json', 'formatversion' => '2',
        ], '', '&', PHP_QUERY_RFC3986);
        if ($this->transport) $body = ($this->transport)($url);
        else {
            $h = curl_init($url);
            if ($h === false) throw new RuntimeException('Không thể kết nối nguồn tư liệu.');
            curl_setopt_array($h, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 18, CURLOPT_USERAGENT => 'V-Remix/1.0 (licensed catalog references)']);
            $body = curl_exec($h); $code = curl_getinfo($h, CURLINFO_RESPONSE_CODE); curl_close($h);
            if (!is_string($body) || $code !== 200) throw new RuntimeException('Wikimedia tạm thời không phản hồi.');
        }
        $payload = json_decode($body, true, 64, JSON_THROW_ON_ERROR);
        $text = static fn ($value): string => trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags((string) $value), ENT_QUOTES | ENT_HTML5, 'UTF-8')) ?? '');
        $rows = [];
        foreach ((array) ($payload['query']['pages'] ?? []) as $page) {
            $info = $page['imageinfo'][0] ?? [];
            if (!in_array($info['mime'] ?? '', ['image/jpeg', 'image/png', 'image/webp'], true)) continue;
            $metadata = $info['extmetadata'] ?? [];
            $meta = static fn ($key): string => (string) ($metadata[$key]['value'] ?? '');
            $id = (string) ($page['pageid'] ?? '');
            if (preg_match('/^[1-9][0-9]{0,14}$/D', $id) !== 1) continue;
            $image = (string) ($info['url'] ?? ''); $thumbnail = (string) ($info['thumburl'] ?? $image);
            if (!self::safeUrl($image) || !self::safeUrl($thumbnail)) continue;
            $rows[] = ['external_id' => $id, 'title' => mb_substr($text(preg_replace('/^File:/', '', (string) ($page['title'] ?? ''))), 0, 220),
                'description' => mb_substr($text($meta('ImageDescription')), 0, 2000), 'creator' => mb_substr($text($meta('Artist')), 0, 500),
                'license' => mb_substr($text($meta('LicenseShortName')), 0, 180), 'license_url' => $meta('LicenseUrl'),
                'image_url' => $image, 'thumbnail_url' => $thumbnail, 'source_url' => 'https://commons.wikimedia.org/?curid=' . $id];
        }
        return $rows;
    }
}
