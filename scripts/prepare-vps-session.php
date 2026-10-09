<?php
declare(strict_types=1);
// Private payload: pipe directly to SSH stdin; never run to a terminal/log.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
try {
    $path = dirname(__DIR__) . '/services/gemini-webapi-bridge/.env';
    $values = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
        if (!str_contains($line, '=') || str_starts_with(trim($line), '#')) continue;
        [$key, $value] = explode('=', $line, 2);
        if (in_array(trim($key), ['GEMINI_WEB_SECURE_1PSID', 'GEMINI_WEB_SECURE_1PSIDTS'], true)) {
            $values[trim($key)] = trim(trim($value), "\"'");
        }
    }
    if (empty($values['GEMINI_WEB_SECURE_1PSID']) || empty($values['GEMINI_WEB_SECURE_1PSIDTS'])) throw new RuntimeException();
    echo json_encode($values, JSON_THROW_ON_ERROR);
} catch (Throwable) {
    fwrite(STDERR, "Private session preparation failed; no values printed.\n");
    exit(1);
}
