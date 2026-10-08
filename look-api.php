<?php
declare(strict_types=1);
require __DIR__ . '/src/Support/Env.php';
require __DIR__ . '/src/Support/SupabaseAuth.php';
require __DIR__ . '/src/Support/StudioPlan.php';
require __DIR__ . '/src/Infrastructure/SupabaseAdminClient.php';
require __DIR__ . '/src/Infrastructure/StudioStorage.php';
use App\Support\Env;
use App\Support\SupabaseAuth;
use App\Support\StudioPlan;
use App\Infrastructure\SupabaseAdminClient;
use App\Infrastructure\StudioStorage;
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$respond = static function (array $body, int $status = 200): never {
    http_response_code($status); echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR); exit;
};
Env::load(__DIR__ . '/.env');
$auth = new SupabaseAuth((string) getenv('SUPABASE_URL'), (string) getenv('SUPABASE_ANON_KEY'), (string) getenv('SUPABASE_SERVICE_ROLE_KEY'));
$auth->boot(); $user = $auth->user();
if (!$user) $respond(['error' => 'Đăng nhập để mở thư viện riêng.'], 401);
if (!$auth->verifyCsrf((string) ($_SERVER['HTTP_X_VREMIX_CSRF'] ?? ''))) $respond(['error' => 'Phiên không hợp lệ. Hãy tải lại Studio.'], 403);
$owner = hash('sha256', (string) ($_SESSION['studio_generation_owner'] ?? ''));
$userId = (string) $user['id'];
session_write_close();
$uuid = static fn (mixed $v): bool => is_string($v) && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $v) === 1;
try {
    $client = new SupabaseAdminClient((string) getenv('SUPABASE_URL'), (string) getenv('SUPABASE_SERVICE_ROLE_KEY'));
    $storage = new StudioStorage((string) getenv('SUPABASE_URL'), (string) getenv('SUPABASE_SERVICE_ROLE_KEY'));
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $offset = max(0, min(10000, (int) ($_GET['offset'] ?? 0)));
        $items = $client->select('looks', ['user_id' => 'eq.' . $userId, 'deleted_at'=>'is.null', 'select' => '*',
            'order' => 'created_at.desc,id.desc', 'limit' => '21', 'offset' => (string) $offset]);
        $more = count($items) > 20; $items = array_slice($items, 0, 20);
        foreach ($items as &$item) {
            if (!empty($item['storage_path'])) {
                try { $item['image_url'] = $storage->sign($item['storage_path']); }
                catch (Throwable) { $item['image_url'] = null; $item['media_error'] = true; }
            }
        } unset($item);
        $respond(['items' => $items, 'hasMore' => $more]);
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') $respond(['error' => 'Method không được hỗ trợ.'], 405);
    $raw = (string) file_get_contents('php://input');
    if (strlen($raw) > 18_000_000) $respond(['error' => 'Dữ liệu quá lớn.'], 413);
    $input = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    $action = $input['action'] ?? '';
    if (in_array($action, ['rename', 'delete'], true)) {
        if (!$uuid($input['id'] ?? null)) $respond(['error' => 'Bản phối không hợp lệ.'], 422);
        $filters = ['id' => 'eq.' . $input['id'], 'user_id' => 'eq.' . $userId];
        if (!$client->select('looks', $filters + ['select' => 'id', 'limit' => '1'])) $respond(['error' => 'Không tìm thấy bản phối.'], 404);
        if ($action === 'delete') $client->update('looks', $filters, ['deleted_at'=>gmdate(DATE_ATOM)]);
        else {
            $name = trim((string) ($input['name'] ?? ''));
            if (mb_strlen($name) < 1 || mb_strlen($name) > 120) $respond(['error' => 'Tên bản phối cần từ 1 đến 120 ký tự.'], 422);
            $client->update('looks', $filters, ['name' => $name, 'updated_at' => gmdate(DATE_ATOM)]);
        }
        $respond(['ok' => true]);
    }
    if ($action !== 'save' || !$uuid($input['saveId'] ?? null)) $respond(['error' => 'Yêu cầu lưu không hợp lệ.'], 422);
    // Recover a prior successful save without repeating uploads or database writes.
    $existing = $client->select('looks', ['user_id' => 'eq.' . $userId, 'client_save_id' => 'eq.' . $input['saveId'], 'select' => 'id,deleted_at', 'limit' => '1']);
    if ($existing) {
        if (!empty($existing[0]['deleted_at'])) $respond(['error'=>'Bản đánh dấu này đã được xóa. Mở lại bộ sưu tập trước khi lưu.'],409);
        $respond(['saved' => true, 'lookId' => $existing[0]['id']]);
    }
    $selection = $input['selection'] ?? null;
    if (!is_array($selection)) $respond(['error' => 'Thiếu lựa chọn bản phối.'], 422);
    $selection['planning'] = StudioPlan::normalize($selection['planning'] ?? null);
    $job = null;
    if ($uuid($input['jobId'] ?? null)) {
        $rows = $client->select('generation_jobs', ['id' => 'eq.' . $input['jobId'], 'select' => '*', 'limit' => '1']);
        $job = $rows[0] ?? null;
        if (!$job || !empty($job['deleted_at']) || $job['status'] !== 'completed'
            || !($job['user_id'] === $userId || ($job['user_id'] === null && !empty($job['owner_session_hash']) && hash_equals($job['owner_session_hash'], $owner)))) {
            $respond(['error' => 'Kết quả tạo ảnh không thuộc tài khoản hoặc phiên của bạn.'], 403);
        }
    }
    $items = $job ? ($job['output']['lookbook']['items'] ?? []) : ($input['images'] ?? []);
    $images = [];
    foreach (array_slice($items, 0, 5) as $index => $item) {
        $url = is_array($item) ? (string) ($item['url'] ?? '') : (string) $item;
        $path = is_array($item) ? (string) ($item['path'] ?? '') : '';
        if (str_starts_with($url, 'data:image/')) {
            $path = $userId . '/saved/' . $input['saveId'] . '/' . $index . '.png';
            $url = $storage->uploadData($path, $url);
        } elseif ($storage->trustedUrl($url)) {
            if (!$path && preg_match('#/storage/v1/object/(?:sign|public)/generated-lookbooks/([^?]+)#', $url, $m)) $path = rawurldecode($m[1]);
            if ($path) $url = $storage->sign($path);
        } else $respond(['error' => 'Ảnh chưa được lưu vào Storage tin cậy.'], 422);
        $images[] = ['url' => $url, 'path' => $path];
    }
    if (!$images) $respond(['error' => 'Chưa có ảnh để lưu.'], 422);
    $slug = static function ($v): ?string { return is_string($v) && preg_match('/^[a-z0-9-]{1,80}$/', $v) ? $v : null; };
    $occasion = $slug($selection['event'] ?? null); $garment = $slug($selection['garment'] ?? null);
    if (!$occasion || !$garment || ($occasion === 'custom' && !$selection['planning']['customOccasion'])) $respond(['error' => 'Thiếu dịp mặc hoặc trang phục.'], 422);
    $record = ['name' => mb_substr(trim((string) ($input['name'] ?? 'Bản phối của tôi')), 0, 120),
        'occasion_slug' => $occasion, 'garment_slug' => $garment, 'selection' => $selection,
        'locks' => $selection['locks'] ?? [], 'image_url' => $images[0]['url'], 'storage_path' => $images[0]['path'] ?: null,
        'generation_job_id' => $job['id'] ?? null, 'prompt_version_id' => $job['prompt_version_id'] ?? null];
    foreach (['color', 'pattern', 'style', 'scene'] as $key) $record[$key . '_slug'] = $slug($selection[$key] ?? null);
    $saved = $client->rpc('save_studio_look', ['p_user' => $userId, 'p_save' => $input['saveId'], 'p_record' => $record, 'p_images' => $images]);
    $respond(['saved' => true, 'lookId' => $saved[0]['id'], 'visibility' => 'private'], 201);
} catch (InvalidArgumentException $error) {
    $respond(['error' => $error->getMessage()], 422);
} catch (JsonException) {
    $respond(['error' => 'JSON không hợp lệ.'], 400);
} catch (Throwable $error) {
    error_log('[V-Remix] library: ' . $error->getMessage());
    $respond(['error' => 'Không thể cập nhật thư viện. Ảnh hiện tại vẫn được giữ; bạn có thể thử lại.'], 503);
}
