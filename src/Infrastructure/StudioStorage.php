<?php
declare(strict_types=1);
namespace App\Infrastructure;

use RuntimeException;

/** Private generated images only; never fetch arbitrary remote URLs. */
final class StudioStorage
{
    public const BUCKET = 'generated-lookbooks';
    public function __construct(private string $url, private string $key) {}

    public function uploadData(string $path, string $data): string
    {
        if (!preg_match('#^data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\r\n]+)$#', $data, $match)) {
            throw new RuntimeException('Ảnh không đúng định dạng JPG, PNG hoặc WebP.');
        }
        $bytes = base64_decode($match[2], true);
        if ($bytes === false || strlen($bytes) > 12_000_000 || !getimagesizefromstring($bytes)) {
            throw new RuntimeException('Ảnh không hợp lệ hoặc vượt quá 12 MB.');
        }
        $this->request('POST', '/object/' . self::BUCKET . '/' . $this->path($path), $bytes, $match[1], ['x-upsert: true']);
        return $this->sign($path);
    }

    public function sign(string $path): string
    {
        $result = $this->request('POST', '/object/sign/' . self::BUCKET . '/' . $this->path($path), json_encode(['expiresIn' => 3600]), 'application/json');
        $signed = $result['signedURL'] ?? $result['signedUrl'] ?? '';
        if (!$signed) throw new RuntimeException('Không thể mở ảnh riêng tư.');
        return str_starts_with($signed, 'http') ? $signed : rtrim($this->url, '/') . '/storage/v1' . $signed;
    }

    public function refreshOutput(array $output): array
    {
        foreach ($output['lookbook']['items'] ?? [] as $index => $item) {
            if (!empty($item['path']) && !str_starts_with($item['path'], 'local/')) {
                $output['lookbook']['items'][$index]['url'] = $this->sign($item['path']);
            }
        }
        if (!empty($output['lookbook']['items'][0]['url'])) $output['imageUrl'] = $output['lookbook']['items'][0]['url'];
        return $output;
    }

    public function trustedUrl(string $url): bool
    {
        return parse_url($url, PHP_URL_SCHEME) === 'https'
            && parse_url($url, PHP_URL_HOST) === parse_url($this->url, PHP_URL_HOST)
            && str_starts_with((string) parse_url($url, PHP_URL_PATH), '/storage/v1/');
    }

    private function path(string $path): string
    {
        if (!preg_match('#^[a-zA-Z0-9/_\-.]+$#', $path) || str_contains($path, '..')) throw new RuntimeException('Đường dẫn ảnh không hợp lệ.');
        return implode('/', array_map('rawurlencode', explode('/', $path)));
    }

    private function request(string $method, string $path, string $body, string $type, array $extra = []): array
    {
        $handle = curl_init(rtrim($this->url, '/') . '/storage/v1' . $path);
        curl_setopt_array($handle, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 25, CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => array_merge(['apikey: ' . $this->key, 'Authorization: Bearer ' . $this->key, 'Content-Type: ' . $type], $extra)]);
        $response = curl_exec($handle); $status = curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        if (!is_string($response) || $status < 200 || $status >= 300) throw new RuntimeException('Storage chưa sẵn sàng (HTTP ' . $status . ').');
        return json_decode($response, true) ?: [];
    }
}
