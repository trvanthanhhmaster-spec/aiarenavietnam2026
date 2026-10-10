<?php
declare(strict_types=1);

namespace App\Support;

use RuntimeException;
use Throwable;

final class SupabaseAuth
{
    private const SESSION_USER = 'vremix_auth_user';
    private const SESSION_ACCESS_TOKEN = 'vremix_auth_access_token';
    private const SESSION_REFRESH_TOKEN = 'vremix_auth_refresh_token';
    private const SESSION_EXPIRES_AT = 'vremix_auth_expires_at';
    private const SESSION_CSRF = 'vremix_auth_csrf';
    private const SESSION_OAUTH = 'vremix_auth_oauth';

    public function __construct(
        private string $supabaseUrl,
        private string $anonKey,
        private string $serviceRoleKey = ''
    ) {
        $this->supabaseUrl = rtrim($this->supabaseUrl, '/');
    }

    public function boot(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        session_name('vremix_auth');
        session_set_cookie_params([
            'httponly' => true,
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'samesite' => 'Lax',
            'path' => '/',
        ]);
        session_start();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function user(): ?array
    {
        $this->boot();
        $user = $_SESSION[self::SESSION_USER] ?? null;
        if (!is_array($user) || empty($user['id'])) {
            return null;
        }

        $expiresAt = (int) ($_SESSION[self::SESSION_EXPIRES_AT] ?? 0);
        if ($expiresAt > time() + 60) {
            return $user;
        }

        try {
            return $this->refresh();
        } catch (Throwable $error) {
            error_log('[V-Remix] Auth refresh: ' . $error->getMessage());
            $this->clearSession();
            return null;
        }
    }

    public function accessToken(): string
    {
        return $this->user() !== null
            ? (string) ($_SESSION[self::SESSION_ACCESS_TOKEN] ?? '')
            : '';
    }

    /**
     * @return array{authenticated: bool, confirmationRequired: bool, user: array<string, mixed>|null}
     */
    public function signUp(string $email, string $password, string $displayName, string $emailRedirectTo): array
    {
        $email = $this->validateCredentials($email, $password);
        $displayName = trim($displayName);
        if (mb_strlen($displayName) < 2 || mb_strlen($displayName) > 80) {
            throw new RuntimeException('Tên hiển thị cần từ 2 đến 80 ký tự.');
        }

        $payload = $this->authRequest('POST', '/auth/v1/signup', [
            'email' => $email,
            'password' => $password,
            'data' => ['display_name' => $displayName],
            'email_redirect_to' => $emailRedirectTo,
        ]);
        if (!empty($payload['access_token'])) {
            $this->storeSession($payload);
        }

        return [
            'authenticated' => !empty($payload['access_token']),
            'confirmationRequired' => empty($payload['access_token']),
            'user' => is_array($payload['user'] ?? null) ? $payload['user'] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function login(string $email, string $password): array
    {
        $email = $this->validateCredentials($email, $password);
        $payload = $this->authRequest('POST', '/auth/v1/token?grant_type=password', [
            'email' => $email,
            'password' => $password,
        ]);
        $this->storeSession($payload);
        return (array) $_SESSION[self::SESSION_USER];
    }

    public function logout(): void
    {
        $token = (string) ($_SESSION[self::SESSION_ACCESS_TOKEN] ?? '');
        if ($token !== '') {
            try {
                $this->authRequest('POST', '/auth/v1/logout', null, $token);
            } catch (Throwable $error) {
                error_log('[V-Remix] Auth logout: ' . $error->getMessage());
            }
        }
        $this->clearSession();
        if (ini_get('session.use_cookies')) {
            $parameters = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $parameters['path'],
                '',
                (bool) $parameters['secure'],
                (bool) $parameters['httponly']
            );
        }
        session_destroy();
    }

    /** Update only the caller's display name, never roles or credentials. */
    public function updateDisplayName(string $displayName): array
    {
        $displayName = trim($displayName);
        if (mb_strlen($displayName) < 2 || mb_strlen($displayName) > 80) {
            throw new RuntimeException('Tên hiển thị cần từ 2 đến 80 ký tự.');
        }
        $token = $this->accessToken();
        if ($token === '') {
            throw new RuntimeException('Hãy đăng nhập trước khi cập nhật thông tin tài khoản.');
        }
        $user = $this->authRequest('PUT', '/auth/v1/user', [
            'data' => ['display_name' => $displayName],
        ], $token);
        if (empty($user['id']) || $user['id'] !== ($_SESSION[self::SESSION_USER]['id'] ?? null)) {
            throw new RuntimeException('Không thể cập nhật thông tin tài khoản.');
        }
        $_SESSION[self::SESSION_USER] = $user;
        return $user;
    }

    public function csrfToken(): string
    {
        $this->boot();
        if (empty($_SESSION[self::SESSION_CSRF])) {
            $_SESSION[self::SESSION_CSRF] = bin2hex(random_bytes(24));
        }
        return (string) $_SESSION[self::SESSION_CSRF];
    }

    public function verifyCsrf(string $token): bool
    {
        $expected = (string) ($_SESSION[self::SESSION_CSRF] ?? '');
        return $expected !== '' && hash_equals($expected, $token);
    }

    public function googleEnabled(): bool
    {
        try {
            $settings = $this->authRequest('GET', '/auth/v1/settings');
            return !empty($settings['external']['google']);
        } catch (Throwable) {
            return false;
        }
    }

    public function beginGoogleOAuth(string $callbackUrl, string $next): string
    {
        if (!$this->googleEnabled()) {
            throw new RuntimeException('Google OAuth chưa được bật trong Supabase Auth.');
        }

        $verifier = $this->base64Url(random_bytes(48));
        $state = $this->base64Url(random_bytes(24));
        $_SESSION[self::SESSION_OAUTH] = [
            'verifier' => $verifier,
            'state' => $state,
            'next' => self::safeNext($next),
            'created_at' => time(),
        ];
        $challenge = $this->base64Url(hash('sha256', $verifier, true));

        $separator = str_contains($callbackUrl, '?') ? '&' : '?';
        $callbackWithState = $callbackUrl . $separator . 'auth_state=' . rawurlencode($state);

        return $this->supabaseUrl . '/auth/v1/authorize?' . http_build_query([
            'provider' => 'google',
            'redirect_to' => $callbackWithState,
            'code_challenge' => $challenge,
            'code_challenge_method' => 's256',
        ], '', '&', PHP_QUERY_RFC3986);
    }

    public function completeGoogleOAuth(string $code, string $state): string
    {
        $oauth = $_SESSION[self::SESSION_OAUTH] ?? null;
        unset($_SESSION[self::SESSION_OAUTH]);
        if (
            !is_array($oauth)
            || empty($oauth['state'])
            || !hash_equals((string) $oauth['state'], $state)
            || (int) ($oauth['created_at'] ?? 0) < time() - 600
        ) {
            throw new RuntimeException('Phiên Google OAuth không hợp lệ hoặc đã hết hạn.');
        }
        if ($code === '' || empty($oauth['verifier'])) {
            throw new RuntimeException('Google không trả về mã xác thực hợp lệ.');
        }

        $payload = $this->authRequest('POST', '/auth/v1/token?grant_type=pkce', [
            'auth_code' => $code,
            'code_verifier' => (string) $oauth['verifier'],
        ]);
        $this->storeSession($payload);
        return self::safeNext((string) ($oauth['next'] ?? 'studio.php'));
    }

    public function isAdmin(): bool
    {
        $user = $this->user();
        if ($user === null || $this->serviceRoleKey === '') {
            return false;
        }
        $rows = $this->adminRequest('GET', '/rest/v1/user_roles?' . http_build_query([
            'user_id' => 'eq.' . (string) $user['id'],
            'role' => 'eq.admin',
            'select' => 'user_id',
            'limit' => '1',
        ], '', '&', PHP_QUERY_RFC3986));
        return isset($rows[0]['user_id']);
    }

    /**
     * Assigns the first admin only from localhost so a fresh demo can be
     * bootstrapped without a shared password or a public self-promotion path.
     */
    public function bootstrapFirstLocalAdmin(): bool
    {
        $user = $this->user();
        if ($user === null || !$this->isLocalRequest() || $this->serviceRoleKey === '') {
            return false;
        }
        if ($this->isAdmin()) {
            return true;
        }
        $admins = $this->adminRequest('GET', '/rest/v1/user_roles?' . http_build_query([
            'role' => 'eq.admin',
            'select' => 'user_id',
            'limit' => '1',
        ], '', '&', PHP_QUERY_RFC3986));
        if ($admins !== []) {
            return false;
        }
        $this->adminRequest('POST', '/rest/v1/user_roles', [
            'user_id' => (string) $user['id'],
            'role' => 'admin',
        ], 'resolution=merge-duplicates,return=minimal');
        return true;
    }

    public function isLocalRequest(): bool
    {
        return in_array((string) ($_SERVER['REMOTE_ADDR'] ?? ''), ['127.0.0.1', '::1'], true);
    }

    public static function safeNext(string $next): string
    {
        $next = trim($next);
        if ($next === '' || str_contains($next, "\n") || str_contains($next, "\r")) {
            return 'studio.php';
        }
        $parts = parse_url($next);
        if ($parts === false || isset($parts['scheme']) || isset($parts['host'])) {
            return 'studio.php';
        }
        $path = ltrim((string) ($parts['path'] ?? ''), '/');
        if (!in_array($path, ['studio.php', 'admin.php', 'index.php', 'shops.php'], true)) {
            return 'studio.php';
        }
        $query = isset($parts['query']) ? '?' . $parts['query'] : '';
        $fragment = isset($parts['fragment']) ? '#' . $parts['fragment'] : '';
        return $path . $query . $fragment;
    }

    /**
     * @return array<string, mixed>
     */
    private function refresh(): array
    {
        $refreshToken = (string) ($_SESSION[self::SESSION_REFRESH_TOKEN] ?? '');
        if ($refreshToken === '') {
            throw new RuntimeException('Phiên đăng nhập đã hết hạn.');
        }
        $payload = $this->authRequest('POST', '/auth/v1/token?grant_type=refresh_token', [
            'refresh_token' => $refreshToken,
        ]);
        $this->storeSession($payload, true);
        return (array) $_SESSION[self::SESSION_USER];
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function storeSession(array $payload, bool $refresh = false): void
    {
        $user = $payload['user'] ?? null;
        if (!is_array($user) || empty($user['id']) || empty($payload['access_token'])) {
            throw new RuntimeException('Supabase không trả về phiên đăng nhập hợp lệ.');
        }
        // Same-identity refresh must not invalidate CSRF tokens in open tabs.
        // Actual sign-ins and account changes still rotate both tokens.
        $keepCsrf = $refresh && ($user['id'] === ($_SESSION[self::SESSION_USER]['id'] ?? null))
            && !empty($_SESSION[self::SESSION_CSRF]);
        if (!$keepCsrf) session_regenerate_id(true);
        $_SESSION[self::SESSION_USER] = $user;
        $_SESSION[self::SESSION_ACCESS_TOKEN] = (string) $payload['access_token'];
        $_SESSION[self::SESSION_REFRESH_TOKEN] = (string) ($payload['refresh_token'] ?? '');
        $_SESSION[self::SESSION_EXPIRES_AT] = time() + max(60, (int) ($payload['expires_in'] ?? 3600));
        if (!$keepCsrf) $_SESSION[self::SESSION_CSRF] = bin2hex(random_bytes(24));
    }

    private function clearSession(): void
    {
        unset(
            $_SESSION[self::SESSION_USER],
            $_SESSION[self::SESSION_ACCESS_TOKEN],
            $_SESSION[self::SESSION_REFRESH_TOKEN],
            $_SESSION[self::SESSION_EXPIRES_AT],
            $_SESSION[self::SESSION_CSRF],
            $_SESSION[self::SESSION_OAUTH]
        );
    }

    private function validateCredentials(string $email, string $password): string
    {
        $email = mb_strtolower(trim($email));
        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new RuntimeException('Email không hợp lệ.');
        }
        if (mb_strlen($password) < 8 || mb_strlen($password) > 128) {
            throw new RuntimeException('Mật khẩu cần từ 8 đến 128 ký tự.');
        }
        return $email;
    }

    /**
     * @param array<string, mixed>|null $body
     * @return array<string, mixed>
     */
    private function authRequest(string $method, string $path, ?array $body = null, string $bearer = ''): array
    {
        if ($this->supabaseUrl === '' || $this->anonKey === '') {
            throw new RuntimeException('Supabase Auth chưa được cấu hình.');
        }
        return $this->request(
            $method,
            $this->supabaseUrl . $path,
            $body,
            $this->anonKey,
            $bearer !== '' ? $bearer : $this->anonKey
        );
    }

    /**
     * @param array<string, mixed>|null $body
     * @return array<int, array<string, mixed>>
     */
    private function adminRequest(string $method, string $path, ?array $body = null, string $prefer = ''): array
    {
        if ($this->serviceRoleKey === '') {
            throw new RuntimeException('Thiếu SUPABASE_SERVICE_ROLE_KEY cho kiểm tra quyền.');
        }
        $result = $this->request(
            $method,
            $this->supabaseUrl . $path,
            $body,
            $this->serviceRoleKey,
            $this->serviceRoleKey,
            $prefer
        );
        return self::isList($result) ? $result : [];
    }

    /**
     * @param array<string, mixed>|null $body
     * @return array<string, mixed>
     */
    private function request(
        string $method,
        string $url,
        ?array $body,
        string $apiKey,
        string $bearer,
        string $prefer = ''
    ): array {
        $handle = curl_init($url);
        if ($handle === false) {
            throw new RuntimeException('Không thể khởi tạo kết nối Supabase.');
        }
        $headers = [
            'apikey: ' . $apiKey,
            'Authorization: Bearer ' . $bearer,
            'Accept: application/json',
            'Content-Type: application/json',
        ];
        if ($prefer !== '') {
            $headers[] = 'Prefer: ' . $prefer;
        }
        curl_setopt_array($handle, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => 15,
        ]);
        if ($body !== null) {
            curl_setopt($handle, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
        }

        $response = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $error = curl_error($handle);
        if (!is_string($response) || $error !== '') {
            throw new RuntimeException('Không thể kết nối Supabase Auth.');
        }
        $decoded = $response !== '' ? json_decode($response, true) : [];
        if ($status < 200 || $status >= 300) {
            $message = is_array($decoded)
                ? (string) ($decoded['msg'] ?? $decoded['message'] ?? $decoded['error_description'] ?? $decoded['error'] ?? '')
                : '';
            throw new RuntimeException($this->friendlyAuthError($message, $status));
        }
        return is_array($decoded) ? $decoded : [];
    }

    private function friendlyAuthError(string $message, int $status): string
    {
        $lower = mb_strtolower($message);
        $retryAfter = 0;
        if (
            preg_match('/(?:after|in)\s+(\d+)\s+seconds?/i', $message, $matches) === 1
            || preg_match('/(\d+)\s+seconds?/i', $message, $matches) === 1
        ) {
            $retryAfter = max(1, (int) $matches[1]);
        }
        $retryMessage = $retryAfter > 0
            ? 'Vì lý do bảo mật, vui lòng thử lại sau ' . $retryAfter . ' giây.'
            : 'Bạn thao tác quá nhanh. Vui lòng chờ 60 giây rồi thử lại.';

        return match (true) {
            str_contains($lower, 'invalid login credentials') => 'Email hoặc mật khẩu không đúng.',
            str_contains($lower, 'user already registered') => 'Email này đã có tài khoản.',
            str_contains($lower, 'email not confirmed') => 'Hãy xác nhận email trước khi đăng nhập.',
            str_contains($lower, 'password') && str_contains($lower, 'weak') => 'Mật khẩu chưa đáp ứng yêu cầu bảo mật.',
            str_contains($lower, 'rate limit'),
            str_contains($lower, 'security purposes'),
            str_contains($lower, 'request this after') => $retryMessage,
            $message !== '' => $message,
            default => 'Supabase Auth trả về HTTP ' . $status . '.',
        };
    }

    /**
     * PHP 8.0-compatible equivalent of array_is_list(), which was added in 8.1.
     *
     * @param array<mixed> $value
     */
    private static function isList(array $value): bool
    {
        return $value === [] || array_keys($value) === range(0, count($value) - 1);
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
