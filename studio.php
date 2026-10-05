<?php
declare(strict_types=1);

require __DIR__ . '/src/Support/Env.php';
require __DIR__ . '/src/Support/SupabaseAuth.php';
require __DIR__ . '/src/Infrastructure/SupabaseClient.php';
require __DIR__ . '/src/Repositories/SiteContentRepository.php';
require __DIR__ . '/src/Repositories/StudioRepository.php';

use App\Infrastructure\SupabaseClient;
use App\Repositories\SiteContentRepository;
use App\Repositories\StudioRepository;
use App\Support\Env;
use App\Support\SupabaseAuth;

Env::load(__DIR__ . '/.env');
$database = require __DIR__ . '/config/database.php';
$auth = new SupabaseAuth(
    (string) getenv('SUPABASE_URL'),
    (string) getenv('SUPABASE_ANON_KEY'),
    (string) getenv('SUPABASE_SERVICE_ROLE_KEY')
);
$auth->boot();
$authUser = $auth->user();
$authNext = 'studio.php' . (!empty($_SERVER['QUERY_STRING']) ? '?' . (string) $_SERVER['QUERY_STRING'] : '');
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
$accountName = trim((string) (
    $authUser['user_metadata']['display_name']
    ?? $authUser['user_metadata']['full_name']
    ?? ''
));
if ($accountName === '') {
    $accountName = 'Tài khoản';
}
$accountInitial = $authUser !== null
    ? mb_strtoupper(mb_substr($accountName !== 'Tài khoản'
        ? $accountName
        : (string) ($authUser['email'] ?? 'V'), 0, 1))
    : 'V';
