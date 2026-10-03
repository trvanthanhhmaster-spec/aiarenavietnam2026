<?php
declare(strict_types=1);

require __DIR__ . '/src/Support/Env.php';
require __DIR__ . '/src/Support/AdminAuth.php';

use App\Support\AdminAuth;
use App\Support\Env;

Env::load(__DIR__ . '/.env');
$adminAuthFile = (string) (getenv('ADMIN_AUTH_FILE') ?: __DIR__ . '/storage/admin-auth.json');
$auth = new AdminAuth($adminAuthFile);
$auth->boot();
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    try {
        if ($action === 'setup') {
            $auth->configure((string) ($_POST['password'] ?? ''));
            header('Location: admin.php');
            exit;
        }
        if ($action === 'login') {
            if (!$auth->login((string) ($_POST['password'] ?? ''))) {
                throw new RuntimeException('Mật khẩu quản trị không đúng.');
            }
            header('Location: admin.php');
            exit;
        }
        if ($action === 'logout' && $auth->verifyCsrf((string) ($_POST['csrf'] ?? ''))) {
            $auth->logout();
            header('Location: admin.php');
            exit;
        }
    } catch (Throwable $exception) {
        $error = $exception->getMessage();
    }
}

$escape = static fn (mixed $value): string => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
$configured = $auth->isConfigured();
$authenticated = $auth->isAuthenticated();
$serviceReady = (string) getenv('SUPABASE_URL') !== '' && (string) getenv('SUPABASE_SERVICE_ROLE_KEY') !== '';
?>
<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f3efe7">
    <title>Quản trị — V-Remix</title>
    <link rel="icon" href="assets/media/favicon.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/admin.css') ?>">
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
            <?php if (!$configured): ?>
                <p class="admin-card__kicker">Thiết lập lần đầu</p>
                <h2>Tạo khoá quản trị cục bộ.</h2>
                <p class="admin-card__copy">Thiết lập này chỉ được phép từ localhost và mật khẩu không được lưu vào Git. Hãy dùng ít nhất 12 ký tự.</p>
                <form method="post" class="admin-form">
                    <input type="hidden" name="action" value="setup">
                    <label>Mật khẩu quản trị
                        <input type="password" name="password" minlength="12" autocomplete="new-password" required>
                    </label>
                    <button class="admin-button admin-button--solid" type="submit">Tạo quyền truy cập <span>↗</span></button>
                </form>
            <?php else: ?>
                <p class="admin-card__kicker">Private access</p>
                <h2>Đăng nhập control room.</h2>
                <p class="admin-card__copy">Phiên quản trị được giữ bằng cookie HttpOnly và mọi lệnh thay đổi đều yêu cầu CSRF token.</p>
                <form method="post" class="admin-form">
                    <input type="hidden" name="action" value="login">
                    <label>Mật khẩu quản trị
                        <input type="password" name="password" autocomplete="current-password" required autofocus>
                    </label>
                    <button class="admin-button admin-button--solid" type="submit">Mở admin <span>↗</span></button>
                </form>
            <?php endif; ?>
            <a class="admin-backlink" href="studio.php">← Quay lại Studio</a>
        </section>
    </main>
<?php else: ?>
    <main class="admin-shell" id="adminApp">
        <header class="admin-header">
            <div>
                <a class="admin-wordmark" href="index.php#stage">V<span>/</span>REMIX</a>
                <span class="admin-header__label">/ Control room</span>
            </div>
            <div class="admin-header__actions">
                <a href="studio.php">Mở Studio <span>↗</span></a>
                <form method="post">
                    <input type="hidden" name="action" value="logout">
                    <input type="hidden" name="csrf" value="<?= $escape($auth->csrfToken()) ?>">
                    <button type="submit">Đăng xuất</button>
                </form>
            </div>
        </header>
        <section class="admin-intro">
            <div>
                <p class="admin-eyebrow">Supabase / source of truth</p>
                <h1>Điều khiển những gì<br><em>người dùng nhìn thấy.</em></h1>
            </div>
            <p class="admin-intro__copy">Catalog và nội dung dưới đây được đọc trực tiếp từ Supabase. Lưu một thay đổi sẽ cập nhật Studio ở lần tải tiếp theo.</p>
        </section>
        <section class="admin-workspace">
            <nav class="admin-nav" aria-label="Các nhóm quản trị">
                <p class="admin-nav__label">AI operations</p>
                <button class="is-active" data-resource="ai-settings"><span>00</span>API & chi phí</button>
                <button data-resource="studio-generation"><span>01</span>Studio generation</button>
                <p class="admin-nav__label">Collections</p>
                <button data-resource="events"><span>02</span>Bối cảnh</button>
                <button data-resource="garments"><span>03</span>Cổ phục</button>
                <button data-resource="accessories"><span>04</span>Phụ kiện</button>
                <button data-resource="options"><span>05</span>Màu, họa tiết & phong cách</button>
                <button data-resource="marketplace"><span>05A</span>Nơi mua / thuê</button>
                <button data-resource="locations"><span>05B</span>Địa điểm chụp</button>
                <button data-resource="rules"><span>06</span>Quy tắc văn hoá</button>
                <p class="admin-nav__label">Editorial</p>
                <button data-resource="branches"><span>07</span>Tầng 1 / Media</button>
                <button data-resource="sources"><span>08</span>Nguồn văn hoá</button>
                <button data-resource="prompts"><span>09</span>Prompt versions</button>
                <button data-resource="pages"><span>10</span>Trang chủ</button>
                <p class="admin-nav__label">Operations</p>
                <button data-resource="looks"><span>11</span>Looks</button>
                <button data-resource="discovery"><span>12</span>Discovery pool</button>
                <button data-resource="jobs"><span>13</span>Generation jobs</button>
            </nav>
            <section class="admin-content">
                <div class="admin-content__toolbar">
                    <div>
                        <p class="admin-eyebrow" id="adminResourceKicker">AI operations / 00</p>
                        <h2 id="adminResourceTitle">API, model & chi phí</h2>
                    </div>
                    <div class="admin-toolbar__actions">
                        <span class="admin-sync-state" id="adminSyncState">Chưa tải dữ liệu</span>
                        <button class="admin-button admin-button--ghost" id="adminRefresh" type="button">Làm mới</button>
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
                <div class="admin-table-wrap">
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
    <dialog class="admin-dialog" id="adminDialog">
        <form method="dialog" class="admin-dialog__card" id="adminEditor">
            <div class="admin-dialog__header">
                <div><p class="admin-eyebrow" id="editorKicker">Edit</p><h2 id="editorTitle">Chỉnh sửa</h2></div>
                <button class="admin-dialog__close" value="cancel" type="submit" aria-label="Đóng">×</button>
            </div>
            <div class="admin-editor__fields" id="editorFields"></div>
            <div class="admin-dialog__footer">
                <button class="admin-button admin-button--ghost" value="cancel" type="submit">Huỷ</button>
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
    <script src="assets/js/admin.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/admin.js') ?>" defer></script>
<?php endif; ?>
</body>
</html>
