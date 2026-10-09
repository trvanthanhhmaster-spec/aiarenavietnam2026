const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/js/admin-google-auth.js', 'utf8');
const nodes = {}, windowEvents = {}, requests = [], pending = [];
function node(id) {
  return nodes[id] ||= { hidden: false, value: '', checked: false, disabled: false, textContent: '', events: {},
    classList: { toggle() {} }, addEventListener(type, fn) { this.events[type] = fn; },
    querySelectorAll() { return []; } };
}
const window = { location: { origin: 'https://v-remix.vietnamsir.com', href: 'https://v-remix.vietnamsir.com/admin.php' },
  VREMIX_ADMIN: { endpoint: 'admin-api.php', csrf: 'fixture-csrf' }, confirm: () => true,
  addEventListener(type, fn) { windowEvents[type] = fn; }, setTimeout };
vm.runInNewContext(source, { window, document: { getElementById: node }, URL,
  fetch(url, options) {
    requests.push({ url, options });
    return new Promise(resolve => pending.push(body => resolve({ ok: !body.error, json: async () => body })));
  } });
const flush = () => new Promise(resolve => setImmediate(resolve));
const state = { management_ready: true, enabled: false, client_id: 'fixture.apps.googleusercontent.com', secret_configured: true,
  revision: 'fixture-revision', google_callback: 'https://abcdefghijklmnopqrst.supabase.co/auth/v1/callback', provider_url: 'https://supabase.com/dashboard/project/abcdefghijklmnopqrst/auth/providers' };
(async () => {
  let load = window.VRemixGoogleAuth.load();
  assert.equal(node('googleAuthFields').disabled, true);
  pending.shift()({ ...state, management_ready: false, notice: 'Missing token' }); await load;
  assert.equal(node('googleAuthFields').disabled, true, 'Missing token leaves writes disabled');
  assert.equal(node('googleAuthNotice').textContent, 'Missing token');
  load = window.VRemixGoogleAuth.load(); pending.shift()(state); await load;
  assert.equal(node('googleAuthFields').disabled, false);
  assert.equal(node('googleClientSecret').value, '', 'No secret returned to form');
  assert.match(node('googleSecretState').textContent, /Để trống/);
  node('googleClientSecret').value = 'test-only-secret';
  node('googleAuthEnabled').checked = true;
  node('googleAuthForm').events.input();
  window.confirm = () => false;
  assert.equal(window.VRemixGoogleAuth.canLeave(), false, 'Unsaved changes need confirmation');
  const submit = node('googleAuthForm').events.submit({ preventDefault() {} });
  assert.equal(node('googleClientSecret').value, '', 'Clear secret immediately');
  assert.equal(window.VRemixGoogleAuth.canLeave(), false, 'Navigation blocked during write');
  assert.equal(requests.at(-1).options.headers['X-CSRF-Token'], 'fixture-csrf');
  assert.equal(JSON.parse(requests.at(-1).options.body).client_secret, 'test-only-secret');
  pending.shift()({ ...state, enabled: true }); await submit;
  assert.match(node('googleProviderState').textContent, /đang bật/);
  assert.equal(window.VRemixGoogleAuth.canLeave(), true);
  const failure = node('googleAuthForm').events.submit({ preventDefault() {} });
  pending.shift()({ error: 'Uncertain result' }); await failure;
  assert.equal(node('googleAuthFields').disabled, true, 'Uncertain write requires reread');
  assert.match(node('googleAuthNotice').textContent, /Làm mới/);
  load = window.VRemixGoogleAuth.load(); window.VRemixGoogleAuth.leave(); pending.shift()(state); await load; await flush();
  assert.equal(node('adminGoogleAuth').hidden, true, 'Stale load cannot reopen panel');
  assert.equal(node('googleClientSecret').value, '');
  assert.equal(node('googleAuthFields').disabled, true);
  const admin = fs.readFileSync('assets/js/admin.js', 'utf8');
  assert.match(admin, /current !== loadSerial/, 'Ordinary table response cannot overwrite provider view');
  assert.match(admin, /VRemixGoogleAuth\.canLeave/, 'Navigation respects dirty form');
  assert.doesNotMatch(source, /localStorage|sessionStorage|console\./, 'No credential storage or logging');
  console.log('Admin Google: readiness, secret clearing, dirty/busy navigation, write failure and stale response handling passed offline.');
})().catch(error => { console.error(error); process.exitCode = 1; });
