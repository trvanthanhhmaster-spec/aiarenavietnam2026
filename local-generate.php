<?php
declare(strict_types=1);

require __DIR__ . '/src/Support/Env.php';

use App\Support\Env;

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
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $respond(['error' => 'Method not allowed.'], 405);
}

Env::load(__DIR__ . '/.env');
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
    if (!preg_match('/^[0-9a-f-]{36}$/i', $requestId)) {
        $respond(['error' => 'clientRequestId must be a UUID.'], 400);
    }
    $aspectRatio = (string) ($input['aspectRatio'] ?? '16:9');
    $resolution = (string) ($input['targetResolution'] ?? '1080');
    if (!in_array($aspectRatio, ['16:9', '1:1', '9:16'], true)
        || !in_array($resolution, ['720', '1080', '2160'], true)) {
        $respond(['error' => 'Invalid image dimensions.'], 422);
    }
    $mode = (string) ($input['generationMode'] ?? 'text-to-image');
    $inputImage = is_array($input['inputImage'] ?? null) ? $input['inputImage'] : null;
    if ($mode === 'image-to-image' && $inputImage === null) {
        $respond(['error' => 'Image-to-image mode requires a source image.'], 422);
    }

    $selection = [
        'event' => (string) ($input['eventSlug'] ?? ''),
        'garment' => (string) ($input['garmentSlug'] ?? ''),
        'color' => (string) ($input['colorSlug'] ?? ''),
        'style' => (string) ($input['styleSlug'] ?? ''),
        'accessories' => array_values(array_filter((array) ($input['accessorySlugs'] ?? []), 'is_string')),
    ];
    $basePrompt = sprintf(
        'Generate a premium editorial Vietnamese fashion photograph. Event/context: %s. Garment: %s. Color: %s. Style/lighting: %s. Accessories: %s. One centered subject, culturally accurate construction, stable full-body pose and camera composition.',
        $selection['event'],
        $selection['garment'],
        $selection['color'],
        $selection['style'],
        $selection['accessories'] === [] ? 'none' : implode(', ', $selection['accessories'])
    );
    $scopes = [
        'A' => 'Create and lock the source frame: subject identity, face, pose, camera angle, position, scale and composition.',
        'B' => 'Change only the background and event context. Preserve frame A subject, garment, camera, position and scale.',
        'C' => 'Change only lighting and time of day. Preserve frame A background, subject, garment, camera and composition.',
        'D' => 'Change only the clothing and garment styling. Preserve frame A identity, face, pose, camera and composition.',
        'E' => 'Change only the subject identity. Preserve frame A position, scale, pose, background, camera and garment composition.',
    ];

    $callBridge = static function (array $payload) use ($bridgeUrl, $bridgeSecret): array {
        $handle = curl_init($bridgeUrl . '/v1/images/generate');
        if ($handle === false) {
            throw new RuntimeException('Unable to initialize Gemini Web bridge request.');
        }
        curl_setopt_array($handle, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 180,
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
    $sourceImage = $inputImage;
    foreach ($scopes as $key => $scope) {
        $image = $callBridge([
            'prompt' => $basePrompt . "\nFrame " . $key . ': ' . $scope,
            'sourceImage' => $sourceImage,
            'aspectRatio' => $aspectRatio,
            'targetResolution' => $resolution,
            'changeScope' => $scope,
        ]);
        $mimeType = (string) ($image['mimeType'] ?? 'image/png');
        $frames[] = [
            'key' => $key,
            'path' => 'local/' . $requestId . '/' . strtolower($key),
            'url' => 'data:' . $mimeType . ';base64,' . (string) $image['data'],
            'mimeType' => $mimeType,
            'index' => count($frames) + 1,
        ];
        if ($key === 'A') {
            $sourceImage = ['mimeType' => $mimeType, 'data' => (string) $image['data']];
        }
    }

    $output = [
        'generationType' => (string) ($input['generationType'] ?? 'image'),
        'provider' => 'gemini-webapi-local',
        'story' => 'Bộ ảnh được tạo từ một frame A cố định và bốn phép biến đổi có kiểm soát.',
        'guardrail' => 'Giữ cấu trúc nhận diện của Việt phục và chỉ thay đúng phạm vi của từng frame.',
        'genZTip' => 'Dùng một điểm nhấn hiện đại để trang phục truyền thống vẫn là trung tâm.',
        'imageSource' => 'gemini-webapi',
        'imageUrl' => $frames[0]['url'] ?? null,
        'lookbook' => ['aspectRatio' => $aspectRatio, 'items' => $frames],
    ];
    if (in_array($output['generationType'], ['video', 'both'], true)) {
        $output['videoStatus'] = 'failed';
        $output['videoError'] = 'Local Gemini Web provider currently generates the A-E image set; video remains on the configured Veo provider.';
    }
    $respond([
        'jobId' => 'local-' . $requestId,
        'requestId' => $requestId,
        'status' => 'completed',
        'output' => $output,
        'usage' => ['imageCount' => count($frames), 'videoCount' => 0],
        'estimatedCostVnd' => 0,
    ]);
} catch (Throwable $error) {
    error_log('[V-Remix] Local Gemini Web generation: ' . $error->getMessage());
    $respond(['status' => 'failed', 'error' => $error->getMessage()], 502);
}
