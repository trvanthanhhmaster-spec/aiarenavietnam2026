(function () {
  'use strict';

  var config = window.VREMIX_ADMIN || {};
  var resourceKey = 'events';
  var rows = [];
  var editing = null;
  var resourceLabels = {
    events: { kicker: 'Collection / 01', title: 'Bối cảnh', columns: ['label', 'slug', 'description', 'is_active'] },
    garments: { kicker: 'Collection / 02', title: 'Cổ phục', columns: ['name', 'category', 'slug', 'is_active'] },
    accessories: { kicker: 'Collection / 03', title: 'Phụ kiện', columns: ['name', 'category', 'slug', 'is_active'] },
    options: { kicker: 'Collection / 04', title: 'Màu & phong cách', columns: ['label', 'option_type', 'slug', 'is_active'] },
    branches: { kicker: 'Editorial / 05', title: 'Media tầng 1', columns: ['label', 'branch_key', 'forward_media_url', 'is_base', 'is_active'] },
    sources: { kicker: 'Editorial / 06', title: 'Nguồn văn hoá', columns: ['title', 'review_status', 'source_url'] },
    prompts: { kicker: 'Editorial / 07', title: 'Prompt versions', columns: ['slug', 'version', 'model', 'is_active'] },
    pages: { kicker: 'Editorial / 08', title: 'Trang chủ', columns: ['slug', 'brand_name', 'title', 'media_url'] },
    jobs: { kicker: 'Operations / 09', title: 'Generation jobs', columns: ['status', 'created_at', 'client_request_id', 'error_message'] }
  };
  var fields = {
    events: [
      ['slug', 'Branch key', 'text', true], ['label', 'Tên hiển thị', 'text', true],
      ['description', 'Mô tả', 'textarea', true], ['cultural_context', 'Bối cảnh văn hoá', 'textarea', true],
      ['sort_order', 'Thứ tự', 'number', true], ['is_active', 'Đang hiển thị', 'checkbox', false]
    ],
    garments: [
      ['slug', 'Slug', 'text', true], ['name', 'Tên hiển thị', 'text', true], ['category', 'Nhóm', 'text', true],
      ['description', 'Mô tả', 'textarea', true], ['origin_note', 'Nguồn gốc', 'textarea', true],
      ['significance_note', 'Ý nghĩa', 'textarea', true], ['image_url', 'Ảnh catalog', 'url', false],
      ['source_id', 'ID nguồn văn hoá', 'text', false], ['sort_order', 'Thứ tự', 'number', true],
      ['is_active', 'Đang hiển thị', 'checkbox', false]
    ],
    accessories: [
      ['slug', 'Slug', 'text', true], ['name', 'Tên hiển thị', 'text', true], ['category', 'Nhóm', 'text', true],
      ['description', 'Mô tả', 'textarea', true], ['image_url', 'Ảnh catalog', 'url', false],
      ['sort_order', 'Thứ tự', 'number', true], ['is_active', 'Đang hiển thị', 'checkbox', false]
    ],
    options: [
      ['option_type', 'Loại', 'select', true, [['color', 'Màu'], ['style', 'Phong cách']]],
      ['slug', 'Slug', 'text', true], ['label', 'Tên hiển thị', 'text', true], ['value', 'Giá trị', 'text', true],
      ['prompt_hint', 'Gợi ý prompt', 'textarea', true], ['sort_order', 'Thứ tự', 'number', true],
      ['is_active', 'Đang hiển thị', 'checkbox', false]
    ],
    branches: [
      ['page_slug', 'Page slug', 'text', true], ['branch_key', 'Branch key', 'text', true],
      ['label', 'Tên hiển thị', 'text', true], ['forward_guard', 'Forward guard', 'number', true],
      ['reverse_guard', 'Reverse guard', 'number', true], ['forward_media_url', 'Forward media URL', 'url', true],
      ['reverse_media_url', 'Reverse media URL (tuỳ chọn)', 'url', false],
      ['is_base', 'Media nền mặc định', 'checkbox', false], ['sort_order', 'Thứ tự', 'number', true],
      ['is_active', 'Đang hiển thị', 'checkbox', false]
    ],
    sources: [
      ['title', 'Tên nguồn', 'text', true], ['source_url', 'URL nguồn', 'url', false],
      ['license', 'License', 'text', false], ['curator_note', 'Ghi chú biên tập', 'textarea', false],
      ['review_status', 'Trạng thái duyệt', 'select', true, [['draft', 'Nháp'], ['reviewed', 'Đã rà soát'], ['published', 'Đã xuất bản']]]
    ],
    prompts: [
      ['slug', 'Prompt slug', 'text', true], ['version', 'Version', 'number', true], ['model', 'Model', 'text', true],
      ['system_prompt', 'System prompt', 'textarea', true], ['eval_notes', 'Eval notes', 'textarea', false],
      ['is_active', 'Đang dùng', 'checkbox', false]
    ],
    pages: [
      ['name', 'Tên trang', 'text', true], ['brand_mark', 'Brand mark', 'text', true], ['brand_name', 'Brand name', 'text', true],
      ['title', 'Title', 'text', true], ['description', 'Description', 'textarea', true],
      ['hero_line_one', 'Hero line 1', 'text', true], ['hero_line_two', 'Hero line 2', 'text', true],
      ['hero_description_one', 'Hero description 1', 'text', true], ['hero_description_two', 'Hero description 2', 'text', true],
      ['controller_label', 'Controller label', 'text', true], ['cta_label', 'CTA label', 'text', true],
      ['ui', 'UI copy JSON', 'json', true], ['media_url', 'Media URL', 'url', true]
    ]
  };

  var nav = document.querySelector('.admin-nav');
  var tableHead = document.getElementById('adminTableHead');
  var tableBody = document.getElementById('adminTableBody');
  var empty = document.getElementById('adminEmpty');
  var dialog = document.getElementById('adminDialog');
  var editor = document.getElementById('adminEditor');
  var editorFields = document.getElementById('editorFields');
  var editorTitle = document.getElementById('editorTitle');
  var editorKicker = document.getElementById('editorKicker');
  var createButton = document.getElementById('adminCreate');
  var refreshButton = document.getElementById('adminRefresh');
  var syncState = document.getElementById('adminSyncState');
  var status = document.getElementById('adminStatus');

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function setStatus(message) {
    syncState.textContent = message;
    status.textContent = message;
  }

  function labelFor(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function displayValue(value, key) {
    if (value == null || value === '') return '—';
    if (key === 'is_active' || key === 'is_base') return value ? 'Đang bật' : 'Tắt';
    if (key === 'created_at' || key === 'updated_at' || key === 'completed_at') {
      try { return new Date(value).toLocaleString('vi-VN'); } catch (error) { return value; }
    }
    if (key === 'output' || key === 'input') {
      var text = JSON.stringify(value);
      return text.length > 90 ? text.slice(0, 90) + '…' : text;
    }
    var stringValue = String(value);
    return stringValue.length > 110 ? stringValue.slice(0, 110) + '…' : stringValue;
  }

  async function request(resource, options) {
    var response = await fetch(config.endpoint + '?resource=' + encodeURIComponent(resource), Object.assign({
      headers: { 'X-CSRF-Token': config.csrf, 'Accept': 'application/json' }
    }, options || {}));
    var body = await response.json();
    if (response.status === 401) {
      window.location.reload();
      throw new Error('Phiên quản trị đã hết hạn.');
    }
    if (!response.ok) throw new Error(body.error || 'Không thể hoàn tất thao tác.');
    return body;
  }

  async function loadResource() {
    var metadata = resourceLabels[resourceKey];
    setStatus('Đang đồng bộ Supabase…');
    tableBody.innerHTML = '<tr><td class="admin-table__loading" colspan="8">Đang đọc dữ liệu đã duyệt…</td></tr>';
    try {
      var body = await request(resourceKey);
      rows = body.items || [];
      document.getElementById('adminResourceKicker').textContent = metadata.kicker;
      document.getElementById('adminResourceTitle').textContent = metadata.title;
      createButton.hidden = resourceKey === 'jobs' || resourceKey === 'pages';
      renderTable(metadata.columns);
      setStatus(rows.length + ' bản ghi · vừa đồng bộ');
    } catch (error) {
      rows = [];
      tableBody.innerHTML = '<tr><td class="admin-table__loading" colspan="8">' + escapeHtml(error.message) + '</td></tr>';
      setStatus('Đồng bộ lỗi');
    }
  }

  function renderTable(columns) {
    tableHead.innerHTML = '<tr>' + columns.map(function (key) {
      return '<th>' + escapeHtml(labelFor(key)) + '</th>';
    }).join('') + (resourceKey === 'jobs' ? '' : '<th class="admin-table__actions">Thao tác</th>') + '</tr>';
    tableBody.innerHTML = '';
    empty.hidden = rows.length !== 0;
    rows.forEach(function (row, index) {
      var tr = document.createElement('tr');
      tr.innerHTML = columns.map(function (key) {
        return '<td class="admin-table__' + escapeHtml(key) + '">' + escapeHtml(displayValue(row[key], key)) + '</td>';
      }).join('') + (resourceKey === 'jobs' ? '' :
        '<td class="admin-table__actions"><button type="button" class="admin-row-action" data-edit="' + index + '">Sửa</button>' +
        '<button type="button" class="admin-row-action admin-row-action--danger" data-delete="' + index + '">Xoá</button></td>');
      tableBody.appendChild(tr);
    });
    tableBody.querySelectorAll('[data-edit]').forEach(function (button) {
      button.addEventListener('click', function () { openEditor(rows[Number(button.dataset.edit)]); });
    });
    tableBody.querySelectorAll('[data-delete]').forEach(function (button) {
      button.addEventListener('click', function () { deleteRow(rows[Number(button.dataset.delete)]); });
    });
  }

  function openEditor(row) {
    editing = row || {};
    var definitions = fields[resourceKey] || [];
    editorTitle.textContent = row ? 'Chỉnh sửa bản ghi' : 'Tạo bản ghi mới';
    editorKicker.textContent = (resourceLabels[resourceKey] || {}).title || 'Edit';
    editorFields.innerHTML = definitions.map(function (definition) {
      var key = definition[0];
      var label = definition[1];
      var type = definition[2];
      var required = definition[3];
      var value = editing[key];
      if (type === 'checkbox') {
        return '<label class="admin-field admin-field--check"><input type="checkbox" data-field="' + key + '"' +
          (value ? ' checked' : '') + '><span><strong>' + escapeHtml(label) + '</strong><small>Chuyển trạng thái hiển thị</small></span></label>';
      }
      var control = '';
      if (type === 'textarea' || type === 'json') {
        var textValue = type === 'json' ? JSON.stringify(value || {}, null, 2) : (value || '');
        control = '<textarea data-field="' + key + '" ' + (required ? 'required' : '') + '>' + escapeHtml(textValue) + '</textarea>';
      } else if (type === 'select') {
        control = '<select data-field="' + key + '" ' + (required ? 'required' : '') + '>' +
          definition[4].map(function (option) {
            return '<option value="' + escapeHtml(option[0]) + '"' + (String(value || '') === option[0] ? ' selected' : '') + '>' + escapeHtml(option[1]) + '</option>';
          }).join('') + '</select>';
      } else {
        control = '<input type="' + (type === 'number' ? 'number' : type) + '" data-field="' + key + '" value="' + escapeHtml(value == null ? '' : value) + '"' +
          (required ? ' required' : '') + (type === 'number' ? ' step="0.01"' : '') + '>';
      }
      return '<label class="admin-field"><span>' + escapeHtml(label) + '</span>' + control + '</label>';
    }).join('');
    dialog.showModal();
  }

  async function saveEditor() {
    var record = { id: editing && editing.id ? editing.id : undefined };
    var definitions = fields[resourceKey] || [];
    definitions.forEach(function (definition) {
      var key = definition[0];
      var field = editorFields.querySelector('[data-field="' + key + '"]');
      if (!field) return;
      if (definition[2] === 'checkbox') record[key] = field.checked;
      else if (definition[2] === 'number') record[key] = field.value === '' ? null : Number(field.value);
      else if (definition[2] === 'json') {
        try { record[key] = JSON.parse(field.value || '{}'); }
        catch (error) { throw new Error('UI copy JSON không hợp lệ.'); }
      } else record[key] = field.value;
    });
    setStatus('Đang lưu vào Supabase…');
    await request(resourceKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': config.csrf },
      body: JSON.stringify({ action: 'save', record: record })
    });
    dialog.close();
    await loadResource();
  }

  async function deleteRow(row) {
    if (!row || !row.id || !window.confirm('Xoá bản ghi này khỏi Supabase?')) return;
    setStatus('Đang xoá…');
    try {
      await request(resourceKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': config.csrf },
        body: JSON.stringify({ action: 'delete', id: row.id })
      });
      await loadResource();
    } catch (error) {
      setStatus(error.message);
    }
  }

  nav.querySelectorAll('[data-resource]').forEach(function (button) {
    button.addEventListener('click', function () {
      nav.querySelectorAll('[data-resource]').forEach(function (item) { item.classList.remove('is-active'); });
      button.classList.add('is-active');
      resourceKey = button.dataset.resource;
      loadResource();
    });
  });
  refreshButton.addEventListener('click', loadResource);
  createButton.addEventListener('click', function () { openEditor(null); });
  editor.addEventListener('submit', function (event) {
    if (event.submitter && event.submitter.id === 'editorSave') {
      event.preventDefault();
      saveEditor().catch(function (error) { setStatus(error.message); });
    }
  });

  loadResource();
}());
