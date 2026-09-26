<?php
declare(strict_types=1);

require __DIR__ . '/config/site.php';
require __DIR__ . '/src/Support/Env.php';
require __DIR__ . '/src/Infrastructure/SupabaseClient.php';
require __DIR__ . '/src/Repositories/SiteContentRepository.php';

use App\Infrastructure\SupabaseClient;
use App\Repositories\SiteContentRepository;
use App\Support\Env;

Env::load(__DIR__ . '/.env');
$database = require __DIR__ . '/config/database.php';

if (
    $database['url'] !== ''
    && $database['anon_key'] !== ''
    && extension_loaded('curl')
) {
    try {
        $content = (new SiteContentRepository(
            new SupabaseClient($database['url'], $database['anon_key']),
            $database['cache_file'],
            $database['cache_ttl']
        ))->getHomePage();

        if ($content !== null) {
            $site = array_replace($site, $content['site']);
            $branches = $content['branches'];
            if ($content['media_url'] !== '') {
                $mediaUrl = $content['media_url'];
            }
        }
    } catch (Throwable $error) {
        error_log('[V-Remix] Supabase bootstrap: ' . $error->getMessage());
    }
}

require __DIR__ . '/includes/partials/head.php';

ini_set('serialize_precision', '-1');
?>

<div class="stage" id="stage">
    <?php require __DIR__ . '/includes/partials/media.php'; ?>
    <?php require __DIR__ . '/includes/partials/hero.php'; ?>
    <?php require __DIR__ . '/includes/partials/controller.php'; ?>
    <?php require __DIR__ . '/includes/partials/header.php'; ?>
    <?php require __DIR__ . '/includes/partials/feedback.php'; ?>
</div>

<script>
window.VREMIX_CONFIG = <?= json_encode(
    ['branches' => $branches, 'ui' => $site['ui']],
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
) ?>;
</script>
<script src="assets/js/app.js" defer></script>
</body>
</html>
