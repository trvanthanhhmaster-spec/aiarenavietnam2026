<?php
declare(strict_types=1);
// Costs ONE image. Explicit authorization per run; no faces/collections/retries.
if (PHP_SAPI !== 'cli' || !in_array('--live', $argv, true) || !in_array('--allow-one-image', $argv, true)) exit("Owner authorization required: --live --allow-one-image.\n");
$base = 'https://v-remix.vietnamsir.com';
$h = curl_init();
curl_setopt_array($h, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 110, CURLOPT_COOKIEFILE => '']);
function onceRequest($h, string $url, ?array $payload = null, string $csrf = ''): array {
    curl_setopt_array($h, [CURLOPT_URL => $url, CURLOPT_CUSTOMREQUEST => $payload === null ? 'GET' : 'POST',
        CURLOPT_POSTFIELDS => $payload === null ? null : json_encode($payload, JSON_THROW_ON_ERROR),
        CURLOPT_HTTPHEADER => $csrf === '' ? [] : ['Content-Type: application/json', 'X-VRemix-CSRF: ' . $csrf]]);
    $raw = curl_exec($h);
    return [(int) curl_getinfo($h, CURLINFO_RESPONSE_CODE), is_string($raw) ? $raw : ''];
}
try {
    [$status, $html] = onceRequest($h, $base . '/studio.php');
    preg_match('/window.VREMIX_STUDIO = (\{.*?\});/s', $html, $match);
    $config = json_decode($match[1] ?? '', true, 512, JSON_THROW_ON_ERROR);
    if ($status !== 200 || empty($config['lookCsrf']) || !empty($config['auth']['authenticated']) || ($config['generationEndpoint'] ?? '') !== 'generation-edge.php') throw new RuntimeException('Anonymous production bootstrap failed.');
    $garment = null;
    foreach ($config['garments'] ?? [] as $item) if ($item['slug'] === 'ao-tac') $garment = $item;
    if (!$garment) throw new RuntimeException('Approved test garment unavailable.');
    $uuid = bin2hex(random_bytes(16));
    $uuid = substr($uuid, 0, 8) . '-' . substr($uuid, 8, 4) . '-4' . substr($uuid, 13, 3) . '-8' . substr($uuid, 17, 3) . '-' . substr($uuid, 20);
    $payload = ['clientRequestId' => $uuid, 'eventSlug' => 'custom', 'generationType' => 'image',
        'planning' => ['version' => 1, 'count' => 1, 'shared' => false, 'customOccasion' => 'Kiểm thử kỹ thuật tạo ảnh',
            'occasionNote' => 'One fictional adult wearing áo tấc in a courtyard. Technical QA only. No real person likeness.',
            'period' => ['kind' => 'unspecified', 'start' => '', 'end' => ''],
            'people' => [['id' => 1, 'name' => '', 'gender' => '', 'faceSupplied' => false,
                'outfit' => ['garment' => $garment['slug'], 'garmentVariant' => '', 'accessories' => []]]]]];
    echo "Submitting ONE authorized image through public Studio gateway; no faces or collections.\n";
    [$status, $raw] = onceRequest($h, $base . '/generation-edge.php', $payload, $config['lookCsrf']);
    $job = json_decode($raw, true) ?: [];
    // Recover interrupted responses by request-ID GET, never another POST.
    for ($i = 0; $i < 12 && !in_array($job['status'] ?? '', ['completed', 'failed'], true); $i++) {
        [$status, $raw] = onceRequest($h, $base . '/generation-edge.php?requestId=' . $uuid, null, $config['lookCsrf']);
        $job = json_decode($raw, true) ?: [];
        if (!in_array($job['status'] ?? '', ['completed', 'failed'], true)) { echo "Waiting on same request (GET only).\n"; sleep(5); }
    }
    if (($job['status'] ?? '') !== 'completed') {
        preg_match('/\bPROVIDER_[A-Z_]+\b/', (string) ($job['error'] ?? ''), $category);
        throw new RuntimeException('One-image test did not complete: HTTP ' . $status . '; ' . ($category[0] ?? 'unclassified') . '. No resubmission.');
    }
    $output = $job['output'] ?? []; $items = $output['lookbook']['items'] ?? [];
    if (($output['imageSource'] ?? '') !== 'gemini' || count($items) !== 1 || ($job['usage']['imageCount'] ?? 0) !== 1) throw new RuntimeException('Expected one real generated image, not catalog fallback.');
    $imageUrl = $items[0]['url'] ?? '';
    if (!str_starts_with($imageUrl, 'https://') || !str_ends_with((string) parse_url($imageUrl, PHP_URL_HOST), '.supabase.co')) throw new RuntimeException('Unexpected generated storage URL.');
    // Do not send application cookies or CSRF to storage.
    $asset = curl_init($imageUrl);
    curl_setopt_array($asset, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 25]);
    $bytes = curl_exec($asset); $assetStatus = curl_getinfo($asset, CURLINFO_RESPONSE_CODE); curl_close($asset);
    $size = is_string($bytes) ? @getimagesizefromstring($bytes) : false;
    if ($assetStatus !== 200 || !$size || $size[0] < 256 || $size[1] < 256) throw new RuntimeException('Generated storage image could not be decoded.');
    echo json_encode(['status' => 'completed', 'jobId' => $job['jobId'], 'imageCount' => 1,
        'width' => $size[0], 'height' => $size[1], 'storageHttp' => $assetStatus,
        'facesUploaded' => 0, 'collectionChanges' => 0], JSON_THROW_ON_ERROR) . "\n";
} catch (Throwable $error) {
    fwrite(STDERR, $error instanceof RuntimeException ? $error->getMessage() . "\n" : "One-image check failed; no private response printed.\n"); exit(1);
} finally { curl_close($h); }
