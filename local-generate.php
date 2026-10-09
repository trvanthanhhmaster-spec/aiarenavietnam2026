<?php
declare(strict_types=1);

require __DIR__ . '/src/Support/Env.php';
require __DIR__ . '/src/Support/StudioPlan.php';
require __DIR__ . '/src/Support/StudioHistory.php';
require __DIR__ . '/src/Support/SupabaseAuth.php';
require __DIR__ . '/src/Infrastructure/SupabaseAdminClient.php';
require __DIR__ . '/src/Infrastructure/StudioStorage.php';
require __DIR__ . '/src/Infrastructure/SupabaseClient.php';
require __DIR__ . '/src/Repositories/StudioRepository.php';

use App\Support\Env;
use App\Support\StudioPlan;
use App\Support\StudioHistory;
use App\Infrastructure\SupabaseClient;
use App\Repositories\StudioRepository;
use App\Support\SupabaseAuth;
use App\Infrastructure\SupabaseAdminClient;
use App\Infrastructure\StudioStorage;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$respond = static function (mixed $body, int $status = 200): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
};

$remoteAddress = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
if (!in_array($remoteAddress, ['127.0.0.1', '::1'], true)) {
    $respond(['error' => 'Local Gemini Web generation is only available from this machine.'], 403);
}
if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'GET'], true)) {
    $respond(['error' => 'Method not allowed.'], 405);
}

Env::load(__DIR__ . '/.env');
$auth = new SupabaseAuth((string) getenv('SUPABASE_URL'), (string) getenv('SUPABASE_ANON_KEY'), (string) getenv('SUPABASE_SERVICE_ROLE_KEY'));
$auth->boot();
$user = $auth->user();
if (!$auth->verifyCsrf((string) ($_SERVER['HTTP_X_VREMIX_CSRF'] ?? ''))) $respond(['error' => 'Phiên tạo ảnh không hợp lệ. Hãy tải lại Studio.'], 403);
if (empty($_SESSION['studio_generation_owner'])) $_SESSION['studio_generation_owner'] = bin2hex(random_bytes(32));
$owner = hash('sha256', $_SESSION['studio_generation_owner']);
session_write_close(); // Polling/auth requests must not wait for the provider.
$admin = new SupabaseAdminClient((string) getenv('SUPABASE_URL'), (string) getenv('SUPABASE_SERVICE_ROLE_KEY'));
$storage = new StudioStorage((string) getenv('SUPABASE_URL'), (string) getenv('SUPABASE_SERVICE_ROLE_KEY'));
$job = null;
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $field = isset($_GET['jobId']) ? 'id' : 'client_request_id';
        $value = (string) ($_GET['jobId'] ?? $_GET['requestId'] ?? '');
        if (!preg_match('/^[0-9a-f-]{36}$/i', $value)) $respond(['error' => 'ID yêu cầu không hợp lệ.'], 400);
        $rows = $admin->select('generation_jobs', [$field => 'eq.' . $value, 'select' => '*', 'limit' => '1']);
        $found = $rows[0] ?? null;
        if (!$found || !empty($found['deleted_at']) || !(($user && $found['user_id'] === $user['id']) || ($found['user_id'] === null && $found['owner_session_hash'] === $owner))) $respond(['error' => 'Không tìm thấy bản phối trong phiên này.'], 404);
        $respond(['jobId' => $found['id'], 'status' => $found['status'], 'error' => $found['error_message'],
            'output' => $found['status'] === 'completed' ? $storage->refreshOutput($found['output']) : []]);
    } catch (Throwable $error) { $respond(['error' => 'Không thể kiểm tra tiến trình.'], 503); }
}
$bridgeUrl = rtrim((string) getenv('GEMINI_WEB_BRIDGE_URL'), '/');
$bridgeSecret = (string) getenv('GEMINI_WEB_BRIDGE_SECRET');
if ($bridgeUrl === '' || $bridgeSecret === '') {
    $respond(['error' => 'Gemini Web bridge is not configured in the local server environment.'], 503);
}

