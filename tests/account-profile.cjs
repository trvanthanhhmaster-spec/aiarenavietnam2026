// Offline Supabase transport fixture: no real accounts or provider writes.
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');
const requests = [];
let mode = 'ok';
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    requests.push({ method: req.method, url: req.url, bearer: req.headers.authorization, body: body ? JSON.parse(body) : null });
    res.setHeader('Content-Type', 'application/json');
    if (req.url.startsWith('/rest/v1/user_roles')) {
      res.end(JSON.stringify(mode === 'admin' ? [{ user_id: 'test-user' }] : []));
      return;
    }
    res.end(JSON.stringify({ id: mode === 'wrong-user' ? 'other-user' : 'test-user', user_metadata: { display_name: 'Tên mới', existing: 'retained' } }));
  });
});
const php = `
require getenv('PROFILE_CLASS');
$auth = new App\\Support\\SupabaseAuth(getenv('PROFILE_URL'), 'fixture-anon');
$auth->boot();
$_SESSION['vremix_auth_user'] = ['id' => 'test-user'];
$_SESSION['vremix_auth_access_token'] = 'fixture-user-token';
$_SESSION['vremix_auth_expires_at'] = time() + 3600;
if (getenv('PROFILE_CASE') === 'guest') unset($_SESSION['vremix_auth_user']);
try {
    $result = $auth->updateDisplayName(getenv('PROFILE_NAME'));
    echo json_encode(['result' => $result, 'session' => $_SESSION['vremix_auth_user']]);
} catch (Throwable $error) {
    echo json_encode(['error' => $error->getMessage(), 'session' => $_SESSION['vremix_auth_user'] ?? null]);
}
session_destroy();
`;
async function run(name, testCase = '') {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.PHP_BIN || '/Applications/XAMPP/xamppfiles/bin/php', ['-r', php], {
      env: { ...process.env, PROFILE_CLASS: path.resolve('src/Support/SupabaseAuth.php'), PROFILE_URL: `http://127.0.0.1:${server.address().port}`, PROFILE_NAME: name, PROFILE_CASE: testCase }
    });
    let output = '', errors = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { errors += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      if (code || errors) return reject(new Error(errors || `PHP exited ${code}`));
      try { resolve(JSON.parse(output)); } catch (error) { reject(error); }
    });
  });
}
async function renderAccount() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.PHP_BIN || '/Applications/XAMPP/xamppfiles/bin/php', ['-r', `
      session_name('vremix_auth'); session_start();
      $_SESSION['vremix_auth_user'] = ['id' => 'test-user', 'email' => 'fixture@example.test', 'email_confirmed_at' => '2026-10-06', 'user_metadata' => ['display_name' => '<Test & User>']];
      $_SESSION['vremix_auth_access_token'] = 'fixture-user-token';
      $_SESSION['vremix_auth_expires_at'] = time() + 3600;
      $_SERVER['REQUEST_METHOD'] = 'GET'; $_GET['embed'] = '1'; $_REQUEST['embed'] = '1';
      require getenv('PROFILE_AUTH_PAGE');
      session_destroy();
    `], { env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${server.address().port}`, SUPABASE_ANON_KEY: 'fixture-anon', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service', PROFILE_AUTH_PAGE: path.resolve('auth.php') } });
    let output = '', errors = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { errors += chunk; });
    child.on('error', reject);
    child.on('close', code => code || errors ? reject(new Error(errors || `PHP exited ${code}`)) : resolve(output));
  });
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const saved = await run('  Tên mới  ');
    assert.equal(saved.session.user_metadata.display_name, 'Tên mới');
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0], { method: 'PUT', url: '/auth/v1/user', bearer: 'Bearer fixture-user-token', body: { data: { display_name: 'Tên mới' } } });
    assert.ok((await run('A')).error);
    assert.ok((await run('a'.repeat(81))).error);
    assert.ok((await run('Tên mới', 'guest')).error);
    assert.equal(requests.length, 1, 'invalid and unauthenticated updates never reach Supabase');
    mode = 'wrong-user';
    const rejected = await run('Tên mới');
    assert.ok(rejected.error);
    assert.equal(rejected.session.id, 'test-user');
    mode = 'member';
    const member = await renderAccount();
    assert.ok(!member.includes('href="admin.php"'), 'members cannot see an admin entry');
    assert.ok(member.includes('Thông tin tài khoản'));
    assert.ok(member.includes('&lt;Test &amp; User&gt;'), 'profile data is HTML-escaped');
    assert.ok(member.includes('name="action" value="update-profile"'));
    mode = 'admin';
    const admin = await renderAccount();
    assert.ok(admin.includes('href="admin.php" target="_top"'), 'approved admins can open the existing guarded admin page');
    console.log('Account profile: own-user token, name validation, session update and wrong-user rejection passed offline.');
    console.log('Account UI: member/admin gating, embedded forms and escaped profile data passed offline.');
  } finally { server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
