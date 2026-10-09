<?php
declare(strict_types=1);
// Root-only, server-to-server configuration. No Google cookies copied to PHP.
// Run in a disposable container with /etc/vremix mounted at /run/vremix RW.
require dirname(__DIR__, 2) . '/src/Support/Env.php';
umask(0077);
try {
    App\Support\Env::load('/run/vremix/edge-bridge.env');
    $url = (string) getenv('GEMINI_WEB_BRIDGE_URL');
    $secret = (string) getenv('GEMINI_WEB_BRIDGE_SECRET');
    if ($url !== 'https://v-remix.vietnamsir.com/private-gemini' || preg_match('/^[a-f0-9]{64}$/D', $secret) !== 1) throw new RuntimeException();
    $file = '/run/vremix/catalog-research.env';
    if (is_link($file)) throw new RuntimeException();
    $content = 'VREMIX_CATALOG_BRIDGE_URL=' . $url . "\nVREMIX_CATALOG_BRIDGE_SECRET=" . $secret . "\n";
    if (file_put_contents($file, $content, LOCK_EX) === false || !chmod($file, 0600) || !chown($file, 10001) || !chgrp($file, 10001)) throw new RuntimeException();
    echo "Admin catalog research connection configured privately. No provider called, no credentials printed.\n";
} catch (Throwable) {
    fwrite(STDERR, "Catalog research configuration failed; no values printed.\n"); exit(1);
}
