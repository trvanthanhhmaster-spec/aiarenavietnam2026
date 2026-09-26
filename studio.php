<?php
declare(strict_types=1);

require __DIR__ . '/src/Support/Env.php';
require __DIR__ . '/src/Infrastructure/SupabaseClient.php';
require __DIR__ . '/src/Repositories/SiteContentRepository.php';
require __DIR__ . '/src/Repositories/StudioRepository.php';

use App\Infrastructure\SupabaseClient;
use App\Repositories\SiteContentRepository;
use App\Repositories\StudioRepository;
use App\Support\Env;

Env::load(__DIR__ . '/.env');
$database = require __DIR__ . '/config/database.php';
$site = null;
$catalog = null;

try {
    if ($database['url'] === '' || $database['anon_key'] === '' || !extension_loaded('curl')) {
        throw new RuntimeException('Supabase configuration is unavailable.');
    }

    $client = new SupabaseClient($database['url'], $database['anon_key']);
    $content = (new SiteContentRepository(
        $client,
        $database['cache_file'],
        $database['cache_ttl'],
        $database['site_slug']
    ))->getHomePage();
    $catalog = (new StudioRepository($client))->getCatalog();
    $site = $content['site'] ?? null;
} catch (Throwable $error) {
    error_log('[V-Remix] Studio bootstrap: ' . $error->getMessage());
}

if (!is_array($site) || !is_array($catalog)) {
    http_response_code(503);
    exit('Studio unavailable.');
}

$escape = static fn (mixed $value): string => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
?>
<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>Studio — <?= $escape($site['title'] ?? 'V-Remix') ?></title>
    <meta name="description" content="Studio phối Việt phục V-Remix theo sự kiện, phục trang và phong cách cá nhân.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Lora:ital,wght@0,500;1,500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/app.css">
    <link rel="stylesheet" href="assets/css/studio.css">
