<?php
declare(strict_types=1);

require __DIR__ . '/src/Support/Env.php';
require __DIR__ . '/src/Support/SupabaseAuth.php';
require __DIR__ . '/src/Infrastructure/SupabaseClient.php';
require __DIR__ . '/src/Repositories/SiteContentRepository.php';
require __DIR__ . '/src/Repositories/StudioRepository.php';
require __DIR__ . '/src/Support/StudioIntelligence.php';

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
// Embedded auth returns must not boot a second syncing Studio instance.
if (($_GET['authReturn'] ?? '') === '1') {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    require __DIR__ . '/includes/studio/auth-return.php';
    exit;
}
if (empty($_SESSION['studio_generation_owner'])) $_SESSION['studio_generation_owner'] = bin2hex(random_bytes(32));
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
$baseMedia = trim((string) ($catalog['generation']['preview_media_url'] ?? ''));
$basePoster = trim((string) ($catalog['generation']['preview_poster_url'] ?? ''));
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
$catalog = App\Support\StudioIntelligence::enrichCatalog($catalog);
$intelligence = App\Support\StudioIntelligence::publicData($catalog);
$studioData = $catalog + [
    'intelligence' => $intelligence,
    'advisorEndpoint' => 'studio-advisor.php',
    'generationEndpoint' => $localWebGeneration
        ? 'local-generate.php'
        : 'generation-edge.php',
    'generationProvider' => $localWebGeneration ? 'gemini-webapi-local' : 'supabase-edge',
    'baseMedia' => $baseMedia,
    'basePoster' => $basePoster,
    'lookEndpoint' => 'look-api.php',
    'draftEndpoint' => 'studio-draft.php',
    'collectionEndpoint' => 'studio-collections-api.php',
    'historyEndpoint' => 'studio-history.php',
    'lookCsrf' => $auth->csrfToken(),
    'sessionScope' => hash('sha256', $_SESSION['studio_generation_owner']),
    'auth' => [
        'authenticated' => $authUser !== null,
        'isAdmin' => $authUser !== null && $auth->isAdmin(),
        'userId' => (string) ($authUser['id'] ?? ''),
        'loginUrl' => 'auth.php?next=' . rawurlencode(SupabaseAuth::safeNext($authNext)),
        'email' => (string) ($authUser['email'] ?? ''),
    ],
];
require __DIR__ . '/includes/components/studio-icon.php';
?>
<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <?php $websitePage = 'studio'; require __DIR__ . '/includes/partials/website-meta.php'; ?>
    <link rel="stylesheet" href="assets/css/studio-intelligence.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/studio-intelligence.css') ?>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/app.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/app.css') ?>">
    <link rel="stylesheet" href="assets/css/studio.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/studio.css') ?>">
    <link rel="stylesheet" href="assets/css/studio-designer.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/studio-designer.css') ?>">
    <link rel="stylesheet" href="assets/css/studio-workspace.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/studio-workspace.css') ?>">
    <link rel="stylesheet" href="assets/css/studio-assessment.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/studio-assessment.css') ?>">
    <link rel="stylesheet" href="assets/css/studio-example.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/studio-example.css') ?>">
