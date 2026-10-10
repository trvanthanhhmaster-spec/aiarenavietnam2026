<?php
declare(strict_types=1);
// Costs ONE image. Explicit authorization per run; no faces/collections/retries.
if (PHP_SAPI !== 'cli' || !in_array('--live', $argv, true) || !in_array('--allow-one-image', $argv, true)) exit("Owner authorization required: --live --allow-one-image.\n");
$base = 'https://v-remix.vietnamsir.com';
$h = curl_init();
curl_setopt_array($h, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 110, CURLOPT_COOKIEFILE => '']);
$destination = null;
$evidence = [];
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
    $variant = null;
    foreach ($config['garmentVariants'] ?? [] as $item) if ($item['garment_id'] === $garment['id']) { $variant = $item; break; }
    if (!$variant) throw new RuntimeException('Approved concrete sample unavailable.');
    $uuid = bin2hex(random_bytes(16));
    $uuid = substr($uuid, 0, 8) . '-' . substr($uuid, 8, 4) . '-4' . substr($uuid, 13, 3) . '-8' . substr($uuid, 17, 3) . '-' . substr($uuid, 20);
    $payload = ['clientRequestId' => $uuid, 'eventSlug' => 'custom', 'generationType' => 'image',
        'planning' => ['version' => 1, 'count' => 1, 'shared' => false, 'customOccasion' => 'Kiểm thử kỹ thuật tạo ảnh',
            'occasionNote' => 'One fictional adult wearing áo tấc in a courtyard. Technical QA only. No real person likeness.',
            'period' => ['kind' => 'unspecified', 'start' => '', 'end' => ''],
            'people' => [['id' => 1, 'name' => '', 'gender' => '', 'faceSupplied' => false,
                'outfit' => ['garment' => $garment['slug'], 'garmentVariant' => $variant['slug'], 'accessories' => []]]]]];
    if (in_array('--save-artifacts', $argv, true)) {
        $destination = dirname(__DIR__) . '/artifacts/reference-generation-qa/' . $uuid;
        if (!mkdir($destination, 0700, true)) throw new RuntimeException('Unable to create private test evidence. No image submitted.');
        $evidence = ['status' => 'submitting', 'requestId' => $uuid, 'startedAtUtc' => gmdate('c'),
            'maxImageRequests' => 1, 'maxReviewRequests' => 1, 'facesUploaded' => 0, 'collectionChanges' => 0];
        if (file_put_contents($destination . '/evidence.json', json_encode($evidence, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR)) === false)
            throw new RuntimeException('Unable to save request evidence. No image submitted.');
    }
    echo "Submitting ONE authorized image through public Studio gateway; no faces or collections. Request: " . $uuid . "\n";
    [$status, $raw] = onceRequest($h, $base . '/generation-edge.php', $payload, $config['lookCsrf']);
    $job = json_decode($raw, true) ?: [];
    // Recover interrupted responses by request-ID GET, never another POST.
    $acceptedHttp = $status;
    for ($i = 0; $i < 40 && !in_array($job['status'] ?? '', ['completed', 'failed'], true); $i++) {
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
    if (($output['garmentReferences']['status'] ?? '') !== 'attached' || count($output['garmentReferences']['items'] ?? []) !== 1) throw new RuntimeException('Real garment sample was not attached.');
    if (($output['copyPolicy'] ?? '') !== 'selected-catalog-only' || !str_contains($output['story'] ?? '', 'không thêm phụ kiện')) throw new RuntimeException('Selected-only copy contract failed.');
    $evidence = array_merge($evidence, ['status' => 'completed', 'requestId' => $uuid, 'jobId' => $job['jobId'], 'imageCount' => 1,
        'acceptedHttp' => $acceptedHttp, 'promptPolicy' => $output['promptPolicy'] ?? 'legacy',
        'narrativeSource' => $output['narrativeSource'] ?? null,
        'width' => $size[0], 'height' => $size[1], 'storageHttp' => $assetStatus,
        'facesUploaded' => 0, 'collectionChanges' => 0, 'garmentReferences'=>'attached', 'referenceCount'=>1,
        'reviewStatus'=>$output['reviewStatus'] ?? 'unavailable', 'assessment'=>$output['imageAssessment'] ?? null,
        'culturalScore'=>$output['culturalScore'] ?? null, 'copyPolicy'=>$output['copyPolicy']]);
    if ($destination !== null) {
        file_put_contents($destination.'/generated-image.png', $bytes);
        file_put_contents($destination.'/evidence.json', json_encode($evidence,JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
    }
    echo json_encode($evidence, JSON_THROW_ON_ERROR) . "\n";
} catch (Throwable $error) {
    if ($destination !== null && $evidence) {
        $evidence['status'] = 'test-failed';
        $evidence['jobId'] = $job['jobId'] ?? null;
        $evidence['jobStatus'] = $job['status'] ?? null;
        $evidence['httpStatus'] = $status ?? null;
        preg_match('/\bPROVIDER_[A-Z_]+\b/', (string) ($job['error'] ?? ''), $failure);
        $evidence['providerCode'] = $failure[0] ?? null;
        $evidence['finishedAtUtc'] = gmdate('c');
        file_put_contents($destination . '/evidence.json', json_encode($evidence, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
    }
    fwrite(STDERR, $error instanceof RuntimeException ? $error->getMessage() . "\n" : "One-image check failed; no private response printed.\n"); exit(1);
} finally { curl_close($h); }
