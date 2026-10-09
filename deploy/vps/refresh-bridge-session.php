<?php
declare(strict_types=1);
// Root-only helper; mount ONLY /etc/vremix at /run/vremix. Preserve all keys.
umask(0077);
try {
    if (PHP_SAPI !== 'cli' || posix_geteuid() !== 0) throw new RuntimeException();
    $raw = stream_get_contents(STDIN, 20001);
    if (strlen($raw) > 20000) throw new RuntimeException();
    $input = json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
    $names = ['GEMINI_WEB_SECURE_1PSID', 'GEMINI_WEB_SECURE_1PSIDTS'];
    if (!is_array($input) || count($input) !== 2) throw new RuntimeException();
    foreach ($names as $name) {
        if (!is_string($input[$name] ?? null) || $input[$name] === '' || strlen($input[$name]) > 8192 || preg_match('/[^\x21-\x7e]/', $input[$name])) throw new RuntimeException();
    }
    $path = '/run/vremix/bridge.env';
    if (!is_file($path) || is_link($path)) throw new RuntimeException();
    $stream = fopen($path, 'r+');
    if (!$stream || !flock($stream, LOCK_EX)) throw new RuntimeException();
    $original = stream_get_contents($stream);
    if (!preg_match('/^GEMINI_WEB_BRIDGE_SECRET=[a-f0-9]{64}$/m', $original)) throw new RuntimeException();
    $updated = preg_replace('/^GEMINI_WEB_SECURE_1PSID(?:TS)?=.*\R?/m', '', $original);
    foreach ($names as $name) $updated = rtrim($updated) . "\n" . $name . '=' . $input[$name] . "\n";
    // In-place write preserves the bind-mounted inode; no extra secret copies.
    rewind($stream);
    if (fwrite($stream, $updated) !== strlen($updated) || !ftruncate($stream, strlen($updated)) || !fflush($stream)) throw new RuntimeException();
    fclose($stream);
    if (!chmod($path, 0600) || !chown($path, 10002) || !chgrp($path, 10002)) throw new RuntimeException();
    echo "Bridge session refreshed; gateway and bridge keys unchanged.\n";
} catch (Throwable) {
    fwrite(STDERR, "Private session refresh failed; no values printed.\n");
    exit(1);
}
