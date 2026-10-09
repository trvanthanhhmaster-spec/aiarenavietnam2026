<?php
declare(strict_types=1);
require __DIR__ . '/src/Support/Env.php';
require __DIR__ . '/src/Support/SupabaseAuth.php';
require __DIR__ . '/src/Support/StudioDraft.php';
require __DIR__ . '/src/Support/StudioIntelligence.php';
require __DIR__ . '/src/Support/StudioAdviceBudget.php';
require __DIR__ . '/src/Support/EdgeGateway.php';
require __DIR__ . '/src/Infrastructure/SupabaseClient.php';
require __DIR__ . '/src/Infrastructure/StudioWeather.php';
require __DIR__ . '/src/Repositories/StudioRepository.php';
use App\Support\{Env, SupabaseAuth, StudioDraft, StudioIntelligence, StudioAdviceBudget, EdgeGateway};
use App\Infrastructure\{SupabaseClient, StudioWeather};
use App\Repositories\StudioRepository;
header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store');
$respond = static function (array $body, int $status = 200): never { http_response_code($status); echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR); exit; };
Env::load(__DIR__ . '/.env');
$url = rtrim((string) getenv('SUPABASE_URL'), '/'); $key = (string) getenv('SUPABASE_SERVICE_ROLE_KEY');
$auth = new SupabaseAuth($url, (string) getenv('SUPABASE_ANON_KEY'), $key); $auth->boot(); $user = $auth->user();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') $respond(['error' => 'Chỉ hỗ trợ POST.'], 405);
if (!$auth->verifyCsrf((string) ($_SERVER['HTTP_X_VREMIX_CSRF'] ?? ''))) $respond(['error' => 'Phiên tư vấn không hợp lệ. Hãy tải lại Studio.'], 403);
try {
    $raw = (string) file_get_contents('php://input');
    if (strlen($raw) > 24000) $respond(['error' => 'Yêu cầu tư vấn quá lớn.'], 413);
    $input = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    if (!is_array($input)) throw new InvalidArgumentException('Yêu cầu không hợp lệ.');
    $action = $input['action'] ?? '';
    if (!in_array($action, ['context', 'recommend', 'stylist'], true)) throw new InvalidArgumentException('Chọn hành động tư vấn hợp lệ.');
    $selection = StudioDraft::normalize(['draft' => $input['selection'] ?? []])['draft'];
    $intent = $input['intent'] ?? 'remix';
    if (!in_array($intent, ['remix', 'historical'], true)) throw new InvalidArgumentException('Mục đích bản phối không hợp lệ.');
    $owner = hash('sha256', (string) ($_SESSION['studio_generation_owner'] ?? session_id()));
    if ($action === 'context') {
        $location = StudioWeather::location($input);
        $cache = $_SESSION['studio_weather_cache'] ?? null;
        if (!$cache || $cache['expires'] <= time() || $cache['key'] !== $location['latitude'] . ',' . $location['longitude']) StudioAdviceBudget::reserve('weather', $owner);
        $result = StudioWeather::fetch($location, $selection['planning']['period'] ?? null, $cache);
        $_SESSION['studio_weather_cache'] = $result['cache'];
        $_SESSION['studio_advice_context'] = ['id' => bin2hex(random_bytes(16)), 'expires' => time() + 600, 'context' => $result['context']];
        $respond(['contextId' => $_SESSION['studio_advice_context']['id'], 'context' => $result['context']]);
    }
    $saved = $_SESSION['studio_advice_context'] ?? [];
    $context = ($saved['id'] ?? '') === ($input['contextId'] ?? '') && ($saved['expires'] ?? 0) > time() && ($saved['context']['period'] ?? null) === ($selection['planning']['period'] ?? null) ? $saved['context'] : null;
    $catalog = (new StudioRepository(new SupabaseClient($url, (string) getenv('SUPABASE_ANON_KEY'))))->getCatalog();
    if (!$catalog) throw new RuntimeException('Chưa đọc được thư viện. Bản phối vẫn được giữ.');
    $advice = StudioIntelligence::recommend($selection, $catalog, $context, $intent);
    if ($action === 'recommend') $respond($advice);
    if (($input['aiConsent'] ?? false) !== true) throw new InvalidArgumentException('Cần xác nhận một lượt AI tư vấn văn bản.');
    $people = $selection['planning']['people'] ?? [];
    if (!$selection['event'] || !$people) throw new InvalidArgumentException('Chọn dịp, số người và trang phục trước khi gọi AI tư vấn.');
    foreach ($people as $person) {
        if (!StudioIntelligence::find($catalog['garments'], $person['outfit']['garment'])) throw new InvalidArgumentException('Chọn trang phục có trong thư viện cho đủ mọi người trước khi tư vấn.');
    }
    $requestId = $input['requestId'] ?? '';
    if (!is_string($requestId) || !preg_match('/^[a-f0-9-]{36}$/i', $requestId)) throw new InvalidArgumentException('ID tư vấn không hợp lệ.');
    // Reserving before transport prevents an uncertain request from being replayed.
    if (isset($_SESSION['studio_advice_requests'][$requestId])) $respond(['error' => 'Lượt này đã được gửi. Không tự chạy lại để tránh tính thêm lượt.'], 409);
    if (strlen((string) getenv('VREMIX_GATEWAY_SECRET')) < 32) throw new RuntimeException('AI tư vấn chưa được kết nối; gợi ý biên tập vẫn sử dụng được.');
    $preference = $input['preference'] ?? '';
    if (!is_string($preference) || mb_strlen($preference) > 240 || str_contains($preference, 'data:')) throw new InvalidArgumentException('Sở thích tối đa 240 ký tự, không gửi ảnh hoặc thông tin cá nhân.');
    StudioAdviceBudget::reserve('ai', $owner);
    $requests = $_SESSION['studio_advice_requests'] ?? []; $requests[$requestId] = time();
    $_SESSION['studio_advice_requests'] = array_slice($requests, -10, null, true);
    session_write_close();
    $body = json_encode(['selection' => StudioIntelligence::safeSelection($selection), 'intent' => $intent, 'preference' => $preference,
        'context' => $context, 'recipes' => $advice['recommendations'], 'guards' => $advice['guards']], JSON_THROW_ON_ERROR);
    $headers = EdgeGateway::headers((string) getenv('VREMIX_GATEWAY_SECRET'), 'POST', '', $owner, $user['id'] ?? null, $body, null, 'studio-advisor');
    $handle = curl_init($url . '/functions/v1/studio-advisor');
    curl_setopt_array($handle, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 50,
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json', 'Authorization: Bearer ' . $key, 'x-vremix-owner: ' . $owner, 'x-vremix-user: ' . ($user['id'] ?? '')], $headers)]);
    $raw = curl_exec($handle); $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE); curl_close($handle);
    if ($status !== 200 || !is_string($raw)) throw new RuntimeException('AI tư vấn chưa trả lời được. Không tự gửi lại; gợi ý biên tập vẫn có sẵn.');
    $ai = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    $respond($advice + ['ai' => $ai]);
} catch (InvalidArgumentException | JsonException $error) { $respond(['error' => $error instanceof JsonException ? 'Dữ liệu tư vấn không hợp lệ.' : $error->getMessage()], 422);
} catch (Throwable $error) { $respond(['error' => $error instanceof RuntimeException ? $error->getMessage() : 'Tư vấn tạm thời chưa sẵn sàng. Bản phối vẫn được giữ.'], 503); }
