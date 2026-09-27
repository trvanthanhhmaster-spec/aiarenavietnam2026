(function () {
  'use strict';

  var catalog = window.VREMIX_STUDIO || {};
  var experience = document.getElementById('studioExperience');
  var form = document.getElementById('studioForm');
  var frame = document.querySelector('.studio-frame');
  var media = document.getElementById('studioMedia');
  var intro = document.getElementById('studioIntro');
  var hotspots = document.getElementById('studioHotspots');
  var dock = document.getElementById('studioDock');
  var dockIndex = document.getElementById('dockIndex');
  var dockTitle = document.getElementById('dockTitle');
  var dockDescription = document.getElementById('dockDescription');
  var dockContent = document.getElementById('dockContent');
  var dockHint = document.getElementById('dockHint');
  var dockClose = document.getElementById('dockClose');
  var summary = document.getElementById('selectionSummary');
  var studioStatus = document.getElementById('studioStatus');
  var srStatus = document.getElementById('studioSrStatus');
  var imageInput = document.getElementById('inputImage');
  var uploadName = document.getElementById('uploadName');
  var result = document.getElementById('studioResult');
  var resultClose = document.getElementById('resultClose');
  var resultState = document.getElementById('resultState');
  var resultTitle = document.getElementById('resultTitle');
  var resultProgress = document.getElementById('resultProgress');
  var resultStory = document.getElementById('resultStory');
  var resultGuardrail = document.getElementById('resultGuardrail');
  var resultGenZTip = document.getElementById('resultGenZTip');

  var modes = [
    {
      id: 'event',
      index: '01 / 04',
      title: 'Bối cảnh',
      description: 'Chọn nơi bản phối sẽ xuất hiện để xác định độ trang trọng, nhịp chuyển động và cách phối.',
      anchor: { x: 20, y: 39 }
    },
    {
      id: 'garment',
      index: '02 / 04',
      title: 'Cổ phục',
      description: 'Chọn dáng áo làm cấu trúc gốc. Những chi tiết nhận diện cần được giữ nguyên trong bản phối.',
      anchor: { x: 58, y: 28 }
    },
    {
      id: 'style',
      index: '03 / 04',
      title: 'Phối sắc',
      description: 'Điều chỉnh màu chủ đạo và tinh thần thị giác mà không làm mất đi cấu trúc trang phục.',
      anchor: { x: 78, y: 61 }
    },
    {
      id: 'accessory',
      index: '04 / 04',
      title: 'Phụ kiện',
      description: 'Thêm điểm nhấn hiện đại có chọn lọc. Bạn có thể chọn nhiều phụ kiện hoặc để trống.',
      anchor: { x: 35, y: 75 }
    }
  ];

  var state = {
    openMode: null,
    event: firstSlug(catalog.events),
    garment: firstSlug(catalog.garments),
    color: firstSlug(catalog.colors),
    style: firstSlug(catalog.styles),
    accessories: []
  };

  function firstSlug(items) {
    return items && items[0] ? String(items[0].slug || '') : '';
  }

  function lookup(items, slug) {
    return (items || []).find(function (item) {
      return item.slug === slug;
    }) || {};
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function buildHotspots() {
    hotspots.innerHTML = '';
    modes.forEach(function (mode) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'studio-hotspot';
      button.dataset.mode = mode.id;
      button.style.left = mode.anchor.x + '%';
      button.style.top = mode.anchor.y + '%';
      button.setAttribute('aria-label', 'Mở lựa chọn ' + mode.title);
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = '<span class="studio-hotspot__label">' + escapeHtml(mode.title) + '</span>';
      button.addEventListener('click', function () {
        toggleMode(mode.id);
      });
      hotspots.appendChild(button);
    });
  }

  function toggleMode(modeId) {
    if (state.openMode === modeId) {
      closeDock(true);
      return;
    }
    state.openMode = modeId;
    renderDock();
    setStatus('Đang tinh chỉnh ' + modeById(modeId).title.toLowerCase() + '.');
  }

  function openMode(modeId) {
    state.openMode = modeId;
    renderDock();
  }

  function closeDock(restoreFocus) {
    var previous = state.openMode;
    state.openMode = null;
    renderDock();
    setStatus('Bản phối đã lưu lựa chọn hiện tại.');
    if (restoreFocus && previous) {
      var trigger = hotspots.querySelector('[data-mode="' + previous + '"]');
      if (trigger) trigger.focus();
    }
  }

  function modeById(modeId) {
    return modes.find(function (mode) {
      return mode.id === modeId;
    }) || modes[0];
  }

  function renderDock() {
    var open = Boolean(state.openMode);
    dock.classList.toggle('is-open', open);
    dock.setAttribute('aria-hidden', String(!open));
    intro.classList.toggle('is-muted', open);

    Array.prototype.forEach.call(hotspots.querySelectorAll('.studio-hotspot'), function (button) {
      var active = button.dataset.mode === state.openMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-expanded', String(active));
    });
    Array.prototype.forEach.call(document.querySelectorAll('.studio-footer__notes [data-mode]'), function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.mode === state.openMode));
    });

    if (!open) return;
    var mode = modeById(state.openMode);
    dockIndex.textContent = mode.index;
    dockTitle.textContent = mode.title;
    dockDescription.textContent = mode.description;
    dockHint.textContent = mode.id === 'accessory'
      ? 'Có thể chọn nhiều phụ kiện. Chọn lại để bỏ.'
      : 'Chọn một phương án để cập nhật bản phối.';
    renderDockContent(mode.id);
  }

  function renderDockContent(modeId) {
    dockContent.className = 'studio-dock__content';
    if (modeId === 'event') {
      dockContent.innerHTML = optionList(catalog.events, 'event', state.event, false);
    } else if (modeId === 'garment') {
      dockContent.innerHTML = optionList(catalog.garments, 'garment', state.garment, false);
    } else if (modeId === 'accessory') {
      dockContent.innerHTML = optionList(catalog.accessories, 'accessory', state.accessories, true);
    } else {
      dockContent.classList.add('studio-dock__content--split');
      dockContent.innerHTML =
        '<div class="studio-dock__group"><p class="studio-dock__group-label">Màu chủ đạo</p>' +
        optionList(catalog.colors, 'color', state.color, false, true) +
        '</div><div class="studio-dock__group"><p class="studio-dock__group-label">Tinh thần</p>' +
        optionList(catalog.styles, 'style', state.style, false) +
        '</div>';
    }

    Array.prototype.forEach.call(dockContent.querySelectorAll('[data-option-kind]'), function (button) {
      button.addEventListener('click', function () {
        chooseOption(button.dataset.optionKind, button.dataset.optionValue);
      });
    });
  }

  function optionList(items, kind, selectedValue, multiple, swatches) {
    return (items || []).map(function (item) {
      var slug = String(item.slug || '');
      var selected = multiple ? selectedValue.indexOf(slug) !== -1 : selectedValue === slug;
      var name = item.label || item.name || slug;
      var detail = item.description || item.category || item.origin_note || '';
      var swatch = swatches
        ? '<span class="studio-option__swatch" style="background:' + escapeHtml(item.value || '#d6d6cf') + '"></span>'
        : '';
      return '<button type="button" class="studio-option' + (selected ? ' is-selected' : '') + (swatches ? ' studio-option--swatch' : '') +
        '" data-option-kind="' + escapeHtml(kind) + '" data-option-value="' + escapeHtml(slug) +
        '" aria-pressed="' + String(selected) + '">' + swatch +
        '<span><span class="studio-option__name">' + escapeHtml(name) + '</span>' +
        (detail ? '<span class="studio-option__meta">' + escapeHtml(detail) + '</span>' : '') +
        '</span><span class="studio-option__check" aria-hidden="true">✓</span></button>';
    }).join('');
  }

  function chooseOption(kind, value) {
    if (kind === 'accessory') {
      var position = state.accessories.indexOf(value);
      if (position === -1) state.accessories.push(value);
      else state.accessories.splice(position, 1);
    } else {
      state[kind] = value;
    }
    renderDockContent(state.openMode);
    updateSummary();
    setStatus('Đã cập nhật ' + modeById(state.openMode).title.toLowerCase() + '.');
  }

  function updateSummary() {
    var event = lookup(catalog.events, state.event);
    var garment = lookup(catalog.garments, state.garment);
    var color = lookup(catalog.colors, state.color);
    var style = lookup(catalog.styles, state.style);
    var accessoryNames = state.accessories.map(function (slug) {
      return lookup(catalog.accessories, slug).name;
    }).filter(Boolean);

    summary.textContent = [
      event.label,
      garment.name,
      color.label,
      style.label,
      accessoryNames.length ? accessoryNames.length + ' phụ kiện' : 'không phụ kiện'
    ].filter(Boolean).join(' · ');

    document.getElementById('footerEvent').textContent = event.label || 'Chưa chọn';
    document.getElementById('footerGarment').textContent = garment.name || 'Chưa chọn';
    document.getElementById('footerStyle').textContent = [color.label, style.label].filter(Boolean).join(' / ') || 'Chưa chọn';
    document.getElementById('footerAccessory').textContent = accessoryNames.length ? accessoryNames.join(', ') : 'Không phụ kiện';
  }

  function setStatus(message) {
    studioStatus.textContent = message;
    srStatus.textContent = message;
  }

  function prepareMedia() {
    if (!catalog.baseMedia) {
      setStatus('Media nền chưa được cấu hình; Studio vẫn dùng nền dự phòng.');
      return;
    }

    var reveal = function () {
      frame.classList.add('is-ready');
      setStatus('Studio đã sẵn sàng.');
    };
    media.addEventListener('loadeddata', reveal, { once: true });
    media.addEventListener('canplay', reveal, { once: true });
    media.addEventListener('ended', function () {
      media.currentTime = 0;
      var replay = media.play();
      if (replay && typeof replay.catch === 'function') replay.catch(function () {});
    });
    media.addEventListener('error', function () {
      setStatus('Không tải được media nền; Studio đang dùng nền dự phòng.');
    }, { once: true });
    media.src = catalog.baseMedia;
    var playback = media.play();
    if (playback && typeof playback.catch === 'function') playback.catch(function () {});
  }

  imageInput.addEventListener('change', function () {
    var file = imageInput.files && imageInput.files[0];
    if (!file) {
      uploadName.textContent = 'Tuỳ chọn';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      imageInput.value = '';
      uploadName.textContent = 'Ảnh vượt quá 8 MB';
      setStatus('Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn 8 MB.');
      return;
    }
    uploadName.textContent = file.name;
    setStatus('Đã thêm ảnh đại diện.');
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    generateLook();
  });

  async function generateLook() {
    var garment = lookup(catalog.garments, state.garment);
    var occasion = lookup(catalog.events, state.event);
    showResult();
    setResultState('queued', 'Đang xếp hàng bản phối.');
    resultTitle.textContent = garment.name
      ? garment.name + ', trong một nhịp hiện đại.'
      : 'Đang chuẩn bị một dáng Việt mới.';
    resultStory.textContent = garment.origin_note || 'Thông tin nguồn gốc sẽ được bổ sung từ kho tri thức đã duyệt.';
    resultGuardrail.textContent = occasion.cultural_context || 'Giữ nguyên những chi tiết nhận diện trước khi hiện đại hoá.';
    resultGenZTip.textContent = 'Ưu tiên một điểm nhấn hiện đại để dáng áo vẫn là trung tâm.';

    var payload = {
      eventSlug: state.event,
      garmentSlug: state.garment,
      accessorySlugs: state.accessories.slice(),
      colorSlug: state.color,
      styleSlug: state.style
    };

    var file = imageInput.files && imageInput.files[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setResultState('failed', 'Ảnh vượt quá 8 MB. Hãy đóng kết quả và chọn ảnh khác.');
        return;
      }
      payload.inputImage = await readImage(file);
    }

    if (!catalog.generationEndpoint) {
      setResultState('failed', 'Edge Function chưa được cấu hình. Bản preview đang dùng nội dung từ catalog.');
      return;
    }

    try {
      setResultState('processing', 'Gemini đang kiểm tra bối cảnh, câu chuyện và giới hạn văn hoá.');
      var response = await fetch(catalog.generationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Generation failed.');
      resultStory.textContent = body.output && body.output.story ? body.output.story : resultStory.textContent;
      resultGuardrail.textContent = body.output && body.output.guardrail ? body.output.guardrail : resultGuardrail.textContent;
      resultGenZTip.textContent = body.output && body.output.genZTip ? body.output.genZTip : resultGenZTip.textContent;
      setResultState('completed', 'Phần tư vấn đã hoàn tất. Image prompt đã sẵn sàng cho job sinh ảnh tiếp theo.');
    } catch (error) {
      setResultState('failed', 'Gemini chưa phản hồi. Studio giữ lại bản preview và nội dung từ catalog để bạn không mất lựa chọn.');
    }
  }

  function setResultState(value, message) {
    resultState.textContent = value;
    resultProgress.textContent = message;
    experience.setAttribute('aria-busy', String(value === 'queued' || value === 'processing'));
    srStatus.textContent = message;
  }

  function showResult() {
    result.hidden = false;
    document.body.style.overflow = 'hidden';
    resultClose.focus();
  }

  function hideResult() {
    result.hidden = true;
    document.body.style.overflow = '';
    experience.setAttribute('aria-busy', 'false');
    form.querySelector('.studio-submit').focus();
  }

  function readImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve({ mimeType: file.type, data: String(reader.result).split(',')[1] || '' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  dockClose.addEventListener('click', function () {
    closeDock(true);
  });
  resultClose.addEventListener('click', hideResult);
  Array.prototype.forEach.call(document.querySelectorAll('.studio-footer__notes [data-mode]'), function (button) {
    button.addEventListener('click', function () {
      openMode(button.dataset.mode);
      var activeHotspot = hotspots.querySelector('[data-mode="' + button.dataset.mode + '"]');
      if (activeHotspot) activeHotspot.focus();
    });
  });
  window.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (!result.hidden) hideResult();
    else if (state.openMode) closeDock(true);
  });

  buildHotspots();
  renderDock();
  updateSummary();
  prepareMedia();
})();
