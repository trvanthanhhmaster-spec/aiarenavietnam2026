(() => {
  'use strict';
  const config = window.VREMIX_STUDIO, experience = document.getElementById('studioExperience');
  const dialog = document.getElementById('studioLibrary'), items = document.getElementById('libraryItems');
  const status = document.getElementById('libraryStatus'), more = document.getElementById('libraryMore');
  let offset = 0, trigger, loadVersion = 0;
  async function request(payload, page = 0) {
    const response = await fetch(config.lookEndpoint + (payload ? '' : '?offset=' + page), {
      method: payload ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'X-VRemix-CSRF': config.lookCsrf },
      ...(payload ? { body: JSON.stringify(payload) } : {})
    });
    const body = await response.json();
    if (response.status === 401) { dialog.close(); document.dispatchEvent(new Event('vremix:open-auth')); }
    if (!response.ok) throw new Error(body.error || 'Không thể mở thư viện.');
    return body;
  }
  function button(text, fn) {
    const element = document.createElement('button'); element.type = 'button'; element.textContent = text;
    element.addEventListener('click', async () => {
      element.disabled = true;
      try { await fn(); } catch (e) { status.textContent = e.message; }
      finally { element.disabled = false; }
    }); return element;
  }
  function card(look) {
    const article = document.createElement('article'), image = document.createElement('img');
    image.src = look.image_url || ''; image.alt = look.name; image.loading = 'lazy';
    const title = document.createElement('h3'); title.textContent = look.name;
    const date = document.createElement('p'); date.textContent = new Date(look.created_at).toLocaleDateString('vi-VN');
    const actions = document.createElement('div');
    const openImage = button('Mở ảnh', () => { experience.resultsApi.open(look, false); dialog.close(); });
    const mediaNote = document.createElement('p'); mediaNote.hidden = true;
    const unavailable = () => {
      image.hidden = true; openImage.disabled = true; mediaNote.hidden = false;
      mediaNote.textContent = 'Ảnh cũ không tải được. Bạn vẫn có thể mở lựa chọn để chỉnh tiếp.';
      look.image_url = null;
    };
    if (!look.image_url) unavailable();
    image.onerror = unavailable;
    actions.append(openImage,
      button('Chỉnh tiếp', () => { experience.resultsApi.open(look, true); dialog.close(); }));
    const edit = document.createElement('div'); edit.hidden = true;
    const name = document.createElement('input'); name.value = look.name; name.maxLength = 120; name.setAttribute('aria-label', 'Tên bản phối');
    edit.append(name, button('Lưu tên', async () => {
      await request({ action: 'rename', id: look.id, name: name.value }); look.name = name.value.trim(); title.textContent = look.name; edit.hidden = true;
    }), button('Hủy', () => { edit.hidden = true; }));
    const confirm = document.createElement('div'); confirm.hidden = true;
    const note = document.createElement('p'); note.textContent = 'Xóa bản này khỏi thư viện? Không thể hoàn tác. Ảnh trong lịch sử tạo chưa bị xóa.';
    confirm.append(note, button('Xác nhận xóa', async () => {
      await request({ action: 'delete', id: look.id }); article.remove(); offset = Math.max(0, offset - 1);
      status.textContent = offset ? 'Đã xóa khỏi thư viện.' : 'Bạn chưa lưu bản phối nào. Tạo ảnh rồi bấm “Lưu bản phối”.';
    }), button('Giữ lại', () => { confirm.hidden = true; }));
    actions.append(button('Đổi tên', () => { edit.hidden = false; name.focus(); }), button('Xóa', () => { confirm.hidden = false; }));
    article.append(image, title, date, mediaNote, actions, edit, confirm); items.append(article);
  }
  async function load(reset) {
    const version = ++loadVersion;
    status.textContent = 'Đang mở thư viện…'; more.disabled = true;
    if (reset) { offset = 0; items.replaceChildren(); }
    try {
      const body = await request(null, offset);
      if (version !== loadVersion || !dialog.open) return;
      body.items.forEach(card); offset += body.items.length;
      more.hidden = !body.hasMore;
      status.textContent = offset ? 'Chọn một bản phối để xem hoặc chỉnh tiếp.' : 'Bạn chưa lưu bản phối nào. Tạo ảnh rồi bấm “Lưu bản phối”.';
    } catch (e) { if (version === loadVersion) status.textContent = e.message; }
    finally { if (version === loadVersion) more.disabled = false; }
  }
  document.querySelectorAll('[data-workspace-library]').forEach(element => element.addEventListener('click', () => {
    trigger = element;
    if (!config.auth.authenticated) { document.dispatchEvent(new Event('vremix:open-auth')); return; }
    dialog.showModal(); load(true);
  }));
  document.getElementById('libraryClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { loadVersion++; trigger?.focus(); });
  more.addEventListener('click', () => load(false));
  document.getElementById('clearStudioDraft').addEventListener('click', async () => {
    try {
      await window.VRemixSession.clear(); status.textContent = 'Đã xóa bản nháp trên thiết bị. Bản phối đã lưu trong tài khoản không bị xóa.';
    } catch (_) { status.textContent = 'Chưa xóa được bản nháp. Trình duyệt không cho phép truy cập bộ nhớ lúc này.'; }
  });
})();