try {
    $raw = (string) file_get_contents('php://input');
    if (strlen($raw) > 12_000_000) {
        $respond(['error' => 'Request body is too large.'], 413);
    }
    $input = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($input)) {
        $respond(['error' => 'Invalid request body.'], 400);
    }
    $requestId = (string) ($input['clientRequestId'] ?? '');
    $collectionId = $input['collectionId'] ?? null;
    if ($collectionId !== null) {
        if (!StudioHistory::uuid($collectionId)) $respond(['error'=>'Bộ sưu tập không hợp lệ.'],422);
        $collection = $admin->select('studio_collections',['id'=>'eq.'.$collectionId,'select'=>'user_id,deleted_at','limit'=>'1'])[0] ?? null;
        if ($collection && (!$user || $collection['user_id'] !== $user['id'] || $collection['deleted_at'])) $respond(['error'=>'Bộ sưu tập không thuộc tài khoản đang mở.'],403);
        if ($user && !$collection) $respond(['error'=>'Lưu bộ sưu tập trước khi tạo ảnh.'],422);
    }
    if (!preg_match('/^[0-9a-f-]{36}$/i', $requestId)) {
        $respond(['error' => 'clientRequestId must be a UUID.'], 400);
    }
    // Quality and dimensions are admin-owned, never a client-side override.
    $settings = $admin->select('studio_generation_settings', ['id' => 'eq.1', 'select' => 'canvas_aspect_ratio,target_resolution', 'limit' => '1']);
    if (empty($settings[0])) throw new RuntimeException('Cấu hình tạo ảnh chưa sẵn sàng.');
    $input['aspectRatio'] = $settings[0]['canvas_aspect_ratio'];
    $input['targetResolution'] = $settings[0]['target_resolution'];
    $aspectRatio = (string) ($input['aspectRatio'] ?? '16:9');
    $resolution = (string) ($input['targetResolution'] ?? '1080');
    if (!in_array($aspectRatio, ['16:9', '1:1', '9:16'], true)
        || !in_array($resolution, ['720', '1080', '2160'], true)) {
        $respond(['error' => 'Invalid image dimensions.'], 422);
    }
    $mode = (string) ($input['generationMode'] ?? 'text-to-image');
    $inputImage = is_array($input['inputImage'] ?? null) ? $input['inputImage'] : null;
    if ($inputImage !== null && (!in_array($inputImage['mimeType'] ?? '', ['image/jpeg', 'image/png', 'image/webp'], true)
        || !is_string($inputImage['data'] ?? null) || strlen($inputImage['data']) > 11_200_000 || base64_decode($inputImage['data'], true) === false)) {
        $respond(['error' => 'Ảnh tham khảo không hợp lệ.'], 422);
    }
    if ($mode === 'image-to-image' && $inputImage === null) {
        $respond(['error' => 'Image-to-image mode requires a source image.'], 422);
    }

    $selection = [
        'event' => (string) ($input['eventSlug'] ?? ''),
        'location' => (string) ($input['location'] ?? ''),
        'season' => (string) ($input['season'] ?? ''),
        'weather' => (string) ($input['weather'] ?? ''),
        'audience' => (string) ($input['audience'] ?? ''),
        'garment' => (string) ($input['garmentSlug'] ?? ''),
        'garment_variant' => (string) ($input['garmentVariantSlug'] ?? ''),
        'color' => (string) ($input['colorSlug'] ?? ''),
        'style' => (string) ($input['styleSlug'] ?? ''),
        'accessories' => array_values(array_filter((array) ($input['accessorySlugs'] ?? []), 'is_string')),
        'accessory_variants' => array_values(array_filter((array) ($input['accessoryVariantSlugs'] ?? []), 'is_string')),
    ];
    $basePrompt = sprintf(
        'Generate a premium editorial Vietnamese fashion photograph. Event/context: %s. Location: %s. Season/weather: %s / %s. Audience/use case: %s. Garment type: %s. Concrete garment variant: %s. Color: %s. Style/lighting: %s. Accessory types: %s. Concrete accessory variants: %s. One centered subject, culturally accurate construction, stable full-body pose and camera composition.',
        $selection['event'],
        $selection['location'],
        $selection['season'],
        $selection['weather'],
        $selection['audience'],
        $selection['garment'],
        $selection['garment_variant'],
        $selection['color'],
        $selection['style'],
        $selection['accessories'] === [] ? 'none' : implode(', ', $selection['accessories']),
        $selection['accessory_variants'] === [] ? 'none' : implode(', ', $selection['accessory_variants'])
    );
    $scopes = [
        'A' => 'Create and lock the source frame: subject identity, face, pose, camera angle, position, scale and composition.',
        'B' => 'Change only the background and event context. Preserve frame A subject, garment, camera, position and scale.',
        'C' => 'Change only lighting and time of day. Preserve frame A background, subject, garment, camera and composition.',
        'D' => 'Change only the clothing and garment styling. Preserve frame A identity, face, pose, camera and composition.',
        'E' => 'Replace only the adult model identity with another adult model. Preserve frame A position, scale, pose, background, camera and garment composition.',
    ];
    $plan = null;
    if (isset($input['planning'])) {
        try {
            $plan = StudioPlan::normalize($input['planning']);
            if (($input['generationType'] ?? 'image') !== 'image') throw new InvalidArgumentException('Luồng bản phối chỉ tạo một ảnh; video được quản lý riêng.');
            if (array_filter($plan['people'], static fn (array $p): bool => $p['faceSupplied']) && $inputImage === null) throw new InvalidArgumentException('Ảnh tham khảo chưa được gửi. Hãy tải lại ảnh hoặc bỏ ảnh tham khảo.');
            $database = require __DIR__ . '/config/database.php';
            $catalog = (new StudioRepository(new SupabaseClient($database['url'], $database['anon_key'])))->getCatalog();
            if (!$catalog) throw new RuntimeException('Catalog chưa sẵn sàng.');
            $event = ($input['eventSlug'] ?? '') === 'custom' && $plan['customOccasion'] !== ''
                ? ['label' => $plan['customOccasion'], 'description' => 'User preference only; not reviewed cultural knowledge. Do not claim culturally verified occasion or suitability.']
                : (array_values(array_filter($catalog['events'], static fn (array $e): bool => $e['slug'] === ($input['eventSlug'] ?? '')))[0] ?? null);
            if (!$event) throw new InvalidArgumentException('Chọn một dịp đã được duyệt.');
            $basePrompt = StudioPlan::prompt($plan, $catalog) . "\nEvent: " . $event['label'] . '. ' . ($event['description'] ?? '');
            $scopes = ['A' => 'Create one complete photo of the specified people and their chosen outfits.'];
        } catch (InvalidArgumentException $error) {
            $respond(['error' => $error->getMessage(), 'status' => 'failed'], 422);
        }
    }

    if ($plan === null) $respond(['error' => 'Hãy hoàn tất luồng bốn bước trước khi tạo ảnh.'], 422);
    $input['planning'] = $plan;
    $referenceImage = (new StudioHistory($admin, $storage, $user['id'] ?? null, $owner))->reference($input);
    $faceReferenceImage = $referenceImage ? $inputImage : null;
    if ($referenceImage) { $inputImage = $referenceImage; $input['generationMode'] = 'image-to-image'; }
    $basePrompt .= "\n" . ($input['editInstruction'] ?? '');
    $prompts = $admin->select('studio_prompt_versions', ['slug' => 'eq.studio-group-web', 'is_active' => 'eq.true', 'select' => 'id,version,system_prompt', 'limit' => '1']);
    if (empty($prompts[0])) throw new RuntimeException('Chưa có phiên bản prompt nhóm được duyệt.');
    $basePrompt = $prompts[0]['system_prompt'] . "\n" . $basePrompt;
    $safeInput = $input; unset($safeInput['inputImage'], $safeInput['faceReferenceImage'], $safeInput['_provider'], $safeInput['_estimate']);
    $safeInput['planning'] = $plan;
    $reserved = $admin->rpc('reserve_local_generation', ['p_request' => $requestId, 'p_user' => $user['id'] ?? null,
        'p_owner' => $owner, 'p_input' => $safeInput]);
    $job = $reserved[0] ?? null;
    if (!$job) throw new RuntimeException('Không thể đăng ký lượt tạo ảnh.');
    if (!empty($job['deleted_at']) || ($collectionId && !empty($job['collection_id']) && $job['collection_id'] !== $collectionId)) $respond(['error'=>'Yêu cầu này không còn thuộc bộ đang mở. Tải lại Studio trước khi tạo.'],409);
    if ($collectionId && empty($job['collection_id'])) $admin->update('generation_jobs',['id'=>'eq.'.$job['id'],'collection_id'=>'is.null'],['collection_id'=>$collectionId]);
    if ($job['status'] !== 'queued') {
        $respond(['jobId' => $job['id'], 'status' => $job['status'], 'error' => $job['error_message'],
            'output' => $job['status'] === 'completed' ? $storage->refreshOutput($job['output']) : []]);
    }
    $claimed = $admin->update('generation_jobs', ['id' => 'eq.' . $job['id'], 'status' => 'eq.queued'], ['status' => 'processing', 'prompt_version_id' => $prompts[0]['id'], 'updated_at' => gmdate(DATE_ATOM)]);
    if (!$claimed) $respond(['jobId' => $job['id'], 'status' => 'processing', 'output' => []]);
    $callBridge = static function (array $payload) use ($bridgeUrl, $bridgeSecret): array {
        $handle = curl_init($bridgeUrl . '/v1/images/generate');
        if ($handle === false) {
            throw new RuntimeException('Unable to initialize Gemini Web bridge request.');
        }
        curl_setopt_array($handle, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            // Keep a transient provider stall from holding the Studio request
            // until Apache's much longer script timeout.
            CURLOPT_TIMEOUT => 90,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'x-vremix-bridge-secret: ' . $bridgeSecret,
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
        ]);
        $body = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $error = curl_error($handle);
        if (!is_string($body) || $error !== '') {
            throw new RuntimeException('Gemini Web bridge connection failed: ' . $error);
        }
        $decoded = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($decoded)) {
            throw new RuntimeException('Gemini Web bridge returned HTTP ' . $status . '.');
        }
        if (!empty($decoded['error'])) {
            throw new RuntimeException((string) $decoded['error']);
        }
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException('Gemini Web bridge returned HTTP ' . $status . '.');
        }
        $image = $decoded['images'][0] ?? null;
        if (!is_array($image) || empty($image['data'])) {
            throw new RuntimeException('Gemini Web bridge returned no generated image.');
        }
        return $image;
    };

    $frames = [];
    $fallbackFrames = [];
    $sourceImage = $inputImage;
    foreach ($scopes as $key => $scope) {
        try {
            $image = $callBridge([
                'prompt' => $basePrompt . "\nFrame " . $key . ': ' . $scope,
                'sourceImage' => $sourceImage,
                'aspectRatio' => $aspectRatio,
                'targetResolution' => $resolution,
                'changeScope' => $input['editInstruction'] ?? $scope,
                'operation' => $referenceImage ? 'group-edit' : 'group',
                'referenceImages' => $faceReferenceImage ? [$faceReferenceImage] : [],
            ]);
        } catch (Throwable $error) {
            if ($key === 'A' || !is_array($sourceImage) || empty($sourceImage['data'])) {
                throw $error;
            }
            // A is the locked source frame; preserving it is safer than
            // failing the complete lookbook when a branch provider call flakes.
            $image = $sourceImage;
            $fallbackFrames[] = $key;
            error_log('[V-Remix] Frame ' . $key . ' fallback to frame A: ' . $error->getMessage());
        }
        $mimeType = (string) ($image['mimeType'] ?? 'image/png');
        $path = $job['id'] . '/' . strtolower($key) . '.png';
        $imageUrl = $storage->uploadData($path, 'data:' . $mimeType . ';base64,' . (string) $image['data']);
        $frames[] = [
            'key' => $key,
            'path' => $path,
            'url' => $imageUrl,
            'mimeType' => $mimeType,
            'index' => count($frames) + 1,
            'fallback' => in_array($key, $fallbackFrames, true),
            ...(($size = @getimagesizefromstring((string) base64_decode((string) $image['data'], true))) ? ['width'=>$size[0], 'height'=>$size[1]] : []),
        ];
        if ($key === 'A') {
            $sourceImage = ['mimeType' => $mimeType, 'data' => (string) $image['data']];
        }
    }

    $output = [
        'generationType' => (string) ($input['generationType'] ?? 'image'),
        'provider' => 'gemini-webapi-local',
        'copySource' => 'catalog-fallback',
        'imageAssessment' => ['status'=>'not-assessed','source'=>'not-assessed'],
        'story' => $plan !== null ? 'Bản phối minh họa theo dịp mặc và trang phục của ' . $plan['count'] . ' người. Đây không phải chứng nhận độ chính xác văn hóa hay kích cỡ.' : ($fallbackFrames === []
            ? 'Bộ ảnh được tạo từ một frame A cố định và bốn phép biến đổi có kiểm soát.'
            : 'Frame A đã được khoá. ' . implode(', ', $fallbackFrames) . ' đang dùng ảnh A làm fallback vì Gemini tạm thời không trả ảnh.'),
        'guardrail' => 'Đối chiếu chi tiết áo với nguồn tham khảo đã duyệt. Ảnh AI và số đo chỉ mang tính minh họa.',
        'genZTip' => 'Dùng một điểm nhấn hiện đại để trang phục truyền thống vẫn là trung tâm.',
        'imageSource' => $fallbackFrames === [] ? 'gemini-webapi' : 'gemini-webapi-partial-fallback',
        'culturalScore' => null,
        'culturalScoreSource' => 'not-assessed',
        'imageUrl' => $frames[0]['url'] ?? null,
        'planning' => $plan,
        'workflowVersion' => $plan !== null ? 'studio-group-v1' : 'legacy-frame-plan',
        'promptVersionId' => $prompts[0]['id'],
        'promptVersion' => $prompts[0]['version'],
        'lookbook' => ['aspectRatio' => $aspectRatio, 'items' => $frames],
    ];
    $admin->update('generation_jobs', ['id' => 'eq.' . $job['id']], ['status' => 'completed', 'output' => $output,
        'image_count' => count($frames), 'completed_at' => gmdate(DATE_ATOM), 'updated_at' => gmdate(DATE_ATOM)]);
    if (in_array($output['generationType'], ['video', 'both'], true)) {
        $output['videoStatus'] = 'failed';
        $output['videoError'] = 'Local Gemini Web provider currently generates the A-E image set; video remains on the configured Veo provider.';
    }
    $respond([
        'jobId' => $job['id'],
        'requestId' => $requestId,
        'status' => 'completed',
        'output' => $output,
        'usage' => ['imageCount' => count($frames), 'videoCount' => 0],
        'estimatedCostVnd' => $job['estimated_cost_vnd'],
        'costSource' => 'admin-estimate',
    ]);
} catch (InvalidArgumentException $error) {
    $respond(['status'=>'failed','error'=>$error->getMessage()], 422);
} catch (Throwable $error) {
    if ($job && $job['status'] === 'queued') {
        try { $admin->update('generation_jobs', ['id' => 'eq.' . $job['id'], 'status' => 'eq.processing'], ['status' => 'failed', 'error_message' => 'Tạo ảnh chưa hoàn tất. Kiểm tra provider rồi thử lại.', 'updated_at' => gmdate(DATE_ATOM)]); } catch (Throwable) {}
    }
    error_log('[V-Remix] Local Gemini Web generation: ' . $error->getMessage());
    $respond(['status' => 'failed', 'error' => $error->getMessage()], 502);
}
