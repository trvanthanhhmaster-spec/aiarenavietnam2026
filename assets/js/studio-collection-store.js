/* Per-collection optimistic writes. Reads never write; conflicts never overwrite. */
(() => {
  const config = window.VREMIX_STUDIO, base = window.VRemixSession;
  if (!config.collectionEndpoint || !config.auth.authenticated) return;
  let initialized, baseline = new Map(), pending, blocked = false, authExpired = false, writing = Promise.resolve(), timer;
  const accountKey = 'vremix.collections.' + config.auth.userId;
  let tabId;
  try { tabId = sessionStorage.getItem(accountKey+'.tab') || crypto.randomUUID(); sessionStorage.setItem(accountKey+'.tab',tabId); } catch (_) { tabId = crypto.randomUUID(); }
  const key = accountKey + '.recovery.' + tabId;
  const activeKey = accountKey + '.active.' + tabId;
  let sync = { state: 'loading', hasDraft: false, message: '' };
  const announce = (state, message) => {
    sync = { state, message, hasDraft: baseline.size > 0 || Boolean(pending) };
    document.dispatchEvent(new CustomEvent('vremix:draft-sync', { detail: sync }));
  };
  const clean = record => {
    const outfit = value => {
      const result = {};
      for (const k of ['garment','garmentVariant','color','pattern','style','scene']) result[k] = value[k] || '';
      for (const k of ['accessories','accessoryVariants']) result[k] = [...new Set(value[k] || [])];
      return result;
    };
    const selection = value => {
      if (!value) return null;
      const result = { ...outfit(value), event: value.event || '', locks: {} };
      for (const k of ['aspectRatio','resolution','mode','outputType','activeFrame']) if (value[k] != null) result[k] = value[k];
      for (const k of ['character','face','hair','garment','background','pose','camera','lighting']) result.locks[k] = value.locks?.[k] !== false;
      const p = value.planning;
      if (p) result.planning = { version:1,count:p.count ?? null,shared:p.shared !== false,activePerson:p.activePerson || 1,
        period:p.period ? {kind:p.period.kind,start:p.period.kind==='unspecified'?'':p.period.start,end:p.period.kind==='unspecified'?'':p.period.end}:null,
        customOccasion:(p.customOccasion || '').trim(),occasionNote:(p.occasionNote || '').trim(),people:(p.people || []).map((person,i)=>({
          id:i+1,name:(person.name || '').trim(),gender:person.gender || '',heightCm:person.heightCm ?? null,weightKg:person.weightKg ?? null,
          faceSupplied:false,customized:Boolean(person.customized),outfit:outfit(person.outfit || {}) })) };
      return result;
    };
    return { draft:selection(record.draft),selection:selection(record.selection),jobId:record.jobId || null,
      saveId:record.saveId || null,savedLookId:record.savedLookId || null,saveAfterLogin:Boolean(record.saveAfterLogin),guideStep:record.guideStep || 'event' };
  };
  const wire = item => ({ id: item.id, name: item.name, record: clean(item.record), deleted: Boolean(item.deleted) });
  const fingerprint = item => JSON.stringify(wire(item));
  async function request(items) {
    const response = await fetch(config.collectionEndpoint, { method: items ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-VRemix-CSRF': config.lookCsrf, 'X-VRemix-Account': config.auth.userId },
      ...(items ? { body: JSON.stringify({ items }) } : {}) });
    const body = await response.json();
    if (!response.ok) {
      if ([401,403].includes(response.status)) {
        authExpired = true;
        announce('auth', 'Phiên đăng nhập cần làm mới. Thay đổi được giữ trên thiết bị cho tài khoản này.');
      }
      throw Object.assign(new Error(body.error || 'Chưa mở được bộ sưu tập.'), { status: response.status });
    }
    return body;
  }
  function remember(record) {
    try { localStorage.setItem(key, JSON.stringify({ time: Date.now(), record: { collectionId: record.collectionId, collections: record.collections.filter(item => !baseline.has(item.id) || fingerprint(item) !== baseline.get(item.id).fingerprint).map(item => ({ ...wire(item), revision: item.revision || 0 })) } })); }
    catch (_) { announce('error', 'Không giữ được bản khôi phục trên thiết bị. Đừng đóng trang trước khi lưu thành công.'); }
  }
  function read() {
    if (!initialized) initialized = (async () => {
      const body = await request();
      body.items.forEach(item => baseline.set(item.id, { revision: item.revision, fingerprint: fingerprint(item) }));
      let items = body.items, active;
      try { active = localStorage.getItem(activeKey); const recovery = JSON.parse(localStorage.getItem(key) || 'null');
        if (recovery && Date.now() - recovery.time < 86400000) {
          const dirty = recovery.record.collections.filter(item => !baseline.has(item.id) || fingerprint(item) !== baseline.get(item.id).fingerprint);
          if (dirty.length) {
            const removedOrChanged = dirty.some(item => baseline.has(item.id) ? item.revision !== baseline.get(item.id).revision : item.revision > 0);
            if (removedOrChanged) { blocked = true; pending = recovery.record; announce('conflict', 'Có bản chỉnh trên thiết bị chưa đồng bộ. Giữ thành bộ riêng hoặc mở bản mới nhất.'); }
            else {
              const map = new Map(items.map(item => [item.id,item])); dirty.forEach(item => map.set(item.id,item)); items = [...map.values()];
              pending = recovery.record; announce('error','Đã khôi phục thay đổi chưa đồng bộ. Bấm Thử lưu lại.');
            }
          }
        }
      } catch (_) { /* Recovery is optional, the server remains authoritative. */ }
      if (!body.hasAny && !items.length) {
        const guest = await base.readGuest();
        if (guest) { pending = guest; announce('saving', 'Bản khách được giữ; sẽ chuyển vào tài khoản khi lưu.'); return { ...guest, __migration:true }; }
      }
      if (!blocked && !pending) announce('saved', '');
      const selected = active ? items.find(item => item.id === active) : items[0];
      const collectionId = selected?.id || (body.deletedIds?.includes(active) ? crypto.randomUUID() : active || crypto.randomUUID());
      try { localStorage.setItem(activeKey,collectionId); } catch (_) {}
      return { ...(selected?.record || {}), collectionId, collections: items };
    })().catch(e => { initialized = undefined; if (!authExpired) announce('error', e.message); throw e; });
    return initialized;
  }
  async function drain() {
    if (authExpired) throw new Error(sync.message);
    await read(); if (blocked) throw new Error(sync.message);
    while (pending) {
      const record = pending; pending = null;
      const dirty = (record.collections || []).filter(item => !baseline.has(item.id) || fingerprint(item) !== baseline.get(item.id).fingerprint);
      try {
        // Bound request sizes without imposing a global collection payload limit.
        for (let index = 0; index < dirty.length; index += 10) {
          const batch = dirty.slice(index,index + 10).map(item => ({ ...wire(item), revision: baseline.get(item.id)?.revision || item.revision || 0 }));
          const response = await request(batch);
          response.items.forEach(item => {
            const source = dirty.find(row => row.id === item.id);
            baseline.set(item.id, { revision: item.revision, fingerprint: fingerprint(source) });
          });
        }
        (record.collections || []).forEach(item => { item.revision = baseline.get(item.id)?.revision || 0; });
        if (pending) remember(pending); else localStorage.removeItem(key);
        localStorage.setItem(activeKey, (pending || record).collectionId);
        announce(pending ? 'saving' : 'saved', '');
      } catch (e) { if (!pending) pending = record; blocked = e.status === 409; if (!authExpired) announce(blocked ? 'conflict' : 'error', e.message); throw e; }
    }
  }
  function flush() { clearTimeout(timer); writing = writing.catch(() => {}).then(drain); return writing; }
  window.VRemixSession = {
    read,
    async getCollection(id) {
      await flush();
      const body = await request();
      const item = body.items.find(row => row.id === id);
      if (!item) throw new Error('Bộ này đã bị xóa hoặc không còn thuộc tài khoản.');
      baseline.set(id,{revision:item.revision,fingerprint:fingerprint(item)});
      return item;
    },
    save(record) {
      if (blocked) return Promise.resolve();
      const items = record.collections || [];
      items.forEach(item => { item.revision = baseline.get(item.id)?.revision || item.revision || 0; });
      try { localStorage.setItem(activeKey,record.collectionId); } catch (_) {}
      if (!items.some(item => !baseline.has(item.id) || fingerprint(item) !== baseline.get(item.id).fingerprint)) return Promise.resolve();
      remember(record);
      pending = JSON.parse(JSON.stringify(record));
      if (!blocked && !authExpired) { clearTimeout(timer); timer = setTimeout(() => flush().catch(() => {}),600); announce('saving', 'Đang lưu bộ sưu tập…'); }
      return Promise.resolve();
    },
    async deleteVersion(collectionId, jobId) {
      await flush();
      const response = await fetch(config.collectionEndpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-VRemix-CSRF':config.lookCsrf,'X-VRemix-Account':config.auth.userId},body:JSON.stringify({action:'hideVersion',collectionId,jobId,revision:baseline.get(collectionId)?.revision})});
      const body = await response.json();
      if (!response.ok) {
        if ([401,403].includes(response.status)) { authExpired=true; announce('auth','Phiên đăng nhập cần làm mới. Thay đổi được giữ trên thiết bị cho tài khoản này.'); }
        else if (response.status===409) {blocked=true;announce('conflict',body.error);}
        throw new Error(body.error);
      }
      baseline.set(collectionId,{revision:body.item.revision,fingerprint:fingerprint(body.item)});
      return body.item;
    },
    retry: flush,
    flush: () => flush(),
    status: () => ({ ...sync }),
    discardRecovery() { localStorage.removeItem(key); location.reload(); },
    async forkLocal() {
      if (!pending) return;
      const copies = pending.collections.filter(item => !baseline.has(item.id) || fingerprint(item) !== baseline.get(item.id).fingerprint)
        .filter(item => !item.deleted).map(item => ({ ...wire(item),id:crypto.randomUUID(),revision:0,name:(item.name+' · Bản trên thiết bị').slice(0,120) }));
      if (!copies.length) throw new Error('Không có thay đổi để giữ thành bộ riêng.');
      await request(copies); localStorage.removeItem(key); localStorage.setItem(activeKey,copies[0].id); location.reload();
    }
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && pending && !blocked) flush().catch(() => {}); });
})();
