<?php
declare(strict_types=1);
// Read-only CLI diagnosis; no prompts, account IDs, raw errors or secrets in output.
if (PHP_SAPI !== 'cli' || ($argv[1] ?? '') !== '--live') exit("CLI --live only. No generation requests.\n");
$root = $argv[2] ?? dirname(__DIR__, 2);
require $root . '/src/Support/Env.php';
App\Support\Env::load($root . '/.env');
$url = rtrim((string) getenv('SUPABASE_URL'), '/') . '/rest/v1/generation_jobs?select=status,error_message,provider,created_at&order=created_at.desc&limit=10';
$key = (string) getenv('SUPABASE_SERVICE_ROLE_KEY');
if (!$key) exit("Diagnostic configuration unavailable.\n");
$h = curl_init($url);
curl_setopt_array($h, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 25,
    CURLOPT_HTTPHEADER => ['apikey: ' . $key, 'Authorization: Bearer ' . $key]]);
$raw = curl_exec($h); $code = curl_getinfo($h, CURLINFO_RESPONSE_CODE); curl_close($h);
if ($code !== 200) exit('Diagnostic read failed: HTTP ' . $code . ".\n");
foreach (json_decode((string) $raw, true) ?: [] as $row) {
    $message = (string) ($row['error_message'] ?? '');
    $category = 'none';
    foreach (['bridge' => '/bridge/i', 'quota' => '/quota|resource_exhausted|billing/i',
        'session' => '/unauthenticated|expired|session/i', 'timeout' => '/timeout|timed out/i',
        'storage' => '/storage|upload/i', 'gateway' => '/signature|gateway/i'] as $name => $pattern) {
        if (preg_match($pattern, $message)) $category = $name;
    }
    preg_match('/\bHTTP\s+(\d{3})\b/i', $message, $http);
    $status = in_array($row['status'], ['queued', 'running', 'completed', 'failed'], true) ? $row['status'] : 'other';
    echo json_encode(['created_at' => $row['created_at'], 'status' => $status,
        'error_category' => $message === '' ? 'none' : ($category === 'none' ? 'other' : $category),
        'provider_http' => $http[1] ?? null], JSON_UNESCAPED_SLASHES) . "\n";
}
