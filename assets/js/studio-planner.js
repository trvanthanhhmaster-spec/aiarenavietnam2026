(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VRemixPlanner = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var outfitKeys = ['garment', 'garmentVariant', 'color', 'pattern', 'style', 'scene', 'accessories', 'accessoryVariants'];
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function outfit(state) {
    var result = {};
    outfitKeys.forEach(function (key) { result[key] = clone(state[key] == null ? (/ies|Variants/.test(key) ? [] : '') : state[key]); });
    return result;
  }
  function person(id) { return { id: id, name: '', heightCm: null, weightKg: null, faceSupplied: false, customized: false, outfit: outfit({}) }; }
  function create() { return { version: 1, count: null, shared: true, activePerson: 1, period: null, occasionNote: '', people: [] }; }
  function setCount(plan, count) {
    if (!Number.isInteger(count) || count < 1 || count > 12) throw new Error('Chọn từ 1 đến 12 người.');
    var base = plan.people[0];
    plan.people = Array.from({ length: count }, function (_, i) {
      if (plan.people[i]) return plan.people[i];
      var added = person(i + 1);
      if (plan.shared && base) added.outfit = clone(base.outfit);
      return added;
    });
    plan.count = count;
    plan.activePerson = Math.min(plan.activePerson, count);
  }
  function capture(plan, state) {
    var active = plan.people[plan.activePerson - 1];
    if (!active) return;
    active.outfit = outfit(state);
    if (plan.shared && plan.activePerson === 1) plan.people.forEach(function (p) {
      if (!p.customized) p.outfit = outfit(state);
    });
    else active.customized = true;
  }
  function load(plan, state) {
    var active = plan.people[plan.activePerson - 1];
    if (active) Object.assign(state, clone(active.outfit));
  }
  function setShared(plan, shared, state) {
    plan.shared = Boolean(shared);
    if (plan.shared) plan.people.forEach(function (p) {
      if (!p.outfit.garment) p.outfit = outfit(state);
    });
  }
  function localDate(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    var d = new Date(value + 'T12:00:00');
    return !Number.isNaN(d.getTime()) && localDate(d) === value;
  }
  function period(kind, customStart, customEnd, now) {
    var today = new Date(now || new Date()); today.setHours(12, 0, 0, 0);
    if (kind === 'unspecified') return { kind: kind, start: '', end: '' };
    var start = new Date(today), end = new Date(today);
    if (kind === 'this-week') end.setDate(end.getDate() + (7 - end.getDay()) % 7);
    else if (kind === 'next-week') {
      start.setDate(start.getDate() + ((8 - start.getDay()) % 7 || 7));
      // Sunday belongs to the current week; next Monday is tomorrow.
      if (today.getDay() === 0) start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 12);
      end = new Date(start); end.setDate(end.getDate() + 6);
    } else if (kind === 'next-month') {
      start = new Date(today.getFullYear(), today.getMonth() + 1, 1, 12);
      end = new Date(today.getFullYear(), today.getMonth() + 2, 0, 12);
    } else if (kind === 'custom') {
      if (!validDate(customStart) || !validDate(customEnd || customStart)) throw new Error('Chọn ngày hợp lệ.');
      start = new Date(customStart + 'T12:00:00'); end = new Date((customEnd || customStart) + 'T12:00:00');
    } else throw new Error('Chọn thời gian bạn muốn mặc.');
    if (end < start || start < today) throw new Error('Ngày kết thúc phải từ ngày bắt đầu; không chọn ngày đã qua.');
    return { kind: kind, start: localDate(start), end: localDate(end) };
  }
  function missing(plan, event) {
    if (!event) return 'event';
    if (!plan.count) return 'people';
    if (!plan.period) return 'time';
    if (plan.people.length !== plan.count || plan.people.some(function (p) { return !p.outfit.garment; })) return 'garment';
    return 'review';
  }
  function periodLabel(p) {
    if (!p) return 'Chưa chọn';
    if (p.kind === 'unspecified') return 'Chưa xác định';
    var labels = { 'this-week': 'Tuần này', 'next-week': 'Tuần sau', 'next-month': 'Tháng sau', custom: 'Ngày bạn chọn' };
    function format(s) { return s.split('-').reverse().join('/'); }
    return labels[p.kind] + ' · ' + format(p.start) + (p.start === p.end ? '' : ' – ' + format(p.end));
  }
  return { create: create, setCount: setCount, capture: capture, load: load, setShared: setShared,
    outfit: outfit, clone: clone, period: period, periodLabel: periodLabel, missing: missing, localDate: localDate };
});
