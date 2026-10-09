<?php
declare(strict_types=1);
// Run as UID 0 in a disposable PHP container with ONLY /etc/vremix mounted RW.
umask(0077);
try {
    $input = json_decode(stream_get_contents(STDIN, 32769), true, 32, JSON_THROW_ON_ERROR);
    if (!is_array($input)) throw new RuntimeException();
    foreach (['VREMIX_GATEWAY_SECRET', 'GEMINI_WEB_BRIDGE_SECRET'] as $name) {
        if (!preg_match('/^[a-f0-9]{64}$/D', $input[$name] ?? '')) throw new RuntimeException();
    }
    foreach (['GEMINI_WEB_SECURE_1PSID', 'GEMINI_WEB_SECURE_1PSIDTS'] as $name) {
        if (!is_string($input[$name] ?? null) || strlen($input[$name]) > 8192 || preg_match('/[^\x21-\x7e]/', $input[$name])) throw new RuntimeException();
    }
    if ($input['GEMINI_WEB_SECURE_1PSID'] === '') throw new RuntimeException();
    $base = '/run/vremix';
    $appPath = $base . '/app.env';
    if (!is_file($appPath) || is_link($appPath)) throw new RuntimeException();
    $app = preg_replace('/^VREMIX_GATEWAY_SECRET=.*\R?/m', '', file_get_contents($appPath));
    if (file_put_contents($appPath, rtrim($app) . "\nVREMIX_GATEWAY_SECRET=" . $input['VREMIX_GATEWAY_SECRET'] . "\n", LOCK_EX) === false) throw new RuntimeException();
    if (!chmod($appPath, 0600) || !chown($appPath, 10001) || !chgrp($appPath, 10001)) throw new RuntimeException();
    $bridge = [
        'GEMINI_WEB_SECURE_1PSID' => $input['GEMINI_WEB_SECURE_1PSID'],
        'GEMINI_WEB_SECURE_1PSIDTS' => $input['GEMINI_WEB_SECURE_1PSIDTS'],
        'GEMINI_WEB_BRIDGE_SECRET' => $input['GEMINI_WEB_BRIDGE_SECRET'],
        'GEMINI_WEB_BRIDGE_HOST' => '0.0.0.0', 'GEMINI_WEB_BRIDGE_PORT' => '8788',
        'GEMINI_WEB_AUTO_COOKIE_SYNC' => 'false', 'GEMINI_WEB_AUTO_REFRESH' => 'false',
        'GEMINI_WEB_TIMEOUT_SECONDS' => '120', 'GEMINI_WEB_GENERATION_TIMEOUT_SECONDS' => '85',
    ];
    $edge = [
        'VREMIX_GATEWAY_SECRET' => $input['VREMIX_GATEWAY_SECRET'],
        'GEMINI_WEB_BRIDGE_SECRET' => $input['GEMINI_WEB_BRIDGE_SECRET'],
        'GEMINI_WEB_BRIDGE_URL' => 'https://v-remix.vietnamsir.com/private-gemini',
    ];
    foreach (['bridge.env' => $bridge, 'edge-bridge.env' => $edge] as $file => $values) {
        $path = $base . '/' . $file;
        if (is_link($path)) throw new RuntimeException();
        $data = '';
        foreach ($values as $key => $value) $data .= $key . '=' . $value . "\n";
        if (file_put_contents($path, $data, LOCK_EX) === false) throw new RuntimeException();
        if (!chmod($path, 0600)) throw new RuntimeException();
        $uid = $file === 'bridge.env' ? 10002 : 0;
        if (!chown($path, $uid) || !chgrp($path, $uid)) throw new RuntimeException();
    }
    echo "Private bridge configuration installed; no credential values printed.\n";
} catch (Throwable) {
    fwrite(STDERR, "Private VPS configuration failed; no values are printed.\n");
    exit(1);
}
