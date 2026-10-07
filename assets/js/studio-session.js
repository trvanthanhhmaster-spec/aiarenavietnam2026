/* Account drafts live on the server. IndexedDB is only a guest draft / recovery cache. */
(() => {
  'use strict';
  const config = window.VREMIX_STUDIO;
  const authenticated = Boolean(config.auth.authenticated);
  const legacyKey = 'session:' + config.sessionScope;
  const key = authenticated ? 'account:' + config.auth.userId : legacyKey;
  let db, initializing, revision = null, blocked = false, timer, pending, writing = Promise.resolve(), localQueue = Promise.resolve();
  let sync = { state: authenticated ? 'loading' : 'guest', hasDraft: false, updatedAt: null, message: '' };
  function announce(state, message, extra = {}) {
    sync = { ...sync, state, message, ...extra };
    document.dispatchEvent(new CustomEvent('vremix:draft-sync', { detail: { ...sync } }));
  }
  function connection() {
    if (!db) db = new Promise((resolve, reject) => {
      const request = indexedDB.open('vremix-studio-drafts', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('drafts');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return db;
  }
  async function transact(mode, operation) {
    const conn = await connection();
    return new Promise((resolve, reject) => {
      const tx = conn.transaction('drafts', mode);
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
  function meaningful(record) {
    return Boolean(record && (record.draft?.event || record.draft?.planning?.count || record.jobId || record.savedLookId));
  }
  async function cacheRead(cacheKey) {
    try {
      const record = await transact('readonly', store => store.get(cacheKey));
      if (!record || Date.now() - record.updatedAt > 86400000 || (record.userId && record.userId !== config.auth.userId)) return null;
      return record;
    } catch (_) { return null; }
  }
  function cacheSave(record) {
    localQueue = localQueue.catch(() => {}).then(() => transact('readwrite', store => store.put(record, key)));
    localQueue.catch(() => { if (!authenticated) document.dispatchEvent(new Event('vremix:draft-storage-error')); });
    return localQueue;
  }
  async function request(payload) {
    const response = await fetch(config.draftEndpoint, {
      method: payload ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', keepalive: Boolean(payload),
      headers: { 'Content-Type': 'application/json', 'X-VRemix-CSRF': config.lookCsrf, 'X-VRemix-Account': config.auth.userId },
      ...(payload ? { body: JSON.stringify(payload) } : {})
    });
    const body = await response.json();
    if (!response.ok) {
      const error = new Error(body.error || 'Chưa đồng bộ được bản nháp lên tài khoản.');
      error.status = response.status; throw error;
    }
    return body;
  }
  async function initialize() {
    if (!authenticated) {
      const record = await cacheRead(key);
      announce('guest', 'Đăng nhập để giữ bản nháp trong tài khoản và mở trên thiết bị khác.', { hasDraft: meaningful(record) });
      return record;
    }
    try {
      const body = await request(); revision = body.revision;
      if (body.record) {
        if (!pending) cacheSave(body.record).catch(() => {});
        announce(pending ? 'saving' : 'saved', pending ? 'Đang lưu thay đổi vào tài khoản…' : 'Bản nháp đã lưu trong tài khoản.',
          { hasDraft: meaningful(pending || body.record), updatedAt: body.record.updatedAt });
        return body.record;
      }
      // Import an older device draft only when no server draft/tombstone exists.
      if (revision === 0) {
        const local = await cacheRead(key) || await cacheRead(legacyKey);
        if (meaningful(local)) {
          if (!pending) pending = sanitize(local);
          announce('saving', 'Đang chuyển bản nháp lên tài khoản…', { hasDraft: true });
          return local;
        }
      }
      announce(pending ? 'saving' : 'saved', pending ? 'Đang lưu thay đổi vào tài khoản…' : 'Lựa chọn mới sẽ tự lưu trong tài khoản.', { hasDraft: meaningful(pending) });
      return null;
    } catch (e) {
      announce('error', 'Chưa mở được bản nháp trên server. Bản khôi phục trên thiết bị chưa được đồng bộ.');
      return await cacheRead(key);
    }
  }
  function read() {
    if (!initializing) {
      initializing = initialize();
      initializing.then(() => { if (pending && revision !== null) schedule(); });
    }
    return initializing;
  }
  function serverRecord(record) {
    // No provider output blobs, signed URLs or face pixels are stored in the draft row.
    return Object.fromEntries(['draft', 'selection', 'jobId', 'saveId', 'savedLookId', 'saveAfterLogin', 'guideStep']
      .filter(k => record[k] !== undefined).map(k => [k, record[k]]));
  }
  async function drain() {
    await read();
    if (blocked) throw new Error(sync.message);
    if (revision === null) {
      const body = await request();
      if (body.revision !== 0) { blocked = true; throw Object.assign(new Error('Đã có bản nháp trên server. Tải lại Studio để tránh ghi đè lựa chọn trên thiết bị khác.'), { status: 409 }); }
      revision = 0;
    }
    while (pending) {
      const record = pending; pending = null;
      try {
        const body = await request({ action: 'save', revision, record: serverRecord(record) });
        revision = body.revision;
        announce(pending ? 'saving' : 'saved', pending ? 'Đang lưu thay đổi…' : 'Bản nháp đã lưu trong tài khoản.', { hasDraft: meaningful(record), updatedAt: body.updatedAt });
      } catch (e) { if (!pending) pending = record; if (e.status === 409) blocked = true; throw e; }
    }
  }
  function flushServer() {
    clearTimeout(timer);
    writing = writing.catch(() => {}).then(drain);
    writing.catch(e => announce(e.status === 409 || blocked ? 'conflict' : 'error', e.message || 'Chưa đồng bộ được bản nháp lên tài khoản.'));
    return writing;
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(() => { flushServer().catch(() => {}); }, 600); }
  window.VRemixSession = {
    read,
    save(value) {
      const record = sanitize(value);
      cacheSave(record).catch(() => {});
      if (!authenticated) {
        announce('guest', 'Bản nháp tạm trên thiết bị. Đăng nhập để lưu trong tài khoản.', { hasDraft: meaningful(record) });
        return localQueue.catch(() => {});
      }
      pending = record;
      if (!blocked) { announce('saving', 'Đang lưu bản nháp vào tài khoản…', { hasDraft: meaningful(record) }); schedule(); }
      return Promise.resolve();
    },
    async clear() {
      clearTimeout(timer); pending = null;
      if (authenticated) {
        await read(); await writing.catch(() => {});
        clearTimeout(timer); pending = null;
        if (blocked || revision === null) throw new Error(sync.message || 'Chưa mở được bản nháp trên server.');
        try {
          const body = await request({ action: 'clear', revision }); revision = body.revision;
          announce('saved', 'Đã xóa bản nháp trong tài khoản. Các bản phối đã lưu không bị xóa.', { hasDraft: false });
        } catch (e) { if (e.status === 409) blocked = true; announce(e.status === 409 ? 'conflict' : 'error', e.message); throw e; }
      }
      // Delete the device cache only after server confirmation.
      await localQueue.catch(() => {});
      await transact('readwrite', store => store.delete(key)).catch(e => { if (!authenticated) throw e; });
      if (authenticated) await transact('readwrite', store => store.delete(legacyKey)).catch(() => {});
      else announce('guest', 'Đã xóa bản nháp trên thiết bị.', { hasDraft: false });
    },
    flush() { return authenticated ? flushServer().catch(() => {}) : localQueue.catch(() => {}); },
    retry() { return authenticated ? flushServer() : localQueue; },
    status() { return { ...sync }; }
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && pending && !blocked) flushServer().catch(() => {}); });
})();
