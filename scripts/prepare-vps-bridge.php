<?php
declare(strict_types=1);
// Secret payload goes ONLY through an SSH stdin pipe, never tool output or Git.
umask(0077);
$root = dirname(__DIR__);
function envValues(string $path): array {
    $values = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$key, $value] = explode('=', $line, 2);
        $values[trim($key)] = trim(trim($value), "\"'");
    }
    return $values;
}
function updatePrivateEnv(string $path, array $updates): void {
    if (!is_file($path) || is_link($path)) throw new RuntimeException('Private environment file is unavailable.');
    $lines = file($path, FILE_IGNORE_NEW_LINES) ?: [];
    $output = [];
    foreach ($lines as $line) {
        $key = trim(explode('=', $line, 2)[0]);
        if (array_key_exists($key, $updates)) continue;
        $output[] = $line;
    }
    foreach ($updates as $key => $value) $output[] = $key . '=' . $value;
    if (file_put_contents($path, implode("\n", $output) . "\n", LOCK_EX) === false) throw new RuntimeException('Private configuration write failed.');
    chmod($path, 0600);
}
try {
    $cookies = envValues($root . '/services/gemini-webapi-bridge/.env');
    if (empty($cookies['GEMINI_WEB_SECURE_1PSID'])) throw new RuntimeException('Bridge session missing.');
    $privatePath = $root . '/.env.bridge-vps';
    if (is_link($privatePath)) throw new RuntimeException('Invalid private configuration path.');
    if (!is_file($privatePath)) {
        $stream = fopen($privatePath, 'x');
        if (!$stream) throw new RuntimeException('Cannot prepare private deployment keys.');
        fwrite($stream, 'VREMIX_GATEWAY_SECRET=' . bin2hex(random_bytes(32)) . "\nGEMINI_WEB_BRIDGE_SECRET=" . bin2hex(random_bytes(32)) . "\n");
        fclose($stream);
    }
    chmod($privatePath, 0600);
    $keys = envValues($privatePath);
    foreach (['VREMIX_GATEWAY_SECRET', 'GEMINI_WEB_BRIDGE_SECRET'] as $key) {
        if (!preg_match('/^[a-f0-9]{64}$/D', $keys[$key] ?? '')) throw new RuntimeException('Invalid deployment keys.');
    }
    foreach ([$root . '/.env', '/Applications/XAMPP/xamppfiles/htdocs/aiarenavietnam2026/.env'] as $path) {
        updatePrivateEnv($path, ['VREMIX_GATEWAY_SECRET' => $keys['VREMIX_GATEWAY_SECRET']]);
    }
    echo json_encode([
        'VREMIX_GATEWAY_SECRET' => $keys['VREMIX_GATEWAY_SECRET'],
        'GEMINI_WEB_BRIDGE_SECRET' => $keys['GEMINI_WEB_BRIDGE_SECRET'],
        'GEMINI_WEB_SECURE_1PSID' => $cookies['GEMINI_WEB_SECURE_1PSID'],
        'GEMINI_WEB_SECURE_1PSIDTS' => $cookies['GEMINI_WEB_SECURE_1PSIDTS'] ?? '',
    ], JSON_THROW_ON_ERROR);
} catch (Throwable) {
    fwrite(STDERR, "Private bridge preparation failed; no values are printed.\n");
    exit(1);
}
