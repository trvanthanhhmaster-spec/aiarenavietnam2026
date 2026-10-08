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
        if (!item.name) item.name = label(clean.draft || clean.selection) || 'Bộ sưu tập mới';
        if (JSON.stringify(item.record) !== JSON.stringify(clean)) item.updatedAt = Date.now();
        item.record = clean;
      }
      // The envelope must never be attached to the snapshot stored inside it.
      return Object.assign({}, clean, { collectionId: active, collections: clone(items) });
    }
    return {
      ingest: function (record) {
        items = clone(record && record.collections || []); active = record && record.collectionId || uuid();
        items.forEach(function (item) { delete item.record.collections; delete item.record.collectionId; });
        if (record && !record.collections) capture(record);
      },
      capture: capture,
      list: function () { return clone(items).filter(function (item) { return !item.deleted; }).sort(function (a, b) { return b.updatedAt - a.updatedAt; }); },
      active: function () { return active; },
      start: function () { active = uuid(); return active; },
      get: function (id) { var item = items.find(function (item) { return item.id === id; }); return item ? clone(item) : null; },
      select: function (id) { if (!items.some(function (item) { return item.id === id; })) throw new Error('Không tìm thấy bộ sưu tập.'); active = id; },
      remove: function (id) { var item = items.find(function (row) { return row.id === id; }); if (item) item.deleted = true; },
      rename: function (id, name) { var item = items.find(function (row) { return row.id === id; }); if (item) item.name = name; },
      hydrate: function (value) { var index = items.findIndex(function (row) { return row.id === value.id; }); if (index >= 0) items[index] = clone(value); },
      replace: function (id, record, revision) { var item = items.find(function (row) { return row.id === id; }); if (item) { item.record = clone(record); item.revision = revision; item.updatedAt = Date.now(); if (item.count) item.count--; } },
      setCount: function (id, count, more) { var item = items.find(function (row) { return row.id === id; }); if (item) { item.count = count; item.hasMore = more; } },
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
