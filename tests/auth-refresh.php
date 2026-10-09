<?php
declare(strict_types=1);
require __DIR__ . '/../src/Support/SupabaseAuth.php';
use App\Support\SupabaseAuth;
function check(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
$auth = new SupabaseAuth('https://example.invalid', 'fixture');
$auth->boot();
$method = new ReflectionMethod($auth, 'storeSession');
$method->setAccessible(true);
$payload = ['user' => ['id' => 'owner'], 'access_token' => 'fixture-access', 'refresh_token' => 'fixture-refresh'];
$method->invoke($auth, $payload);
$token = $auth->csrfToken(); $id = session_id();
$method->invoke($auth, $payload, true);
check($auth->verifyCsrf($token), 'Same-account refresh invalidated an open tab');
check(session_id() === $id, 'Same-account refresh broke concurrent session requests');
$method->invoke($auth, $payload);
check(!$auth->verifyCsrf($token), 'Explicit sign-in must rotate CSRF even for the same account');
$token = $auth->csrfToken();
$payload['user']['id'] = 'another-owner';
$method->invoke($auth, $payload, true);
check(!$auth->verifyCsrf($token), 'Different identity must never reuse CSRF');
check(!$auth->verifyCsrf(''), 'Empty CSRF was accepted');
$source = file_get_contents(__DIR__ . '/../src/Support/SupabaseAuth.php');
$refresh = substr($source, strpos($source, 'private function refresh()'), strpos($source, 'private function storeSession') - strpos($source, 'private function refresh()'));
check(str_contains($refresh, '$this->storeSession($payload, true)'), 'Refresh caller did not use same-identity mode');
session_destroy();
echo "Auth refresh: same-identity session/CSRF continuity and sign-in/account-change rotation passed.\n";
