<?php
declare(strict_types=1);
require __DIR__ . '/src/Support/Env.php';
require __DIR__ . '/src/Support/SupabaseAuth.php';
require __DIR__ . '/src/Support/StudioDraft.php';
require __DIR__ . '/src/Infrastructure/SupabaseAdminClient.php';
require __DIR__ . '/src/Infrastructure/StudioStorage.php';
use App\Support\Env;
use App\Support\SupabaseAuth;
use App\Support\StudioDraft;
use App\Infrastructure\SupabaseAdminClient;
use App\Infrastructure\StudioStorage;
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$respond = static function (array $body, int $status = 200): never {
    http_response_code($status); echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR); exit;
};
Env::load(__DIR__ . '/.env');
$url = (string) getenv('SUPABASE_URL'); $key = (string) getenv('SUPABASE_SERVICE_ROLE_KEY');
$auth = new SupabaseAuth($url, (string) getenv('SUPABASE_ANON_KEY'), $key);
$auth->boot(); $user = $auth->user();
if (!$user) $respond(['error' => 'Đăng nhập để lưu bản nháp trong tài khoản.'], 401);
if (!$auth->verifyCsrf((string) ($_SERVER['HTTP_X_VREMIX_CSRF'] ?? ''))) $respond(['error' => 'Phiên không hợp lệ. Hãy tải lại Studio.'], 403);
$userId = (string) $user['id'];
if ((string) ($_SERVER['HTTP_X_VREMIX_ACCOUNT'] ?? '') !== $userId) $respond(['error' => 'Tài khoản đã thay đổi. Tải lại Studio trước khi đồng bộ bản nháp.'], 403);
$owner = hash('sha256', (string) ($_SESSION['studio_generation_owner'] ?? ''));
session_write_close();
try {
    $client = new SupabaseAdminClient($url, $key);
    $jobCache = []; $lookCache = [];
    $ownsJob = static function (string $id) use ($client, $userId, $owner, &$jobCache): ?array {
        $job = $jobCache[$id] ?? $client->select('generation_jobs', ['id' => 'eq.' . $id, 'select' => 'id,user_id,owner_session_hash,status,output', 'limit' => '1'])[0] ?? null;
        if ($job) $jobCache[$id] = $job;
        return $job && ($job['user_id'] === $userId || ($job['user_id'] === null && !empty($job['owner_session_hash']) && hash_equals($job['owner_session_hash'], $owner))) ? $job : null;
    };
    $ownsLook = static function (string $id) use ($client, $userId, &$lookCache): ?array {
        return $lookCache[$id] ?? $client->select('looks', ['id' => 'eq.' . $id, 'user_id' => 'eq.' . $userId, 'select' => '*', 'limit' => '1'])[0] ?? null;
    };
    $primeRefs = static function (?array $record) use ($client, $userId, &$jobCache, &$lookCache): void {
        if (!$record || empty($record['collections'])) return;
        $refs = array_merge([$record], array_column($record['collections'], 'record'));
        $jobs = array_values(array_unique(array_filter(array_column($refs, 'jobId'))));
        $looks = array_values(array_unique(array_filter(array_column($refs, 'savedLookId'))));
        if ($jobs) foreach ($client->select('generation_jobs', ['id' => 'in.(' . implode(',', $jobs) . ')', 'select' => 'id,user_id,owner_session_hash,status,output']) as $job) $jobCache[$job['id']] = $job;
        if ($looks) foreach ($client->select('looks', ['id' => 'in.(' . implode(',', $looks) . ')', 'user_id' => 'eq.' . $userId, 'select' => '*']) as $look) $lookCache[$look['id']] = $look;
    };
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $row = $client->select('studio_drafts', ['user_id' => 'eq.' . $userId, 'select' => '*', 'limit' => '1'])[0] ?? null;
        $record = $row['payload'] ?? null;
        $primeRefs($record);
        if ($record) {
            $record['updatedAt'] = (int) (strtotime($row['updated_at']) * 1000); $record['userId'] = $userId;
            $output = null;
            if (!empty($record['savedLookId'])) {
                $look = $ownsLook($record['savedLookId']);
                if ($look) {
                    try {
                        $image = !empty($look['storage_path']) ? (new StudioStorage($url, $key))->sign($look['storage_path']) : $look['image_url'];
                        if ($image) $output = ['lookbook' => ['items' => [['url' => $image, 'path' => $look['storage_path'] ?? null]]]];
                    } catch (Throwable) { $record['mediaUnavailable'] = true; }
                }
            }
            if (!$output && !empty($record['jobId'])) {
                // Across devices an unclaimed guest job is not exposed by its ID alone.
                $job = $ownsJob($record['jobId']);
                if ($job && $job['status'] === 'completed') {
                    try { $output = (new StudioStorage($url, $key))->refreshOutput($job['output']); }
                    catch (Throwable) { $record['mediaUnavailable'] = true; }
                }
            }
            if ($output) $record['output'] = $output;
            // Covers are refreshed from owned media, never from a client URL.
            foreach ($record['collections'] ?? [] as $index => $collection) {
                $snapshot = $collection['record'];
                $job = !empty($snapshot['jobId']) ? $ownsJob($snapshot['jobId']) : null;
                $look = !empty($snapshot['savedLookId']) ? $ownsLook($snapshot['savedLookId']) : null;
                try {
                    if ($job && $job['status'] === 'completed') $snapshot['output'] = (new StudioStorage($url, $key))->refreshOutput($job['output']);
                    elseif ($look) {
                        $image = !empty($look['storage_path']) ? (new StudioStorage($url, $key))->sign($look['storage_path']) : $look['image_url'];
                        if ($image) $snapshot['output'] = ['lookbook' => ['items' => [['url' => $image, 'path' => $look['storage_path'] ?? null]]]];
                    }
                } catch (Throwable) { $snapshot['mediaUnavailable'] = true; }
                $record['collections'][$index]['record'] = $snapshot;
            }
        }
        $respond(['record' => $record, 'revision' => $row['revision'] ?? 0]);
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') $respond(['error' => 'Method không được hỗ trợ.'], 405);
    $raw = (string) file_get_contents('php://input');
    if (strlen($raw) > 100000) $respond(['error' => 'Các bộ sưu tập đã vượt dung lượng lưu bản nháp. Chưa chuyển bộ; dữ liệu đã lưu trước đó vẫn được giữ.'], 413);
    $input = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
    if (!is_array($input) || !is_int($input['revision'] ?? null) || $input['revision'] < 0) $respond(['error' => 'Phiên bản bản nháp không hợp lệ.'], 422);
    $action = $input['action'] ?? '';
    if (!in_array($action, ['save', 'clear'], true)) $respond(['error' => 'Yêu cầu bản nháp không hợp lệ.'], 422);
    if ($action === 'save' && !is_array($input['record'] ?? null)) $respond(['error' => 'Thiếu bản nháp.'], 422);
    $record = $action === 'save' ? StudioDraft::normalize($input['record']) : null;
    $primeRefs($record);
    // Validate every archived reference too, so collections cannot expose another account's media.
    foreach ($record['collections'] ?? [] as $collection) {
        $snapshot = $collection['record'];
        if (!empty($snapshot['jobId'])) {
            $job = $ownsJob($snapshot['jobId']);
            if (!$job) $respond(['error' => 'Phiên bản trong bộ sưu tập không thuộc tài khoản của bạn.'], 403);
            if ($job['user_id'] === null && !$client->update('generation_jobs', ['id' => 'eq.' . $job['id'], 'user_id' => 'is.null', 'owner_session_hash' => 'eq.' . $owner], ['user_id' => $userId])) $respond(['error' => 'Phiên bản đã được gắn với tài khoản khác.'], 403);
            $jobCache[$job['id']]['user_id'] = $userId;
        }
        if (!empty($snapshot['savedLookId']) && !$ownsLook($snapshot['savedLookId'])) $respond(['error' => 'Bản phối trong bộ sưu tập không thuộc tài khoản của bạn.'], 403);
    }
    if (!empty($record['jobId'])) {
        $job = $ownsJob($record['jobId']);
        if (!$job) $respond(['error' => 'Ảnh không thuộc tài khoản hoặc phiên của bạn.'], 403);
        // Claim only an owned guest result after login for cross-device access.
        if ($job['user_id'] === null && !$client->update('generation_jobs', ['id' => 'eq.' . $job['id'], 'user_id' => 'is.null', 'owner_session_hash' => 'eq.' . $owner], ['user_id' => $userId])) {
            $respond(['error' => 'Ảnh đã được gắn với tài khoản khác. Hãy tải lại Studio.'], 403);
        }
    }
    if (!empty($record['savedLookId']) && !$ownsLook($record['savedLookId'])) $respond(['error' => 'Bản phối không thuộc tài khoản của bạn.'], 403);
    $saved = $client->rpc('write_studio_draft', ['p_user' => $userId, 'p_payload' => $record, 'p_revision' => $input['revision']])[0];
    $respond(['ok' => true, 'revision' => $saved['revision'], 'updatedAt' => (int) (strtotime($saved['updated_at']) * 1000)]);
} catch (InvalidArgumentException $error) { $respond(['error' => $error->getMessage()], 422);
} catch (JsonException) { $respond(['error' => 'JSON không hợp lệ.'], 400);
} catch (Throwable $error) {
    if (str_contains($error->getMessage(), 'STUDIO_DRAFT_CONFLICT')) $respond(['error' => 'Bản nháp đã thay đổi trên một cửa sổ hoặc thiết bị khác. Tải lại Studio trước khi chỉnh tiếp.'], 409);
    error_log('[V-Remix] draft storage unavailable');
    $respond(['error' => 'Chưa đồng bộ được bản nháp lên tài khoản. Hãy thử lại trước khi rời Studio.'], 503);
}