</head>
<body class="studio-page">
    <main class="studio-shell">
        <header class="studio-header">
            <a class="studio-brand" href="index.php#stage" aria-label="<?= $escape($site['ui']['brand_aria_label'] ?? 'Trang chủ V-Remix') ?>">
                <?php $brandWordmarkClass = 'studio-brand__mark'; require __DIR__ . '/includes/components/brand-wordmark.php'; unset($brandWordmarkClass); ?>
            </a>
            <a class="studio-back" href="index.php#stage">Quay lại trải nghiệm</a>
        </header>

        <section class="studio-intro" aria-labelledby="studioTitle">
            <p class="eyebrow">V-Remix / Studio tùy biến</p>
            <h1 id="studioTitle">Phối một dáng Việt<br><em>theo cách của bạn.</em></h1>
            <p>Chọn bối cảnh, cổ phục và một điểm nhấn hiện đại. Studio sẽ chuẩn bị một hướng phối có ngữ cảnh, câu chuyện và cảnh báo văn hóa rõ ràng.</p>
        </section>

        <form class="studio-form" id="studioForm">
            <section class="studio-step" aria-labelledby="eventHeading">
                <div class="step-heading"><span>01</span><h2 id="eventHeading">Bạn mặc đi đâu?</h2></div>
                <div class="choice-grid choice-grid--events">
                    <?php foreach ($catalog['events'] as $index => $event): ?>
                        <label class="choice-card">
                            <input type="radio" name="event" value="<?= $escape($event['slug'] ?? '') ?>" <?= $index === 0 ? 'checked' : '' ?>>
                            <span class="choice-card__body"><strong><?= $escape($event['label'] ?? '') ?></strong><small><?= $escape($event['description'] ?? '') ?></small></span>
                        </label>
                    <?php endforeach; ?>
                </div>
            </section>

            <section class="studio-step" aria-labelledby="garmentHeading">
                <div class="step-heading"><span>02</span><h2 id="garmentHeading">Chọn một nhóm cổ phục</h2></div>
                <div class="choice-grid choice-grid--garments">
                    <?php foreach ($catalog['garments'] as $index => $garment): ?>
                        <label class="choice-card choice-card--garment">
                            <input type="radio" name="garment" value="<?= $escape($garment['slug'] ?? '') ?>" <?= $index === 0 ? 'checked' : '' ?>>
                            <span class="choice-card__body">
                                <strong><?= $escape($garment['name'] ?? '') ?></strong>
                                <small><?= $escape($garment['category'] ?? '') ?> · <?= $escape($garment['description'] ?? '') ?></small>
                                <em><?= $escape($garment['origin_note'] ?? '') ?></em>
                            </span>
                        </label>
                    <?php endforeach; ?>
                </div>
            </section>

            <section class="studio-step" aria-labelledby="detailHeading">
                <div class="step-heading"><span>03</span><h2 id="detailHeading">Thêm điểm nhấn</h2></div>
                <div class="studio-detail-grid">
                    <fieldset>
                        <legend>Màu chủ đạo</legend>
                        <div class="swatch-list">
                            <?php foreach ($catalog['colors'] as $index => $color): ?>
                                <label class="swatch-choice">
                                    <input type="radio" name="color" value="<?= $escape($color['slug'] ?? '') ?>" <?= $index === 0 ? 'checked' : '' ?>>
                                    <span style="--swatch:<?= $escape($color['value'] ?? '#243652') ?>"></span>
                                    <small><?= $escape($color['label'] ?? '') ?></small>
                                </label>
                            <?php endforeach; ?>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>Phong cách</legend>
                        <div class="select-list">
                            <?php foreach ($catalog['styles'] as $index => $style): ?>
                                <label class="select-choice">
                                    <input type="radio" name="style" value="<?= $escape($style['slug'] ?? '') ?>" <?= $index === 0 ? 'checked' : '' ?>>
                                    <span><?= $escape($style['label'] ?? '') ?></span>
                                </label>
                            <?php endforeach; ?>
                        </div>
                    </fieldset>
                </div>
                <fieldset>
                    <legend>Phụ kiện hiện đại</legend>
                    <div class="accessory-grid">
                        <?php foreach ($catalog['accessories'] as $accessory): ?>
                            <label class="accessory-choice">
                                <input type="checkbox" name="accessories[]" value="<?= $escape($accessory['slug'] ?? '') ?>">
                                <span><strong><?= $escape($accessory['name'] ?? '') ?></strong><small><?= $escape($accessory['description'] ?? '') ?></small></span>
                            </label>
                        <?php endforeach; ?>
                    </div>
                </fieldset>
                <label class="upload-choice" for="inputImage">
                    <span><strong>Thử trên ảnh của bạn</strong><small>JPG, PNG hoặc WebP · tối đa 8 MB · ảnh chỉ được gửi khi bạn bấm chuẩn bị bản phối.</small></span>
                    <input id="inputImage" type="file" accept="image/jpeg,image/png,image/webp">
                </label>
            </section>

            <section class="studio-submit">
                <div><p class="eyebrow">Bản phối đầu tiên</p><p id="selectionSummary">Chọn các thành phần để chuẩn bị bản phối.</p></div>
                <button type="submit" class="studio-cta">Chuẩn bị bản phối <span>→</span></button>
            </section>
        </form>

        <section class="studio-result" id="studioResult" aria-live="polite" hidden>
            <div class="result-placeholder"><span class="result-placeholder__orb"></span><p>Studio đã ghi nhận lựa chọn. Lớp sinh ảnh Gemini sẽ được nối vào job nền ở bước tiếp theo.</p></div>
            <div class="result-cards">
                <article><span>Story Card</span><h2 id="resultGarment">—</h2><p id="resultStory">—</p></article>
                <article><span>Cultural Guardrail</span><h2>Giữ đúng tinh thần phục trang</h2><p id="resultGuardrail">—</p></article>
            </div>
        </section>
    </main>
    <script>
        window.VREMIX_STUDIO = <?= json_encode(
            $catalog + ['generationEndpoint' => rtrim($database['url'], '/') . '/functions/v1/generate-look'],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
        ) ?>;
    </script>
    <script src="assets/js/studio.js" defer></script>
</body>
</html>
