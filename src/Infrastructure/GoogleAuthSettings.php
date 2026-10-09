<?php
declare(strict_types=1);

namespace App\Infrastructure;

use RuntimeException;

/** Google-only adapter. Management credentials and provider secrets stay server-side. */
final class GoogleAuthSettings
{
    private string $projectRef;
    private $transport;

    public function __construct(private string $url, private string $anonKey, private string $managementToken, ?callable $transport = null)
    {
        $this->url = rtrim($url, '/');
        if (!preg_match('~^https://([a-z0-9]{20})\.supabase\.co$~D', $this->url, $match)) {
            throw new RuntimeException('Địa chỉ dự án Supabase không hợp lệ.', 503);
        }
        $this->projectRef = $match[1];
        $this->transport = $transport;
    }

    public function read(): array
    {
        if ($this->managementToken === '') {
            $settings = $this->request('GET', false);
            $enabled = $settings['external']['google'] ?? null;
            return $this->metadata() + [
                'management_ready' => false,
                'enabled' => is_bool($enabled) ? $enabled : null,
                'client_id' => null, 'secret_configured' => null, 'revision' => null,
                'notice' => 'Máy chủ chưa có SUPABASE_MANAGEMENT_TOKEN. Chỉ đọc trạng thái; chưa thể lưu cấu hình tại đây.',
            ];
        }
        return $this->sanitize($this->request('GET', true));
    }

    public function save(array $input): array
    {
        if ($this->managementToken === '') {
            throw new RuntimeException('Cần cấu hình SUPABASE_MANAGEMENT_TOKEN riêng trên máy chủ trước khi lưu.', 503);
        }
        if (array_diff(array_keys($input), ['enabled', 'client_id', 'client_secret', 'revision']) !== []
            || !isset($input['enabled'], $input['client_id'], $input['revision'])
            || !is_bool($input['enabled']) || !is_string($input['client_id'])
            || !is_string($input['revision']) || !is_string($input['client_secret'] ?? '')) {
            throw new RuntimeException('Dữ liệu cấu hình không hợp lệ.', 422);
        }
        $id = trim($input['client_id']);
        $secret = trim($input['client_secret'] ?? '');
        if (strlen($id) > 1000 || ($id !== '' && !preg_match('/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/D', $id))) {
            throw new RuntimeException('Client ID phải là ID của OAuth Web application do Google cấp.', 422);
        }
        if (strlen($secret) > 4096 || preg_match('/[\x00-\x20\x7f]/', $secret)) {
            throw new RuntimeException('Client Secret không hợp lệ.', 422);
        }
        $current = $this->request('GET', true);
        $state = $this->sanitize($current);
        if (!hash_equals($state['revision'], $input['revision'])) {
            throw new RuntimeException('Cấu hình đã thay đổi. Làm mới và kiểm tra lại trước khi lưu.', 409);
        }
        if ($input['enabled'] && ($id === '' || ($secret === '' && !$state['secret_configured']))) {
            throw new RuntimeException('Cần Client ID và Client Secret để bật đăng nhập Google.', 422);
        }
        // Retaining an old secret when replacing the client ID is almost always a misconfiguration.
        if ($id !== $state['client_id'] && $id !== '' && $secret === '') {
            throw new RuntimeException('Khi đổi Client ID, hãy nhập Client Secret tương ứng.', 422);
        }
        $patch = ['external_google_enabled' => $input['enabled'], 'external_google_client_id' => $id];
        if ($secret !== '') {
            $patch['external_google_secret'] = $secret;
        }
        $updated = $this->request('PATCH', true, $patch);
        // Use the authoritative PATCH response; never retry an ambiguous write.
        return $this->sanitize($updated);
    }

    private function metadata(): array
    {
        return [
            'project_ref' => $this->projectRef,
            'google_callback' => $this->url . '/auth/v1/callback',
            'provider_url' => 'https://supabase.com/dashboard/project/' . $this->projectRef . '/auth/providers',
        ];
    }

    private function sanitize(array $config): array
    {
        if (!is_bool($config['external_google_enabled'] ?? null)
            || !array_key_exists('external_google_client_id', $config)
            || !(is_string($config['external_google_client_id']) || $config['external_google_client_id'] === null)
            || !array_key_exists('external_google_secret', $config)
            || !(is_string($config['external_google_secret']) || $config['external_google_secret'] === null)) {
            throw new RuntimeException('Không đọc được trạng thái Google. Làm mới để kiểm tra cấu hình trên Supabase.', 502);
        }
        $relevant = [ $config['external_google_enabled'], $config['external_google_client_id'] ?? '', $config['external_google_secret'] ];
        return $this->metadata() + [
            'management_ready' => true,
            'enabled' => $relevant[0], 'client_id' => $relevant[1],
            'secret_configured' => !empty($relevant[2]),
            'revision' => hash_hmac('sha256', json_encode($relevant, JSON_THROW_ON_ERROR), $this->managementToken),
            'notice' => '',
        ];
    }

    private function request(string $method, bool $management, ?array $body = null): array
    {
        $url = $management
            ? 'https://api.supabase.com/v1/projects/' . $this->projectRef . '/config/auth'
            : $this->url . '/auth/v1/settings';
        $headers = ['Accept: application/json', 'Content-Type: application/json'];
        $headers[] = $management ? 'Authorization: Bearer ' . $this->managementToken : 'apikey: ' . $this->anonKey;
        if ($this->transport !== null) {
            $response = ($this->transport)($method, $url, $headers, $body);
        } else {
            $handle = curl_init($url);
            if ($handle === false) {
                throw new RuntimeException('Không thể kết nối Supabase.', 502);
            }
            curl_setopt_array($handle, [
                CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers,
                CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 15,
                CURLOPT_FOLLOWLOCATION => false, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            ]);
            if ($body !== null) {
                curl_setopt($handle, CURLOPT_POSTFIELDS, json_encode($body, JSON_THROW_ON_ERROR));
            }
            try {
                $raw = curl_exec($handle);
                $response = ['status' => (int) curl_getinfo($handle, CURLINFO_HTTP_CODE), 'body' => $raw];
            } finally {
                curl_close($handle);
            }
        }
        $status = (int) ($response['status'] ?? 0);
        if ($status < 200 || $status >= 300 || !is_string($response['body'] ?? null)) {
            if ($status === 401 || $status === 403) {
                throw new RuntimeException('Supabase từ chối quyền quản lý. Kiểm tra token và quyền Auth Config / Project Settings.', 503);
            }
            if ($status === 429) {
                throw new RuntimeException('Supabase đang giới hạn yêu cầu. Vui lòng thử lại sau.', 429);
            }
            throw new RuntimeException($method === 'PATCH'
                ? 'Chưa xác nhận được kết quả lưu. Làm mới để kiểm tra trước khi thử lại.'
                : 'Không đọc được cấu hình Supabase. Vui lòng làm mới.', 502);
        }
        $data = json_decode($response['body'], true);
        if (!is_array($data)) {
            throw new RuntimeException('Phản hồi Supabase không hợp lệ. Làm mới để kiểm tra.', 502);
        }
        return $data;
    }
}
