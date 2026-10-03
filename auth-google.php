<?php
declare(strict_types=1);

require __DIR__ . '/src/Support/Env.php';
require __DIR__ . '/src/Support/SupabaseAuth.php';

use App\Support\Env;
use App\Support\SupabaseAuth;

Env::load(__DIR__ . '/.env');
$auth = new SupabaseAuth(
    (string) getenv('SUPABASE_URL'),
    (string) getenv('SUPABASE_ANON_KEY'),
    (string) getenv('SUPABASE_SERVICE_ROLE_KEY')
);
$auth->boot();
$next = SupabaseAuth::safeNext((string) ($_GET['next'] ?? 'studio.php'));
$scheme = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http';
$host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
$basePath = rtrim(str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/'))), '/');
$callbackUrl = $scheme . '://' . $host . $basePath . '/auth-callback.php';

try {
    header('Location: ' . $auth->beginGoogleOAuth($callbackUrl, $next));
} catch (Throwable) {
    header('Location: auth.php?error=google-disabled&next=' . rawurlencode($next));
}
exit;