</head>
<body class="studio-page">
    <main class="studio-experience" id="studioExperience" aria-busy="false">
        <?php require __DIR__ . '/includes/studio/workspace-navigation.php'; ?>
        <div class="workspace-heading">
            <div class="studio-intro" id="studioIntro">
                <div>
                    <p class="studio-kicker" id="projectKicker">Không gian của bạn</p>
                    <h1 id="projectTitle">Việt phục, theo cách bạn.</h1>
                    <p class="studio-intro__note" id="projectContext" hidden></p>
                    <a class="studio-proof-link" href="#studioExample" data-studio-example-link>Xem bản phối mẫu đã tạo ↓</a>
                </div>
            </div>
            <button type="button" class="workspace-new-collection" id="newStudioCollection" disabled>＋ Bộ sưu tập mới</button>
            <p id="collectionActionStatus" role="alert" hidden></p>
            <section class="studio-quick-start" id="studioQuickStart" aria-label="Bắt đầu bản phối" hidden>
                <button type="button" class="studio-start-card" id="workspaceUpload">
                    <span class="studio-start-card__icon"><?= $studioIcon('upload') ?></span>
                    <span><strong>Thêm ảnh của bạn</strong><small>Không bắt buộc · tối đa 8 MB</small></span>
                </button>
                <button type="button" id="workspaceRemoveUpload" class="workspace-remove-upload" hidden>Bỏ ảnh</button>
                <div class="studio-quick-start__options" id="quickStartOptions" hidden></div>
            </section>
        </div>

        <section class="studio-stage" id="studioStage" aria-label="Không gian phối Việt phục">
            <div class="studio-workbench">
                <header class="workspace-panel-header">
                    <div hidden><h2 id="workspacePanelTitle">Bạn sẽ mặc đi đâu?</h2><p id="workspacePanelHint"></p></div>
                    <nav class="workspace-panel-tabs" aria-label="Thông tin bản phối">
                        <button type="button" class="is-active" data-workspace-panel="catalog" aria-pressed="true">Phối đồ</button>
                        <button type="button" data-workspace-panel="heritage" aria-pressed="false">Về trang phục</button>
                        <button type="button" data-workspace-panel="places" aria-pressed="false">Mua & chụp</button>
                    </nav>
                </header>
                <aside class="studio-toolbox" id="workspaceCatalog" aria-label="Bộ sưu tập phối đồ">
                    <div class="studio-collection-heading">
                        <span class="studio-collection-heading__eyebrow">V-Remix / Bắt đầu</span>
                        <strong>Bạn muốn mặc gì hôm nay?</strong>
                        <p class="studio-collection-heading__note">Chọn dịp trước. Sau đó chọn một dáng Việt phục và thêm điểm nhấn theo cách của bạn.</p>
                    </div>
                    <?php require __DIR__ . '/includes/studio/recipe-notice.php'; ?>
                    <?php require __DIR__ . '/includes/studio/planner-steps.php'; ?>

                    <section class="studio-catalog-card studio-catalog-card--garment" data-guide-card="garment" aria-labelledby="catalogGarmentTitle" hidden>
                        <div class="studio-catalog-card__head">
                            <h2 id="catalogGarmentTitle">Chọn trang phục</h2>
                            <button type="button" data-mode="garment">Xem tất cả <span aria-hidden="true">›</span></button>
                        </div>
                        <?php require __DIR__ . '/includes/studio/planner-person.php'; ?>
                        <p class="guide-card-note">Chọn theo ảnh bạn thích. Nhãn “Gợi ý” không thay cho lựa chọn của bạn.</p>
                        <div class="studio-catalog-grid studio-catalog-grid--garment" id="catalogGarments"></div>
                        <?php require __DIR__ . '/includes/studio/intelligence.php'; ?>
                    </section>
                    <section class="studio-catalog-card studio-catalog-card--variant" id="garmentVariantSection" aria-labelledby="catalogGarmentVariantTitle" hidden>
                        <div class="studio-catalog-card__head">
                            <div>
                                <span class="studio-catalog-card__step">Ảnh tham khảo có nguồn</span>
                                <h2 id="catalogGarmentVariantTitle">Mẫu màu và họa tiết</h2>
                            </div>
                            <span class="studio-catalog-card__count" id="garmentVariantCount"></span>
                        </div>
                        <p class="studio-catalog-card__note">Ảnh tham khảo có nguồn. Màu và họa tiết là mô tả biên tập; xem nguồn để đối chiếu.</p>
                        <div class="studio-variant-grid" id="catalogGarmentVariants"></div>
                        <a class="studio-reference-import" id="catalogGarmentResearch" href="catalog-search.php" hidden>Tìm thêm mẫu có nguồn trong Admin ↗</a>
                    </section>
                    <section class="guide-review" id="guideReview" aria-labelledby="guideReviewTitle" hidden>
                        <span class="guide-eyebrow">Lựa chọn của bạn</span>
                        <h3 id="guideReviewTitle">Kiểm tra trước khi tạo ảnh.</h3>
                        <p>Đây là thông tin sẽ dùng cho một ảnh bản phối. Bạn có thể đổi trước khi xác nhận.</p>
                        <button type="button" data-guide-step="event"><span><small>Dịp mặc</small><strong id="guideEventValue"></strong></span><span>Đổi ›</span></button>
                        <button type="button" data-guide-step="people"><span><small>Số người</small><strong id="guidePeopleValue"></strong></span><span>Đổi ›</span></button>
                        <button type="button" data-guide-step="time"><span><small>Thời gian</small><strong id="guideTimeValue"></strong></span><span>Đổi ›</span></button>
                        <button type="button" data-guide-step="garment"><span><small>Trang phục</small><strong id="guideGarmentValue"></strong></span><span>Đổi ›</span></button>
                        <div id="plannerReviewPeople"></div>
                        <button type="button" class="guide-view-preview" id="plannerGenerate">Tạo ảnh bản phối <?= $studioIcon('chevron-right') ?></button>
                        <button type="button" class="planner-secondary" data-show-suggestion>Xem thẻ bản phối · không dùng AI</button>
                    </section>
                    <div class="guide-navigation" id="guideNavigation" hidden>
                        <button type="button" id="guideBack">‹ Quay lại</button>
                        <button type="button" id="guideContinue" disabled>Tiếp tục <?= $studioIcon('chevron-right') ?></button>
                    </div>

                    <details class="studio-customize" id="guideCustomize" hidden>
                        <summary><strong>Thêm nét riêng cho người đang chọn</strong><small>Phụ kiện, biến tấu màu và phong cách · tùy chọn</small></summary>
                    <section class="studio-catalog-card studio-catalog-card--style" aria-labelledby="catalogStyleTitle">
                        <div class="studio-catalog-card__head"><h2 id="catalogStyleTitle">Phong cách bạn thích</h2><button type="button" data-mode="style">Xem tất cả ›</button></div>
                        <div class="studio-catalog-grid studio-catalog-grid--style" id="catalogStyles"></div>
                    </section>
                    <section class="studio-catalog-card studio-catalog-card--color" aria-labelledby="catalogColorTitle">
                        <div class="studio-catalog-card__head">
                            <h2 id="catalogColorTitle">Biến tấu màu</h2>
                            <button type="button" data-mode="color">Xem màu <span aria-hidden="true">›</span></button>
                        </div>
                        <p class="studio-catalog-card__note">Màu gợi ý theo loại áo, không phải mẫu sản phẩm đã xác minh. Không biến tấu để giữ màu của mẫu áo.</p>
                        <button class="studio-reference-reset" type="button" data-catalog-kind="color" data-option-value="" id="useSampleColor">Theo mẫu áo</button>
                        <div class="studio-catalog-grid studio-catalog-grid--color" id="catalogColors"></div>
                    </section>
                    <section class="studio-catalog-card studio-catalog-card--pattern" id="legacyPatternSection" aria-labelledby="catalogPatternTitle" hidden>
                        <div class="studio-catalog-card__head">
                            <h2 id="catalogPatternTitle">Biến tấu họa tiết đang giữ</h2>
                        </div>
                        <p class="studio-catalog-card__note" id="catalogPatterns"></p>
                        <button class="studio-reference-reset" type="button" data-catalog-kind="pattern" data-option-value="">Dùng họa tiết của mẫu áo</button>
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
                    <details class="studio-scene-customize">
                        <summary><span><strong>Đổi nền ảnh</strong><small id="catalogSceneSummary">Theo dịp mặc</small></span><span aria-hidden="true">›</span></summary>
                        <p class="studio-catalog-card__note">Không cần chọn lại bối cảnh. Chỉ đổi khi muốn nền khác với dịp mặc; nền này dùng chung cho cả nhóm.</p>
                        <button class="studio-reference-reset" type="button" data-catalog-kind="scene" data-option-value="" id="useOccasionScene">Theo dịp mặc</button>
                        <div class="studio-catalog-grid studio-catalog-grid--scene" id="catalogScenes"></div>
                    </details>
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

                <section class="studio-preview" aria-label="Bản xem trước" tabindex="-1">
                    <div class="studio-preview__top" hidden>
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
                        <div class="studio-frame<?= $basePoster !== '' ? ' has-idle-poster' : '' ?>">
                            <?php if ($basePoster !== ''): ?>
                                <img id="studioIdlePoster" class="studio-idle-poster" src="<?= $escape($basePoster) ?>" alt="Không gian phối Việt phục với áo xanh chàm và phụ kiện" fetchpriority="high">
                            <?php endif; ?>
                            <video id="studioMedia" class="studio-media" muted loop playsinline preload="metadata" aria-label="Không gian minh họa của Studio"<?= $basePoster !== '' ? ' poster="' . $escape($basePoster) . '"' : '' ?>></video>
                            <img id="studioPreviewImage" class="studio-preview-image" alt="Bản phối AI đang xem trước" hidden>
                            <div class="studio-media-placeholder" aria-hidden="true">
                                <span class="studio-media-placeholder__orb"></span>
                                <span class="studio-media-placeholder__line"></span>
                            </div>
                            <div class="studio-frame__veil" aria-hidden="true"></div>
                            <div class="studio-preview__empty" id="previewEmpty">
                                <strong id="plannerPreviewTitle">Bắt đầu từ dịp bạn sẽ mặc.</strong>
                                <small id="plannerPreviewHint" hidden></small>
                                <button type="button" class="workspace-start" data-workspace-start><span id="plannerPreviewAction">Chọn dịp mặc</span> <?= $studioIcon('chevron-right') ?></button>
                            </div>
                            <div class="studio-generation-loading" id="previewGenerationStatus" hidden>
                                <video id="studioLoadingVideo" muted loop playsinline preload="none" poster="assets/media/studio-loading-poster.jpg" data-src="assets/media/studio-loading-loop.mp4" aria-hidden="true"></video>
                                <span class="studio-sr-only" id="previewGenerationMessage">Đang chuẩn bị bản phối.</span>
                                <span class="studio-loading-fallback" id="studioLoadingFallback" hidden>Đang tạo ảnh…</span>
                                <button type="button" id="studioLoadingToggle" aria-label="Tạm dừng video chờ">Tạm dừng</button>
                            </div>
                        </div>
                        <div class="workspace-compare" id="studioCompare" hidden aria-label="So sánh hai bản phối"></div>
                        <div class="studio-hotspots" id="studioHotspots"></div>
                    </div>

                    <details class="studio-advanced" id="guideAdvanced" hidden>
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
                            <span class="studio-rail__status"><i></i><span id="studioStatus" hidden></span></span>
                            <div id="studioDraftNotice" class="studio-draft-notice" hidden>
                                <p id="studioDraftStatus" role="status"></p>
                                <div class="studio-draft-notice__actions">
                                    <button type="button" class="planner-secondary" id="retryDraftSync" hidden>Thử lưu lại</button>
                                    <button type="button" class="planner-secondary" id="keepLocalCollection" hidden>Giữ bản trên thiết bị thành bộ riêng</button>
                                    <button type="button" class="planner-secondary" id="loadServerCollections" hidden>Mở bản mới nhất</button>
                                </div>
                            </div>
                            <p id="selectionSummary" hidden></p>
                            <button type="button" class="planner-secondary" id="viewSuggestionFallback" data-show-suggestion hidden>Xem thẻ bản phối ngay · không dùng AI</button>
                        </div>
                        <label class="studio-upload" for="inputImage" hidden>
                            <span class="studio-upload__icon" aria-hidden="true"><?= $studioIcon('upload') ?></span>
                            <span><strong>Tải ảnh của bạn</strong><small id="uploadName">Tuỳ chọn · tối đa 8 MB</small></span>
                            <input id="inputImage" type="file" accept="image/jpeg,image/png,image/webp">
                        </label>
                        <input id="outputType" type="hidden" value="<?= $escape((string) ($catalog['generation']['default_output_type'] ?? 'image')) ?>">
                        <div class="studio-variants__actions studio-result-actions">
                            <button type="button" id="compareLooks" disabled>So sánh ảnh</button>
                            <button type="button" id="saveLook" disabled>Lưu bản phối</button>
                            <a class="result-download" id="resultDownload" href="#" download hidden>Tải ảnh <span aria-hidden="true">↓</span></a>
                            <details class="studio-result-more" id="studioResultMore" hidden>
                                <summary aria-label="Thêm thao tác với bản phối" title="Thêm thao tác"><span aria-hidden="true">⋯</span></summary>
                                <div class="studio-result-more__panel" aria-label="Thao tác bổ sung">
                                    <button type="button" id="downloadStory" aria-label="Xuất thẻ chia sẻ 9:16" hidden><span>Xuất thẻ chia sẻ</span><small>Khung 9:16 · giữ nguyên ảnh gốc</small></button>
                                    <button type="button" id="generatePortrait" hidden><span>Tạo ảnh dọc 9:16</span><small>AI tạo phiên bản mới · 1 lượt</small></button>
                                    <button type="button" id="deleteCurrentVersion" hidden>Xóa phiên bản</button>
                                </div>
                            </details>
                            <button type="button" id="addVariant" aria-label="Thêm phụ kiện vào bản phối" hidden><?= $studioIcon('sparkles') ?><span>Thêm phụ kiện</span></button>
                            <button type="button" id="retryGeneration" hidden>Thử tạo lại</button>
                            <button type="button" id="repairGeneration" hidden>Sửa chi tiết chưa khớp</button>
                        </div>
                    </section>

                    <aside class="studio-history" id="studioHistory" aria-label="Lịch sử ảnh bản phối" hidden>
                        <header><strong id="historyTitle">Phiên bản</strong><button type="button" id="historyRecent" aria-label="Xem ảnh gần đây" title="Xem tất cả ảnh gần đây">Ảnh khác</button><button type="button" id="historyCompare" hidden>So sánh</button></header>
                        <p id="historyStatus" role="status"></p>
                        <button type="button" id="historyRetry" hidden>Thử tải lại</button>
                        <div id="historyItems" class="studio-history-strip"></div>
                        <button type="button" id="historyMore" hidden>Xem thêm</button>
                        <div id="historyConfirm" hidden>
                            <p>Mở phiên bản này sẽ thay lựa chọn đang chỉnh. Ảnh đã tạo vẫn được giữ.</p>
                            <button type="button" id="historyAccept">Mở phiên bản</button>
                            <button type="button" id="historyCancel">Giữ lựa chọn</button>
                        </div>
                    </aside>
                    <section class="studio-variants" id="studioVariants" aria-label="Các phương án bản phối" hidden>
                        <div class="studio-variants__title">
                            <span id="workspaceVariantLabel">Dáng áo gợi ý</span>
                            <strong>Đổi từng chi tiết để chọn bản bạn thích.</strong>
                        </div>
                        <div class="studio-variants__strip" id="variantStrip">
                            <button type="button" class="is-active" data-variant="base"><span>A</span><strong>Bản gốc</strong><small>Chưa tạo ảnh</small></button>
                            <button type="button" data-variant="1"><span>01</span><strong>Phương án 1</strong><small>Chưa tạo</small></button>
                            <button type="button" data-variant="2"><span>02</span><strong>Phương án 2</strong><small>Chưa tạo</small></button>
                            <button type="button" data-variant="3"><span>03</span><strong>Phương án 3</strong><small>Chưa tạo</small></button>
                        </div>
                    </section>
                </section>

                <aside class="studio-insights" id="workspaceInsights" aria-label="Thông tin văn hoá và kiểm tra" hidden>
                    <section class="studio-insight studio-passport">
                        <div class="studio-insight__head"><span>Về trang phục</span><small>01</small></div>
                        <div class="studio-passport__visual" id="passportVisual" aria-hidden="true"><span>V</span></div>
                        <h2 id="passportTitle">Chưa chọn Việt phục</h2>
                        <dl>
                            <div><dt>Nguồn gốc</dt><dd id="passportOrigin">Chọn một trang phục để xem nội dung đã được duyệt.</dd></div>
                            <div><dt>Đặc điểm</dt><dd id="passportFeature">—</dd></div>
                            <div><dt>Cấu trúc cần giữ</dt><dd id="passportStructure">Chọn dáng áo để xem đặc trưng cần đối chiếu.</dd></div>
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
                        <a class="studio-search-link" href="shops.php">Mẫu thật từ mạng lưới cửa hàng <span aria-hidden="true">→</span></a>
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

        <details class="workspace-output-details" id="outputDetails" hidden>
        <summary>Thông tin bản phối</summary>
        <dl class="result-selection" id="resultSelectionInfo"></dl>
        <p class="studio-result-note" id="resultVerification" role="status">Ảnh chưa được AI đối chiếu với lựa chọn.</p>
        <p class="studio-result-note" id="resultCopySource"></p>
        <p class="studio-result-note" id="resultReferenceSource"></p>
        <section class="studio-assessment" id="resultAssessment" aria-label="Đối chiếu ảnh theo từng người" hidden></section>
        <section class="studio-result" id="studioResult" hidden>
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
                    <div class="result-story result-score" hidden><span>Điểm gợi ý AI về lựa chọn</span><p id="resultCulturalScore">—</p></div>
                    <div class="result-story"><span>Gợi ý chụp & phối</span><p id="resultGenZTip">—</p></div>
                    <div class="result-video-branches" id="resultVideoBranches" hidden aria-label="Các video chuyển cảnh"></div>
                </div>
            </div>
        </section>
        </details>

        <?php require __DIR__ . '/includes/studio/proof-example.php'; ?>
        <p class="studio-sr-only" id="studioSrStatus" role="status" aria-live="polite">Studio đã sẵn sàng.</p>
    </main>
    <?php require __DIR__ . '/includes/studio/collections.php'; ?>
    <dialog id="studioSuggestion" class="studio-suggestion" aria-labelledby="suggestionTitle">
        <header><div><span>Gợi ý từ catalog</span><h2 id="suggestionTitle">Bản phối bạn đã chọn</h2></div><button type="button" id="closeSuggestion" aria-label="Đóng thẻ bản phối">×</button></header>
        <p id="suggestionStatus" role="status"></p>
        <p class="studio-suggestion__note">Đây là thẻ lựa chọn với ảnh mẫu có nguồn, không phải ảnh AI hay sản phẩm shop đang có sẵn. Không có điểm đánh giá AI.</p>
        <div id="suggestionPeople"></div>
    </dialog>
    <dialog class="studio-auth-dialog" id="studioAuthDialog" aria-labelledby="studioAuthTitle">
        <button type="button" class="studio-auth-close" aria-label="Đóng đăng nhập" id="studioAuthClose">×</button>
        <h2 id="studioAuthTitle"><?= $authUser !== null ? 'Tài khoản của bạn' : 'Đăng nhập hoặc đăng ký' ?></h2>
        <p><?= $authUser !== null ? 'Quản lý phiên đăng nhập V-Remix.' : 'Lưu bản phối và giữ những dáng Việt của riêng bạn.' ?></p>
        <iframe id="studioAuthFrame" title="Đăng nhập V-Remix" data-src="auth.php?next=studio.php%3FauthReturn%3D1&amp;embed=1"></iframe>
    </dialog>
    <script>
        window.VREMIX_STUDIO = <?= json_encode($studioData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) ?>;
    </script>
    <script src="assets/js/studio-planner.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-planner.js') ?>" defer></script>
    <script src="assets/js/studio-session.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-session.js') ?>" defer></script>
    <script src="assets/js/studio-collection-store.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-collection-store.js') ?>" defer></script>
    <script src="assets/js/studio-collections-model.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-collections-model.js') ?>" defer></script>
    <script src="assets/js/studio-loading.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-loading.js') ?>" defer></script>
    <script src="assets/js/studio-result-actions.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-result-actions.js') ?>" defer></script>
    <script src="assets/js/studio-lookbook-card.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-lookbook-card.js') ?>" defer></script>
    <script src="assets/js/studio-catalog-choices.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-catalog-choices.js') ?>" defer></script>
    <script src="assets/js/studio-assessment.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-assessment.js') ?>" defer></script>
    <script src="assets/js/studio-example.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-example.js') ?>" defer></script>
    <script src="assets/js/studio.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio.js') ?>" defer></script>
    <script src="assets/js/studio-history.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-history.js') ?>" defer></script>
    <script src="assets/js/studio-workspace.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-workspace.js') ?>" defer></script>
    <script src="assets/js/studio-planner-ui.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-planner-ui.js') ?>" defer></script>
    <script src="assets/js/studio-intelligence.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-intelligence.js') ?>" defer></script>
    <script src="assets/js/studio-suggestion.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-suggestion.js') ?>" defer></script>
    <script src="assets/js/studio-auth-modal.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-auth-modal.js') ?>" defer></script>
    <script src="assets/js/studio-collections.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/studio-collections.js') ?>" defer></script>
</body>
</html>
