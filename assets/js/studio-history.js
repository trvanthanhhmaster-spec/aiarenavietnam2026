(function () {
  'use strict';
  var app = document.getElementById('studioExperience');
  var config = window.VREMIX_STUDIO || {};
  var rail = document.getElementById('studioHistory');
  if (!app || !rail || !app.resultsApi || !config.historyEndpoint) return;
  var api = app.resultsApi;
  var strip = document.getElementById('historyItems');
  var status = document.getElementById('historyStatus');
  var retry = document.getElementById('historyRetry');
  var confirm = document.getElementById('historyConfirm');
  var compare = document.getElementById('historyCompare');
  var more = document.getElementById('historyMore');
  var removeCurrent = document.getElementById('deleteCurrentVersion');
  function updateDelete() { if (removeCurrent) removeCurrent.hidden = !config.auth?.authenticated || !api.current().jobId; }
  if (removeCurrent) removeCurrent.addEventListener('click', async function () {
    if (api.current().pending || !api.current().jobId) return;
    if (!window.confirm('Xóa phiên bản đang xem khỏi bộ sưu tập? Ảnh này cũng sẽ được bỏ khỏi bản phối đã lưu. Tệp ảnh chưa bị xóa vĩnh viễn.')) return;
    removeCurrent.disabled = true;
    try { await app.collectionsApi.removeVersion(api.current().jobId); updateDelete(); }
    catch (e) { status.textContent = e.message; visible(true); }
    finally { removeCurrent.disabled = false; }
  });
  var items = [], scoped = false, serial = 0, pendingChoice = null, recent = false, nextOffset = 0, loadedCollectionId = null;
  function currentId() {
    var value = api.current();
    var legacy = value.lookId && items.find(function (item) { return item.lookId === value.lookId && !item.jobId; });
    return legacy ? legacy.id : value.jobId || (value.lookId ? 'look:' + value.lookId : null);
  }
  function label(item, index) { return scoped ? 'Phiên bản ' + (index + 1) : item.name || 'Ảnh ' + (index + 1) + ' · ' + new Date(item.created_at).toLocaleDateString('vi-VN'); }
  function visible(value) { rail.hidden = !value; app.classList.toggle('has-history', value); }
  function highlightSelection() {
    Array.prototype.forEach.call(strip.children, function (button, index) {
      var active = items[index] && items[index].id === currentId();
      button.classList.toggle('is-active', Boolean(active));
      button.setAttribute('aria-pressed', String(Boolean(active)));
    });
    compare.textContent = api.isComparing && api.isComparing() ? 'Đóng so sánh' : 'So sánh';
    updateDelete();
  }
  function open(item) {
    try {
      if (!item.image_url) throw new Error('Ảnh chưa tải được. Thử tải lại lịch sử; lựa chọn hiện tại vẫn được giữ.');
      pendingChoice = null; confirm.hidden = true; recent = false;
      api.open(item, true);
    } catch (error) { status.textContent = error.message; }
  }
  function render() {
    compare.textContent = api.isComparing && api.isComparing() ? 'Đóng so sánh' : 'So sánh';
    compare.title = 'Chọn hai phiên bản để đối chiếu';
    strip.replaceChildren();
    document.getElementById('historyTitle').textContent = scoped ? 'Phiên bản' : 'Ảnh gần đây';
    document.getElementById('historyRecent').hidden = !scoped;
    items.forEach(function (item, index) {
      var button = document.createElement('button'); button.type = 'button';
      var active = item.id === currentId();
      button.className = 'studio-history-item' + (active ? ' is-active' : '');
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', label(item, index) + ' · ' + (item.saved ? 'Đã lưu' : 'Chưa lưu'));
      button.title = label(item, index) + ' · ' + new Date(item.created_at).toLocaleString('vi-VN');
      if (item.image_url) {
        var image = document.createElement('img'); image.src = item.image_url; image.alt = ''; image.loading = 'lazy';
        image.addEventListener('error', function () { image.hidden = true; button.classList.add('image-unavailable'); });
        button.appendChild(image);
      }
      var title = document.createElement('strong'); title.textContent = scoped || !item.name ? 'Bản ' + String(index + 1).padStart(2, '0') : item.name;
      var note = document.createElement('small'); note.textContent = item.saved ? 'Đã lưu' : 'Chưa lưu';
      note.className = 'history-save-state' + (item.saved ? ' is-saved' : ''); note.title = note.textContent;
      button.append(title, note);
      if (item.parentJobId && scoped) {
        var parentIndex = items.findIndex(function (row) { return row.jobId === item.parentJobId; });
        if (parentIndex >= 0 && parentIndex !== index - 1) {
          button.title += ' · Từ phiên bản ' + (parentIndex + 1);
        }
      }
      button.addEventListener('click', function () {
        if (api.current().pending) { status.textContent = 'Đợi ảnh đang tạo hoàn tất rồi chọn phiên bản khác.'; return; }
        if (api.current().edited) { pendingChoice = item; confirm.hidden = false; return; }
        open(item);
      });
      strip.appendChild(button);
    });
    compare.hidden = items.filter(function (item) { return item.image_url; }).length < 2;
    visible(items.length > 1 || items.length > 0 && !api.current().jobId);
    updateDelete();
  }
  async function load(append) {
    append = append === true;
    var request = ++serial, selected = api.current();
    updateDelete();
    // A new project should not show unrelated older generations. Restore the
    // rail only for the result currently opened, or an explicit recent action.
    if (!recent && !selected.jobId && !selected.lookId && !selected.hasCollection) {
      items = []; strip.replaceChildren(); visible(false);
      pendingChoice = null; confirm.hidden = true;
      return;
    }
    var query = selected.collectionId ? '?collectionId=' + encodeURIComponent(selected.collectionId)
      : !recent && selected.lookId ? '?lookId=' + encodeURIComponent(selected.lookId)
      : !recent && selected.jobId ? '?jobId=' + encodeURIComponent(selected.jobId) : '';
    if (append) query += (query ? '&' : '?') + 'offset=' + nextOffset;
    retry.hidden = true;
    more.disabled = true;
    try {
      var response = await fetch(config.historyEndpoint + query, { headers: { 'X-VRemix-CSRF': config.lookCsrf || '' } });
      var body = await response.json();
      if (request !== serial) return;
      if (!response.ok) throw new Error(body.error || 'Chưa tải được lịch sử ảnh.');
      if (append) items = scoped ? items.concat(body.items || []) : (body.items || []).concat(items);
      else items = body.items || [];
      scoped = Boolean(body.scoped); loadedCollectionId = selected.collectionId || null; nextOffset = body.nextOffset || 0;
      more.hidden = !body.hasMore; more.disabled = false; status.textContent = '';
      render();
      app.dispatchEvent(new CustomEvent('studio:version-count', { detail: { count: items.length, hasMore: body.hasMore, collectionId: selected.collectionId } }));
    } catch (error) {
      if (request !== serial) return;
      status.textContent = error.message; retry.hidden = false;
      more.disabled = false;
      if (selected.jobId || selected.lookId || items.length) visible(true);
    }
  }
  document.getElementById('historyRecent').addEventListener('click', function () { recent = true; load(); });
  retry.addEventListener('click', load);
  more.addEventListener('click', function () { load(true); });
  document.getElementById('historyAccept').addEventListener('click', function () { if (pendingChoice) open(pendingChoice); });
  document.getElementById('historyCancel').addEventListener('click', function () { pendingChoice = null; confirm.hidden = true; });
  compare.addEventListener('click', function () {
    if (api.isComparing && api.isComparing()) { api.closeCompare(); return; }
    api.compare(items.map(function (item, index) { return { url: item.image_url, label: label(item, index), active: item.id === currentId() }; }));
  });
  app.addEventListener('studio:compare-change', function () { compare.textContent = api.isComparing && api.isComparing() ? 'Đóng so sánh' : 'So sánh'; });
  app.addEventListener('studio:history-change', function (event) {
    recent = false;
    if (event && event.detail && event.detail.selectionOnly && scoped
        && loadedCollectionId === (api.current().collectionId || null)
        && items.some(function (item) { return item.id === currentId(); })) {
      // Choosing a known version is local. Do not wait for re-signing every
      // image, replace cached URLs, or let an older fetch undo this choice.
      ++serial; more.disabled = false; highlightSelection();
      return;
    }
    load();
  });
  load();
})();
