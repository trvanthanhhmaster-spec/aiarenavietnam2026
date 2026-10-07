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
  var items = [], scoped = false, serial = 0, pendingChoice = null, recent = false, nextOffset = 0;
  function currentId() {
    var value = api.current();
    var legacy = value.lookId && items.find(function (item) { return item.lookId === value.lookId && !item.jobId; });
    return legacy ? legacy.id : value.jobId || (value.lookId ? 'look:' + value.lookId : null);
  }
  function label(item, index) { return scoped ? 'Phiên bản ' + (index + 1) : item.name || 'Ảnh ' + (index + 1) + ' · ' + new Date(item.created_at).toLocaleDateString('vi-VN'); }
  function visible(value) { rail.hidden = !value; app.classList.toggle('has-history', value); }
  function open(item) {
    try {
      if (!item.image_url) throw new Error('Ảnh chưa tải được. Thử tải lại lịch sử; lựa chọn hiện tại vẫn được giữ.');
      pendingChoice = null; confirm.hidden = true; recent = false;
      api.open(item, true);
    } catch (error) { status.textContent = error.message; }
  }
  function render() {
    compare.textContent = 'So sánh';
    compare.title = 'So sánh ảnh đang chọn với ảnh trước đó';
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
    var selected = items.findIndex(function (item) { return item.id === currentId(); });
    compare.hidden = selected < 1 || !items[selected].image_url || !items[selected - 1].image_url;
    visible(items.length > 0);
  }
  async function load(append) {
    append = append === true;
    var request = ++serial, selected = api.current();
    var query = !recent && selected.lookId ? '?lookId=' + encodeURIComponent(selected.lookId)
      : !recent && selected.jobId ? '?jobId=' + encodeURIComponent(selected.jobId) : '';
    if (append) query += (query ? '&' : '?') + 'offset=' + nextOffset;
    retry.hidden = true;
    more.disabled = true;
    try {
      var response = await fetch(config.historyEndpoint + query, { headers: { 'X-VRemix-CSRF': config.lookCsrf || '' } });
      var body = await response.json();
      if (request !== serial) return;
      if (!response.ok) throw new Error(body.error || 'Chưa tải được lịch sử ảnh.');
      if (!append && body.scoped && body.items && body.items.length === 1 && !body.hasMore) {
        recent = true; return load(); // Legacy independent jobs are shown honestly as recent images.
      }
      if (append) items = scoped ? items.concat(body.items || []) : (body.items || []).concat(items);
      else items = body.items || [];
      scoped = Boolean(body.scoped); nextOffset = body.nextOffset || 0;
      more.hidden = !body.hasMore; more.disabled = false; status.textContent = '';
      render();
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
    var index = items.findIndex(function (item) { return item.id === currentId(); });
    if (index < 1) return;
    api.compare([items[index - 1], items[index]].map(function (item, offset) { return { url: item.image_url, label: label(item, index - 1 + offset) }; }));
    compare.textContent = compare.textContent === 'Đóng so sánh' ? 'So sánh' : 'Đóng so sánh';
  });
  app.addEventListener('studio:history-change', function () { recent = false; load(); });
  load();
})();
