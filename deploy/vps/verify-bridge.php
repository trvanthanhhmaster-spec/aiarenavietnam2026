<?php
declare(strict_types=1);
// Readiness only: no generation requests, prompts, uploads or account records.
if (($argv[1] ?? '') !== '--live') exit("Use --live for authenticated readiness checks (no AI generation).\n");
require dirname(__DIR__, 2) . '/src/Support/Env.php';
require dirname(__DIR__, 2) . '/src/Support/EdgeGateway.php';
App\Support\Env::load('/run/vremix/app.env');
App\Support\Env::load('/run/vremix/edge-bridge.env');
function checkRequest(string $url, string $method, array $headers, ?string $body, int $expected): array {
    $h = curl_init($url);
    curl_setopt_array($h, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 25]);
    if ($body !== null) curl_setopt($h, CURLOPT_POSTFIELDS, $body);
    $raw = curl_exec($h); $code = (int) curl_getinfo($h, CURLINFO_RESPONSE_CODE); curl_close($h);
    if ($code !== $expected) throw new RuntimeException('Readiness HTTP mismatch: expected ' . $expected . ', received ' . $code . '.');
    return json_decode((string) $raw, true, 32, JSON_THROW_ON_ERROR);
}
try {
    $bridge = (string) getenv('GEMINI_WEB_BRIDGE_URL');
    $bridgeKey = (string) getenv('GEMINI_WEB_BRIDGE_SECRET');
    if (!$bridge || strlen($bridgeKey) < 32) throw new RuntimeException('Missing private bridge configuration.');
    checkRequest($bridge . '/health', 'GET', [], null, 401);
    $health = checkRequest($bridge . '/health', 'GET', ['x-vremix-bridge-secret: ' . $bridgeKey], null, 200);
    if (($health['authenticated'] ?? false) !== true) throw new RuntimeException('Bridge session is not ready.');
    echo "Bridge HTTPS: unauthenticated calls rejected; Google session readiness verified. No image called.\n";
    $edge = rtrim((string) getenv('SUPABASE_URL'), '/') . '/functions/v1/generate-look';
    $key = (string) getenv('VREMIX_GATEWAY_SECRET');
    $owner = hash('sha256', 'vremix-readiness-no-generation');
    $query = '?jobId=00000000-0000-4000-8000-000000000000';
    $base = ['Content-Type: application/json', 'Authorization: Bearer ' . getenv('SUPABASE_SERVICE_ROLE_KEY'), 'x-vremix-owner: ' . $owner];
    checkRequest($edge . $query, 'GET', $base, null, 403);
    $signed = App\Support\EdgeGateway::headers($key, 'GET', $query, $owner, null, null);
    $result = checkRequest($edge . $query, 'GET', array_merge($base, $signed), null, 404);
    if (($result['error'] ?? '') !== 'Job not found.') throw new RuntimeException('Unexpected Edge readiness response.');
    checkRequest($edge . $query . '&tampered=1', 'GET', array_merge($base, $signed), null, 403);
    $body = '{}';
    $signed = App\Support\EdgeGateway::headers($key, 'POST', '', $owner, null, $body);
    checkRequest($edge, 'POST', array_merge($base, $signed), $body, 400);
    echo "Edge gateway: signed read reached database; missing/tampered signatures rejected; invalid POST rejected before job creation.\n";
} catch (Throwable $error) {
    // The helper only creates generic diagnostics, never raw transport bodies.
    fwrite(STDERR, $error instanceof RuntimeException ? $error->getMessage() . "\n" : "Readiness failed.\n");
    exit(1);
}
