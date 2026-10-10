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
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    try {
        if ($action === 'logout' && $auth->verifyCsrf((string) ($_POST['csrf'] ?? ''))) {
            $auth->logout();
            header('Location: auth.php?next=admin.php');
            exit;
        }
    } catch (Throwable $exception) {
        $error = $exception->getMessage();
    }
}

$escape = static fn (mixed $value): string => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
$user = $auth->user();
if ($user !== null && $auth->isLocalRequest()) {
    try {
        if ($auth->bootstrapFirstLocalAdmin()) {
            $message = 'Tài khoản đầu tiên đã được cấp quyền Admin trên localhost.';
        }
    } catch (Throwable $exception) {
        $error = 'Không thể kiểm tra quyền Admin: ' . $exception->getMessage();
    }
}
$authenticated = $user !== null && $auth->isAdmin();
$serviceReady = (string) getenv('SUPABASE_URL') !== '' && (string) getenv('SUPABASE_SERVICE_ROLE_KEY') !== '';
?>
<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f0f8fc">
    <?php $websitePage = 'private'; $websitePrivateTitle = 'Quản trị — V-Remix'; require __DIR__ . '/includes/partials/website-meta.php'; ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/admin.css') ?>">
    <link rel="stylesheet" href="assets/css/admin-dashboard.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/admin-dashboard.css') ?>">
    <link rel="stylesheet" href="assets/css/admin-website.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/admin-website.css') ?>">
</head>
<body class="admin-page">
<?php if (!$authenticated): ?>
    <main class="admin-gate">
        <div class="admin-gate__aside">
            <a class="admin-wordmark" href="index.php#stage">V<span>/</span>REMIX</a>
            <p class="admin-eyebrow">Control room / 02</p>
            <h1>Giữ cho<br><em>dáng Việt</em><br>đúng tinh thần.</h1>
            <p class="admin-gate__note">Quản lý catalog, media, nguồn văn hoá và prompt của Studio từ một nơi.</p>
        </div>
        <section class="admin-gate__card">
            <div class="admin-card__topline"><span>V-REMIX ADMIN</span><span><?= $serviceReady ? 'SUPABASE / READY' : 'SUPABASE / SETUP' ?></span></div>
            <?php if ($error !== ''): ?><p class="admin-alert admin-alert--error"><?= $escape($error) ?></p><?php endif; ?>
            <?php if ($message !== ''): ?><p class="admin-alert"><?= $escape($message) ?></p><?php endif; ?>
            <?php if ($user === null): ?>
                <p class="admin-card__kicker">Supabase account</p>
                <h2>Đăng nhập bằng tài khoản.</h2>
                <p class="admin-card__copy">Admin không còn dùng khoá hoặc mật khẩu chia sẻ. Hãy đăng nhập bằng email hoặc Google; quyền quản trị được kiểm tra theo role trong Supabase.</p>
                <a class="admin-button admin-button--solid" href="auth.php?next=admin.php">Đăng nhập Admin <span>↗</span></a>
            <?php else: ?>
                <p class="admin-card__kicker">Chưa có quyền Admin</p>
                <h2>Tài khoản đã đăng nhập.</h2>
                <p class="admin-card__copy"><?= $escape((string) ($user['email'] ?? '')) ?> chưa có role <strong>admin</strong>. Quản trị viên hiện tại có thể cấp role trong bảng <code>user_roles</code>.</p>
                <form method="post" class="admin-form">
                    <input type="hidden" name="action" value="logout">
                    <input type="hidden" name="csrf" value="<?= $escape($auth->csrfToken()) ?>">
                    <button class="admin-button admin-button--solid" type="submit">Đăng xuất và đổi tài khoản <span>↗</span></button>
                </form>
            <?php endif; ?>
            <a class="admin-backlink" href="studio.php">← Quay lại Studio</a>
        </section>
    </main>
