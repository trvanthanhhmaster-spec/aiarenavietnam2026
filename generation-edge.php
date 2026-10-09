<?php
declare(strict_types=1);
require __DIR__ . '/src/Support/Env.php';
require __DIR__ . '/src/Support/SupabaseAuth.php';
require __DIR__ . '/src/Support/StudioHistory.php';
require __DIR__ . '/src/Support/StudioPlan.php';
require __DIR__ . '/src/Support/EdgeGateway.php';
require __DIR__ . '/src/Infrastructure/SupabaseAdminClient.php';
require __DIR__ . '/src/Infrastructure/StudioStorage.php';
use App\Support\Env;
use App\Support\SupabaseAuth;
use App\Support\StudioHistory;
use App\Infrastructure\SupabaseAdminClient;
use App\Infrastructure\StudioStorage;
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$respond = static function (array $body, int $status = 200): never { http_response_code($status); echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR); exit; };
Env::load(__DIR__ . '/.env');
$url = rtrim((string) getenv('SUPABASE_URL'), '/'); $key = (string) getenv('SUPABASE_SERVICE_ROLE_KEY');
$auth = new SupabaseAuth($url, (string) getenv('SUPABASE_ANON_KEY'), $key);
$auth->boot(); $user = $auth->user();
if (!$auth->verifyCsrf((string) ($_SERVER['HTTP_X_VREMIX_CSRF'] ?? ''))) $respond(['error' => 'Phiên tạo ảnh không hợp lệ. Hãy tải lại Studio.'], 403);
if (empty($_SESSION['studio_generation_owner'])) $_SESSION['studio_generation_owner'] = bin2hex(random_bytes(32));
$owner = hash('sha256', $_SESSION['studio_generation_owner']); session_write_close();
try {
    $method = $_SERVER['REQUEST_METHOD']; $query = '';
    if ($method === 'GET') {
        $field = isset($_GET['jobId']) ? 'jobId' : 'requestId'; $value = (string) ($_GET[$field] ?? '');
        if (!preg_match('/^[0-9a-f-]{36}$/i', $value)) $respond(['error' => 'ID không hợp lệ.'], 422);
        $query = '?' . $field . '=' . rawurlencode($value); $body = null;
        $client = new SupabaseAdminClient($url, $key);
        $rows = $client->select('generation_jobs', [($field === 'jobId' ? 'id' : 'client_request_id') => 'eq.' . $value, 'select' => '*', 'limit' => '1']);
        $job = $rows[0] ?? null;
        if (!$job || !empty($job['deleted_at']) || !(($user && $job['user_id'] === $user['id']) || ($job['user_id'] === null && $job['owner_session_hash'] === $owner))) $respond(['error' => 'Không tìm thấy bản phối.'], 404);
        if ($job['provider'] === 'gemini-webapi-local') {
            $storage = new StudioStorage($url, $key);
            $respond(['jobId' => $job['id'], 'status' => $job['status'], 'error' => $job['error_message'], 'output' => $job['status'] === 'completed' ? $storage->refreshOutput($job['output']) : []]);
        }
    } elseif ($method === 'POST') {
        $raw = (string) file_get_contents('php://input');
        if (strlen($raw) > 12_000_000) $respond(['error' => 'Dữ liệu quá lớn.'], 413);
        $input = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($input) || empty($input['planning'])) $respond(['error' => 'Hãy hoàn tất bốn bước.'], 422);
        $client = new SupabaseAdminClient($url, $key);
        $settings = $client->select('studio_generation_settings', ['id' => 'eq.1', 'select' => 'canvas_aspect_ratio,target_resolution', 'limit' => '1']);
        if (empty($settings[0])) throw new RuntimeException('Cấu hình tạo ảnh chưa sẵn sàng.');
        $input['aspectRatio'] = ($input['portraitRequested'] ?? false) === true ? '9:16' : $settings[0]['canvas_aspect_ratio']; $input['targetResolution'] = $settings[0]['target_resolution'];
        if (isset($input['repairRequested']) && !is_bool($input['repairRequested'])) throw new InvalidArgumentException('Yêu cầu sửa chi tiết không hợp lệ.');
        if (($input['repairRequested'] ?? false) && empty($input['referenceJobId']) && empty($input['referenceLookId'])) throw new InvalidArgumentException('Cần chọn phiên bản đã được đánh giá để sửa.');
        $input['generationType'] = 'image';
        unset($input['faceReferenceImage']);
        $reference = (new StudioHistory($client, new StudioStorage($url, $key), $user['id'] ?? null, $owner))->reference($input);
        if ($reference) {
            $input['faceReferenceImage'] = $input['inputImage'] ?? null;
            $input['inputImage'] = $reference;
            $input['generationMode'] = 'image-to-image';
        }
        $body = json_encode($input, JSON_THROW_ON_ERROR);
    } else $respond(['error' => 'Method không được hỗ trợ.'], 405);
    $signedHeaders = App\Support\EdgeGateway::headers((string) getenv('VREMIX_GATEWAY_SECRET'), $method, $query, $owner, $user['id'] ?? null, $body);
    $handle = curl_init($url . '/functions/v1/generate-look' . $query);
    curl_setopt_array($handle, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 110,
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json', 'Authorization: Bearer ' . $key,
            'x-vremix-owner: ' . $owner, 'x-vremix-user: ' . ($user['id'] ?? '')], $signedHeaders)]);
    if ($body !== null) curl_setopt($handle, CURLOPT_POSTFIELDS, $body);
    $result = curl_exec($handle); $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    curl_close($handle);
    if (!is_string($result) || !$status) $respond(['error' => 'Kết nối bị gián đoạn. Yêu cầu có thể vẫn đang xử lý; hãy xem tiến trình trước khi tạo lại.'], 503);
    $decoded = json_decode($result, true, 512, JSON_THROW_ON_ERROR);
    $respond($decoded, $status);
} catch (InvalidArgumentException $error) { $respond(['status'=>'failed','error'=>$error->getMessage()],422);
} catch (Throwable) { $respond(['error' => 'Dịch vụ tạo ảnh chưa sẵn sàng. Bản phối cũ vẫn được giữ.'], 503); }
