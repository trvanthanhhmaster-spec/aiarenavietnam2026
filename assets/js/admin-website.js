(function () {
  'use strict';
  var panel = document.getElementById('adminWebsiteSettings');
  if (!panel) return;
  var form = document.getElementById('websiteForm'), fields = document.getElementById('websiteFields');
  var inputs = document.getElementById('websiteInputs'), status = document.getElementById('websiteStatus');
  var config = window.VREMIX_ADMIN || {}, state = null, section = '', dirty = false, busy = false, serial = 0, selectedPreviews = {};
  var assetFields = { logo_light: ['Logo trên nền sáng', 'PNG/WebP nền trong suốt nếu có.'], logo_dark: ['Logo trên nền tối', 'Tùy chọn; để trống dùng logo nền sáng.'], favicon: ['Favicon', 'Ảnh vuông từ 48 px. PNG hoặc ICO; SVG có sẵn vẫn dùng được.'], apple_icon: ['Icon màn hình chính iPhone', 'Ảnh vuông từ 180 px; nên dùng PNG.'], icon_192: ['Icon ứng dụng 192 px', 'Ảnh vuông 192 × 192 px cho manifest.'], icon_512: ['Icon ứng dụng 512 px', 'Ảnh vuông 512 × 512 px cho manifest.'], share_image: ['Ảnh chia sẻ mặc định (og:image)', 'Nên dùng PNG/JPG/WebP 1200 × 630 px.'], home_share: ['Ảnh chia sẻ trang Khám phá', 'Để trống dùng ảnh mặc định.'], studio_share: ['Ảnh chia sẻ trang Studio', 'Để trống dùng ảnh mặc định.'] };
  function escape(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function message(text, error) { status.textContent = text; status.hidden = !text; status.classList.toggle('admin-alert--error', !!error); }
  function get(path) { return path.split('.').reduce(function (obj, key) { return obj[key]; }, state.settings[section]); }
  function set(path, value) { var keys = path.split('.'), obj = state.settings[section]; keys.slice(0, -1).forEach(function (key) { obj = obj[key]; }); obj[keys[keys.length - 1]] = value; }
  function textField(path, label, hint, multiline) {
    var id = 'website-' + path.replace(/\./g, '-');
    var value = get(path);
    if (Array.isArray(value)) value = value.join('\n');
    return '<div class="admin-website__field"><label for="' + id + '">' + escape(label) + '</label>' + (multiline ? '<textarea rows="3"' : '<input type="text"') + ' id="' + id + '" data-setting="' + path + '"' + (multiline ? '>' + escape(value) + '</textarea>' : ' value="' + escape(value) + '">') + (hint ? '<small>' + escape(hint) + '</small>' : '') + '</div>';
  }
  function check(path, label) { return '<label class="admin-website__check"><input type="checkbox" data-setting="' + path + '"' + (get(path) ? ' checked' : '') + '><span>' + escape(label) + '</span></label>'; }
  function asset(path, purpose) {
    var spec = assetFields[purpose];
    return '<section class="admin-website__asset" aria-label="' + escape(spec[0]) + '"><h4>' + escape(spec[0]) + '</h4><div class="admin-website__asset-body"><figure class="admin-website__asset-preview' + (purpose.indexOf('share') !== -1 ? ' admin-website__asset-preview--share' : '') + (purpose === 'logo_dark' ? ' admin-website__asset-preview--dark' : '') + '"><img id="website-asset-' + purpose + '" data-asset-path="' + path + '" data-asset-purpose="' + purpose + '" alt="Xem trước ' + escape(spec[0]) + '"><figcaption id="website-asset-caption-' + purpose + '">Ảnh đang chọn</figcaption></figure><div class="admin-website__asset-controls"><p class="admin-website__hint">' + escape(spec[1]) + '</p><div class="admin-website__upload"><input type="file" id="website-file-' + purpose + '" accept="image/png,image/jpeg,image/webp' + (purpose === 'favicon' ? ',image/x-icon,.ico' : '') + '" aria-label="Chọn tệp ' + escape(spec[0]) + '"><button type="button" class="admin-button admin-button--ghost" data-upload="' + purpose + '" data-path="' + path + '">Tải ảnh lên</button></div><small>Chọn tệp → Tải ảnh lên → Lưu cấu hình.</small><details class="admin-website__asset-path"><summary>Đường dẫn ảnh</summary>' + textField(path, 'Đường dẫn ' + spec[0], 'Chỉ chấp nhận asset có sẵn hoặc ảnh đã tải lên.') + '</details></div></div></section>';
  }
  function releaseSelectedPreviews() { Object.keys(selectedPreviews).forEach(function (key) { URL.revokeObjectURL(selectedPreviews[key]); }); selectedPreviews = {}; }
  function render() {
    panel.classList.toggle('is-brand', section === 'brand');
    document.getElementById('websitePreview').hidden = section === 'brand';
    document.getElementById('websiteIntro').textContent = section === 'brand' ? 'Quản lý nhận diện dùng chung cho Khám phá, Studio và khu vực quản trị. Tải ảnh công khai rồi lưu để áp dụng.' : 'Cấu hình cho các trang công khai. Trang quản trị, đăng nhập và dữ liệu cá nhân luôn không lập chỉ mục; không đưa vào sitemap.';
    var html = '';
    if (section === 'brand') {
      html = '<div class="admin-website__overview"><section class="admin-website__current-logo" aria-label="Logo hiện tại"><img id="websiteCurrentLogo" alt="Logo hiện tại"><h3>Logo hiện tại</h3><a href="#website-asset-logo_light">Đổi logo ↓</a></section><section class="admin-website__share-entry" aria-label="Ảnh chia sẻ website"><img id="websiteBrandShareImage" alt="Ảnh chia sẻ mặc định hiện tại"><div><h3>Ảnh chia sẻ · og:image</h3><p>Ảnh khi gửi liên kết website lên mạng xã hội. Đổi ảnh mặc định hoặc đặt ảnh riêng cho từng trang trong SEO & chia sẻ.</p><button type="button" class="admin-button admin-button--ghost" data-open-website="seo">Thay ảnh chia sẻ →</button></div></section></div><section class="admin-website__section"><h3>Nhận diện website</h3>' + textField('name', 'Tên website', 'Dùng cho thẻ chia sẻ, dữ liệu có cấu trúc và manifest.') + textField('theme_color', 'Màu giao diện ứng dụng', 'Dạng #RRGGBB; không thay toàn bộ bảng màu của website.') + '</section>';
      [['Logo', ['logo_light', 'logo_dark']], ['Favicon & icon thiết bị', ['favicon', 'apple_icon', 'icon_192', 'icon_512']]].forEach(function (group) { html += '<section class="admin-website__section"><h3>' + group[0] + '</h3>' + group[1].map(function (key) { return asset(key, key); }).join('') + '</section>'; });
    } else {
      html = '<section class="admin-website__section"><h3>Địa chỉ & chia sẻ mặc định</h3>' + textField('base_url', 'Domain chuẩn (canonical)', 'Domain HTTPS đang phục vụ website. Không dùng localhost.') + check('indexable', 'Cho phép các trang công khai được lập chỉ mục') + asset('share_image', 'share_image') + textField('share_alt', 'Mô tả ảnh chia sẻ', 'Giúp mô tả ảnh cho công nghệ hỗ trợ.') + '</section>';
      [['home', 'Khám phá'], ['studio', 'Studio']].forEach(function (page) {
        html += '<section class="admin-website__section"><h3>SEO · ' + page[1] + '</h3>' + textField('pages.' + page[0] + '.title', 'Tiêu đề trang', page[0] === 'home' ? 'Để trống dùng Title trong mục Trang chủ.' : 'Tiêu đề riêng cho Studio.') + textField('pages.' + page[0] + '.description', 'Mô tả trang', 'Ngắn gọn, đúng chức năng; không nhồi từ khóa.', true) + asset('pages.' + page[0] + '.share_image', page[0] + '_share') + check('pages.' + page[0] + '.indexable', 'Cho phép lập chỉ mục trang ' + page[1]) + '</section>';
      });
      html += '<section class="admin-website__section"><h3>Xác minh & thông tin tổ chức</h3>' + textField('google_verification', 'Mã xác minh Google Search Console', 'Chỉ nhập giá trị content, không dán cả thẻ meta.') + textField('bing_verification', 'Mã xác minh Bing Webmaster', 'Chỉ nhập giá trị content.') + textField('social_urls', 'Liên kết mạng xã hội chính thức', 'Mỗi dòng một URL HTTPS, tối đa 8. Dùng trong Organization.sameAs.', true) + '</section>';
    }
    inputs.innerHTML = html;
    document.getElementById('websiteBrandPreview').hidden = section !== 'brand';
    document.getElementById('websiteSeoPreview').hidden = section !== 'seo';
    preview();
  }
  function preview() {
    if (!state) return;
    var settings = state.settings;
    if (section === 'brand') {
      document.getElementById('websiteCurrentLogo').src = settings.brand.logo_light || 'assets/images/v-remix-leaf-logo.png';
      document.getElementById('websiteBrandShareImage').src = settings.seo.share_image || 'assets/media/brand/share-default.png';
    }
    inputs.querySelectorAll('[data-asset-path]').forEach(function (image) {
      var purpose = image.dataset.assetPurpose, url = get(image.dataset.assetPath);
      var fallback = purpose === 'logo_dark' ? settings.brand.logo_light : purpose.indexOf('share') !== -1 ? settings.seo.share_image : '';
      image.src = selectedPreviews[purpose] || url || fallback || '';
      image.hidden = !(selectedPreviews[purpose] || url || fallback);
      image.classList.remove('is-unavailable');
      if (!selectedPreviews[purpose]) document.getElementById('website-asset-caption-' + purpose).textContent = url ? 'Ảnh đang chọn' : fallback ? 'Dùng ảnh mặc định' : 'Chưa có ảnh';
    });
    document.getElementById('websiteLogoPreview').src = settings.brand.logo_light || 'assets/images/v-remix-leaf-logo.png';
    document.getElementById('websiteIconPreview').src = settings.brand.favicon || 'assets/media/favicon.svg';
    document.getElementById('websiteBrandName').textContent = settings.brand.name;
    var key = document.getElementById('websitePreviewPage').value, page = settings.seo.pages[key];
    var title = page.title || state.home.title || 'V-Remix';
    document.getElementById('websitePreviewUrl').textContent = settings.seo.base_url + (key === 'home' ? '/' : '/studio.php');
    document.getElementById('websitePreviewTitle').textContent = title;
    document.getElementById('websitePreviewDescription').textContent = page.description || state.home.description || '';
    document.getElementById('websiteShareTitle').textContent = title;
    document.getElementById('websiteSharePreview').src = page.share_image || settings.seo.share_image || 'assets/media/brand/share-default.png';
    document.getElementById('websiteIndexPreview').textContent = settings.seo.indexable && page.indexable ? 'Đang cho phép lập chỉ mục trang này trên domain chuẩn.' : 'Trang này đang đặt noindex và không có trong sitemap.';
  }
  async function request(options) {
    var response = await fetch(config.endpoint + '?resource=' + section, Object.assign({credentials:'same-origin', cache:'no-store', headers:{'X-CSRF-Token':config.csrf, 'Content-Type':'application/json', Accept:'application/json'}}, options || {}));
    var body; try { body = await response.json(); } catch (e) { throw new Error('Không đọc được phản hồi. Làm mới trước khi thử lại.'); }
    if (!response.ok) throw new Error(body.error || 'Không thể lưu cấu hình.');
    return body;
  }
  window.VRemixWebsite = {
    canLeave: function () { if (busy) { message('Đang xử lý. Chờ hoàn tất trước khi chuyển mục.', false); return false; } return !dirty || window.confirm('Cấu hình thương hiệu/SEO chưa được lưu. Bỏ thay đổi này?'); },
    leave: function () { serial++; releaseSelectedPreviews(); panel.hidden = true; fields.disabled = true; state = null; dirty = false; },
    load: async function (key) {
      var current = ++serial; releaseSelectedPreviews(); section = key; panel.hidden = false; fields.disabled = true; state = null; dirty = false; inputs.innerHTML = '';
      message('Đang đọc cấu hình website…', false);
      try { var body = await request(); if (current !== serial) return; state = body; render(); fields.disabled = false; message('', false); document.getElementById('adminContent').scrollIntoView({block:'start',behavior:'instant'}); return 'Đã đồng bộ'; }
      catch (error) { if (current !== serial) return; message(error.message, true); return 'Đồng bộ lỗi'; }
    }
  };
  inputs.addEventListener('input', function (event) {
    var field = event.target, path = field.dataset.setting;
    if (!path || !state || busy) return;
    set(path, field.type === 'checkbox' ? field.checked : path === 'social_urls' ? field.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean) : field.value);
    dirty = true; preview();
  });
  document.getElementById('websitePreviewPage').addEventListener('change', preview);
  inputs.addEventListener('change', function (event) {
    var fileInput = event.target;
    if (!state || busy || !fileInput.id || fileInput.id.indexOf('website-file-') !== 0) return;
    var purpose = fileInput.id.slice('website-file-'.length), file = fileInput.files[0];
    if (selectedPreviews[purpose]) URL.revokeObjectURL(selectedPreviews[purpose]);
    delete selectedPreviews[purpose];
    if (!file) { preview(); return; }
    selectedPreviews[purpose] = URL.createObjectURL(file); dirty = true; preview();
    document.getElementById('website-asset-caption-' + purpose).textContent = file.name + ' · chưa tải lên';
  });
  panel.addEventListener('click', function (event) {
    var shortcut = event.target.closest('[data-open-website]');
    if (shortcut) document.querySelector('#adminNavigation [data-resource="seo"]').click();
  });
  panel.addEventListener('error', function (event) {
    var image = event.target;
    if (!image.dataset || !image.dataset.assetPurpose) return;
    image.classList.add('is-unavailable');
    document.getElementById('website-asset-caption-' + image.dataset.assetPurpose).textContent = 'Không tải được ảnh. Kiểm tra đường dẫn hoặc chọn tệp mới.';
  }, true);
  inputs.addEventListener('click', async function (event) {
    var button = event.target.closest('[data-upload]'); if (!button || busy || !state) return;
    var file = document.getElementById('website-file-' + button.dataset.upload).files[0];
    if (!file || file.size > 5000000) { message('Chọn ảnh tối đa 5 MB trước khi tải lên.', true); return; }
    var body = new FormData(); body.append('asset', file); body.append('purpose', button.dataset.upload);
    busy = true; fields.disabled = true; message('Đang tải ảnh thương hiệu công khai…', false);
    try {
      var result = await request({method:'POST', headers:{'X-CSRF-Token':config.csrf, Accept:'application/json'}, body:body});
      set(button.dataset.path, result.asset.url);
      document.getElementById('website-' + button.dataset.path.replace(/\./g, '-')).value = result.asset.url;
      if (selectedPreviews[button.dataset.upload]) URL.revokeObjectURL(selectedPreviews[button.dataset.upload]);
      delete selectedPreviews[button.dataset.upload];
      document.getElementById('website-file-' + button.dataset.upload).value = '';
      dirty = true; preview();
      message('Đã tải ảnh (' + result.asset.width + ' × ' + result.asset.height + '). Bấm Lưu cấu hình để áp dụng.', false);
    }
    catch (error) { message(error.message, true); }
    finally { busy = false; fields.disabled = false; }
  });
  form.addEventListener('submit', async function (event) {
    event.preventDefault(); if (!state || busy) return;
    if (Object.keys(selectedPreviews).length) { message('Bạn đã chọn tệp mới nhưng chưa tải lên. Bấm Tải ảnh lên trước khi lưu cấu hình.', true); return; }
    busy = true; fields.disabled = true; message('Đang lưu cấu hình…', false);
    try { state = await request({method:'POST', body:JSON.stringify({action:'save', revision:state.revision, values:state.settings[section]})}); dirty = false; render(); message('Đã lưu. Website này áp dụng ngay; máy chủ khác dùng chung CSDL cập nhật trong khoảng 30 giây. Mạng xã hội có thể cần tải lại bản xem trước.', false); }
    catch (error) { state = null; message(error.message + ' Làm mới để kiểm tra trạng thái trước khi thử lại.', true); }
    finally { busy = false; fields.disabled = !state; }
  });
  window.addEventListener('beforeunload', function (event) { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
}());
