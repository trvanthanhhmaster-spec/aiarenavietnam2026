<?php
declare(strict_types=1);

require __DIR__ . '/config/site.php';
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
    ['branches' => $branches],
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
) ?>;
</script>
<script src="assets/js/app.js" defer></script>
</body>
</html>
