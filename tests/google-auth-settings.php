<?php
declare(strict_types=1);
require __DIR__ . '/../src/Infrastructure/GoogleAuthSettings.php';

use App\Infrastructure\GoogleAuthSettings;

function check(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
function rejects(callable $operation, int $code, string $forbidden = ''): void {
    try { $operation(); } catch (RuntimeException $error) {
        check($error->getCode() === $code, 'Wrong error status: ' . $error->getMessage());
        check($forbidden === '' || !str_contains($error->getMessage(), $forbidden), 'Secret leaked in error');
        return;
    }
    throw new RuntimeException('Expected rejection');
}
$url = 'https://abcdefghijklmnopqrst.supabase.co';
$remote = ['external_google_enabled' => false, 'external_google_client_id' => '123-fixture.apps.googleusercontent.com', 'external_google_secret' => 'test-secret-never-display', 'smtp_pass' => 'also-private'];
$calls = [];
$transport = function ($method, $endpoint, $headers, $patch) use (&$remote, &$calls): array {
    $calls[] = compact('method', 'endpoint', 'headers', 'patch');
    if ($method === 'PATCH') $remote = array_replace($remote, $patch);
    return ['status' => 200, 'body' => json_encode($remote)];
};
$client = new GoogleAuthSettings($url, 'fixture-anon', 'fixture-management', $transport);
$state = $client->read();
check($state['management_ready'] && $state['secret_configured'] && !$state['enabled'], 'Wrong state');
$encoded = json_encode($state);
check(!str_contains($encoded, $remote['external_google_secret']) && !str_contains($encoded, 'also-private') && !str_contains($encoded, 'fixture-management'), 'Secret leaked in response');
check($calls[0]['endpoint'] === 'https://api.supabase.com/v1/projects/abcdefghijklmnopqrst/config/auth', 'Untrusted endpoint');
$input = ['enabled' => true, 'client_id' => $state['client_id'], 'client_secret' => '', 'revision' => $state['revision']];
$saved = $client->save($input);
check($saved['enabled'], 'Enable not persisted');
check(array_keys($calls[2]['patch']) === ['external_google_enabled', 'external_google_client_id'], 'Blank secret overwrites existing secret / unrelated settings');
rejects(fn() => $client->save($input), 409);
$input['revision'] = $saved['revision'];
$input['enabled'] = false;
$client->save($input);
check($remote['external_google_secret'] === 'test-secret-never-display', 'Disabling cleared credentials');
$input['revision'] = $client->read()['revision'];
$input['client_id'] = 'new-fixture.apps.googleusercontent.com';
rejects(fn() => $client->save($input), 422);
$input['client_secret'] = 'replacement-fixture-secret';
$new = $client->save($input);
check($new['client_id'] === $input['client_id'] && $remote['external_google_secret'] === $input['client_secret'], 'Replacement not saved');
check(!str_contains(json_encode($new), $input['client_secret']), 'Replacement secret echoed');
foreach ([['enabled' => 'true'], ['client_id' => 'bad'], ['client_secret' => "has\nnewline"], ['site_url' => 'https://evil.invalid']] as $change) {
    rejects(fn() => $client->save(array_replace($input, $change)), 422);
}
$remote['external_google_secret'] = '';
$input['revision'] = $client->read()['revision'];
$input['enabled'] = true;
$input['client_secret'] = '';
rejects(fn() => $client->save($input), 422);
$publicCalls = [];
$public = new GoogleAuthSettings($url, 'fixture-anon', '', function ($method, $endpoint, $headers) use (&$publicCalls) {
    $publicCalls[] = compact('method', 'endpoint', 'headers');
    return ['status' => 200, 'body' => '{"external":{"google":false}}'];
});
check($public->read()['management_ready'] === false && $public->read()['client_id'] === null, 'Missing token falsely reports configured');
rejects(fn() => $public->save($input), 503);
check(count($publicCalls) === 2 && $publicCalls[0]['endpoint'] === $url . '/auth/v1/settings', 'Missing token attempts write');
foreach ([401 => 503, 403 => 503, 429 => 429, 500 => 502, 0 => 502] as $status => $expected) {
    $failure = new GoogleAuthSettings($url, 'fixture', 'fixture', fn() => ['status' => $status, 'body' => '{"error":"sensitive-secret"}']);
    rejects(fn() => $failure->read(), $expected, 'sensitive-secret');
}
$writeCalls = 0;
$remote['external_google_secret'] = 'existing';
$uncertain = new GoogleAuthSettings($url, 'fixture', 'fixture', function ($method) use (&$writeCalls, $remote) {
    if ($method === 'PATCH') { $writeCalls++; return ['status' => 0, 'body' => false]; }
    return ['status' => 200, 'body' => json_encode($remote)];
});
$input['revision'] = $uncertain->read()['revision'];
$input['client_id'] = $remote['external_google_client_id'];
rejects(fn() => $uncertain->save($input), 502);
check($writeCalls === 1, 'Ambiguous write replayed');
rejects(fn() => new GoogleAuthSettings('https://evil.invalid', 'fixture', 'fixture'), 503);
$api = file_get_contents(__DIR__ . '/../admin-api.php');
check(strpos($api, '!$auth->isAdmin()') < strpos($api, "=== 'google-auth'"), 'Google route bypasses admin');
check(strpos($api, 'verifyCsrf') < strpos($api, "=== 'google-auth'"), 'Google route bypasses CSRF');
check(str_contains($api, '8193') && str_contains($api, 'get_object_vars'), 'Missing bounded JSON object handling');
echo "Google Auth: secret redaction, narrow PATCH, validation, stale-state rejection, missing token, sanitized failures and no write replay passed offline.\n";
