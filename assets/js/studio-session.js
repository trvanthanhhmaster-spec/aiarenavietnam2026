/* Durable same-session drafts, without reference face pixels or API credentials. */
(() => {
  'use strict';
  const config = window.VREMIX_STUDIO;
  const key = 'session:' + config.sessionScope;
  let queue = Promise.resolve();
  const db = new Promise((resolve, reject) => {
    const request = indexedDB.open('vremix-studio-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  async function transact(mode, operation) {
    const connection = await db;
    return new Promise((resolve, reject) => {
      const tx = connection.transaction('drafts', mode);
      const request = operation(tx.objectStore('drafts'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  }
  function sanitize(value) {
    const result = JSON.parse(JSON.stringify(value));
    for (const selection of [result.draft, result.selection]) {
      for (const person of selection?.planning?.people || []) person.faceSupplied = false;
    }
    result.updatedAt = Date.now(); result.userId = config.auth.userId;
    return result;
  }
  window.VRemixSession = {
    async read() {
      try {
        const record = await transact('readonly', store => store.get(key));
        if (!record || Date.now() - record.updatedAt > 86400000 || (record.userId && record.userId !== config.auth.userId)) return null;
        return record;
      } catch (_) { return null; }
    },
    save(value) {
      const record = sanitize(value);
      queue = queue.catch(() => {}).then(() => transact('readwrite', store => store.put(record, key)));
      queue.catch(() => document.dispatchEvent(new Event('vremix:draft-storage-error')));
      return queue;
    },
    clear() { queue = queue.catch(() => {}).then(() => transact('readwrite', store => store.delete(key))); return queue; },
    flush() { return queue.catch(() => {}); }
  };
})();