$studioData = $catalog + [
    'generationEndpoint' => $localWebGeneration
        ? 'local-generate.php'
        : rtrim($database['url'], '/') . '/functions/v1/generate-look',
    'generationProvider' => $localWebGeneration ? 'gemini-webapi-local' : 'supabase-edge',
    'baseMedia' => $baseMedia,
    'lookEndpoint' => 'look-api.php',
    'lookCsrf' => $auth->csrfToken(),
    'auth' => [
        'authenticated' => $authUser !== null,
        'loginUrl' => 'auth.php?next=' . rawurlencode(SupabaseAuth::safeNext($authNext)),
        'email' => (string) ($authUser['email'] ?? ''),
    ],
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
            <div class="studio-brand-cluster">
                <a class="studio-brand" href="index.php#stage" aria-label="<?= $escape($brandAccessibleName) ?>">
                    <?php $brandWordmarkClass = 'studio-brand__mark'; require __DIR__ . '/includes/components/brand-wordmark.php'; unset($brandWordmarkClass); ?>
                </a>
                <span class="studio-section-marker"><small>Không gian phối</small><strong>Studio</strong></span>
            </div>
            <nav class="studio-header-actions" aria-label="Điều hướng Studio">
                <a class="studio-nav-action" href="index.php#stage">
                    <span><small>Trở về</small><strong>Tầng 1</strong></span>
                </a>
                <?php if ($authUser !== null): ?>
                    <a class="studio-account is-authenticated" href="auth.php?next=<?= rawurlencode(SupabaseAuth::safeNext($authNext)) ?>" aria-label="Mở tài khoản <?= $escape((string) ($authUser['email'] ?? '')) ?>">
                        <span class="studio-account__avatar" aria-hidden="true"><?= $escape($accountInitial) ?></span>
                        <span class="studio-account__copy"><small>Đã đăng nhập</small><strong><?= $escape($accountName) ?></strong></span>
                    </a>
                <?php else: ?>
                    <a class="studio-account" href="auth.php?next=<?= rawurlencode(SupabaseAuth::safeNext($authNext)) ?>">
                        <span class="studio-account__avatar" aria-hidden="true"><?= $escape($accountInitial) ?></span>
                        <span class="studio-account__copy"><small>Tài khoản</small><strong>Đăng nhập</strong></span>
                    </a>
                <?php endif; ?>
            </nav>
        </header>

        <section class="studio-stage" id="studioStage" aria-label="Không gian phối Việt phục">
            <div class="studio-workbench">
                <aside class="studio-toolbox" aria-label="Bộ sưu tập phối đồ">
                    <div class="studio-collection-heading">
                        <span class="studio-collection-heading__eyebrow">V-Remix / Bắt đầu</span>
                        <strong>Bạn muốn mặc gì hôm nay?</strong>
                        <p class="studio-collection-heading__note">Chọn dịp trước. Sau đó chọn một dáng Việt phục và thêm điểm nhấn theo cách của bạn.</p>
                    </div>
                    <div class="studio-progress" aria-label="Ba bước để bắt đầu">
                        <button type="button" class="studio-progress__step is-current" data-progress-step="event" data-mode="event">
                            <span>01</span><strong>Dịp mặc</strong>
                        </button>
                        <i aria-hidden="true"></i>
                        <button type="button" class="studio-progress__step" data-progress-step="garment" data-mode="garment">
                            <span>02</span><strong>Trang phục</strong>
                        </button>
                        <i aria-hidden="true"></i>
                        <button type="button" class="studio-progress__step" data-progress-step="style" data-mode="style">
                            <span>03</span><strong>Phong cách</strong>
                        </button>
                        <p id="studioNextHint">Bắt đầu bằng cách chọn dịp bạn sẽ mặc.</p>
                    </div>

                    <section class="studio-catalog-card studio-catalog-card--event" aria-labelledby="catalogEventTitle">
                        <div class="studio-catalog-card__head">
                            <h2 id="catalogEventTitle"><span aria-hidden="true">01</span> Bạn sẽ mặc đi đâu?</h2>
                            <button type="button" data-mode="event">Xem tất cả <span aria-hidden="true">›</span></button>
                        </div>
                        <div class="studio-catalog-grid studio-catalog-grid--event" id="catalogEvents"></div>
                    </section>

                    <section class="studio-catalog-card studio-catalog-card--garment" aria-labelledby="catalogGarmentTitle">
                        <div class="studio-catalog-card__head">
                            <h2 id="catalogGarmentTitle"><span aria-hidden="true">02</span> Chọn dáng Việt phục</h2>
                            <button type="button" data-mode="garment">Xem tất cả <span aria-hidden="true">›</span></button>
                        </div>
                        <div class="studio-catalog-grid studio-catalog-grid--garment" id="catalogGarments"></div>
                    </section>
                    <section class="studio-catalog-card studio-catalog-card--variant" id="garmentVariantSection" aria-labelledby="catalogGarmentVariantTitle" hidden>
                        <div class="studio-catalog-card__head">
                            <div>
                                <span class="studio-catalog-card__step">Tiếp theo</span>
                                <h2 id="catalogGarmentVariantTitle">Chọn mẫu cụ thể</h2>
                            </div>
                            <span class="studio-catalog-card__count" id="garmentVariantCount"></span>
                        </div>
                        <p class="studio-catalog-card__note">Mỗi mẫu có ảnh, chất liệu và họa tiết riêng để bạn xem trước rõ hơn.</p>
                        <div class="studio-variant-grid" id="catalogGarmentVariants"></div>
                    </section>
                    <section class="studio-catalog-card studio-catalog-card--style" aria-labelledby="catalogStyleTitle">
                        <div class="studio-catalog-card__head">
                            <h2 id="catalogStyleTitle"><span aria-hidden="true">03</span> Bạn thích phong cách nào?</h2>
                            <button type="button" data-mode="style">Xem tất cả <span aria-hidden="true">›</span></button>
                        </div>
                        <div class="studio-catalog-grid studio-catalog-grid--style" id="catalogStyles"></div>
                    </section>

                    <details class="studio-customize">
                        <summary><strong>Thêm nét riêng của bạn</strong><small>Màu sắc, họa tiết, phụ kiện và nơi chụp · tuỳ chọn</small></summary>
                    <section class="studio-catalog-card studio-catalog-card--color" aria-labelledby="catalogColorTitle">
                        <div class="studio-catalog-card__head">
                            <h2 id="catalogColorTitle">Màu bạn thích</h2>
                            <button type="button" data-mode="color">Xem tất cả <span aria-hidden="true">›</span></button>
                        </div>
                        <div class="studio-catalog-grid studio-catalog-grid--color" id="catalogColors"></div>
                    </section>
                    <section class="studio-catalog-card studio-catalog-card--pattern" aria-labelledby="catalogPatternTitle">
                        <div class="studio-catalog-card__head">
                            <h2 id="catalogPatternTitle">Họa tiết</h2>
                            <button type="button" data-mode="pattern">Xem tất cả <span aria-hidden="true">›</span></button>
                        </div>
                        <div class="studio-catalog-grid studio-catalog-grid--pattern" id="catalogPatterns"></div>
                    </section>
                    <section class="studio-catalog-card studio-catalog-card--accessory" aria-labelledby="catalogAccessoryTitle">
                        <div class="studio-catalog-card__head">
                            <h2 id="catalogAccessoryTitle">Thêm điểm nhấn</h2>
                            <button type="button" data-mode="accessory">Xem tất cả <span aria-hidden="true">›</span></button>
                        </div>
                        <div class="studio-catalog-grid studio-catalog-grid--accessory" id="catalogAccessories"></div>
                    </section>
                    <section class="studio-catalog-card studio-catalog-card--variant" id="accessoryVariantSection" aria-labelledby="catalogAccessoryVariantTitle" hidden>
                        <div class="studio-catalog-card__head">
                            <div>
                                <span class="studio-catalog-card__step">Mẫu phụ kiện</span>
                                <h2 id="catalogAccessoryVariantTitle">Chọn sản phẩm cụ thể</h2>
                            </div>
                            <span class="studio-catalog-card__count" id="accessoryVariantCount"></span>
                        </div>
                        <div class="studio-variant-grid studio-variant-grid--accessory" id="catalogAccessoryVariants"></div>
                    </section>
                    <section class="studio-catalog-card studio-catalog-card--scene" aria-labelledby="catalogSceneTitle">
                        <div class="studio-catalog-card__head">
                            <h2 id="catalogSceneTitle">Chọn nơi xuất hiện</h2>
                            <button type="button" data-mode="scene">Xem tất cả <span aria-hidden="true">›</span></button>
                        </div>
                        <div class="studio-catalog-grid studio-catalog-grid--scene" id="catalogScenes"></div>
                    </section>
                    </details>

                    <nav class="studio-tool-list" aria-label="Các lớp phối đồ">
                        <button type="button" data-mode="event"><span>01</span><strong>Dịp mặc</strong><small id="footerEvent">Chưa chọn</small></button>
                        <button type="button" data-mode="garment"><span>02</span><strong>Trang phục</strong><small id="footerGarment">Chưa chọn</small></button>
                        <button type="button" data-mode="color"><span>03</span><strong>Màu sắc</strong><small id="footerColor">Chưa chọn</small></button>
                        <button type="button" data-mode="pattern"><span>04</span><strong>Họa tiết</strong><small id="footerPattern">Chưa chọn</small></button>
                        <button type="button" data-mode="accessory"><span>05</span><strong>Phụ kiện</strong><small id="footerAccessory">Không phụ kiện</small></button>
                        <button type="button" data-mode="style"><span>06</span><strong>Phong cách</strong><small id="footerStyle">Chưa chọn</small></button>
                        <button type="button" data-mode="scene"><span>07</span><strong>Bối cảnh</strong><small id="footerScene">Chưa chọn</small></button>
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

                <section class="studio-preview" aria-label="Bản xem trước">
                    <div class="studio-intro" id="studioIntro">
                        <div>
                            <p class="studio-kicker" id="projectKicker">Bản phối mới</p>
                            <h1 id="projectTitle">Bắt đầu từ một dịp mặc.</h1>
                            <p class="studio-intro__note" id="projectContext">Chọn dịp bạn sẽ mặc, dáng Việt phục và phong cách. Bạn không cần biết trước về AI.</p>
                        </div>
                        <div class="studio-intro__rule" aria-hidden="true"></div>
                    </div>

                    <section class="studio-quick-start" id="studioQuickStart" aria-label="Gợi ý nhanh">
                        <button type="button" class="studio-start-card" data-start-mode="event">
                            <span class="studio-start-card__icon" aria-hidden="true">⌁</span>
                            <span><strong>Chọn dịp mặc</strong><small>Đi học, dạo phố, dự lễ…</small></span>
                        </button>
                        <label class="studio-start-card" for="inputImage">
                            <span class="studio-start-card__icon" aria-hidden="true">▧</span>
                            <span><strong>Tải ảnh của bạn</strong><small>JPG, PNG · Tối đa 8MB</small></span>
                        </label>
                        <button type="button" class="studio-start-card" data-start-mode="quick">
                            <span class="studio-start-card__icon" aria-hidden="true">✦</span>
                            <span><strong>Để V-Remix gợi ý</strong><small>Chọn một dịp để bắt đầu</small></span>
                        </button>
                        <div class="studio-quick-start__options" id="quickStartOptions" hidden></div>
                    </section>

                    <div class="studio-preview__top">
                        <div>
                            <p class="studio-kicker">Bản xem trước</p>
                            <h2 id="previewTitle">Khung hình đầu tiên</h2>
                        </div>
                        <div class="studio-preview__preset">
                            <span>Ảnh xem trước</span>
                            <strong><?= $escape((string) ($catalog['generation']['canvas_aspect_ratio'] ?? '16:9')) ?></strong>
                            <small>Chất lượng được đội ngũ chuẩn bị sẵn</small>
                        </div>
                    </div>

                    <div class="studio-plane" id="studioPlane">
                        <div class="studio-frame">
                            <video id="studioMedia" class="studio-media" muted autoplay playsinline preload="metadata" aria-label="Media nền của Studio"></video>
                            <img id="studioPreviewImage" class="studio-preview-image" alt="Bản phối AI đang xem trước" hidden>
                            <div class="studio-media-placeholder" aria-hidden="true">
                                <span class="studio-media-placeholder__orb"></span>
                                <span class="studio-media-placeholder__line"></span>
                            </div>
                            <div class="studio-frame__veil" aria-hidden="true"></div>
                            <div class="studio-preview__empty" id="previewEmpty">
                                <span>V–R / 02</span>
                                <strong>Chọn dịp, trang phục<br>và phong cách để bắt đầu.</strong>
                                <small>Việt phục · Bối cảnh · Phong cách</small>
                            </div>
                            <div class="studio-preview-progress" id="previewGenerationStatus" hidden>
                                <i aria-hidden="true"></i>
                                <span id="previewGenerationMessage">Đang chuẩn bị bản phối.</span>
                            </div>
                        </div>
                        <div class="studio-hotspots" id="studioHotspots"></div>
                    </div>

                    <details class="studio-advanced">
                        <summary><span>Tuỳ chọn nâng cao</span><small>Giữ nhân vật và thử từng thay đổi</small></summary>
                        <section class="studio-locks" aria-label="Giữ nguyên lựa chọn">
                            <div>
                                <span>Giữ nguyên lựa chọn</span>
                                <strong>Giữ nguyên những gì bạn đã chọn</strong>
                            </div>
                            <div class="studio-locks__items" id="baseLookLocks">
                                <?php foreach (['character' => 'Người mẫu', 'face' => 'Gương mặt', 'hair' => 'Tóc', 'garment' => 'Trang phục', 'background' => 'Phông nền', 'pose' => 'Dáng đứng', 'camera' => 'Góc chụp', 'lighting' => 'Ánh sáng'] as $lockKey => $lockLabel): ?>
                                    <label><input type="checkbox" data-lock="<?= $escape($lockKey) ?>" checked><span><?= $escape($lockLabel) ?></span></label>
                                <?php endforeach; ?>
                            </div>
                        </section>

                        <div class="studio-frame-plan" aria-label="Các thay đổi có thể thử">
                            <button type="button" class="studio-frame-step is-active" data-frame-step="A"><b>A</b><span><strong>Bản gốc</strong><small>Giữ khung hình</small></span></button>
                            <button type="button" class="studio-frame-step" data-frame-step="B"><b>B</b><span><strong>Đổi nền</strong><small id="frameBSummary">Chỉ thay nền</small></span></button>
                            <button type="button" class="studio-frame-step" data-frame-step="C"><b>C</b><span><strong>Đổi ánh sáng</strong><small id="frameCSummary">Chỉ thay sáng</small></span></button>
                            <button type="button" class="studio-frame-step" data-frame-step="D"><b>D</b><span><strong>Đổi trang phục</strong><small id="frameDSummary">Chỉ thay áo</small></span></button>
                            <button type="button" class="studio-frame-step" data-frame-step="E"><b>E</b><span><strong>Đổi người mẫu</strong><small id="frameESummary">Giữ vị trí và khung hình</small></span></button>
                        </div>
                    </details>

                    <section class="studio-auto-create" id="studioForm" aria-live="polite">
                        <div class="studio-rail__copy">
                            <span class="studio-rail__status"><i></i><span id="studioStatus">Chưa có lựa chọn</span></span>
                            <p id="selectionSummary">Chọn dịp trước, rồi chọn trang phục. Bản xem trước sẽ tự cập nhật.</p>
                        </div>
                        <label class="studio-upload" for="inputImage">
                            <span class="studio-upload__icon" aria-hidden="true">＋</span>
                            <span><strong>Tải ảnh của bạn</strong><small id="uploadName">Tuỳ chọn · tối đa 8 MB</small></span>
                            <input id="inputImage" type="file" accept="image/jpeg,image/png,image/webp">
                        </label>
                        <input id="outputType" type="hidden" value="<?= $escape((string) ($catalog['generation']['default_output_type'] ?? 'image')) ?>">
                        <span class="studio-auto-create__hint">Khi bạn chọn đủ 3 điều chính, bản xem trước sẽ tự tạo.</span>
                    </section>

                    <section class="studio-variants" id="studioVariants" aria-label="Các phương án bản phối">
                        <div class="studio-variants__title">
                            <span>Thử các cách phối</span>
                            <strong>Đổi từng chi tiết để chọn bản bạn thích.</strong>
                        </div>
                        <div class="studio-variants__strip" id="variantStrip">
                            <button type="button" class="is-active" data-variant="base"><span>A</span><strong>Bản gốc</strong><small>Chưa tạo ảnh</small></button>
                            <button type="button" data-variant="1"><span>01</span><strong>Phương án 1</strong><small>Chưa tạo</small></button>
                            <button type="button" data-variant="2"><span>02</span><strong>Phương án 2</strong><small>Chưa tạo</small></button>
                            <button type="button" data-variant="3"><span>03</span><strong>Phương án 3</strong><small>Chưa tạo</small></button>
                        </div>
                        <div class="studio-variants__actions">
                            <button type="button" id="compareLooks" disabled>So sánh ảnh</button>
                            <button type="button" id="saveLook" disabled>Lưu bản phối</button>
                            <button type="button" id="addVariant">＋ Tạo phương án khác</button>
                        </div>
                    </section>
                </section>

                <aside class="studio-insights" aria-label="Thông tin văn hoá và kiểm tra">
                    <section class="studio-insight studio-passport">
                        <div class="studio-insight__head"><span>Về trang phục</span><small>01</small></div>
                        <div class="studio-passport__visual" id="passportVisual" aria-hidden="true"><span>V</span></div>
                        <h2 id="passportTitle">Chưa chọn Việt phục</h2>
                        <dl>
                            <div><dt>Nguồn gốc</dt><dd id="passportOrigin">Chọn một trang phục để xem nội dung đã được duyệt.</dd></div>
                            <div><dt>Đặc điểm</dt><dd id="passportFeature">—</dd></div>
                            <div><dt>Ý nghĩa</dt><dd id="passportMeaning">—</dd></div>
                            <div><dt>Nguồn tham khảo</dt><dd id="passportSource">Đang chờ nguồn đã được duyệt.</dd></div>
                        </dl>
                    </section>
                    <section class="studio-insight studio-check">
                        <div class="studio-insight__head"><span>Kiểm tra bản phối</span><small>02</small></div>
                        <ul id="culturalCheckList">
                            <li data-check="color">○ Chưa chọn màu</li>
                            <li data-check="event">○ Chưa chọn dịp mặc</li>
                            <li data-check="accessory">○ Chưa chọn phụ kiện</li>
                            <li data-check="score">○ Chưa có đánh giá phù hợp</li>
                        </ul>
                        <p id="culturalWarning">Hệ thống sẽ hiển thị quy tắc văn hoá đã được duyệt.</p>
                    </section>
                    <section class="studio-insight studio-tips">
                        <div class="studio-insight__head"><span>Gợi ý chụp & phối</span><small>03</small></div>
                        <div><span>Địa điểm</span><strong id="tipLocation">Khuôn viên · Phố cổ · Văn Miếu</strong></div>
                        <div><span>Góc chụp</span><strong>Chính diện · 3/4 người · Đang bước</strong></div>
                        <div><span>Phối đồ</span><strong id="tipStyling">Chọn một điểm nhấn hiện đại vừa đủ.</strong></div>
                    </section>
                    <section class="studio-insight studio-sourcing">
                        <div class="studio-insight__head"><span>Nơi mua / thuê</span><small>04</small></div>
                        <div class="studio-recommendation-list" id="studioListings">
                            <p class="studio-recommendation-empty">Chọn trang phục hoặc phụ kiện để xem gợi ý đã xác minh.</p>
                        </div>
                        <a class="studio-search-link" id="listingSearchLink" href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Tìm quanh vị trí của bạn <span aria-hidden="true">↗</span></a>
                    </section>
                    <section class="studio-insight studio-places">
                        <div class="studio-insight__head"><span>Nơi chụp thật</span><small>05</small></div>
                        <div class="studio-recommendation-list" id="studioLocations">
                            <p class="studio-recommendation-empty">Chọn bối cảnh để xem địa điểm phù hợp trên bản đồ.</p>
                        </div>
                        <a class="studio-search-link" id="locationSearchLink" href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Khám phá thêm địa điểm <span aria-hidden="true">↗</span></a>
                    </section>
                </aside>
            </div>
        </section>

        <section class="studio-result" id="studioResult" aria-live="polite" hidden>
            <div class="studio-result__backdrop" aria-hidden="true"></div>
            <div class="studio-result__header">
                <div>
                    <p class="studio-kicker">Bản phối / <span id="resultState">Chuẩn bị</span></p>
                    <h2 id="resultTitle">Đang chuẩn bị một dáng Việt mới.</h2>
                </div>
                <button class="icon-button icon-button--light" id="resultClose" type="button" aria-label="Thu gọn chi tiết bản phối">×</button>
            </div>
            <div class="studio-result__grid">
                <div class="studio-result__visual">
                    <span class="result-orb" id="resultPlaceholderVisual"></span>
                    <span class="result-orb__label" id="resultVisualLabel">BẢN PHỐI / ĐANG CHUẨN BỊ</span>
                    <div class="studio-result__images" id="resultImages" hidden></div>
                    <video class="studio-result__video" id="resultVideo" controls playsinline preload="metadata" hidden></video>
                </div>
                <div class="studio-result__copy">
                    <p id="resultProgress">Mình đang chuẩn bị bản phối cho bạn.</p>
                    <div class="result-story"><span>Câu chuyện trang phục</span><p id="resultStory">—</p></div>
                    <div class="result-story"><span>Lưu ý văn hóa</span><p id="resultGuardrail">—</p></div>
                    <div class="result-story result-score"><span>Mức độ phù hợp văn hóa</span><p id="resultCulturalScore">—</p></div>
                    <div class="result-story"><span>Gợi ý chụp & phối</span><p id="resultGenZTip">—</p></div>
                    <div class="result-video-branches" id="resultVideoBranches" hidden aria-label="Các video chuyển cảnh"></div>
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
