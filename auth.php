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
$mode = ($_GET['mode'] ?? '') === 'signup' ? 'signup' : 'login';
$message = '';
$error = '';

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
            header('Location: auth.php?next=' . rawurlencode($next));
            exit;
        }
    } catch (Throwable $exception) {
        $error = $exception->getMessage();
        $mode = $action === 'signup' ? 'signup' : 'login';
    }
}

$user = $auth->user();
$googleEnabled = $auth->googleEnabled();
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
    <link rel="icon" href="assets/media/favicon.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/auth.css?v=<?= (int) filemtime(__DIR__ . '/assets/css/auth.css') ?>">
</head>
<body class="auth-page">
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
                <div class="auth-account">
                    <p class="auth-kicker">Đã đăng nhập</p>
                    <h2><?= $escape($displayName !== '' ? $displayName : 'Tài khoản V-Remix') ?></h2>
                    <p><?= $escape((string) ($user['email'] ?? '')) ?></p>
                    <a class="auth-button auth-button--primary" href="<?= $escape($next) ?>">Tiếp tục <span>↗</span></a>
                    <form method="post">
                        <input type="hidden" name="csrf" value="<?= $escape($auth->csrfToken()) ?>">
                        <input type="hidden" name="action" value="logout">
                        <input type="hidden" name="next" value="<?= $escape($next) ?>">
                        <button class="auth-button auth-button--text" type="submit">Đăng xuất tài khoản</button>
                    </form>
                </div>
            <?php else: ?>
                <div class="auth-tabs" role="tablist" aria-label="Chọn hình thức tài khoản">
                    <a class="<?= $mode === 'login' ? 'is-active' : '' ?>" href="auth.php?mode=login&amp;next=<?= rawurlencode($next) ?>">Đăng nhập</a>
                    <a class="<?= $mode === 'signup' ? 'is-active' : '' ?>" href="auth.php?mode=signup&amp;next=<?= rawurlencode($next) ?>">Tạo tài khoản</a>
                </div>

                <?php if ($error !== ''): ?><p class="auth-alert auth-alert--error" role="alert"><?= $escape($error) ?></p><?php endif; ?>
                <?php if ($message !== ''): ?><p class="auth-alert" role="status"><?= $escape($message) ?></p><?php endif; ?>

                <div class="auth-heading">
                    <p class="auth-kicker"><?= $mode === 'signup' ? 'Thư viện của bạn' : 'Chào mừng trở lại' ?></p>
                    <h2><?= $mode === 'signup' ? 'Bắt đầu một look mới.' : 'Tiếp tục bản phối.' ?></h2>
                </div>

                <?php if ($googleEnabled): ?>
                    <a class="auth-button auth-button--google" href="auth-google.php?next=<?= rawurlencode($next) ?>">
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

                <form method="post" class="auth-form">
                    <input type="hidden" name="csrf" value="<?= $escape($auth->csrfToken()) ?>">
                    <input type="hidden" name="action" value="<?= $mode === 'signup' ? 'signup' : 'login' ?>">
                    <input type="hidden" name="next" value="<?= $escape($next) ?>">
                    <?php if ($mode === 'signup'): ?>
                        <label>Họ và tên
                            <input type="text" name="display_name" minlength="2" maxlength="80" autocomplete="name" required>
                        </label>
                    <?php endif; ?>
                    <label>Email
                        <input type="email" name="email" autocomplete="email" inputmode="email" required>
                    </label>
                    <label>Mật khẩu
                        <input type="password" name="password" minlength="8" maxlength="128" autocomplete="<?= $mode === 'signup' ? 'new-password' : 'current-password' ?>" required>
                        <?php if ($mode === 'signup'): ?><small>Tối thiểu 8 ký tự.</small><?php endif; ?>
                    </label>
                    <button class="auth-button auth-button--primary" type="submit">
                        <?= $mode === 'signup' ? 'Tạo tài khoản' : 'Đăng nhập' ?> <span>↗</span>
                    </button>
                </form>
                <p class="auth-legal">Bằng việc tiếp tục, bạn đồng ý để V-Remix lưu thông tin tài khoản và thư viện look theo chính sách dữ liệu của dự án.</p>
            <?php endif; ?>
        </section>
    </main>
</body>
</html>
