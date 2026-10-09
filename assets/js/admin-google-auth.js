(function () {
  'use strict';
  var panel = document.getElementById('adminGoogleAuth');
  if (!panel) return;
  var form = document.getElementById('googleAuthForm');
  var fields = document.getElementById('googleAuthFields');
  var enabled = document.getElementById('googleAuthEnabled');
  var clientId = document.getElementById('googleClientId');
  var secret = document.getElementById('googleClientSecret');
  var secretState = document.getElementById('googleSecretState');
  var badge = document.getElementById('googleProviderState');
  var notice = document.getElementById('googleAuthNotice');
  var state = null, dirty = false, busy = false, serial = 0;
  var config = window.VREMIX_ADMIN || {};

  document.getElementById('googleOrigin').value = window.location.origin;
  document.getElementById('googleSiteCallback').value = new URL('auth-callback.php', window.location.href).href;

  function message(text, error) {
    notice.textContent = text;
    notice.hidden = !text;
    notice.classList.toggle('admin-alert--error', !!error);
  }

  async function request(options) {
    var response = await fetch(config.endpoint + '?resource=google-auth', Object.assign({
      cache: 'no-store', credentials: 'same-origin',
      headers: { 'X-CSRF-Token': config.csrf, 'Accept': 'application/json', 'Content-Type': 'application/json' }
    }, options || {}));
    var body;
    try { body = await response.json(); } catch (error) { throw new Error('Không đọc được phản hồi máy chủ. Hãy làm mới.'); }
    if (!response.ok) throw new Error(body.error || 'Không thể xử lý cấu hình Google.');
    return body;
  }

  function render(body) {
    state = body;
    enabled.checked = body.enabled === true;
    clientId.value = body.client_id || '';
    secret.value = '';
    dirty = false;
    fields.disabled = !body.management_ready;
    badge.textContent = body.enabled === true ? 'Google đang bật' : body.enabled === false ? 'Google đang tắt' : 'Chưa xác định trạng thái';
    badge.classList.toggle('is-enabled', body.enabled === true);
    secretState.textContent = body.secret_configured === true
      ? 'Đã có secret trên Supabase. Để trống để giữ nguyên; nhập mới để thay thế.'
      : body.secret_configured === false ? 'Chưa có secret. Secret được gửi tới Supabase, không hiển thị lại.'
      : 'Chưa có quyền đọc cấu hình kết nối.';
    document.getElementById('googleCallback').value = body.google_callback || '';
    var link = document.getElementById('googleProviderLink');
    link.hidden = !body.provider_url;
    if (body.provider_url) link.href = body.provider_url;
    message(body.notice || '', false);
  }

  function canLeave() {
    if (busy) {
      message('Đang lưu cấu hình. Vui lòng chờ trước khi chuyển mục.', false);
      return false;
    }
    return !dirty || window.confirm('Cấu hình Google chưa được lưu. Bỏ thay đổi này?');
  }

  window.VRemixGoogleAuth = {
    canLeave: canLeave,
    leave: function () {
      serial++;
      panel.hidden = true;
      fields.disabled = true;
      secret.value = '';
      state = null;
      dirty = false;
    },
    load: async function () {
      var current = ++serial;
      panel.hidden = false;
      fields.disabled = true;
      state = null;
      secret.value = '';
      clientId.value = '';
      dirty = false;
      badge.textContent = 'Đang kiểm tra';
      message('Đang đọc trạng thái từ Supabase…', false);
      try {
        var body = await request();
        if (current !== serial) return;
        render(body);
        return body.management_ready ? 'Đã đồng bộ' : 'Chưa kết nối quản lý';
      } catch (error) {
        if (current !== serial) return;
        badge.textContent = 'Không đọc được trạng thái';
        message(error.message, true);
        return 'Đồng bộ lỗi';
      }
    }
  };

  form.addEventListener('input', function () { dirty = true; });
  form.addEventListener('change', function () { dirty = true; });
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (busy || !state || !state.management_ready || fields.disabled) return;
    var payload = { enabled: enabled.checked, client_id: clientId.value.trim(), client_secret: secret.value.trim(), revision: state.revision };
    // Never persist the plaintext in browser storage or leave it in a hidden panel.
    secret.value = '';
    busy = true;
    fields.disabled = true;
    message('Đang lưu trực tiếp vào Supabase…', false);
    try {
      var body = await request({ method: 'POST', body: JSON.stringify(payload) });
      render(body);
      message('Đã lưu cấu hình Google vào Supabase.', false);
    } catch (error) {
      // Require a fresh authoritative read before retrying an uncertain write.
      state = null;
      dirty = false;
      message(error.message + ' Bấm Làm mới để đọc lại; secret vừa nhập đã được xóa khỏi ô.', true);
    } finally {
      payload.client_secret = '';
      busy = false;
      fields.disabled = !state || !state.management_ready;
    }
  });

  panel.querySelectorAll('[data-google-copy]').forEach(function (button) {
    button.addEventListener('click', async function () {
      var input = document.getElementById(button.dataset.googleCopy);
      if (!input.value) { message('Chưa có địa chỉ. Hãy làm mới cấu hình.', false); return; }
      try {
        await navigator.clipboard.writeText(input.value);
        button.textContent = 'Đã chép';
        window.setTimeout(function () { button.textContent = 'Sao chép'; }, 1800);
      } catch (error) {
        input.focus(); input.select();
        message('Địa chỉ đã được chọn. Nhấn ⌘C hoặc Ctrl+C để sao chép.', false);
      }
    });
  });
  window.addEventListener('beforeunload', function (event) {
    if (dirty || busy) { event.preventDefault(); event.returnValue = ''; }
  });
  window.addEventListener('pagehide', function () { secret.value = ''; });
}());
