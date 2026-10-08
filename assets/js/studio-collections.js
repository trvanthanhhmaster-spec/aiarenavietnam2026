(function () {
  'use strict';
  var app = document.getElementById('studioExperience'), api = app.collectionsApi, config = window.VREMIX_STUDIO;
  var dialog = document.getElementById('studioCollections'), grid = document.getElementById('collectionsItems');
  var status = document.getElementById('collectionsStatus'), confirm = document.getElementById('collectionSwitchConfirm');
  var error = document.getElementById('collectionSwitchError'), accept = document.getElementById('collectionSwitchAccept');
  var trigger, action, busy = false, loadSerial = 0, counts = {};
  var controls = [document.getElementById('newStudioCollection')].concat(Array.from(document.querySelectorAll('[data-workspace-collections]')));
  function enable() { controls.forEach(function (button) { button.disabled = !api.ready() || busy; }); }
  app.addEventListener('studio:collections-ready', enable); enable();
  document.getElementById('collectionsPrivacy').textContent = config.auth.authenticated
    ? 'Bộ sưu tập được lưu riêng trong tài khoản. Ảnh mặt tham khảo không được lưu.'
    : 'Bộ sưu tập tạm trên thiết bị trong 24 giờ. Đăng nhập để giữ trong tài khoản.';
  function render() {
    grid.replaceChildren();
    api.list().forEach(function (item) {
      var card = document.createElement('button'); card.type = 'button'; card.className = 'collection-card';
      card.setAttribute('aria-label', 'Mở bộ sưu tập ' + item.name);
      var cover = document.createElement('div'); cover.className = 'collection-cover';
      var record = item.record, image = record.output && record.output.lookbook && record.output.lookbook.items[0];
      if (image && image.url) {
        var picture = document.createElement('img'); picture.src = image.url; picture.alt = item.name; picture.loading = 'lazy';
        picture.onerror = function () { picture.hidden = true; cover.textContent = 'Mở để tải lại ảnh'; };
        cover.appendChild(picture);
      } else cover.textContent = record.jobId || record.savedLookId ? 'Ảnh chưa tải được' : 'Đang chuẩn bị';
      var title = document.createElement('strong'); title.textContent = item.name;
      var note = document.createElement('span');
      var count = counts[record.jobId || 'look:' + record.savedLookId];
      note.textContent = (count != null ? count + ' bản phối' : record.jobId || record.savedLookId ? 'Bản phối đã tạo' : 'Chưa tạo ảnh') + (item.id === api.active() ? ' · Đang mở' : '');
      card.append(cover, title, note);
      card.addEventListener('click', function () {
        if (item.id === api.active()) { dialog.close(); return; }
        transition(function () { return api.open(item.id); }, card);
      }); grid.appendChild(card);
    });
  }
  async function execute(fn) {
    if (busy) return;
    busy = true; enable(); accept.disabled = true; error.hidden = true;
    try { await fn(); confirm.close(); dialog.close(); document.getElementById('studioStage').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (e) {
      if (confirm.open) { error.textContent = e.message; error.hidden = false; }
      else { status.textContent = e.message; if (!dialog.open) dialog.showModal(); }
    } finally { busy = false; accept.disabled = false; enable(); }
  }
  function transition(fn, button) {
    if (busy) return;
    loadSerial++;
    trigger = button;
    if (api.edited()) { action = fn; error.hidden = true; confirm.showModal(); }
    else execute(fn);
  }
  document.getElementById('newStudioCollection').addEventListener('click', function () { transition(function () { return api.start(); }, this); });
  accept.addEventListener('click', function () { if (action) execute(action); });
  document.getElementById('collectionSwitchCancel').addEventListener('click', function () { confirm.close(); });
  confirm.addEventListener('cancel', function (e) { if (busy) e.preventDefault(); });
  confirm.addEventListener('close', function () { action = null; if (!busy && trigger) trigger.focus(); });
  async function loadLegacy() {
    var serial = ++loadSerial, offset = 0, groups = {}, more = true;
    status.textContent = 'Đang mở bộ sưu tập…';
    try {
      while (more) {
        var response = await fetch(config.historyEndpoint + '?offset=' + offset, { headers: { 'X-VRemix-CSRF': config.lookCsrf } });
        var body = await response.json();
        if (serial !== loadSerial || !dialog.open) return;
        if (!response.ok) throw new Error(body.error || 'Chưa tải được các bộ cũ.');
        (body.items || []).forEach(function (item) {
          var key = item.rootJobId || item.rootLookId || item.id;
          if (!groups[key]) groups[key] = { ids: [], updatedAt: 0, record: null };
          var group = groups[key]; group.ids.push(item.jobId || item.id);
          var time = Date.parse(item.created_at) || 0;
          if (!group.record || time >= group.updatedAt) {
            group.updatedAt = time;
            group.record = { draft: item.selection, selection: item.selection, guideStep: 'review', jobId: item.jobId || null,
              savedLookId: item.lookId || null, saveId: item.client_save_id || null,
              output: item.image_url ? { lookbook: { items: [{ url: item.image_url, path: item.storage_path }] } } : null };
          }
        });
        more = Boolean(body.hasMore); var next = body.nextOffset;
        if (more && !(next > offset)) throw new Error('Chưa tải hết các bộ cũ. Hãy thử mở lại.');
        offset = next;
      }
      Object.values(groups).forEach(function (group) { group.ids.forEach(function (id) { counts[id] = group.ids.length; }); });
      await api.importHistory(Object.values(groups));
      if (serial !== loadSerial || !dialog.open) return;
      render(); status.textContent = api.list().length ? '' : 'Chưa có bộ sưu tập. Bắt đầu bằng “＋ Bộ sưu tập mới”.';
    } catch (e) { if (serial === loadSerial && dialog.open) status.textContent = e.message; }
  }
  document.querySelectorAll('[data-workspace-collections]').forEach(function (button) { button.addEventListener('click', function () {
    if (!api.ready() || busy) return; trigger = button; render(); dialog.showModal(); loadLegacy();
  }); });
  document.getElementById('collectionsClose').addEventListener('click', function () { if (!busy) dialog.close(); });
  dialog.addEventListener('close', function () { loadSerial++; if (trigger) trigger.focus(); });
  dialog.addEventListener('cancel', function (event) { if (busy) event.preventDefault(); });
  dialog.querySelector('[data-workspace-library]').addEventListener('click', function () { dialog.close(); });
})();
