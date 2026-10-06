<?php
declare(strict_types=1);

require __DIR__ . '/src/Support/Env.php';
require __DIR__ . '/src/Support/SupabaseAuth.php';
require __DIR__ . '/src/Infrastructure/SupabaseAdminClient.php';
require __DIR__ . '/src/Support/StudioPlan.php';

use App\Infrastructure\SupabaseAdminClient;
use App\Support\Env;
use App\Support\SupabaseAuth;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$respond = static function (mixed $body, int $status = 200): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
};

Env::load(__DIR__ . '/.env');
$auth = new SupabaseAuth(
    (string) getenv('SUPABASE_URL'),
    (string) getenv('SUPABASE_ANON_KEY'),
    (string) getenv('SUPABASE_SERVICE_ROLE_KEY')
);
$auth->boot();
$user = $auth->user();
if ($user === null) {
    $respond(['error' => 'Hãy đăng nhập để lưu Look vào thư viện riêng.'], 401);
}
if (!$auth->verifyCsrf((string) ($_SERVER['HTTP_X_VREMIX_CSRF'] ?? ''))) {
    $respond(['error' => 'Phiên Studio không hợp lệ. Hãy tải lại trang.'], 403);
}
$userId = (string) $user['id'];

$supabaseUrl = rtrim((string) getenv('SUPABASE_URL'), '/');
$serviceRoleKey = (string) getenv('SUPABASE_SERVICE_ROLE_KEY');
if ($supabaseUrl === '' || $serviceRoleKey === '') {
    $respond(['error' => 'Dịch vụ lưu Look chưa được cấu hình.'], 503);
}

try {
    $client = new SupabaseAdminClient($supabaseUrl, $serviceRoleKey);
    $sessionToken = (string) ($_SESSION['look_session_token'] ?? '');
    if ($sessionToken === '') {
        $sessionToken = bin2hex(random_bytes(32));
        $_SESSION['look_session_token'] = $sessionToken;
    }
    $sessionHash = hash('sha256', $sessionToken);
    $sessionRows = $client->select('user_context_sessions', [
        'session_token_hash' => 'eq.' . $sessionHash,
        'select' => 'id',
        'limit' => '1',
    ]);
    $sessionId = (string) ($sessionRows[0]['id'] ?? '');

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $items = $client->select('looks', [
            'user_id' => 'eq.' . $userId,
            'select' => 'id,name,occasion_slug,garment_slug,color_slug,pattern_slug,style_slug,scene_slug,selection,locks,image_url,visibility,created_at',
            'order' => 'created_at.desc',
            'limit' => '20',
        ]);
        $respond(['items' => $items]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        $respond(['error' => 'Method không được hỗ trợ.'], 405);
    }

    $input = json_decode((string) file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($input) || ($input['action'] ?? '') !== 'save') {
        $respond(['error' => 'Payload lưu Look không hợp lệ.'], 400);
    }
    $selection = $input['selection'] ?? null;
    if (!is_array($selection)) {
        $respond(['error' => 'Thiếu lựa chọn của Look.'], 422);
    }
    $slug = static function (mixed $value): ?string {
        $value = trim((string) $value);
        return $value !== '' && preg_match('/^[a-z0-9-]{1,80}$/', $value) ? $value : null;
    };
    $occasion = $slug($selection['event'] ?? null);
    if (isset($selection['planning'])) {
        // Only normalized metadata, never source face pixels, is saved in the plan.
        try { $selection['planning'] = \App\Support\StudioPlan::normalize($selection['planning']); }
        catch (InvalidArgumentException $error) { $respond(['error' => $error->getMessage()], 422); }
    }
    $garment = $slug($selection['garment'] ?? null);
    if ($occasion === null || $garment === null) {
        $respond(['error' => 'Look cần có dịp mặc và Việt phục hợp lệ.'], 422);
    }

    $context = is_array($input['context'] ?? null) ? $input['context'] : [];
    if ($sessionId === '') {
        $created = $client->insert('user_context_sessions', [
            'session_token_hash' => $sessionHash,
            'branch_key' => $slug($context['branch'] ?? null),
            'occasion_slug' => $occasion,
            'context' => $context,
            'last_seen_at' => gmdate(DATE_ATOM),
        ]);
        $sessionId = (string) ($created[0]['id'] ?? '');
    } else {
        $client->update('user_context_sessions', ['id' => 'eq.' . $sessionId], [
            'branch_key' => $slug($context['branch'] ?? null),
            'occasion_slug' => $occasion,
            'context' => $context,
            'last_seen_at' => gmdate(DATE_ATOM),
        ]);
    }

    $images = array_values(array_filter(
        is_array($input['images'] ?? null) ? $input['images'] : [],
        static fn (mixed $url): bool => is_string($url) && preg_match('#^https?://#i', $url) === 1
    ));
    $visibility = ($input['visibility'] ?? '') === 'public' ? 'public' : 'private';
    $lookRows = $client->insert('looks', [
        'user_id' => $userId,
        'session_id' => $sessionId,
        'name' => mb_substr(trim((string) ($input['name'] ?? 'Look V-Remix')), 0, 120),
        'occasion_slug' => $occasion,
        'garment_slug' => $garment,
        'color_slug' => $slug($selection['color'] ?? null),
        'pattern_slug' => $slug($selection['pattern'] ?? null),
        'style_slug' => $slug($selection['style'] ?? null),
        'scene_slug' => $slug($selection['scene'] ?? null),
        'selection' => $selection,
        'locks' => is_array($input['locks'] ?? null) ? $input['locks'] : [],
        'image_url' => $images[0] ?? null,
        'visibility' => $visibility,
    ]);
    $lookId = (string) ($lookRows[0]['id'] ?? '');
    if ($lookId === '') {
        throw new RuntimeException('Supabase không trả về ID Look.');
    }

    foreach (array_slice($images, 0, 5) as $index => $imageUrl) {
        $client->insert('look_variants', [
            'look_id' => $lookId,
            'variant_index' => $index,
            'label' => $index === 0 ? 'Look gốc' : 'Variant ' . $index,
            'selection' => $selection,
            'image_url' => $imageUrl,
        ]);
    }

    $accessorySlugs = array_values(array_filter(
        is_array($selection['accessories'] ?? null) ? $selection['accessories'] : [],
        static fn (mixed $value): bool => is_string($value) && preg_match('/^[a-z0-9-]{1,80}$/', $value) === 1
    ));
    if ($accessorySlugs !== []) {
        $accessories = $client->select('studio_accessories', [
            'slug' => 'in.(' . implode(',', $accessorySlugs) . ')',
            'select' => 'id,name',
        ]);
        foreach ($accessories as $accessory) {
            $client->insert('look_accessories', [
                'look_id' => $lookId,
                'accessory_id' => (string) $accessory['id'],
                'accessory_name' => (string) $accessory['name'],
            ]);
        }
    }

    if ($visibility === 'public') {
        $client->insert('discovery_looks', [
            'look_id' => $lookId,
            'status' => 'pending',
        ]);
    }

    $respond(['lookId' => $lookId, 'visibility' => $visibility, 'saved' => true], 201);
} catch (JsonException) {
    $respond(['error' => 'JSON không hợp lệ.'], 400);
} catch (Throwable $error) {
    error_log('[V-Remix] look-api: ' . $error->getMessage());
    $respond(['error' => 'Không thể lưu Look vào Supabase.'], 500);
}
