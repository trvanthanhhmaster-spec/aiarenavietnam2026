const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function element() {
  return { children: [], events: {}, hidden: false, disabled: false, open: false,
    addEventListener(name, fn) { this.events[name] = fn; },
    setAttribute() {}, append(...values) { this.children.push(...values); },
    replaceChildren() { this.children = []; }, focus() {},
    showModal() { this.open = true; }, close() { this.open = false; this.events.close?.(); } };
}
async function main() {
  const ids = Object.fromEntries(['studioExperience', 'studioLibrary', 'libraryItems', 'libraryStatus', 'libraryMore', 'libraryClose', 'clearStudioDraft', 'confirmClearStudioDraft', 'cancelClearStudioDraft', 'acceptClearStudioDraft'].map(k => [k, element()]));
  const opened = [], requests = [], trigger = element();
  ids.studioExperience.resultsApi = { open(look, edit) { opened.push({ look, edit }); } };
  const document = { getElementById: id => ids[id], createElement: () => element(), querySelectorAll: () => [trigger], addEventListener() {} };
  const config = { auth: { authenticated: true }, lookEndpoint: 'look-api.php' };
  vm.runInNewContext(fs.readFileSync('assets/js/studio-library.js', 'utf8'), {
    document, window: { VREMIX_STUDIO: config, VRemixSession: { clear: async () => { throw new Error('blocked'); } } },
    fetch: () => new Promise(resolve => requests.push(resolve)), Event: class {}
  });
  trigger.events.click(); ids.studioLibrary.close(); trigger.events.click();
  const row = { name: 'Fixture', id: 'fixture', created_at: '2026-10-07', selection: {} };
  requests[1]({ status: 200, ok: true, json: async () => ({ items: [row], hasMore: false }) });
  await new Promise(setImmediate);
  requests[0]({ status: 200, ok: true, json: async () => ({ items: [{ ...row, name: 'Stale' }], hasMore: true }) });
  await new Promise(setImmediate);
  assert.equal(ids.libraryItems.children.length, 1, 'late response from a closed library cannot duplicate cards');
  const card = ids.libraryItems.children[0];
  assert.equal(card.children[3].hidden, false, 'missing image has a visible explanation');
  const actions = card.children[4];
  assert.equal(actions.children[0].disabled, true, 'do not offer an unusable Open image action');
  await actions.children[1].events.click();
  assert.equal(opened[0].edit, true, 'editing remains available without an image');
  assert.equal(ids.studioLibrary.open, false);
  await ids.clearStudioDraft.events.click();
  assert.equal(ids.confirmClearStudioDraft.hidden, false, 'deleting the cloud draft requires confirmation');
  await ids.acceptClearStudioDraft.events.click.call(ids.acceptClearStudioDraft);
  assert.match(ids.libraryStatus.textContent, /Chưa xóa được/);
  console.log('Studio library audit: stale-response suppression, unavailable media, independent editing and storage errors passed offline.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
