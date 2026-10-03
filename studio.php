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
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('vremix_studio');
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'path' => '/',
    ]);
    session_start();
}
if (empty($_SESSION['studio_csrf'])) {
    $_SESSION['studio_csrf'] = bin2hex(random_bytes(24));
}
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
$brandVisibleName = trim((string) ($site['brand_mark'] ?? '') . ' ' . (string) ($site['brand_name'] ?? ''));
$brandAccessibleName = trim($brandVisibleName . ' — ' . (string) ($site['ui']['brand_aria_label'] ?? 'Trang chủ V-Remix'));
$baseBranch = null;
foreach ($branches as $branch) {
    if (!empty($branch['isBase'])) {
        $baseBranch = $branch;
        break;
    }
}
$baseMedia = (string) (($baseBranch ?? reset($branches))['forwardUrl'] ?? '');
$localWebGeneration = filter_var((string) getenv('GEMINI_WEB_LOCAL_ENABLED'), FILTER_VALIDATE_BOOL);
$studioData = $catalog + [
    'generationEndpoint' => $localWebGeneration
        ? 'local-generate.php'
        : rtrim($database['url'], '/') . '/functions/v1/generate-look',
    'generationProvider' => $localWebGeneration ? 'gemini-webapi-local' : 'supabase-edge',
    'baseMedia' => $baseMedia,
    'lookEndpoint' => 'look-api.php',
    'lookCsrf' => (string) $_SESSION['studio_csrf'],
];
?>
<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#f3efe7">
    <title>Studio — <?= $escape($site['title'] ?? 'V-Remix') ?></title>
    <meta name="description" content="Studio phối Việt phục V-Remix theo bối cảnh, dáng áo và điểm nhấn cá nhân.">
    <link rel="icon" href="assets/media/favicon.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/app.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/app.css') ?>">
    <link rel="stylesheet" href="assets/css/studio.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/studio.css') ?>">
    <link rel="stylesheet" href="assets/css/studio-designer.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/studio-designer.css') ?>">
