(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VRemixCollections = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function meaningful(record) { return Boolean(record && (record.draft && (record.draft.event || record.draft.planning && record.draft.planning.count) || record.jobId || record.savedLookId)); }
  function create(uuid, label) {
    var items = [], active = uuid();
    function row() { return items.find(function (item) { return item.id === active; }); }
    function capture(record) {
      var clean = clone(record); delete clean.collections; delete clean.collectionId;
      if (meaningful(clean)) {
        var item = row();
        if (!item) { item = { id: active, name: '', record: {} }; items.push(item); }
        item.name = label(clean.draft || clean.selection) || 'Bộ sưu tập mới';
        item.record = clean; item.updatedAt = Date.now();
      }
      return Object.assign(clean, { collectionId: active, collections: clone(items) });
    }
    return {
      ingest: function (record) {
        items = clone(record && record.collections || []); active = record && record.collectionId || uuid();
        if (record && !record.collections) capture(record);
      },
      capture: capture,
      list: function () { return clone(items).sort(function (a, b) { return b.updatedAt - a.updatedAt; }); },
      active: function () { return active; },
      start: function () { active = uuid(); return active; },
      get: function (id) { var item = items.find(function (item) { return item.id === id; }); return item ? clone(item) : null; },
      select: function (id) { if (!items.some(function (item) { return item.id === id; })) throw new Error('Không tìm thấy bộ sưu tập.'); active = id; },
      importHistory: function (groups) {
        groups.forEach(function (group) {
          if (items.some(function (item) { return group.ids.indexOf(item.record.jobId || 'look:' + item.record.savedLookId) >= 0; })) return;
          items.push({ id: uuid(), name: label(group.record.draft || group.record.selection) || 'Bộ sưu tập', updatedAt: group.updatedAt, record: clone(group.record) });
        });
      }
    };
  }
  return { create: create, meaningful: meaningful };
});
