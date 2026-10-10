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
$escape = static fn (mixed $value): string => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
$next = SupabaseAuth::safeNext((string) ($_REQUEST['next'] ?? 'studio.php'));
$embedded = (string) ($_REQUEST['embed'] ?? '') === '1';
$embedQuery = $embedded ? '&amp;embed=1' : '';
$mode = ($_GET['mode'] ?? '') === 'signup' ? 'signup' : 'login';
$message = '';
$error = '';
$retryAfterSeconds = 0;
$action = '';
$formValues = [
    'display_name' => '',
    'email' => '',
];

if (isset($_GET['error'])) {
    $error = match ((string) $_GET['error']) {
        'google-disabled' => 'Google OAuth chưa được bật trong Supabase. Hãy cấu hình Google Client ID và Client Secret trong Authentication → Providers.',
        'oauth-failed' => 'Không thể hoàn tất đăng nhập Google. Hãy thử lại.',
        default => 'Phiên đăng nhập không hợp lệ.',
    };
}
if (isset($_GET['message']) && $_GET['message'] === 'confirmed') {
    $message = 'Email đã được xác nhận. Bạn có thể đăng nhập.';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    $formValues['display_name'] = trim((string) ($_POST['display_name'] ?? ''));
    $formValues['email'] = trim((string) ($_POST['email'] ?? ''));
    try {
        if (!$auth->verifyCsrf((string) ($_POST['csrf'] ?? ''))) {
            throw new RuntimeException('Phiên biểu mẫu đã hết hạn. Hãy tải lại trang.');
        }
        if ($action === 'login') {
            $auth->login((string) ($_POST['email'] ?? ''), (string) ($_POST['password'] ?? ''));
            header('Location: ' . $next);
            exit;
        }
        if ($action === 'signup') {
            $origin = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http')
                . '://' . (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
            $basePath = rtrim(str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/'))), '/');
            $result = $auth->signUp(
                (string) ($_POST['email'] ?? ''),
                (string) ($_POST['password'] ?? ''),
                (string) ($_POST['display_name'] ?? ''),
                $origin . $basePath . '/auth.php?message=confirmed&next=' . rawurlencode($next)
            );
            if ($result['authenticated']) {
                header('Location: ' . $next);
                exit;
            }
            $message = 'Tài khoản đã được tạo. Hãy kiểm tra email để xác nhận trước khi đăng nhập.';
            $mode = 'login';
        }
        if ($action === 'logout') {
            $auth->logout();
            header('Location: ' . ($embedded ? $next : 'auth.php?next=' . rawurlencode($next)));
            exit;
        }
        if ($action === 'update-profile') {
            $auth->updateDisplayName($formValues['display_name']);
            $message = 'Đã lưu tên hiển thị.';
        }
    } catch (Throwable $exception) {
        $error = $exception->getMessage();
        if (preg_match('/sau\s+(\d+)\s+giây/u', $error, $matches) === 1) {
            $retryAfterSeconds = max(1, (int) $matches[1]);
        } elseif (str_contains($error, 'thao tác quá nhanh')) {
            $retryAfterSeconds = 60;
        }
        $mode = $action === 'signup' ? 'signup' : 'login';
    }
}

$user = $auth->user();
$googleEnabled = $user === null && $auth->googleEnabled();
$isAdmin = false;
if ($user !== null) {
    try {
        $isAdmin = $auth->isAdmin();
    } catch (Throwable $exception) {
        error_log('[V-Remix] Account role check failed.');
    }
}
$displayName = '';
if ($user !== null) {
    $displayName = trim((string) ($user['user_metadata']['display_name'] ?? $user['user_metadata']['full_name'] ?? ''));
}
?>
<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f3efe7">
    <title>Tài khoản — V-Remix</title>
    <meta name="description" content="Đăng nhập hoặc tạo tài khoản V-Remix để lưu và quản lý lookbook Việt phục.">
    <meta name="robots" content="noindex,follow">
    <?php require __DIR__ . '/includes/website-bootstrap.php'; ?>
    <link rel="icon" href="<?= $escape($websiteSettings['brand']['favicon'] ?: 'assets/media/favicon.svg') ?>">
    <link rel="apple-touch-icon" href="<?= $escape($websiteSettings['brand']['apple_icon'] ?: 'assets/media/brand/apple-touch-icon.png') ?>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/auth.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/auth.css') ?>">
</head>
<body class="auth-page<?= $embedded ? ' auth-page--embedded' : '' ?>">
    <main class="auth-shell">
        <section class="auth-visual" aria-label="Giới thiệu V-Remix">
            <a class="auth-brand" href="index.php#stage">V<span>–</span>Remix</a>
            <div class="auth-visual__copy">
                <p>Tài khoản / V-Remix</p>
                <h1>Giữ những<br><em>dáng Việt</em><br>của riêng bạn.</h1>
            </div>
            <p class="auth-visual__note">Lưu look, tiếp tục chỉnh sửa và quản lý thư viện cá nhân trên mọi thiết bị.</p>
        </section>

        <section class="auth-panel">
            <div class="auth-panel__top">
                <span>SUPABASE AUTH</span>
                <a href="<?= $escape($next) ?>">Đóng ×</a>
            </div>
            <?php if ($user !== null): ?>
                <div class="auth-account" data-account-name="<?= $escape($displayName !== '' ? $displayName : 'Tài khoản') ?>">
                    <p class="auth-kicker">Đã đăng nhập</p>
                    <h2>Thông tin tài khoản</h2>
                    <?php if ($error !== ''): ?><p class="auth-alert auth-alert--error" role="alert"><?= $escape($error) ?></p><?php endif; ?>
                    <?php if ($message !== ''): ?><p class="auth-alert" role="status"><?= $escape($message) ?></p><?php endif; ?>
                    <dl class="auth-account-details">
                        <div><dt>Email</dt><dd><?= $escape((string) ($user['email'] ?? '')) ?></dd></div>
                        <div><dt>Trạng thái email</dt><dd><?= !empty($user['email_confirmed_at']) ? 'Đã xác nhận' : 'Chưa xác nhận' ?></dd></div>
                        <div><dt>Quyền truy cập</dt><dd><?= $isAdmin ? 'Quản trị viên' : 'Thành viên' ?></dd></div>
                    </dl>
                    <form method="post" class="auth-form" data-auth-form>
                        <?php if ($embedded): ?><input type="hidden" name="embed" value="1"><?php endif; ?>
                        <input type="hidden" name="csrf" value="<?= $escape($auth->csrfToken()) ?>">
                        <input type="hidden" name="action" value="update-profile">
                        <input type="hidden" name="next" value="<?= $escape($next) ?>">
                        <label>Tên hiển thị
                            <input type="text" name="display_name" value="<?= $escape($error !== '' && $action === 'update-profile' ? $formValues['display_name'] : $displayName) ?>" minlength="2" maxlength="80" autocomplete="name" required>
                        </label>
                        <button class="auth-button auth-button--primary" type="submit" data-auth-submit>Lưu thông tin</button>
                    </form>
                    <?php if ($isAdmin): ?>
                        <a class="auth-button auth-account-admin" href="admin.php" <?= $embedded ? 'target="_top"' : '' ?>>Mở trang quản trị <span aria-hidden="true">↗</span></a>
                    <?php endif; ?>
                    <?php if (!$embedded): ?><a class="auth-button auth-button--text" href="<?= $escape($next) ?>">Quay lại Studio</a><?php endif; ?>
                    <form method="post">
                        <?php if ($embedded): ?><input type="hidden" name="embed" value="1"><?php endif; ?>
                        <input type="hidden" name="csrf" value="<?= $escape($auth->csrfToken()) ?>">
                        <input type="hidden" name="action" value="logout">
                        <input type="hidden" name="next" value="<?= $escape($next) ?>">
                        <button class="auth-button auth-button--text" type="submit">Đăng xuất tài khoản</button>
                    </form>
                </div>
            <?php else: ?>
                <div class="auth-tabs" role="tablist" aria-label="Chọn hình thức tài khoản">
                    <a class="<?= $mode === 'login' ? 'is-active' : '' ?>" href="auth.php?mode=login&amp;next=<?= rawurlencode($next) ?><?= $embedQuery ?>">Đăng nhập</a>
                    <a class="<?= $mode === 'signup' ? 'is-active' : '' ?>" href="auth.php?mode=signup&amp;next=<?= rawurlencode($next) ?><?= $embedQuery ?>">Tạo tài khoản</a>
                </div>

                <?php if ($error !== ''): ?><p class="auth-alert auth-alert--error" role="alert"><?= $escape($error) ?></p><?php endif; ?>
                <?php if ($message !== ''): ?><p class="auth-alert" role="status"><?= $escape($message) ?></p><?php endif; ?>

                <div class="auth-heading">
                    <p class="auth-kicker"><?= $mode === 'signup' ? 'Thư viện của bạn' : 'Chào mừng trở lại' ?></p>
                    <h2><?= $mode === 'signup' ? 'Bắt đầu một look mới.' : 'Tiếp tục bản phối.' ?></h2>
                </div>

                <?php if ($googleEnabled): ?>
                    <a class="auth-button auth-button--google" <?= $embedded ? 'target="_top"' : '' ?> href="auth-google.php?next=<?= rawurlencode($next) ?>">
                        <span class="auth-google-mark" aria-hidden="true">G</span>
                        Tiếp tục với Google
                    </a>
                <?php else: ?>
                    <button class="auth-button auth-button--google is-disabled" type="button" disabled title="Google OAuth chưa được bật trong Supabase">
                        <span class="auth-google-mark" aria-hidden="true">G</span>
                        Tiếp tục với Google
                    </button>
                <?php endif; ?>
                <?php if (!$googleEnabled): ?>
                    <p class="auth-provider-note">Google đang chờ cấu hình OAuth Client trong Supabase; đăng ký email vẫn hoạt động bình thường.</p>
                <?php endif; ?>

                <div class="auth-divider"><span>hoặc bằng email</span></div>

                <form method="post" class="auth-form" data-auth-form>
                    <?php if ($embedded): ?><input type="hidden" name="embed" value="1"><?php endif; ?>
                    <input type="hidden" name="csrf" value="<?= $escape($auth->csrfToken()) ?>">
                    <input type="hidden" name="action" value="<?= $mode === 'signup' ? 'signup' : 'login' ?>">
                    <input type="hidden" name="next" value="<?= $escape($next) ?>">
                    <?php if ($mode === 'signup'): ?>
                        <label>Họ và tên
                            <input type="text" name="display_name" value="<?= $escape($formValues['display_name']) ?>" minlength="2" maxlength="80" autocomplete="name" required>
                        </label>
                    <?php endif; ?>
                    <label>Email
                        <input type="email" name="email" value="<?= $escape($formValues['email']) ?>" autocomplete="email" inputmode="email" required>
                    </label>
                    <label>Mật khẩu
                        <input type="password" name="password" minlength="8" maxlength="128" autocomplete="<?= $mode === 'signup' ? 'new-password' : 'current-password' ?>" required>
                        <?php if ($mode === 'signup'): ?><small>Tối thiểu 8 ký tự.</small><?php endif; ?>
                    </label>
                    <button class="auth-button auth-button--primary" type="submit" data-auth-submit data-retry-after="<?= $retryAfterSeconds ?>">
                        <?= $mode === 'signup' ? 'Tạo tài khoản' : 'Đăng nhập' ?> <span>↗</span>
                    </button>
                    <small class="auth-cooldown" data-auth-cooldown aria-live="polite"<?= $retryAfterSeconds > 0 ? '' : ' hidden' ?>></small>
                </form>
                <p class="auth-legal">Bằng việc tiếp tục, bạn đồng ý để V-Remix lưu thông tin tài khoản và thư viện look theo chính sách dữ liệu của dự án.</p>
            <?php endif; ?>
        </section>
    </main>
    <script src="assets/js/auth.js?v=<?= (int) filemtime(__DIR__ . '/assets/js/auth.js') ?>"></script>
</body>
</html>
