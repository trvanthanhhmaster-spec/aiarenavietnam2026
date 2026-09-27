<?php
declare(strict_types=1);

namespace App\Support;

use RuntimeException;

final class AdminAuth
{
    private const SESSION_KEY = 'vremix_admin_authenticated';
    private const CSRF_KEY = 'vremix_admin_csrf';
    private const ATTEMPTS_KEY = 'vremix_admin_attempts';

    public function __construct(private string $credentialsFile)
    {
    }

    public function boot(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        session_name('vremix_admin');
        session_set_cookie_params([
            'httponly' => true,
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'samesite' => 'Strict',
            'path' => '/',
        ]);
        session_start();
    }

    public function isConfigured(): bool
    {
        return is_file($this->credentialsFile);
    }

    public function isAuthenticated(): bool
    {
        return !empty($_SESSION[self::SESSION_KEY]);
    }

    public function canConfigureFromCurrentRequest(): bool
    {
        $address = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        return in_array($address, ['127.0.0.1', '::1'], true);
    }

    public function configure(string $password): void
    {
        if ($this->isConfigured()) {
            throw new RuntimeException('Tài khoản quản trị đã được thiết lập.');
        }
        if (!$this->canConfigureFromCurrentRequest()) {
            throw new RuntimeException('Chỉ có thể thiết lập quản trị lần đầu từ localhost.');
        }
        if (mb_strlen($password) < 12) {
            throw new RuntimeException('Mật khẩu quản trị cần ít nhất 12 ký tự.');
        }

        $directory = dirname($this->credentialsFile);
        if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new RuntimeException('Không thể tạo thư mục lưu cấu hình quản trị.');
        }

        $payload = json_encode([
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'created_at' => gmdate(DATE_ATOM),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

        if (file_put_contents($this->credentialsFile, $payload, LOCK_EX) === false) {
            throw new RuntimeException('Không thể lưu cấu hình quản trị.');
        }
        chmod($this->credentialsFile, 0600);
        $this->markAuthenticated();
    }

    public function login(string $password): bool
    {
        $this->enforceAttemptLimit();
        $credentials = $this->credentials();
        if (!password_verify($password, (string) ($credentials['password_hash'] ?? ''))) {
            $this->recordFailedAttempt();
            return false;
        }

        unset($_SESSION[self::ATTEMPTS_KEY]);
        $this->markAuthenticated();
        return true;
    }

    public function logout(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $parameters = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $parameters['path'], '', $parameters['secure'], $parameters['httponly']);
        }
        session_destroy();
    }

    public function csrfToken(): string
    {
        if (empty($_SESSION[self::CSRF_KEY])) {
            $_SESSION[self::CSRF_KEY] = bin2hex(random_bytes(24));
        }
        return (string) $_SESSION[self::CSRF_KEY];
    }

    public function verifyCsrf(string $token): bool
    {
        $expected = (string) ($_SESSION[self::CSRF_KEY] ?? '');
        return $expected !== '' && hash_equals($expected, $token);
    }

    /**
     * @return array<string, mixed>
     */
    private function credentials(): array
    {
        if (!$this->isConfigured()) {
            throw new RuntimeException('Quản trị chưa được thiết lập.');
        }
        $contents = file_get_contents($this->credentialsFile);
        if ($contents === false) {
            throw new RuntimeException('Không thể đọc cấu hình quản trị.');
        }
        $credentials = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($credentials)) {
            throw new RuntimeException('Cấu hình quản trị không hợp lệ.');
        }
        return $credentials;
    }

    private function markAuthenticated(): void
    {
        session_regenerate_id(true);
        $_SESSION[self::SESSION_KEY] = true;
        $_SESSION[self::CSRF_KEY] = bin2hex(random_bytes(24));
    }

    private function enforceAttemptLimit(): void
    {
        $attempts = $_SESSION[self::ATTEMPTS_KEY] ?? [];
        $recent = array_values(array_filter(
            is_array($attempts) ? $attempts : [],
            static fn (mixed $timestamp): bool => is_int($timestamp) && $timestamp > time() - 300
        ));
        $_SESSION[self::ATTEMPTS_KEY] = $recent;
        if (count($recent) >= 5) {
            throw new RuntimeException('Đã thử quá nhiều lần. Hãy chờ 5 phút rồi thử lại.');
        }
    }

    private function recordFailedAttempt(): void
    {
        $attempts = $_SESSION[self::ATTEMPTS_KEY] ?? [];
        if (!is_array($attempts)) {
            $attempts = [];
        }
        $attempts[] = time();
        $_SESSION[self::ATTEMPTS_KEY] = $attempts;
    }
}