<?php else: ?>
    <main class="admin-shell" id="adminApp">
        <a class="admin-skip" href="#adminContent">Bỏ qua điều hướng</a>
        <?php require __DIR__ . '/includes/admin/navigation.php'; ?>
        <header class="admin-header">
            <div>
                <div class="admin-header__heading"><span class="admin-eyebrow">V-Remix / Admin</span><h1>Không gian quản trị.</h1><p>Nội dung, sáng tạo và vận hành — trong một nơi.</p></div>
            </div>
            <div class="admin-header__actions">
                <label class="admin-search"><?= $adminIcon('search') ?><span class="admin-sr-only">Tìm mục quản trị</span><input id="adminSearch" type="search" placeholder="Tìm mục quản trị…" autocomplete="off"></label>
                <a class="admin-open-studio" href="studio.php">Mở Studio <span>↗</span></a>
                <form method="post">
                    <input type="hidden" name="action" value="logout">
                    <input type="hidden" name="csrf" value="<?= $escape($auth->csrfToken()) ?>">
                    <button class="admin-signout" type="submit" title="Đăng xuất" aria-label="Đăng xuất"><?= $adminIcon('logout') ?></button>
                </form>
            </div>
        </header>
        <section class="admin-workspace">
            <nav class="admin-nav" id="adminNavigation" aria-label="Các mục quản trị" tabindex="-1">
                <div class="admin-nav__heading"><strong id="adminGroupTitle">AI & chi phí</strong><button id="adminMenuClose" type="button" aria-label="Đóng menu">×</button></div>
                <p class="admin-nav__label">AI operations</p>
                <button class="is-active" data-resource="ai-settings"><span>00</span>API & chi phí</button>
                <button data-resource="studio-generation"><span>01</span>Cấu hình Studio</button>
                <p class="admin-nav__label">Collections</p>
                <button data-resource="events"><span>02</span>Bối cảnh</button>
                <button data-resource="garments"><span>03</span>Cổ phục</button>
                <button data-resource="garment-variants"><span>03A</span>Mẫu cổ phục</button>
                <button data-resource="accessories"><span>04</span>Phụ kiện</button>
                <button data-resource="accessory-variants"><span>04A</span>Mẫu phụ kiện</button>
                <a class="admin-nav__link" href="catalog-search.php"><span>04B</span>Tìm & nhập nguồn</a>
                <a class="admin-nav__link" href="shops.php?mode=review"><span>04C</span>Mạng lưới cửa hàng</a>
                <button data-resource="options"><span>05</span>Màu, họa tiết & phong cách</button>
                <button data-resource="marketplace"><span>05A</span>Nơi mua / thuê</button>
                <button data-resource="locations"><span>05B</span>Địa điểm chụp</button>
                <button data-resource="rules"><span>06</span>Quy tắc văn hoá</button>
                <p class="admin-nav__label">Editorial</p>
                <button data-resource="branches"><span>07</span>Tầng 1 / Media</button>
                <button data-resource="sources"><span>08</span>Nguồn văn hoá</button>
                <button data-resource="prompts"><span>09</span>Prompt versions</button>
                <button data-resource="pages"><span>10</span>Trang chủ</button>
                <button data-resource="brand"><span>10D</span>Thương hiệu · Logo & icon</button>
                <button data-resource="seo"><span>10E</span>SEO & chia sẻ</button>
                <p class="admin-nav__label">Accounts</p>
                <button data-resource="users"><span>10A</span>Người dùng</button>
                <button data-resource="roles"><span>10B</span>Phân quyền</button>
                <button data-resource="google-auth"><span>10C</span>Đăng nhập Google</button>
                <p class="admin-nav__label">Operations</p>
                <button data-resource="looks"><span>11</span>Bản phối đã lưu</button>
                <button data-resource="discovery"><span>12</span>Discovery pool</button>
                <button data-resource="jobs"><span>13</span>Lịch sử tạo ảnh</button>
                <p class="admin-nav__empty" id="adminSearchEmpty" role="status" hidden>Không tìm thấy mục phù hợp.</p>
                <p class="admin-nav__footnote">Dữ liệu từ Supabase.<br>Thay đổi chỉ áp dụng khi lưu.</p>
            </nav>
            <section class="admin-content" id="adminContent" tabindex="-1">
                <div class="admin-content__toolbar">
                    <div>
                        <p class="admin-eyebrow" id="adminResourceKicker">AI operations / 00</p>
                        <h2 id="adminResourceTitle">API, model & chi phí</h2>
                    </div>
                    <div class="admin-toolbar__actions">
                        <span class="admin-sync-state" id="adminSyncState">Chưa tải dữ liệu</span>
                        <button class="admin-button admin-button--ghost" id="adminRefresh" type="button"><?= $adminIcon('refresh') ?> Làm mới</button>
                        <button class="admin-button admin-button--solid" id="adminCreate" type="button">Tạo mới <span>＋</span></button>
                    </div>
                </div>
                <div class="admin-metrics" id="adminMetrics" hidden></div>
                <section class="admin-quick-config" id="adminQuickConfig" aria-label="Trạng thái cấu hình AI">
                    <div class="admin-quick-config__copy">
                        <span class="admin-quick-config__eyebrow">Runtime configuration</span>
                        <strong id="adminKeyStatus">Đang đọc trạng thái API key…</strong>
                        <p>Key chỉ hiển thị dạng che khuất và 4 ký tự cuối. Supabase/Edge Function không cho đọc ngược plaintext.</p>
                    </div>
                    <div class="admin-quick-config__facts">
                        <span><b id="adminImageRoute">Ảnh —</b><small>provider / model</small></span>
                        <span><b id="adminVideoRoute">Video —</b><small>provider / model</small></span>
                        <button class="admin-button admin-button--solid" id="adminQuickEdit" type="button">Cấu hình API & video</button>
                    </div>
                </section>
                <?php require __DIR__ . '/includes/admin/google-auth.php'; ?>
                <?php require __DIR__ . '/includes/admin/website-settings.php'; ?>
                <div class="admin-table-wrap" id="adminTableWrap">
                    <table class="admin-table">
                        <thead id="adminTableHead"></thead>
                        <tbody id="adminTableBody"></tbody>
                    </table>
                    <div class="admin-empty" id="adminEmpty" hidden>Chưa có dữ liệu trong collection này.</div>
                </div>
            </section>
        </section>
        <p class="admin-sr-only" id="adminStatus" role="status" aria-live="polite">Admin đã sẵn sàng.</p>
    </main>
    <dialog class="admin-dialog" id="adminDialog" aria-labelledby="editorTitle">
        <form method="dialog" class="admin-dialog__card" id="adminEditor">
            <div class="admin-dialog__header">
                <div><p class="admin-eyebrow" id="editorKicker">Edit</p><h2 id="editorTitle">Chỉnh sửa</h2></div>
                <button class="admin-dialog__close" value="cancel" type="submit" formnovalidate aria-label="Đóng">×</button>
            </div>
            <div class="admin-editor__fields" id="editorFields"></div>
            <p class="admin-alert admin-alert--error" id="editorError" role="alert" hidden></p>
            <div class="admin-dialog__footer">
                <button class="admin-button admin-button--ghost" value="cancel" type="submit" formnovalidate>Huỷ</button>
                <button class="admin-button admin-button--solid" id="editorSave" value="default" type="submit">Lưu vào Supabase <span>↗</span></button>
            </div>
        </form>
    </dialog>
    <script>
        window.VREMIX_ADMIN = <?= json_encode([
            'endpoint' => 'admin-api.php',
            'csrf' => $auth->csrfToken(),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) ?>;
    </script>
    <script src="assets/js/admin-google-auth.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/admin-google-auth.js') ?>" defer></script>
    <script src="assets/js/admin-website.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/admin-website.js') ?>" defer></script>
    <script src="assets/js/admin.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/admin.js') ?>" defer></script>
    <script src="assets/js/admin-shell.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/admin-shell.js') ?>" defer></script>
<?php endif; ?>
</body>
</html>
