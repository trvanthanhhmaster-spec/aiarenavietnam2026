const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('admin.php', 'utf8');
const source = fs.readFileSync('assets/js/admin-shell.js', 'utf8');
function node(textContent = '', dataset = {}) {
  const classes = new Set();
  return { textContent, dataset, hidden: false, value: '', attrs: {}, events: {},
    classList: { toggle(k, on) { if (on) classes.add(k); else classes.delete(k); }, contains: k => classes.has(k) },
    setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; },
    addEventListener(k, fn) { this.events[k] = fn; },
    focus() { document.activeElement = this; }, getClientRects() { return this.hidden ? [] : [1]; },
    click() { if (this.events.click) this.events.click(); }
  };
}
const items = [...html.matchAll(/<button[^>]*data-resource="([^"]+)"[^>]*>(.*?)<\/button>/g)]
  .map(match => node(match[2].replace(/<[^>]+>/g, ''), { resource: match[1] }));
items.push(node('Tìm & nhập nguồn'));
const labels = Array.from({ length: 5 }, () => node());
const buttons = ['ai', 'catalog', 'editorial', 'accounts', 'operations'].map(group => {
  const n = node('', { adminGroup: group }); n.attrs['aria-label'] = group; return n;
});
const ids = Object.fromEntries(['adminNavigation', 'adminSearch', 'adminMenuToggle', 'adminMenuBackdrop', 'adminGroupTitle', 'adminSearchEmpty', 'adminMenuClose', 'adminContent'].map(id => [id, node()]));
const nav = ids.adminNavigation;
nav.querySelectorAll = selector => selector === '.admin-nav__label' ? labels : items;
nav.querySelector = () => items.find(item => item.classList.contains('is-active'));
items[0].classList.toggle('is-active', true);
let allowLeave = true;
let mobile = false;
const media = { matches: false, addEventListener(k, fn) { this.change = fn; } };
const events = {};
const document = { activeElement: null, getElementById: id => ids[id], querySelectorAll: () => buttons,
  addEventListener(k, fn) { events[k] = fn; } };
items.forEach(item => {
  item.events.click = () => {
    if (!allowLeave) return;
    items.forEach(n => n.classList.toggle('is-active', n === item));
    events['admin:resource']({ detail: { resource: item.dataset.resource } });
  };
});
vm.runInNewContext(source, { document, window: { matchMedia() { media.matches = mobile; return media; } } });
const visible = () => items.filter(item => !item.hidden).map(item => item.dataset.resource || 'import');
assert.deepEqual(visible(), ['ai-settings', 'studio-generation']);
buttons[1].click();
assert.ok(visible().includes('import'), 'Catalog keeps source-import link');
assert.equal(items.find(item => item.classList.contains('is-active')).dataset.resource, 'events', 'Group opens a real resource through existing handler');
allowLeave = false;
buttons[3].click();
assert.equal(ids.adminGroupTitle.textContent, 'catalog', 'Rejected dirty navigation does not switch rail');
allowLeave = true;
ids.adminSearch.value = 'co phuc'; ids.adminSearch.events.input();
assert.deepEqual(visible(), ['garments', 'garment-variants'], 'Accent-insensitive search across groups');
ids.adminSearch.value = 'no such item'; ids.adminSearch.events.input();
assert.equal(ids.adminSearchEmpty.hidden, false);
mobile = true;
ids.adminMenuClose.click(); ids.adminMenuToggle.click();
assert.equal(visible().length, items.length, 'Mobile full menu includes all resources');
assert.equal(ids.adminMenuToggle.attrs['aria-expanded'], 'true');
events.keydown({ key: 'Escape' });
assert.equal(ids.adminMenuBackdrop.hidden, true);
assert.equal(document.activeElement, ids.adminMenuToggle, 'Escape restores trigger focus');
ids.adminMenuToggle.click();
items.find(item => item.dataset.resource === 'google-auth').click();
assert.equal(ids.adminGroupTitle.textContent, 'accounts');
assert.equal(ids.adminMenuToggle.attrs['aria-expanded'], 'false');
assert.equal(document.activeElement, ids.adminContent);
ids.adminMenuToggle.click(); ids.adminMenuBackdrop.click();
assert.equal(ids.adminMenuToggle.attrs['aria-expanded'], 'false');
media.change();
assert.match(html, /admin-dashboard\.css/);
assert.match(html, /id="editorError" role="alert"/);
assert.match(html, /Inter:wght@300;400;500;600;700;800/);
const admin = fs.readFileSync('assets/js/admin.js', 'utf8');
assert.match(admin, /VRemixGoogleAuth\.canLeave\(\)/);
assert.match(admin, /if \(saving\) \{ event.preventDefault\(\); return; \}/);
assert.match(admin, /editorError.textContent = error.message/);
assert.match(admin, /empty.hidden = true;\s*tableHead.innerHTML = ''/);
const css = fs.readFileSync('assets/css/admin-dashboard.css', 'utf8');
assert.match(css, /--admin-paper: #f0f8fc/);
assert.match(css, /background: #94a103/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /safe-area-inset-bottom/);
assert.doesNotMatch(source, /fetch\(|localStorage|sessionStorage/);
console.log('Admin shell: groups, dirty guard, accent search, mobile full menu, Escape/backdrop/focus and theme contracts passed offline.');
