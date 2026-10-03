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
  var quickStartOptions = document.getElementById('quickStartOptions');
  var projectKicker = document.getElementById('projectKicker');
  var projectTitle = document.getElementById('projectTitle');
  var projectContext = document.getElementById('projectContext');
  var previewEmpty = document.getElementById('previewEmpty');
  var passportTitle = document.getElementById('passportTitle');
  var passportOrigin = document.getElementById('passportOrigin');
  var passportFeature = document.getElementById('passportFeature');
  var passportMeaning = document.getElementById('passportMeaning');
  var passportSource = document.getElementById('passportSource');
  var passportVisual = document.getElementById('passportVisual');
  var culturalWarning = document.getElementById('culturalWarning');
  var tipLocation = document.getElementById('tipLocation');
  var tipStyling = document.getElementById('tipStyling');
  var saveLookButton = document.getElementById('saveLook');
  var compareLooksButton = document.getElementById('compareLooks');
  var addVariantButton = document.getElementById('addVariant');
  var variantStrip = document.getElementById('variantStrip');
  var summary = document.getElementById('selectionSummary');
  var studioStatus = document.getElementById('studioStatus');
  var srStatus = document.getElementById('studioSrStatus');
  var imageInput = document.getElementById('inputImage');
  var uploadName = document.getElementById('uploadName');
  var outputType = document.getElementById('outputType');
  var result = document.getElementById('studioResult');
  var resultClose = document.getElementById('resultClose');
  var resultState = document.getElementById('resultState');
  var resultTitle = document.getElementById('resultTitle');
  var resultProgress = document.getElementById('resultProgress');
  var resultStory = document.getElementById('resultStory');
  var resultGuardrail = document.getElementById('resultGuardrail');
  var resultGenZTip = document.getElementById('resultGenZTip');
  var resultVisual = document.querySelector('.studio-result__visual');
  var resultPlaceholderVisual = document.getElementById('resultPlaceholderVisual');
  var resultVisualLabel = document.getElementById('resultVisualLabel');
  var resultImages = document.getElementById('resultImages');
  var resultVideo = document.getElementById('resultVideo');
  var resultDownload = document.getElementById('resultDownload');
  var resultVideoBranches = document.getElementById('resultVideoBranches');
  var submitButton = form.querySelector('.studio-submit');
  var canvasAspect = document.getElementById('canvasAspect');
  var targetResolution = document.getElementById('targetResolution');
  var generationMode = document.getElementById('generationMode');
  var headerSaveLook = document.getElementById('headerSaveLook');
  var headerDownloadLookbook = document.getElementById('headerDownloadLookbook');
  var catalogPanels = {
    garment: document.getElementById('catalogGarments'),
    color: document.getElementById('catalogColors'),
    pattern: document.getElementById('catalogPatterns'),
    accessory: document.getElementById('catalogAccessories'),
    style: document.getElementById('catalogStyles'),
    scene: document.getElementById('catalogScenes')
  };
  var frameSteps = document.querySelectorAll('[data-frame-step]');
  var submitLabel = submitButton.innerHTML;
  var activeJobKey = 'vremix.active-generation-job.v1';
  var generationPending = false;
  var lastOutputFingerprint = '';
  var currentLookbookItems = [];
  var currentVideo = null;

  var modes = [
    { id: 'garment', index: '01 / 07', title: 'Trang phục', description: 'Chọn dáng áo làm cấu trúc gốc. Những chi tiết nhận diện cần được giữ nguyên trong bản phối.', anchor: { x: 58, y: 28 } },
    { id: 'color', index: '02 / 07', title: 'Màu sắc', description: 'Chọn bảng màu để AI giữ độ tương phản và chất liệu đúng với trang phục.', anchor: { x: 78, y: 61 } },
    { id: 'pattern', index: '03 / 07', title: 'Họa tiết', description: 'Thêm họa tiết có chừng mực, ưu tiên chi tiết đã được biên tập văn hoá.', anchor: { x: 72, y: 31 } },
    { id: 'accessory', index: '04 / 07', title: 'Phụ kiện', description: 'Thêm điểm nhấn hiện đại có chọn lọc. Bạn có thể chọn nhiều phụ kiện hoặc để trống.', anchor: { x: 35, y: 75 } },
    { id: 'style', index: '05 / 07', title: 'Phong cách', description: 'Định hướng nhịp thị giác mà không làm mất cấu trúc Việt phục.', anchor: { x: 78, y: 61 } },
    { id: 'scene', index: '06 / 07', title: 'Bối cảnh', description: 'Chọn nơi bản phối xuất hiện để xác định phông nền, ánh sáng và góc chụp.', anchor: { x: 20, y: 39 } },
    { id: 'event', index: '07 / 07', title: 'Dịp mặc', description: 'Chọn hoàn cảnh để hệ thống gợi ý dáng áo, màu và quy tắc văn hoá phù hợp.', anchor: { x: 20, y: 39 } }
  ];

  var query = new URLSearchParams(window.location.search);
  var branchEventMap = { dihoc: 'school', daopho: 'street', dule: 'ceremony', chupanh: 'portrait' };
  var contextOccasion = query.get('occasion') || branchEventMap[query.get('branch')] || '';
  var hasContext = Boolean(contextOccasion && lookup(catalog.events, contextOccasion).slug);
  var state = {
    openMode: null,
    event: hasContext ? contextOccasion : '',
    garment: '',
    color: '',
    pattern: '',
    style: '',
    scene: '',
    accessories: [],
    aspectRatio: catalog.generation && catalog.generation.canvas_aspect_ratio || '16:9',
    resolution: catalog.generation && catalog.generation.target_resolution || '1080',
    mode: catalog.generation && catalog.generation.default_generation_mode || 'text-to-image',
    activeFrame: 'A',
    locks: {
      character: true, face: true, hair: true, garment: true,
      background: true, pose: true, camera: true, lighting: true
    }
  };

  function applyEventPreset(eventSlug, announce) {
    var event = lookup(catalog.events, eventSlug);
    if (!event.slug) return;
    state.event = event.slug;
    var preset = event.preset && typeof event.preset === 'object' ? event.preset : {};
    if (lookup(catalog.garments, preset.garment).slug) state.garment = preset.garment;
    if (lookup(catalog.colors, preset.color).slug) state.color = preset.color;
    if (lookup(catalog.styles, preset.style).slug) state.style = preset.style;
    if (lookup(catalog.scenes, preset.scene).slug) state.scene = preset.scene;
    if (announce) setStatus('Đã áp dụng gợi ý cho ' + event.label + '.');
  }

  if (hasContext) applyEventPreset(contextOccasion, false);

  canvasAspect.value = state.aspectRatio;
  targetResolution.value = state.resolution;
  generationMode.value = state.mode;

  function renderQuickStart() {
    if (!quickStartOptions) return;
    quickStartOptions.innerHTML = (catalog.events || []).map(function (event) {
      return '<button type="button" data-quick-event="' + escapeHtml(event.slug) + '"' +
        (state.event === event.slug ? ' class="is-active"' : '') + '>' + escapeHtml(event.label) + '</button>';
    }).join('');
    quickStartOptions.querySelectorAll('[data-quick-event]').forEach(function (button) {
      button.addEventListener('click', function () {
        applyEventPreset(button.dataset.quickEvent, true);
        renderQuickStart();
        updateSummary();
      });
    });
  }

  function createRequestId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (character) {
      var random = Math.random() * 16 | 0;
      var value = character === 'x' ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
  }

  function readActiveJob() {
    try {
      var value = JSON.parse(window.localStorage.getItem(activeJobKey) || 'null');
      if (!value || !value.requestId || !value.startedAt) return null;
      if (Date.now() - Number(value.startedAt) > 24 * 60 * 60 * 1000) {
        window.localStorage.removeItem(activeJobKey);
        return null;
      }
      return value;
    } catch (error) {
      window.localStorage.removeItem(activeJobKey);
      return null;
    }
  }

  function saveActiveJob(value) {
    window.localStorage.setItem(activeJobKey, JSON.stringify(value));
  }

  function clearActiveJob() {
    window.localStorage.removeItem(activeJobKey);
  }

  function isSynchronousLocalGeneration() {
    return catalog.generationProvider === 'gemini-webapi-local'
      || /(?:^|\/)local-generate\.php(?:$|\?)/i.test(String(catalog.generationEndpoint || ''));
  }

  function syncSubmitButton() {
    submitButton.disabled = generationPending && !result.hidden;
    submitButton.innerHTML = generationPending
      ? 'Xem tiến trình <span aria-hidden="true">↗</span>'
      : submitLabel;
  }

  function restoreSelection(selection) {
    if (!selection) return;
    if (lookup(catalog.events, selection.event).slug) state.event = selection.event;
    if (lookup(catalog.garments, selection.garment).slug) state.garment = selection.garment;
    if (lookup(catalog.colors, selection.color).slug) state.color = selection.color;
    if (lookup(catalog.patterns, selection.pattern).slug) state.pattern = selection.pattern;
    if (lookup(catalog.styles, selection.style).slug) state.style = selection.style;
    if (lookup(catalog.scenes, selection.scene).slug) state.scene = selection.scene;
    state.accessories = Array.isArray(selection.accessories)
      ? selection.accessories.filter(function (slug) {
        return Boolean(lookup(catalog.accessories, slug).slug);
      })
      : [];
    if (selection.aspectRatio) {
      state.aspectRatio = selection.aspectRatio;
      canvasAspect.value = selection.aspectRatio;
    }
    if (selection.targetResolution) {
      state.resolution = selection.targetResolution;
      targetResolution.value = selection.targetResolution;
    }
    if (selection.generationMode) {
      state.mode = selection.generationMode;
      generationMode.value = selection.generationMode;
    }
    if (selection.generationType) outputType.value = selection.generationType;
    if (selection.locks && typeof selection.locks === 'object') {
      Object.keys(state.locks).forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(selection.locks, key)) state.locks[key] = Boolean(selection.locks[key]);
      });
    }
    updateSummary();
  }

  function prepareResultCopy() {
    var garment = lookup(catalog.garments, state.garment);
    var occasion = lookup(catalog.events, state.event);
    resultTitle.textContent = garment.name
      ? garment.name + ', trong một nhịp hiện đại.'
      : 'Đang chuẩn bị một dáng Việt mới.';
    resultStory.textContent = garment.origin_note || 'Thông tin nguồn gốc sẽ được bổ sung từ kho tri thức đã duyệt.';
    resultGuardrail.textContent = occasion.cultural_context || 'Giữ nguyên những chi tiết nhận diện trước khi hiện đại hoá.';
    resultGenZTip.textContent = 'Ưu tiên một điểm nhấn hiện đại để dáng áo vẫn là trung tâm.';
    updatePassport();
  }

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
    dock.inert = !open;
    intro.classList.toggle('is-muted', open);

    Array.prototype.forEach.call(hotspots.querySelectorAll('.studio-hotspot'), function (button) {
      var active = button.dataset.mode === state.openMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-expanded', String(active));
    });
    Array.prototype.forEach.call(document.querySelectorAll('.studio-tool-list [data-mode]'), function (button) {
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
    } else if (modeId === 'color') {
      dockContent.innerHTML = optionList(catalog.colors, 'color', state.color, false, true);
    } else if (modeId === 'pattern') {
      dockContent.innerHTML = optionList(catalog.patterns, 'pattern', state.pattern, false);
    } else if (modeId === 'scene') {
      dockContent.innerHTML = optionList(catalog.scenes, 'scene', state.scene, false);
    } else if (modeId === 'accessory') {
      dockContent.innerHTML = optionList(catalog.accessories, 'accessory', state.accessories, true);
    } else {
      dockContent.innerHTML = optionList(catalog.styles, 'style', state.style, false);
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

  function compactCatalogList(items, kind, selectedValue, multiple, limit) {
    return (items || []).slice(0, limit).map(function (item, index) {
      var slug = String(item.slug || '');
      var selected = multiple ? selectedValue.indexOf(slug) !== -1 : selectedValue === slug;
      var name = item.label || item.name || slug;
      var imageUrl = String(item.thumbnail_url || item.image_url || '');
      var image = /^https?:\/\//i.test(imageUrl)
        ? '<img src="' + escapeHtml(imageUrl) + '" alt="" loading="lazy">'
        : '';
      var visualStyle = kind === 'color'
        ? ' style="background:' + escapeHtml(item.value || '#d6d1c8') + '"'
        : '';
      return '<button type="button" class="studio-catalog-item' + (selected ? ' is-selected' : '') +
        '" data-catalog-kind="' + escapeHtml(kind) + '" data-option-value="' + escapeHtml(slug) +
        '" aria-pressed="' + String(selected) + '" title="' + escapeHtml(name) + '">' +
        '<span class="studio-catalog-item__visual"' + visualStyle + '>' + image +
        '<span class="studio-catalog-item__glyph" aria-hidden="true">' +
        escapeHtml(String(index + 1).padStart(2, '0')) + '</span></span>' +
        '<span class="studio-catalog-item__name">' + escapeHtml(name) + '</span></button>';
    }).join('');
  }

  function renderCatalogPanels() {
    var definitions = [
      { kind: 'garment', items: catalog.garments, selected: state.garment, multiple: false, limit: 4 },
      { kind: 'color', items: catalog.colors, selected: state.color, multiple: false, limit: 7 },
      { kind: 'pattern', items: catalog.patterns, selected: state.pattern, multiple: false, limit: 4 },
      { kind: 'accessory', items: catalog.accessories, selected: state.accessories, multiple: true, limit: 5 },
      { kind: 'style', items: catalog.styles, selected: state.style, multiple: false, limit: 4 },
      { kind: 'scene', items: catalog.scenes, selected: state.scene, multiple: false, limit: 5 }
    ];
    definitions.forEach(function (definition) {
      var panel = catalogPanels[definition.kind];
      if (!panel) return;
      panel.innerHTML = compactCatalogList(
        definition.items,
        definition.kind,
        definition.selected,
        definition.multiple,
        definition.limit
      );
    });
  }

  function chooseOption(kind, value) {
    if (kind === 'accessory') {
      var position = state.accessories.indexOf(value);
      if (position === -1) state.accessories.push(value);
      else state.accessories.splice(position, 1);
    } else {
      state[kind] = value;
      if (kind === 'event') {
        applyEventPreset(value, false);
        renderQuickStart();
      }
    }
    if (state.openMode) renderDockContent(state.openMode);
    renderCatalogPanels();
    updateSummary();
    setStatus('Đã cập nhật ' + modeById(kind).title.toLowerCase() + '.');
  }

  function updateSummary() {
    var event = lookup(catalog.events, state.event);
    var garment = lookup(catalog.garments, state.garment);
    var color = lookup(catalog.colors, state.color);
    var pattern = lookup(catalog.patterns, state.pattern);
    var style = lookup(catalog.styles, state.style);
    var scene = lookup(catalog.scenes, state.scene);
    var accessoryNames = state.accessories.map(function (slug) {
      return lookup(catalog.accessories, slug).name;
    }).filter(Boolean);

    summary.textContent = [
      event.label,
      garment.name,
      color.label,
      pattern.label,
      style.label,
      scene.label,
      accessoryNames.length ? accessoryNames.length + ' phụ kiện' : 'không phụ kiện'
    ].filter(Boolean).join(' · ');

    document.getElementById('footerEvent').textContent = event.label || 'Chưa chọn';
    document.getElementById('footerGarment').textContent = garment.name || 'Chưa chọn';
    document.getElementById('footerColor').textContent = color.label || 'Chưa chọn';
    document.getElementById('footerPattern').textContent = pattern.label || 'Chưa chọn';
    document.getElementById('footerStyle').textContent = style.label || 'Chưa chọn';
    document.getElementById('footerScene').textContent = scene.label || 'Chưa chọn';
    document.getElementById('footerAccessory').textContent = accessoryNames.length ? accessoryNames.join(', ') : 'Không phụ kiện';
    document.getElementById('frameBSummary').textContent = scene.label ? 'Nền: ' + scene.label : event.label ? 'Nền: ' + event.label : 'Chỉ thay phông nền';
    document.getElementById('frameCSummary').textContent = style.label ? 'Ánh sáng: ' + style.label : 'Chỉ thay thời điểm trong ngày';
    document.getElementById('frameDSummary').textContent = garment.name ? 'Quần áo: ' + garment.name : 'Chỉ thay quần áo';
    document.getElementById('frameESummary').textContent = accessoryNames.length ? 'Điểm nhấn: ' + accessoryNames.join(', ') : 'Giữ vị trí và kích thước tương đương';
    var hasBaseLook = Boolean(state.event && state.garment && state.style);
    if (previewEmpty) previewEmpty.classList.toggle('is-ready', hasBaseLook);
    if (frame) frame.classList.toggle('has-look', hasBaseLook);
    if (projectKicker) projectKicker.textContent = state.event ? (event.label + ' / Tầng 02') : 'Dự án mới / Tầng 02';
    if (projectTitle) projectTitle.innerHTML = state.event
      ? 'Bản phối cho<br><em>' + escapeHtml(event.label.toLowerCase()) + '.</em>'
      : 'Dự án mới';
    if (projectContext) {
      var preset = event.preset || {};
      projectContext.textContent = state.event
        ? [preset.location, preset.season, garment.name].filter(Boolean).join(' · ')
        : 'Bắt đầu bằng cách chọn Việt phục, tải ảnh của bạn hoặc dùng gợi ý nhanh.';
    }
    updatePassport();
  }

  function updatePassport() {
    var garment = lookup(catalog.garments, state.garment);
    var event = lookup(catalog.events, state.event);
    var color = lookup(catalog.colors, state.color);
    var style = lookup(catalog.styles, state.style);
    var scene = lookup(catalog.scenes, state.scene);
    if (passportTitle) passportTitle.textContent = garment.name || 'Chưa chọn Việt phục';
    if (passportOrigin) passportOrigin.textContent = garment.origin_note || 'Chọn một trang phục để xem nội dung đã được duyệt.';
    if (passportFeature) passportFeature.textContent = garment.description || '—';
    if (passportMeaning) passportMeaning.textContent = garment.significance_note || '—';
    var source = (catalog.sources || []).find(function (item) { return item.id === garment.source_id; });
    if (passportSource) passportSource.textContent = source ? source.title : 'Nguồn Approved sẽ hiển thị tại đây.';
    if (passportVisual) {
      var passportImage = String(garment.thumbnail_url || garment.image_url || '');
      passportVisual.style.backgroundImage = /^https?:\/\//i.test(passportImage)
        ? 'url("' + passportImage.replace(/["\\]/g, '') + '")'
        : '';
      passportVisual.classList.toggle('has-image', Boolean(passportVisual.style.backgroundImage));
      var mark = passportVisual.querySelector('span');
      if (mark) mark.textContent = garment.name ? garment.name.charAt(0).toUpperCase() : 'V';
    }
    if (tipLocation) tipLocation.textContent = [scene.label, event.label].filter(Boolean).join(' · ') || 'Campus · Phố cổ · Văn Miếu';
    if (tipStyling) tipStyling.textContent = [color.label, style.label].filter(Boolean).join(' + ') || 'Chọn một điểm nhấn hiện đại vừa đủ.';
    var colorCheck = document.querySelector('[data-check="color"]');
    var eventCheck = document.querySelector('[data-check="event"]');
    var accessoryCheck = document.querySelector('[data-check="accessory"]');
    if (colorCheck) {
      colorCheck.textContent = color.label ? '✓ ' + color.label + ' hài hòa' : '○ Chưa chọn màu';
      colorCheck.classList.toggle('is-ok', Boolean(color.label));
    }
    if (eventCheck) {
      eventCheck.textContent = event.label ? '✓ Phù hợp dịp ' + event.label.toLowerCase() : '○ Chưa chọn dịp mặc';
      eventCheck.classList.toggle('is-ok', Boolean(event.label));
    }
    if (accessoryCheck) {
      accessoryCheck.textContent = state.accessories.length ? '✓ Phụ kiện không che cấu trúc áo' : '○ Chưa thêm phụ kiện';
      accessoryCheck.classList.toggle('is-ok', state.accessories.length > 0);
    }
    var rule = (catalog.rules || []).find(function (item) {
      return !item.garment_id || item.garment_id === garment.id;
    });
    if (culturalWarning) culturalWarning.textContent = rule ? rule.rule_text : 'Hệ thống sẽ hiển thị quy tắc văn hoá đã được duyệt.';
  }

  function syncFrameSteps() {
    Array.prototype.forEach.call(frameSteps, function (step) {
      step.classList.toggle('is-active', step.dataset.frameStep === state.activeFrame);
    });
  }

  function selectFrame(step) {
    state.activeFrame = step.dataset.frameStep;
    syncFrameSteps();
    var target = { A: null, B: 'event', C: 'style', D: 'garment', E: 'accessory' }[state.activeFrame];
    if (target) openMode(target);
    else if (state.openMode) closeDock(false);
    setStatus(state.activeFrame === 'A'
      ? 'Ảnh A đã khoá: nhân vật, dáng, góc máy và bố cục.'
      : 'Đang chỉnh frame ' + state.activeFrame + '. Chỉ lớp được chọn sẽ thay đổi.');
  }

  // Delegation keeps the cinematic controller interactive even when the
  // responsive layout changes its internal hit areas.
  experience.addEventListener('click', function (event) {
    var step = event.target.closest('[data-frame-step]');
    if (step) selectFrame(step);
    var modeButton = event.target.closest('.studio-tool-list [data-mode]');
    if (modeButton) {
      if (state.openMode === modeButton.dataset.mode) closeDock(true);
      else openMode(modeButton.dataset.mode);
    }
    var catalogModeButton = event.target.closest('.studio-catalog-card__head [data-mode]');
    if (catalogModeButton) openMode(catalogModeButton.dataset.mode);
    var catalogOption = event.target.closest('[data-catalog-kind]');
    if (catalogOption) chooseOption(catalogOption.dataset.catalogKind, catalogOption.dataset.optionValue);
  });
  document.querySelectorAll('[data-start-mode]').forEach(function (button) {
    button.addEventListener('click', function () {
      if (button.dataset.startMode === 'quick') {
        if (quickStartOptions) {
          quickStartOptions.hidden = !quickStartOptions.hidden;
          if (!quickStartOptions.hidden) quickStartOptions.querySelector('button')?.focus();
        }
        setStatus('Chọn một gợi ý nhanh để dựng bản phối.');
        return;
      }
      openMode(button.dataset.startMode);
    });
  });
  document.querySelectorAll('[data-lock]').forEach(function (input) {
    input.addEventListener('change', function () {
      state.locks[input.dataset.lock] = input.checked;
    });
  });
  canvasAspect.addEventListener('change', function () { state.aspectRatio = canvasAspect.value; setStatus('Đã chọn khung ảnh ' + state.aspectRatio + '.'); });
  targetResolution.addEventListener('change', function () { state.resolution = targetResolution.value; setStatus('Đã chọn chất lượng ' + state.resolution + '.'); });
  generationMode.addEventListener('change', function () { state.mode = generationMode.value; setStatus(state.mode === 'image-to-image' ? 'Image to image: ảnh A sẽ làm nguồn cố định.' : 'Text to image: prompt sẽ tạo ảnh A.'); });

  function setStatus(message) {
    studioStatus.textContent = message;
    srStatus.textContent = message;
  }

  document.querySelectorAll('.studio-tool-list [data-mode]').forEach(function (button) {
    button.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        button.click();
      }
    });
  });

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
    if (generationPending) {
      showResult();
      return;
    }
    var activeJob = readActiveJob();
    if (activeJob) {
      // The local Gemini Web adapter completes the full request in one POST
      // and has no GET status endpoint. Discard stale local jobs from older
      // sessions instead of polling them and showing a misleading 405 error.
      if (isSynchronousLocalGeneration()) {
        clearActiveJob();
      } else {
        resumeGeneration(activeJob);
        return;
      }
    }
    generateLook();
  });

  async function generateLook() {
    if (generationPending) return;
    if (!state.event || !state.garment || !state.style) {
      setStatus('Hãy chọn ít nhất dịp mặc, Việt phục và phong cách trước khi tạo.');
      if (!state.event) openMode('event');
      else if (!state.garment) openMode('garment');
      else openMode('style');
      return;
    }
    if (state.mode === 'image-to-image' && !(imageInput.files && imageInput.files[0])) {
      setStatus('Chế độ image to image cần một ảnh nguồn cho frame A.');
      imageInput.focus();
      return;
    }
    showResult();
    setResultState('queued', 'Đang xếp hàng bản phối.');
    prepareResultCopy();

    var requestId = createRequestId();
    var activeJob = {
      requestId: requestId,
      jobId: null,
      startedAt: Date.now(),
      selection: {
        event: state.event,
        garment: state.garment,
        color: state.color,
        pattern: state.pattern,
        style: state.style,
        scene: state.scene,
        accessories: state.accessories.slice(),
        locks: Object.assign({}, state.locks),
        generationType: outputType.value,
        aspectRatio: state.aspectRatio,
        targetResolution: state.resolution,
        generationMode: state.mode
      }
    };
    if (!isSynchronousLocalGeneration()) saveActiveJob(activeJob);
    generationPending = true;
    syncSubmitButton();
    var payload = {
      clientRequestId: requestId,
      eventSlug: state.event,
      location: (lookup(catalog.events, state.event).preset || {}).location || '',
      season: (lookup(catalog.events, state.event).preset || {}).season || '',
      garmentSlug: state.garment,
      accessorySlugs: state.accessories.slice(),
      colorSlug: state.color,
      patternSlug: state.pattern,
      styleSlug: state.style,
      sceneSlug: state.scene,
      locks: Object.assign({}, state.locks),
      generationType: outputType.value,
      aspectRatio: state.aspectRatio,
      targetResolution: state.resolution,
      generationMode: state.mode,
      framePlan: {
        A: { changeScope: 'fixed subject identity, face, pose, camera angle and composition' },
        B: { branch: 'event', changeScope: 'background and scene only', value: state.scene || state.event },
        C: { branch: 'lighting', changeScope: 'lighting and time of day only', value: state.style },
        D: { branch: 'garment', changeScope: 'clothing only', value: state.garment },
        E: { branch: 'character', changeScope: 'subject identity only; preserve position and scale', value: state.accessories }
      }
    };

    var terminalFailure = false;
    try {
      var file = imageInput.files && imageInput.files[0];
      if (file) {
        if (file.size > 8 * 1024 * 1024) {
          terminalFailure = true;
          throw new Error('Ảnh vượt quá 8 MB. Hãy chọn ảnh nhỏ hơn 8 MB.');
        }
        payload.inputImage = await readImage(file);
      }

      if (!catalog.generationEndpoint) {
        terminalFailure = true;
        throw new Error('Edge Function chưa được cấu hình. Bản preview đang dùng nội dung từ catalog.');
      }

      setResultState('processing', 'Gemini đang kiểm tra bối cảnh, câu chuyện và giới hạn văn hoá.');
      var response = await fetch(catalog.generationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var body = await response.json();
      if (!response.ok) {
        terminalFailure = body.status === 'failed';
        throw new Error(body.error || 'Generation failed.');
      }
      if (body.jobId) {
        activeJob.jobId = body.jobId;
        if (!isSynchronousLocalGeneration()) saveActiveJob(activeJob);
      }
      applyOutput(body.output || {});
      var completed = body.status === 'completed' ? body : await pollJob(activeJob);
      if (completed.status !== 'completed') {
        terminalFailure = true;
        throw new Error(completed.error || 'Generation job did not complete.');
      }
      applyOutput(completed.output || {});
      clearActiveJob();
      generationPending = false;
      syncSubmitButton();
      setResultState('completed', resultMessage(completed.output || {}));
    } catch (error) {
      if (terminalFailure) clearActiveJob();
      generationPending = false;
      syncSubmitButton();
      var message = humanizeGenerationError(error && error.message
        ? error.message
        : 'Không thể hoàn tất generation job.');
      setResultState('failed', message + ' Bạn có thể đóng kết quả và thử lại sau.');
    }
  }

  async function resumeGeneration(activeJob) {
    if (generationPending) {
      showResult();
      return;
    }
    restoreSelection(activeJob.selection);
    showResult();
    prepareResultCopy();
    setResultState('processing', 'Đang nối lại generation job sau khi tải lại trang.');
    generationPending = true;
    syncSubmitButton();
    try {
      var completed = await pollJob(activeJob, true);
      if (completed.status !== 'completed') {
        if (completed.status === 'failed' || completed.status === 'cancelled') {
          clearActiveJob();
        }
        throw new Error(completed.error || 'Generation job did not complete.');
      }
      applyOutput(completed.output || {});
      clearActiveJob();
      setResultState('completed', resultMessage(completed.output || {}));
    } catch (error) {
      var message = humanizeGenerationError(error && error.message
        ? error.message
        : 'Không thể nối lại generation job.');
      setResultState('failed', message + ' Bạn có thể thử lại bằng cùng nút tạo.');
    } finally {
      generationPending = false;
      syncSubmitButton();
    }
  }

  function humanizeGenerationError(message) {
    var text = String(message || '');
    if (/no available quota|resource_exhausted|enable billing/i.test(text)) {
      var provider = /veo|video/i.test(text) ? 'video Veo' : 'ảnh Gemini';
      return 'Nhà cung cấp AI chưa cấp quota cho ' + provider +
        '. Hãy bật billing cho Google AI/API project hoặc đổi sang API key có quota rồi thử lại.';
    }
    if (/no prepaid gemini api balance|prepayment credits are depleted/i.test(text)) {
      return 'Gemini API chưa có số dư trả trước. Credits Google Cloud không tự chuyển sang AI Studio; ' +
        'hãy nạp billing trong AI Studio hoặc chuyển backend sang Vertex AI.';
    }
    return text;
  }

  async function pollJob(activeJob, immediate) {
    if (!activeJob || (!activeJob.jobId && !activeJob.requestId)) {
      throw new Error('Generation job did not return an id.');
    }
    // Veo jobs commonly take longer than a minute; keep the overlay alive
    // while the backend continues polling the provider operation.
    var maxAttempts = 180;
    var intervalMs = 2000;
    for (var attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (!(immediate && attempt === 0)) {
        await new Promise(function (resolve) { setTimeout(resolve, intervalMs); });
      }
      var query = activeJob.jobId
        ? 'jobId=' + encodeURIComponent(activeJob.jobId)
        : 'requestId=' + encodeURIComponent(activeJob.requestId);
      var response = await fetch(catalog.generationEndpoint + '?' + query, {
        headers: { Accept: 'application/json' }
      });
      var body = await response.json();
      if (!response.ok) {
        if (response.status === 404 && !activeJob.jobId && attempt < 10) continue;
        throw new Error(body.error || 'Unable to read generation job.');
      }
      if (body.jobId && !activeJob.jobId) {
        activeJob.jobId = body.jobId;
        saveActiveJob(activeJob);
      }
      if (body.output) {
        applyOutput(body.output);
      }
      if (body.status === 'completed' || body.status === 'failed' || body.status === 'cancelled') return body;
      setResultState('processing', body.output && body.output.lookbook && body.output.lookbook.items && body.output.lookbook.items.length
        ? 'Lookbook đã sẵn sàng; video đang được hoàn thiện.'
        : 'Job ' + (attempt + 1) + '/' + maxAttempts + ': Gemini/Veo đang dựng tài sản đầu ra.');
    }
    throw new Error('Generation job vẫn đang được xử lý. Hãy mở lại kết quả sau ít phút để xem video.');
  }

  function resultMessage(output) {
    if (output.video && output.video.url) return 'Video Veo và tài sản bản phối đã sẵn sàng.';
    if (output.videoError) return 'Lookbook đã sẵn sàng; video chưa hoàn tất nên bạn vẫn có thể dùng ảnh.';
    if (output.imageSource === 'catalog-fallback') {
      return 'Đang dùng ảnh catalog đã duyệt làm fallback; bạn có thể thử lại để tạo ảnh AI mới.';
    }
    if (output.imageSource === 'gemini-webapi-partial-fallback') {
      return 'Lookbook đã sẵn sàng; một số frame đang dùng ảnh A làm fallback vì Gemini tạm thời không trả ảnh.';
    }
    if (output.copySource === 'catalog-fallback') {
      return 'Lookbook đã sẵn sàng; Story Card đang dùng dữ liệu catalog đã duyệt vì Gemini tạm thời không phản hồi.';
    }
    return 'Bộ frame A–E và lookbook ' + state.aspectRatio + ' đã sẵn sàng.';
  }

  function applyOutput(output) {
    var items = output.lookbook && Array.isArray(output.lookbook.items)
      ? output.lookbook.items.filter(function (item) { return item && item.url; })
      : [];
    var fingerprint = JSON.stringify({
      story: output.story || '',
      guardrail: output.guardrail || '',
      genZTip: output.genZTip || '',
      images: items.map(function (item) { return item.url; }),
      video: output.video && output.video.url || '',
      videos: (output.videos || []).map(function (item) { return item.key + ':' + item.url; }),
      videoStatus: output.videoStatus || '',
      videoError: output.videoError || ''
    });
    if (fingerprint === lastOutputFingerprint) return;
    lastOutputFingerprint = fingerprint;

    resultStory.textContent = output.story || resultStory.textContent;
    resultGuardrail.textContent = output.guardrail || resultGuardrail.textContent;
    resultGenZTip.textContent = output.genZTip || resultGenZTip.textContent;

    resultImages.innerHTML = '';
    resultImages.hidden = items.length === 0;
    currentLookbookItems = items.slice(0, 5);
    var outputAspect = output.lookbook && output.lookbook.aspectRatio || state.aspectRatio || '16:9';
    resultVisual.style.aspectRatio = outputAspect.replace(':', ' / ');
    resultVisual.classList.toggle('is-landscape', outputAspect === '16:9');
    resultVisual.classList.toggle('has-images', items.length > 0);
    var videos = Array.isArray(output.videos) ? output.videos.filter(function (item) { return item && item.url; }) : [];
    var video = output.video && output.video.url ? output.video : (videos[0] || null);
    currentVideo = video;
    resultVideo.hidden = !video;
    resultVisual.classList.toggle('has-video', Boolean(video));
    if (video) {
      resultVideo.src = video.url;
      resultVideo.poster = items[0] ? items[0].url : '';
      resultVideo.onerror = function () {
        currentVideo = null;
        resultVideo.hidden = true;
        resultVisual.classList.remove('has-video');
        resultImages.hidden = items.length === 0;
        if (items[0]) {
          resultDownload.href = items[0].url;
          resultDownload.textContent = 'Tải lookbook ' + outputAspect + ' ' + String.fromCharCode(8595);
          resultDownload.hidden = false;
        }
        setResultState('completed', 'Lookbook đã sẵn sàng; trình duyệt không tải được video nên đang dùng ảnh.');
      };
      resultVideo.load();
    } else {
      resultVideo.onerror = null;
      resultVideo.removeAttribute('src');
      resultVideo.removeAttribute('poster');
      resultVideo.load();
    }
    resultVideoBranches.hidden = videos.length === 0;
    resultVideoBranches.innerHTML = videos.map(function (item, index) {
      return '<button type="button" data-video-index="' + index + '"' + (index === 0 ? ' class="is-active"' : '') +
        '>A → ' + escapeHtml(item.key || ['B', 'C', 'D', 'E'][index] || String(index + 1)) + '</button>';
    }).join('');
    Array.prototype.forEach.call(resultVideoBranches.querySelectorAll('[data-video-index]'), function (button) {
      button.addEventListener('click', function () {
        var selected = videos[Number(button.dataset.videoIndex)];
        if (!selected) return;
        currentVideo = selected;
        resultVideo.src = selected.url;
        resultVideo.hidden = false;
        resultVideo.load();
        resultDownload.href = selected.url;
        resultDownload.textContent = 'Tải video A → ' + (selected.key || '') + ' ' + String.fromCharCode(8595);
        Array.prototype.forEach.call(resultVideoBranches.querySelectorAll('button'), function (item) {
          item.classList.toggle('is-active', item === button);
        });
      });
    });
    resultPlaceholderVisual.hidden = items.length > 0 || Boolean(video);
    resultVisualLabel.hidden = items.length > 0 || Boolean(video);
    resultDownload.hidden = items.length === 0 && !video;

    items.forEach(function (item, index) {
      var image = document.createElement('img');
      image.src = item.url;
      image.alt = 'Phương án lookbook ' + (index + 1);
      image.loading = index === 0 ? 'eager' : 'lazy';
      resultImages.appendChild(image);
    });
    if (video) {
      resultDownload.href = video.url;
      resultDownload.textContent = 'Tải video MP4 ' + String.fromCharCode(8595);
    } else if (items[0]) {
      resultDownload.href = items[0].url;
      resultDownload.textContent = 'Tải lookbook ' + outputAspect + ' ' + String.fromCharCode(8595);
    }
    if (saveLookButton) saveLookButton.disabled = items.length === 0;
    if (compareLooksButton) compareLooksButton.disabled = items.length < 2;
    if (variantStrip && items.length) {
      var variantButtons = variantStrip.querySelectorAll('[data-variant]');
      variantButtons.forEach(function (button, index) {
        var hasImage = Boolean(items[index]);
        button.classList.toggle('is-ready', hasImage);
        var detail = button.querySelector('small');
        if (detail) detail.textContent = hasImage ? 'Đã có ảnh' : 'Chưa tạo';
      });
    }
  }

  function loadCanvasImage(url) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(new Error('Không thể đọc ảnh lookbook để xuất file.')); };
      image.src = url;
    });
  }

  function coverRect(context, image, rect) {
    var sourceRatio = image.naturalWidth / image.naturalHeight;
    var targetRatio = rect.width / rect.height;
    var sourceWidth = image.naturalWidth;
    var sourceHeight = image.naturalHeight;
    var sourceX = 0;
    var sourceY = 0;
    if (sourceRatio > targetRatio) {
      sourceWidth = image.naturalHeight * targetRatio;
      sourceX = (image.naturalWidth - sourceWidth) / 2;
    } else {
      sourceHeight = image.naturalWidth / targetRatio;
      sourceY = (image.naturalHeight - sourceHeight) / 2;
    }
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      rect.x,
      rect.y,
      rect.width,
      rect.height
    );
  }

  function lookbookLayout(count, width, height) {
    if (count <= 1) return [{ x: 0, y: 0, width: width, height: height }];
    if (count === 5 && width > height) {
      var heroWidth = Math.round(width / 2);
      var tileWidth = Math.round((width - heroWidth) / 2);
      var tileHeight = Math.round(height / 2);
      return [
        { x: 0, y: 0, width: heroWidth, height: height },
        { x: heroWidth, y: 0, width: tileWidth, height: tileHeight },
        { x: heroWidth + tileWidth, y: 0, width: width - heroWidth - tileWidth, height: tileHeight },
        { x: heroWidth, y: tileHeight, width: tileWidth, height: height - tileHeight },
        { x: heroWidth + tileWidth, y: tileHeight, width: width - heroWidth - tileWidth, height: height - tileHeight }
      ];
    }
    if (count === 2) {
      return [
        { x: 0, y: 0, width: width / 2, height: height },
        { x: width / 2, y: 0, width: width / 2, height: height }
      ];
    }
    if (count === 3) {
      return [
        { x: 0, y: 0, width: width, height: height / 2 },
        { x: 0, y: height / 2, width: width / 2, height: height / 2 },
        { x: width / 2, y: height / 2, width: width / 2, height: height / 2 }
      ];
    }
    return [
      { x: 0, y: 0, width: width / 2, height: height / 2 },
      { x: width / 2, y: 0, width: width / 2, height: height / 2 },
      { x: 0, y: height / 2, width: width / 2, height: height / 2 },
      { x: width / 2, y: height / 2, width: width / 2, height: height / 2 }
    ];
  }

  async function downloadLookbookComposite(items) {
    var images = await Promise.all(items.slice(0, 4).map(function (item) {
      return loadCanvasImage(item.url);
    }));
    var canvas = document.createElement('canvas');
    var aspect = state.aspectRatio || '16:9';
    canvas.width = aspect === '16:9' ? 1920 : 1080;
    canvas.height = aspect === '16:9' ? 1080 : (aspect === '1:1' ? 1080 : 1920);
    var context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ xuất lookbook.');

    context.fillStyle = '#0b1a20';
    context.fillRect(0, 0, canvas.width, canvas.height);
    var layout = lookbookLayout(images.length, canvas.width, canvas.height);
    images.forEach(function (image, index) {
      coverRect(context, image, layout[index]);
    });

    var topShade = context.createLinearGradient(0, 0, 0, 210);
    topShade.addColorStop(0, 'rgba(7, 21, 27, .84)');
    topShade.addColorStop(1, 'rgba(7, 21, 27, 0)');
    context.fillStyle = topShade;
    context.fillRect(0, 0, canvas.width, 210);
    context.fillStyle = '#e6f35e';
    context.font = '500 28px "Space Grotesk", "Be Vietnam Pro", sans-serif';
    context.letterSpacing = '4px';
    context.fillText('V-REMIX / LOOKBOOK', 56, 76);
    context.fillStyle = 'rgba(245, 246, 239, .82)';
    context.font = '400 22px "Be Vietnam Pro", sans-serif';
    context.letterSpacing = '0px';
    context.fillText('Việt phục, theo cách bạn.', 56, 118);

    var blob = await new Promise(function (resolve, reject) {
      canvas.toBlob(function (value) {
        if (value) resolve(value);
        else reject(new Error('Không thể đóng gói file lookbook.'));
      }, 'image/png');
    });
    var objectUrl = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = objectUrl;
    link.download = 'v-remix-lookbook-' + canvas.width + 'x' + canvas.height + '.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 1000);
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
    resultImages.innerHTML = '';
    resultImages.hidden = true;
    resultVideo.pause();
    resultVideo.removeAttribute('src');
    resultVideo.removeAttribute('poster');
    resultVideo.hidden = true;
    resultVideo.load();
    resultVisual.classList.remove('has-images', 'has-video');
    lastOutputFingerprint = '';
    currentLookbookItems = [];
    currentVideo = null;
    resultPlaceholderVisual.hidden = false;
    resultVisualLabel.hidden = false;
    resultDownload.hidden = true;
    syncSubmitButton();
    resultClose.focus();
  }

  function hideResult() {
    result.hidden = true;
    document.body.style.overflow = '';
    experience.setAttribute('aria-busy', 'false');
    syncSubmitButton();
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

  async function saveCurrentLook() {
    if (!catalog.lookEndpoint || currentLookbookItems.length === 0) return;
    saveLookButton.disabled = true;
    saveLookButton.textContent = 'Đang lưu…';
    try {
      var response = await fetch(catalog.lookEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VRemix-CSRF': catalog.lookCsrf || ''
        },
        body: JSON.stringify({
          action: 'save',
          name: (lookup(catalog.garments, state.garment).name || 'Look') + ' / V-Remix',
          selection: {
            event: state.event,
            garment: state.garment,
            color: state.color,
            pattern: state.pattern,
            style: state.style,
            scene: state.scene,
            accessories: state.accessories.slice()
          },
          locks: Object.assign({}, state.locks),
          images: currentLookbookItems.map(function (item) { return item.url; }),
          context: {
            occasion: state.event,
            branch: query.get('branch') || ''
          }
        })
      });
      var body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Không thể lưu Look.');
      saveLookButton.textContent = 'Đã lưu Look';
      setStatus('Look đã lưu vào thư viện riêng.');
    } catch (error) {
      saveLookButton.disabled = false;
      saveLookButton.textContent = 'Lưu Look';
      setStatus(error.message || 'Không thể lưu Look.');
    }
  }

  function compareCurrentLooks() {
    if (currentLookbookItems.length < 2) return;
    showResult();
    resultImages.scrollTo({ left: resultImages.clientWidth, behavior: 'smooth' });
    setStatus('Đang so sánh hai phương án lookbook.');
  }

  if (saveLookButton) saveLookButton.addEventListener('click', saveCurrentLook);
  if (compareLooksButton) compareLooksButton.addEventListener('click', compareCurrentLooks);
  if (addVariantButton) addVariantButton.addEventListener('click', function () {
    openMode('accessory');
    setStatus('Chọn một thay đổi nhỏ để tạo variant mới từ Base Look.');
  });
  if (headerSaveLook) headerSaveLook.addEventListener('click', function () {
    if (saveLookButton && !saveLookButton.disabled) saveLookButton.click();
    else {
      document.getElementById('studioVariants')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setStatus('Tạo ảnh trước khi lưu Look.');
    }
  });
  if (headerDownloadLookbook) headerDownloadLookbook.addEventListener('click', function () {
    if (resultDownload && !resultDownload.hidden) resultDownload.click();
    else {
      document.getElementById('studioVariants')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setStatus('Tạo ảnh trước khi tải lookbook.');
    }
  });

  dockClose.addEventListener('click', function () {
    closeDock(true);
  });
  resultClose.addEventListener('click', hideResult);
  resultDownload.addEventListener('click', function (event) {
    if (currentVideo || currentLookbookItems.length === 0) return;
    event.preventDefault();
    var previousLabel = resultDownload.textContent;
    resultDownload.setAttribute('aria-disabled', 'true');
    resultDownload.textContent = 'Đang dựng file 1080×1920…';
    downloadLookbookComposite(currentLookbookItems)
      .then(function () {
        setStatus('Đã xuất lookbook ' + state.aspectRatio + '.');
      })
      .catch(function (error) {
        setStatus(error && error.message ? error.message : 'Không thể xuất lookbook.');
        window.open(currentLookbookItems[0].url, '_blank', 'noopener');
      })
      .finally(function () {
        resultDownload.removeAttribute('aria-disabled');
        resultDownload.textContent = previousLabel;
      });
  });
  window.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (!result.hidden) hideResult();
    else if (state.openMode) closeDock(true);
  });

  buildHotspots();
  renderQuickStart();
  renderCatalogPanels();
  renderDock();
  updateSummary();
  prepareMedia();
  var pendingJob = readActiveJob();
  if (pendingJob) resumeGeneration(pendingJob);
})();