</head>
<body class="studio-page">
    <main class="studio-experience" id="studioExperience" aria-busy="false">
        <header class="studio-masthead">
            <a class="studio-brand" href="index.php#stage" aria-label="<?= $escape($brandAccessibleName) ?>">
                <?php $brandWordmarkClass = 'studio-brand__mark'; require __DIR__ . '/includes/components/brand-wordmark.php'; unset($brandWordmarkClass); ?>
            </a>
            <nav class="studio-header-middle" aria-label="Điều hướng chính">
                <a class="is-active" href="studio.php" aria-current="page">Studio</a>
                <a href="#studioVariants">Lookbook</a>
            </nav>
            <div class="studio-header-actions">
                <button class="studio-header-command" id="headerSaveLook" type="button"><span aria-hidden="true">♡</span> Lưu look</button>
                <button class="studio-header-command" id="headerDownloadLookbook" type="button"><span aria-hidden="true">⇩</span> Tải lookbook</button>
                <a class="studio-admin" href="admin.php" aria-label="Mở trang quản trị"><span aria-hidden="true">♙</span></a>
                <a class="studio-back" href="index.php#stage" aria-label="Về tầng khám phá"><span aria-hidden="true">☰</span></a>
            </div>
        </header>

        <section class="studio-stage" id="studioStage" aria-label="Không gian phối Việt phục">
            <div class="studio-workbench">
                <aside class="studio-toolbox" aria-label="Bộ sưu tập phối đồ">
                    <div class="studio-collection-heading">
                        <span class="studio-collection-heading__eyebrow">V-Remix / Catalog</span>
                        <strong>Chọn chất liệu cho bản phối</strong>
                    </div>

                    <section class="studio-catalog-card studio-catalog-card--garment" aria-labelledby="catalogGarmentTitle">
                        <div class="studio-catalog-card__head">
                            <h2 id="catalogGarmentTitle"><span aria-hidden="true">♧</span> Trang phục</h2>
                            <button type="button" data-mode="garment">Xem tất cả <span aria-hidden="true">›</span></button>
                        </div>
                        <div class="studio-catalog-grid studio-catalog-grid--garment" id="catalogGarments"></div>
                    </section>
                    <section class="studio-catalog-card studio-catalog-card--color" aria-labelledby="catalogColorTitle">
                        <div class="studio-catalog-card__head">
                            <h2 id="catalogColorTitle"><span aria-hidden="true">✣</span> Màu sắc</h2>
                            <button type="button" data-mode="color">Xem tất cả <span aria-hidden="true">›</span></button>
                        </div>
                        <div class="studio-catalog-grid studio-catalog-grid--color" id="catalogColors"></div>
                    </section>
                    <section class="studio-catalog-card studio-catalog-card--pattern" aria-labelledby="catalogPatternTitle">
                        <div class="studio-catalog-card__head">
                            <h2 id="catalogPatternTitle"><span aria-hidden="true">⌘</span> Họa tiết</h2>
                            <button type="button" data-mode="pattern">Xem tất cả <span aria-hidden="true">›</span></button>
                        </div>
                        <div class="studio-catalog-grid studio-catalog-grid--pattern" id="catalogPatterns"></div>
                    </section>
                    <section class="studio-catalog-card studio-catalog-card--accessory" aria-labelledby="catalogAccessoryTitle">
                        <div class="studio-catalog-card__head">
                            <h2 id="catalogAccessoryTitle"><span aria-hidden="true">♙</span> Phụ kiện</h2>
                            <button type="button" data-mode="accessory">Xem tất cả <span aria-hidden="true">›</span></button>
                        </div>
                        <div class="studio-catalog-grid studio-catalog-grid--accessory" id="catalogAccessories"></div>
                    </section>
                    <section class="studio-catalog-card studio-catalog-card--style" aria-labelledby="catalogStyleTitle">
                        <div class="studio-catalog-card__head">
                            <h2 id="catalogStyleTitle"><span aria-hidden="true">♢</span> Phong cách</h2>
                            <button type="button" data-mode="style">Xem tất cả <span aria-hidden="true">›</span></button>
                        </div>
                        <div class="studio-catalog-grid studio-catalog-grid--style" id="catalogStyles"></div>
                    </section>
                    <section class="studio-catalog-card studio-catalog-card--scene" aria-labelledby="catalogSceneTitle">
                        <div class="studio-catalog-card__head">
                            <h2 id="catalogSceneTitle"><span aria-hidden="true">⌂</span> Bối cảnh</h2>
                            <button type="button" data-mode="scene">Xem tất cả <span aria-hidden="true">›</span></button>
                        </div>
                        <div class="studio-catalog-grid studio-catalog-grid--scene" id="catalogScenes"></div>
                    </section>

                    <nav class="studio-tool-list" aria-label="Các lớp phối đồ">
                        <button type="button" data-mode="garment"><span>01</span><strong>Trang phục</strong><small id="footerGarment">Chưa chọn</small></button>
                        <button type="button" data-mode="color"><span>02</span><strong>Màu sắc</strong><small id="footerColor">Chưa chọn</small></button>
                        <button type="button" data-mode="pattern"><span>03</span><strong>Họa tiết</strong><small id="footerPattern">Chưa chọn</small></button>
                        <button type="button" data-mode="accessory"><span>04</span><strong>Phụ kiện</strong><small id="footerAccessory">Không phụ kiện</small></button>
                        <button type="button" data-mode="style"><span>05</span><strong>Phong cách</strong><small id="footerStyle">Chưa chọn</small></button>
                        <button type="button" data-mode="scene"><span>06</span><strong>Bối cảnh</strong><small id="footerScene">Chưa chọn</small></button>
                        <button type="button" data-mode="event"><span>07</span><strong>Dịp mặc</strong><small id="footerEvent">Chưa chọn</small></button>
                    </nav>

                    <aside class="studio-dock" id="studioDock" aria-hidden="true" inert aria-labelledby="dockTitle">
                        <div class="studio-dock__header">
                            <div>
                                <p class="studio-dock__index" id="dockIndex">01 / 07</p>
                                <h2 id="dockTitle">Trang phục</h2>
                            </div>
                            <button class="icon-button" id="dockClose" type="button" aria-label="Đóng bảng lựa chọn">×</button>
                        </div>
                        <p class="studio-dock__description" id="dockDescription"></p>
                        <div class="studio-dock__content" id="dockContent"></div>
                        <div class="studio-dock__hint" id="dockHint">Chọn một phương án để cập nhật bản phối.</div>
                    </aside>
                </aside>

                <section class="studio-preview" aria-label="AI Preview">
                    <div class="studio-intro" id="studioIntro">
                        <div>
                            <p class="studio-kicker" id="projectKicker">Dự án mới / Tầng 02</p>
                            <h1 id="projectTitle">Dự án mới</h1>
                            <p class="studio-intro__note" id="projectContext">Bắt đầu bằng cách chọn Việt phục, tải ảnh của bạn hoặc dùng gợi ý nhanh.</p>
                        </div>
                        <div class="studio-intro__rule" aria-hidden="true"></div>
                    </div>

                    <section class="studio-quick-start" id="studioQuickStart" aria-label="Gợi ý nhanh">
                        <button type="button" class="studio-start-card" data-start-mode="garment">
                            <span class="studio-start-card__icon" aria-hidden="true">⌁</span>
                            <span><strong>Chọn Việt phục</strong><small>Từ bộ sưu tập bên trái</small></span>
                        </button>
                        <label class="studio-start-card" for="inputImage">
                            <span class="studio-start-card__icon" aria-hidden="true">▧</span>
                            <span><strong>Tải ảnh của bạn</strong><small>JPG, PNG · Tối đa 8MB</small></span>
                        </label>
                        <button type="button" class="studio-start-card" data-start-mode="quick">
                            <span class="studio-start-card__icon" aria-hidden="true">✦</span>
                            <span><strong>Dùng gợi ý nhanh</strong><small>Tạo với AI</small></span>
                        </button>
                        <div class="studio-quick-start__options" id="quickStartOptions" hidden></div>
                    </section>

                    <div class="studio-preview__top">
                        <div>
                            <p class="studio-kicker">AI preview / Base look</p>
                            <h2 id="previewTitle">Khung ảnh A</h2>
                        </div>
                        <div class="studio-spec-grid">
                            <label>Khung ảnh
                                <select id="canvasAspect">
                                    <option value="16:9">16:9</option>
                                    <option value="1:1">1:1</option>
                                    <option value="9:16">9:16</option>
                                </select>
                            </label>
                            <label>Chất lượng
                                <select id="targetResolution">
                                    <option value="1080">1080</option>
                                    <option value="720">720</option>
                                    <option value="2160">2160</option>
                                </select>
                            </label>
                            <label>Chế độ
                                <select id="generationMode">
                                    <option value="text-to-image">Text → image</option>
                                    <option value="image-to-image">Image → image</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    <div class="studio-plane" id="studioPlane">
                        <div class="studio-frame">
                            <video id="studioMedia" class="studio-media" muted autoplay playsinline preload="metadata" aria-label="Media nền của Studio"></video>
                            <div class="studio-media-placeholder" aria-hidden="true">
                                <span class="studio-media-placeholder__orb"></span>
                                <span class="studio-media-placeholder__line"></span>
                            </div>
                            <div class="studio-frame__veil" aria-hidden="true"></div>
                            <div class="studio-preview__empty" id="previewEmpty">
                                <span>V–R / 02</span>
                                <strong>Chọn ba lớp đầu tiên<br>để định hình Base Look.</strong>
                                <small>Việt phục · Bối cảnh · Phong cách</small>
                            </div>
                        </div>
                        <div class="studio-hotspots" id="studioHotspots"></div>
                    </div>

                    <section class="studio-locks" aria-label="Base Look Lock">
                        <div>
                            <span>Base Look Lock</span>
                            <strong>Giữ phần không thay đổi</strong>
                        </div>
                        <div class="studio-locks__items" id="baseLookLocks">
                            <?php foreach (['character' => 'Nhân vật', 'face' => 'Khuôn mặt', 'hair' => 'Tóc', 'garment' => 'Trang phục', 'background' => 'Bối cảnh', 'pose' => 'Pose', 'camera' => 'Camera', 'lighting' => 'Ánh sáng'] as $lockKey => $lockLabel): ?>
                                <label><input type="checkbox" data-lock="<?= $escape($lockKey) ?>" checked><span><?= $escape($lockLabel) ?></span></label>
                            <?php endforeach; ?>
                        </div>
                    </section>

                    <div class="studio-frame-plan" aria-label="Kế hoạch frame">
                        <button type="button" class="studio-frame-step is-active" data-frame-step="A"><b>A</b><span><strong>Base</strong><small>Khoá bố cục</small></span></button>
                        <button type="button" class="studio-frame-step" data-frame-step="B"><b>B</b><span><strong>Bối cảnh</strong><small id="frameBSummary">Chỉ thay nền</small></span></button>
                        <button type="button" class="studio-frame-step" data-frame-step="C"><b>C</b><span><strong>Ánh sáng</strong><small id="frameCSummary">Chỉ thay sáng</small></span></button>
                        <button type="button" class="studio-frame-step" data-frame-step="D"><b>D</b><span><strong>Trang phục</strong><small id="frameDSummary">Chỉ thay áo</small></span></button>
                        <button type="button" class="studio-frame-step" data-frame-step="E"><b>E</b><span><strong>Phụ kiện</strong><small id="frameESummary">Chỉ thay điểm nhấn</small></span></button>
                    </div>

                    <form class="studio-rail" id="studioForm">
                        <div class="studio-rail__copy">
                            <span class="studio-rail__status"><i></i><span id="studioStatus">Dự án mới chưa có lựa chọn</span></span>
                            <p id="selectionSummary">Chọn Việt phục, bối cảnh và phong cách để bắt đầu.</p>
                        </div>
                        <label class="studio-upload" for="inputImage">
                            <span class="studio-upload__icon" aria-hidden="true">＋</span>
                            <span><strong>Tải ảnh của bạn</strong><small id="uploadName">Tuỳ chọn · tối đa 8 MB</small></span>
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
                        <button class="studio-submit" type="submit">Generate <span aria-hidden="true">↗</span></button>
                    </form>

                    <section class="studio-variants" id="studioVariants" aria-label="Các phiên bản look">
                        <div class="studio-variants__title">
                            <span>Lookbook / Variants</span>
                            <strong>Giữ Base, thử từng thay đổi.</strong>
                        </div>
                        <div class="studio-variants__strip" id="variantStrip">
                            <button type="button" class="is-active" data-variant="base"><span>A</span><strong>Look gốc</strong><small>Chưa tạo ảnh</small></button>
                            <button type="button" data-variant="1"><span>01</span><strong>Variant 1</strong><small>Chưa tạo</small></button>
                            <button type="button" data-variant="2"><span>02</span><strong>Variant 2</strong><small>Chưa tạo</small></button>
                            <button type="button" data-variant="3"><span>03</span><strong>Variant 3</strong><small>Chưa tạo</small></button>
                        </div>
                        <div class="studio-variants__actions">
                            <button type="button" id="compareLooks" disabled>So sánh</button>
                            <button type="button" id="saveLook" disabled>Lưu Look</button>
                            <button type="button" id="addVariant">＋ Tạo thêm</button>
                        </div>
                    </section>
                </section>

                <aside class="studio-insights" aria-label="Thông tin văn hoá và kiểm tra">
                    <section class="studio-insight studio-passport">
                        <div class="studio-insight__head"><span>Hộ chiếu Di sản</span><small>01</small></div>
                        <div class="studio-passport__visual" id="passportVisual" aria-hidden="true"><span>V</span></div>
                        <h2 id="passportTitle">Chưa chọn Việt phục</h2>
                        <dl>
                            <div><dt>Nguồn gốc</dt><dd id="passportOrigin">Chọn một trang phục để xem nội dung đã được duyệt.</dd></div>
                            <div><dt>Đặc điểm</dt><dd id="passportFeature">—</dd></div>
                            <div><dt>Ý nghĩa</dt><dd id="passportMeaning">—</dd></div>
                            <div><dt>Nguồn tham khảo</dt><dd id="passportSource">Đang chờ nguồn Approved.</dd></div>
                        </dl>
                    </section>
                    <section class="studio-insight studio-check">
                        <div class="studio-insight__head"><span>V-Remix Check</span><small>02</small></div>
                        <ul id="culturalCheckList">
                            <li data-check="color">○ Chưa chọn màu</li>
                            <li data-check="event">○ Chưa chọn dịp mặc</li>
                            <li data-check="accessory">○ Chưa chọn phụ kiện</li>
                        </ul>
                        <p id="culturalWarning">Hệ thống sẽ hiển thị quy tắc văn hoá đã được duyệt.</p>
                    </section>
                    <section class="studio-insight studio-tips">
                        <div class="studio-insight__head"><span>Mẹo Gen Z</span><small>03</small></div>
                        <div><span>Địa điểm</span><strong id="tipLocation">Campus · Phố cổ · Văn Miếu</strong></div>
                        <div><span>Góc chụp</span><strong>Eye-level · 3/4 body · Walking shot</strong></div>
                        <div><span>Styling</span><strong id="tipStyling">Chọn một điểm nhấn hiện đại vừa đủ.</strong></div>
                    </section>
                </aside>
            </div>
        </section>

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
                    <div class="result-video-branches" id="resultVideoBranches" hidden aria-label="Bốn video chuyển đổi"></div>
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
