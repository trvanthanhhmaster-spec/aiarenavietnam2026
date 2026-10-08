(function () {
  'use strict';
  var app = document.getElementById('studioExperience'), api = app.collectionsApi, config = window.VREMIX_STUDIO;
  var dialog = document.getElementById('studioCollections'), grid = document.getElementById('collectionsItems');
  var status = document.getElementById('collectionsStatus'), confirm = document.getElementById('collectionSwitchConfirm');
  var error = document.getElementById('collectionSwitchError'), accept = document.getElementById('collectionSwitchAccept');
  var trigger, action, busy = false;
  var controls = [document.getElementById('newStudioCollection')].concat(Array.from(document.querySelectorAll('[data-workspace-collections]')));
  function enable() { controls.forEach(function (button) { button.disabled = !api.ready() || busy || api.busy(); }); }
  app.addEventListener('studio:collections-ready', enable); app.addEventListener('studio:collections-busy', enable); enable();
  document.getElementById('collectionsPrivacy').textContent = config.auth.authenticated
    ? 'Bộ sưu tập được lưu riêng trong tài khoản. Ảnh mặt tham khảo không được lưu.'
    : 'Bộ sưu tập tạm trên thiết bị trong 24 giờ. Đăng nhập để giữ trong tài khoản.';
  function render() {
    grid.replaceChildren();
    api.list().forEach(function (item) {
      var card = document.createElement('article'); card.className = 'collection-card';
      var open = document.createElement('button'); open.type = 'button'; open.className = 'collection-open';
      open.setAttribute('aria-label', 'Mở bộ sưu tập ' + item.name);
      var cover = document.createElement('div'); cover.className = 'collection-cover';
      var record = item.record, image = item.coverUrl ? {url:item.coverUrl} : record.output && record.output.lookbook && record.output.lookbook.items[0];
      if (image && image.url) {
        var picture = document.createElement('img'); picture.src = image.url; picture.alt = item.name; picture.loading = 'lazy';
        picture.onerror = function () { picture.hidden = true; cover.textContent = 'Mở để tải lại ảnh'; };
        cover.appendChild(picture);
      } else cover.textContent = record.jobId || record.savedLookId ? 'Ảnh chưa tải được' : 'Đang chuẩn bị';
      var title = document.createElement('strong'); title.textContent = item.name;
      var note = document.createElement('span');
      var count = item.count;
      note.textContent = (count != null ? count + (item.hasMore ? '+' : '') + ' bản phối' : record.jobId || record.savedLookId ? 'Bản phối đã tạo' : 'Chưa tạo ảnh') + (item.id === api.active() ? ' · Đang mở' : '');
      open.append(cover, title, note); card.append(open);
      open.addEventListener('click', function () {
        if (item.id === api.active()) { dialog.close(); return; }
        transition(function () { return api.open(item.id); }, open);
      });
      var tools = document.createElement('div'); tools.className = 'collection-actions';
      var rename = document.createElement('button'); rename.type = 'button'; rename.textContent = 'Đổi tên';
      var editor = document.createElement('form'); editor.hidden = true;
      var input = document.createElement('input'); input.value = item.name; input.maxLength = 120; input.setAttribute('aria-label','Tên bộ sưu tập');
      var save = document.createElement('button'); save.type = 'submit'; save.textContent = 'Lưu tên'; editor.append(input,save);
      rename.onclick = function () { if (busy || api.busy()) return; editor.hidden = !editor.hidden; if (!editor.hidden) input.focus(); };
      editor.onsubmit = function (e) { e.preventDefault(); execute(async function () { await api.rename(item.id,input.value); }); };
      var remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Xóa bộ';
      remove.onclick = function () {
        if (busy || api.busy()) return;
        trigger = remove; action = function () { return api.remove(item.id); }; error.hidden = true;
        document.getElementById('collectionSwitchTitle').textContent = 'Xóa bộ sưu tập này?';
        document.getElementById('collectionSwitchDescription').textContent = 'Bộ và các phiên bản sẽ không còn xuất hiện trong Studio. Không tự khôi phục từ lịch sử. Tệp ảnh chưa bị xóa vĩnh viễn.';
        accept.textContent = 'Xác nhận xóa bộ'; confirm.showModal();
      };
      tools.append(rename,remove); card.append(tools,editor); grid.appendChild(card);
    });
  }
  async function execute(fn) {
    if (busy) return;
    busy = true; enable(); accept.disabled = true; error.hidden = true;
    document.getElementById('collectionActionStatus').hidden = true;
    try { await fn(); confirm.close(); dialog.close(); document.getElementById('studioStage').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (e) {
      if (confirm.open) { error.textContent = e.message; error.hidden = false; }
      else { var notice = document.getElementById('collectionActionStatus'); notice.textContent = e.message; notice.hidden = false; if (dialog.open) status.textContent = e.message; }
    } finally { busy = false; accept.disabled = false; enable(); }
  }
  function transition(fn, button) {
    if (busy) return;
    trigger = button;
    document.getElementById('collectionSwitchTitle').textContent = 'Chuyển bộ sưu tập?';
    document.getElementById('collectionSwitchDescription').textContent = 'Lựa chọn và ảnh đang mở được giữ trong bộ cũ. Ảnh mặt cần được thêm lại khi dùng tiếp.';
    accept.textContent = 'Giữ lại và chuyển';
    if (api.edited()) { action = fn; error.hidden = true; confirm.showModal(); }
    else execute(fn);
  }
  document.getElementById('newStudioCollection').addEventListener('click', function () { transition(function () { return api.start(); }, this); });
  accept.addEventListener('click', function () { if (action) execute(action); });
  document.getElementById('collectionSwitchCancel').addEventListener('click', function () { confirm.close(); });
  confirm.addEventListener('cancel', function (e) { if (busy) e.preventDefault(); });
  confirm.addEventListener('close', function () { action = null; if (!busy && trigger) trigger.focus(); });
  document.querySelectorAll('[data-workspace-collections]').forEach(function (button) { button.addEventListener('click', function () {
    if (!api.ready() || busy) return; trigger = button; render(); status.textContent = api.list().length ? '' : 'Chưa có bộ sưu tập. Bắt đầu bằng “＋ Bộ sưu tập mới”.'; dialog.showModal();
  }); });
  document.getElementById('collectionsClose').addEventListener('click', function () { if (!busy) dialog.close(); });
  dialog.addEventListener('close', function () { if (trigger && trigger.isConnected) trigger.focus(); });
  dialog.addEventListener('cancel', function (event) { if (busy) event.preventDefault(); });
  app.addEventListener('studio:collections-change', function () { if (dialog.open && !busy) render(); });
})();
