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
$branches = [];

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
    $branches = $content['branches'] ?? [];
} catch (Throwable $error) {
    error_log('[V-Remix] Studio bootstrap: ' . $error->getMessage());
}

if (!is_array($site) || !is_array($catalog) || !is_array($branches)) {
    http_response_code(503);
    exit('Studio unavailable.');
}

$escape = static fn (mixed $value): string => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
$baseBranch = null;
foreach ($branches as $branch) {
    if (!empty($branch['isBase'])) {
        $baseBranch = $branch;
        break;
    }
}
$baseMedia = (string) (($baseBranch ?? reset($branches))['forwardUrl'] ?? '');
$studioData = $catalog + [
    'generationEndpoint' => rtrim($database['url'], '/') . '/functions/v1/generate-look',
    'baseMedia' => $baseMedia,
];
?>
<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#10252d">
    <title>Studio — <?= $escape($site['title'] ?? 'V-Remix') ?></title>
    <meta name="description" content="Studio phối Việt phục V-Remix theo bối cảnh, dáng áo và điểm nhấn cá nhân.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&family=Space+Grotesk:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/app.css">
    <link rel="stylesheet" href="assets/css/studio.css">
</head>
<body class="studio-page">
    <main class="studio-experience" id="studioExperience" aria-busy="false">
        <header class="studio-masthead">
            <a class="studio-brand" href="index.php#stage" aria-label="<?= $escape($site['ui']['brand_aria_label'] ?? 'Trang chủ V-Remix') ?>">
                <?php $brandWordmarkClass = 'studio-brand__mark'; require __DIR__ . '/includes/components/brand-wordmark.php'; unset($brandWordmarkClass); ?>
            </a>
            <span class="studio-header-middle">Việt phục / interactive studio</span>
            <a class="studio-back" href="index.php#stage"><span aria-hidden="true">←</span> Tầng 01</a>
        </header>

        <section class="studio-stage" id="studioStage" aria-label="Không gian phối Việt phục">
            <div class="studio-plane" id="studioPlane">
                <div class="studio-frame">
                    <video id="studioMedia" class="studio-media" muted autoplay playsinline preload="metadata" aria-label="Media nền của Studio"></video>
                    <div class="studio-media-placeholder" aria-hidden="true">
                        <span class="studio-media-placeholder__orb"></span>
                        <span class="studio-media-placeholder__line"></span>
                    </div>
                    <div class="studio-frame__veil" aria-hidden="true"></div>
                </div>
                <div class="studio-hotspots" id="studioHotspots"></div>
            </div>

            <div class="studio-intro" id="studioIntro">
                <p class="studio-kicker">V-Remix / Tầng 02</p>
                <h1>Phối một dáng Việt<br><em>theo cách bạn.</em></h1>
                <p class="studio-intro__note">Chạm vào một điểm để bắt đầu. Giữ tinh thần của dáng áo, mở ra một cách xuất hiện mới.</p>
            </div>

            <aside class="studio-dock" id="studioDock" aria-hidden="true" aria-labelledby="dockTitle">
                <div class="studio-dock__header">
                    <div>
                        <p class="studio-dock__index" id="dockIndex">01 / 04</p>
                        <h2 id="dockTitle">Bối cảnh</h2>
                    </div>
                    <button class="icon-button" id="dockClose" type="button" aria-label="Đóng bảng lựa chọn">×</button>
                </div>
                <p class="studio-dock__description" id="dockDescription"></p>
                <div class="studio-dock__content" id="dockContent"></div>
                <div class="studio-dock__hint" id="dockHint">Chọn một phương án để cập nhật bản phối.</div>
            </aside>

            <form class="studio-rail" id="studioForm">
                <div class="studio-rail__copy">
                    <span class="studio-rail__status"><i></i><span id="studioStatus">Bản phối đang ở trạng thái nháp</span></span>
                    <p id="selectionSummary">Chọn bối cảnh để bắt đầu.</p>
                </div>
                <label class="studio-upload" for="inputImage">
                    <span class="studio-upload__icon" aria-hidden="true">＋</span>
                    <span><strong>Ảnh đại diện</strong><small id="uploadName">Tuỳ chọn</small></span>
                    <input id="inputImage" type="file" accept="image/jpeg,image/png,image/webp">
                </label>
                <label class="studio-output">
                    <span>Đầu ra</span>
                    <select id="outputType" aria-label="Chọn loại đầu ra">
                        <option value="image">Ảnh lookbook</option>
                        <option value="video">Video Veo</option>
                        <option value="both">Ảnh + video</option>
                    </select>
                </label>
                <button class="studio-submit" type="submit">Tạo bản phối <span aria-hidden="true">↗</span></button>
            </form>
        </section>

        <footer class="studio-footer">
            <div class="studio-footer__notes" aria-label="Bốn điểm bắt đầu">
                <button type="button" data-mode="event"><span>01</span><strong>Bối cảnh</strong><small id="footerEvent">Chọn nơi bạn sẽ xuất hiện</small></button>
                <button type="button" data-mode="garment"><span>02</span><strong>Cổ phục</strong><small id="footerGarment">Chọn dáng áo làm gốc</small></button>
                <button type="button" data-mode="style"><span>03</span><strong>Phối sắc</strong><small id="footerStyle">Màu và tinh thần tổng thể</small></button>
                <button type="button" data-mode="accessory"><span>04</span><strong>Phụ kiện</strong><small id="footerAccessory">Thêm một nhịp hiện đại</small></button>
            </div>
            <div class="studio-footer__baseline">
                <span>V-Remix — Việt phục Remix</span>
                <span>Data từ catalog đã duyệt · Gemini qua Edge Function</span>
            </div>
        </footer>

        <section class="studio-result" id="studioResult" aria-live="polite" hidden>
            <div class="studio-result__backdrop" aria-hidden="true"></div>
            <div class="studio-result__header">
                <div>
                    <p class="studio-kicker">Bản phối / <span id="resultState">queued</span></p>
                    <h2 id="resultTitle">Đang chuẩn bị một dáng Việt mới.</h2>
                </div>
                <button class="icon-button icon-button--light" id="resultClose" type="button" aria-label="Đóng kết quả">×</button>
            </div>
            <div class="studio-result__grid">
                <div class="studio-result__visual">
                    <span class="result-orb" id="resultPlaceholderVisual"></span>
                    <span class="result-orb__label" id="resultVisualLabel">AI LOOK / ĐANG CHUẨN BỊ</span>
                    <div class="studio-result__images" id="resultImages" hidden></div>
                    <video class="studio-result__video" id="resultVideo" controls playsinline preload="metadata" hidden></video>
                </div>
                <div class="studio-result__copy">
                    <p id="resultProgress">Đang kiểm tra lựa chọn và chuẩn bị prompt có phiên bản.</p>
                    <div class="result-story"><span>Story Card</span><p id="resultStory">—</p></div>
                    <div class="result-story"><span>Cultural Guardrail</span><p id="resultGuardrail">—</p></div>
                    <div class="result-story"><span>Mẹo Gen Z</span><p id="resultGenZTip">—</p></div>
                    <a class="result-download" id="resultDownload" href="#" download hidden>Tải lookbook 9:16 <span aria-hidden="true">↓</span></a>
                </div>
            </div>
        </section>

        <p class="studio-sr-only" id="studioSrStatus" role="status" aria-live="polite">Studio đã sẵn sàng.</p>
    </main>
    <script>
        window.VREMIX_STUDIO = <?= json_encode($studioData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) ?>;
    </script>
    <script src="assets/js/studio.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio.js') ?>" defer></script>
</body>
</html>
