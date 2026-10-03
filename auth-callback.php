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

try {
    if (!empty($_GET['error'])) {
        throw new RuntimeException((string) ($_GET['error_description'] ?? $_GET['error']));
    }
    $next = $auth->completeGoogleOAuth(
        (string) ($_GET['code'] ?? ''),
        (string) ($_GET['auth_state'] ?? '')
    );
    header('Location: ' . $next);
} catch (Throwable $error) {
    error_log('[V-Remix] Google OAuth callback: ' . $error->getMessage());
    header('Location: auth.php?error=oauth-failed');
}
exit;
