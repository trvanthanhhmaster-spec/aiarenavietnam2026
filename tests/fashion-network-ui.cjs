const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const toggle = { checked: false, listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; } };
const unit = { required: false };
const imageFailure = { hidden: true };
const image = { complete: true, naturalWidth: 0, hidden: false, listeners: {}, parentElement: { querySelector: () => imageFailure }, addEventListener(type, fn) { this.listeners[type] = fn; } };
const form = {
  dataset: {}, attributes: {}, listeners: {}, status: null,
  querySelector(selector) {
    if (selector === '[name="rent_enabled"]') return toggle;
    if (selector === '[name="rent_unit"]') return unit;
    if (selector === '[data-submit-status]') return this.status;
    return null;
  },
  addEventListener(type, fn) { this.listeners[type] = fn; },
  setAttribute(key, value) { this.attributes[key] = value; },
  removeAttribute(key) { delete this.attributes[key]; },
  appendChild(node) { this.status = node; }
};
const events = {};
const sandbox = {
  document: {
    querySelectorAll(selector) {
      if (selector === '.network-product-image img') return [image];
      if (selector === 'form[method="post"]') return [form];
      if (selector === 'form[aria-busy]') return form.attributes['aria-busy'] ? [form] : [];
      throw new Error(`Unexpected selector ${selector}`);
    },
    createElement() { return { setAttribute() {}, remove() { form.status = null; } }; }
  },
  window: { addEventListener(type, fn) { events[type] = fn; } },
  fetch() { throw new Error('UI must never make automatic provider/import requests'); }
};
vm.runInNewContext(fs.readFileSync('assets/js/fashion-network.js', 'utf8'), sandbox);
assert.equal(image.hidden, true);
assert.equal(imageFailure.hidden, false);
assert.equal(unit.required, false);
toggle.checked = true; toggle.listeners.change(); assert.equal(unit.required, true);
let cancelled = false;
form.listeners.submit({ preventDefault() { cancelled = true; } });
assert.equal(cancelled, false);
assert.equal(form.dataset.submitting, 'true');
assert.match(form.status.textContent, /Đang gửi/);
form.listeners.submit({ preventDefault() { cancelled = true; } }); assert.equal(cancelled, true);
events.pageshow(); assert.equal(form.dataset.submitting, undefined); assert.equal(form.status, null);
console.log('Fashion network UI: image fallback, conditional units, submit feedback, duplicate guard and bfcache reset passed.');
