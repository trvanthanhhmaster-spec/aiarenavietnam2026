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
  var previewImage = document.getElementById('studioPreviewImage');
  var previewGenerationStatus = document.getElementById('previewGenerationStatus');
  var previewGenerationMessage = document.getElementById('previewGenerationMessage');
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
  var compareLayer = document.getElementById('studioCompare');
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
  var resultCulturalScore = document.getElementById('resultCulturalScore');
  var resultGenZTip = document.getElementById('resultGenZTip');
  var resultVisual = document.querySelector('.studio-result__visual');
  var resultPlaceholderVisual = document.getElementById('resultPlaceholderVisual');
  var resultVisualLabel = document.getElementById('resultVisualLabel');
  var resultImages = document.getElementById('resultImages');
  var resultVideo = document.getElementById('resultVideo');
  var resultDownload = document.getElementById('resultDownload');
  var resultVideoBranches = document.getElementById('resultVideoBranches');
  var submitButton = form && form.querySelector('.studio-submit');
  var canvasAspect = document.getElementById('canvasAspect');
  var targetResolution = document.getElementById('targetResolution');
  var generationMode = document.getElementById('generationMode');
  var garmentVariantSection = document.getElementById('garmentVariantSection');
  var garmentVariantGrid = document.getElementById('catalogGarmentVariants');
  var garmentVariantCount = document.getElementById('garmentVariantCount');
  var accessoryVariantSection = document.getElementById('accessoryVariantSection');
  var accessoryVariantGrid = document.getElementById('catalogAccessoryVariants');
  var accessoryVariantCount = document.getElementById('accessoryVariantCount');
  var progressSteps = document.querySelectorAll('[data-progress-step]');
  var nextHint = document.getElementById('studioNextHint');
  var catalogPanels = {
    event: document.getElementById('catalogEvents'),
    garment: document.getElementById('catalogGarments'),
    color: document.getElementById('catalogColors'),
    pattern: document.getElementById('catalogPatterns'),
    accessory: document.getElementById('catalogAccessories'),
    style: document.getElementById('catalogStyles'),
    scene: document.getElementById('catalogScenes')
  };
  var frameSteps = document.querySelectorAll('[data-frame-step]');
  var submitLabel = submitButton ? submitButton.innerHTML : '';
  var activeJobKey = 'vremix.active-generation-job.v1';
  var generationPending = false;
  var lastOutputFingerprint = '';
  var currentLookbookItems = [];
  var currentVideo = null;
  var autoGenerateTimer = null;
  var queuedAutoGeneration = false;
  var pendingAutoFingerprint = '';

  var modes = [
    { id: 'event', index: '01 / 07', title: 'Dịp mặc', description: 'Chọn hoàn cảnh để hệ thống gợi ý dáng áo, màu và cách phối phù hợp.', anchor: { x: 20, y: 39 } },
    { id: 'garment', index: '02 / 07', title: 'Trang phục', description: 'Chọn một dáng Việt phục làm điểm bắt đầu. Bạn chưa cần biết tên gọi lịch sử.', anchor: { x: 58, y: 28 } },
    { id: 'color', index: '03 / 07', title: 'Màu sắc', description: 'Chọn màu bạn thích; hệ thống sẽ cân lại độ hài hòa với trang phục.', anchor: { x: 78, y: 61 } },
    { id: 'pattern', index: '04 / 07', title: 'Họa tiết', description: 'Có thể bỏ qua bước này. Chỉ thêm họa tiết khi bạn muốn bản phối có điểm nhấn.', anchor: { x: 72, y: 31 } },
    { id: 'accessory', index: '05 / 07', title: 'Phụ kiện', description: 'Thêm một hoặc hai món quen thuộc. Bạn có thể để trống để giữ nét truyền thống.', anchor: { x: 35, y: 75 } },
    { id: 'style', index: '06 / 07', title: 'Phong cách', description: 'Nói cho hệ thống biết bạn muốn tổng thể nhẹ nhàng, thanh lịch hay năng động.', anchor: { x: 78, y: 61 } },
    { id: 'scene', index: '07 / 07', title: 'Bối cảnh', description: 'Chọn nơi bạn muốn xuất hiện để ảnh có ánh sáng và không khí phù hợp.', anchor: { x: 20, y: 39 } }
  ];

  var query = new URLSearchParams(window.location.search);
  var branchEventMap = { dihoc: 'school', daopho: 'street', dule: 'ceremony', chupanh: 'portrait' };
  var contextOccasion = query.get('occasion') || branchEventMap[query.get('branch')] || '';
  var hasContext = Boolean(contextOccasion && lookup(catalog.events, contextOccasion).slug);
  var state = {
    openMode: null,
    event: hasContext ? contextOccasion : '',
    garment: '',
    garmentVariant: '',
    color: '',
    pattern: '',
    style: '',
    scene: '',
    accessories: [],
    accessoryVariants: [],
    aspectRatio: catalog.generation && catalog.generation.canvas_aspect_ratio || '16:9',
    resolution: catalog.generation && catalog.generation.target_resolution || '1080',
    mode: catalog.generation && catalog.generation.default_generation_mode || 'text-to-image',
    outputType: catalog.generation && catalog.generation.default_output_type || (document.getElementById('outputType') || {}).value || 'image',
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
    syncVariantSelections();
    if (lookup(catalog.colors, preset.color).slug) state.color = preset.color;
    if (lookup(catalog.styles, preset.style).slug) state.style = preset.style;
    if (lookup(catalog.scenes, preset.scene).slug) state.scene = preset.scene;
    if (announce) setStatus('Đã áp dụng gợi ý cho ' + event.label + '.');
  }

  if (hasContext) applyEventPreset(contextOccasion, false);

  if (canvasAspect) canvasAspect.value = state.aspectRatio;
  if (targetResolution) targetResolution.value = state.resolution;
  if (generationMode) generationMode.value = state.mode;

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
        scheduleAutoGeneration();
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
    if (!submitButton) return;
    submitButton.disabled = generationPending && !result.hidden;
    submitButton.innerHTML = generationPending
      ? 'Xem tiến trình <span aria-hidden="true">↗</span>'
      : submitLabel;
  }

  function restoreSelection(selection) {
    if (!selection) return;
    if (lookup(catalog.events, selection.event).slug) state.event = selection.event;
    if (lookup(catalog.garments, selection.garment).slug) state.garment = selection.garment;
    if (lookup(catalog.garmentVariants, selection.garmentVariant).slug) {
      state.garmentVariant = selection.garmentVariant;
    }
    if (lookup(catalog.colors, selection.color).slug) state.color = selection.color;
    if (lookup(catalog.patterns, selection.pattern).slug) state.pattern = selection.pattern;
    if (lookup(catalog.styles, selection.style).slug) state.style = selection.style;
    if (lookup(catalog.scenes, selection.scene).slug) state.scene = selection.scene;
    state.accessories = Array.isArray(selection.accessories)
      ? selection.accessories.filter(function (slug) {
        return Boolean(lookup(catalog.accessories, slug).slug);
      })
      : [];
    state.accessoryVariants = Array.isArray(selection.accessoryVariants)
      ? selection.accessoryVariants.filter(function (slug) {
        return Boolean(lookup(catalog.accessoryVariants, slug).slug);
      })
      : [];
    syncVariantSelections();
    if (selection.aspectRatio) {
      state.aspectRatio = selection.aspectRatio;
      if (canvasAspect) canvasAspect.value = selection.aspectRatio;
    }
    if (selection.targetResolution) {
      state.resolution = selection.targetResolution;
      if (targetResolution) targetResolution.value = selection.targetResolution;
    }
    if (selection.generationMode) {
      state.mode = selection.generationMode;
      if (generationMode) generationMode.value = selection.generationMode;
    }
    if (selection.generationType) state.outputType = selection.generationType;
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

  function variantsForGarment() {
    var garment = lookup(catalog.garments, state.garment);
    return (catalog.garmentVariants || []).filter(function (item) {
      return item.garment_id === garment.id;
    });
  }

  function variantsForAccessories() {
    var parentIds = state.accessories.map(function (slug) {
      return lookup(catalog.accessories, slug).id;
    }).filter(Boolean);
    return (catalog.accessoryVariants || []).filter(function (item) {
      return parentIds.indexOf(item.accessory_id) !== -1;
    });
  }

  function syncVariantSelections() {
    var garmentVariants = variantsForGarment();
    if (!garmentVariants.some(function (item) { return item.slug === state.garmentVariant; })) {
      state.garmentVariant = garmentVariants[0] ? garmentVariants[0].slug : '';
    }
    var accessoryVariants = variantsForAccessories();
    state.accessoryVariants = state.accessoryVariants.filter(function (slug) {
      return accessoryVariants.some(function (item) { return item.slug === slug; });
    });
    state.accessories.forEach(function (accessorySlug) {
      var accessory = lookup(catalog.accessories, accessorySlug);
      var hasSelection = state.accessoryVariants.some(function (variantSlug) {
        return lookup(catalog.accessoryVariants, variantSlug).accessory_id === accessory.id;
      });
      if (!hasSelection) {
        var first = accessoryVariants.find(function (item) { return item.accessory_id === accessory.id; });
        if (first) state.accessoryVariants.push(first.slug);
      }
    });
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
    setStatus('Đã đóng bảng lựa chọn.');
    if (restoreFocus && previous) {
      var trigger = experience.querySelector('.studio-catalog-card__head [data-mode="' + previous + '"]')
        || experience.querySelector('[data-progress-step][data-mode="' + previous + '"]');
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
    bindCatalogImageFallback(dockContent);
  }

  function optionList(items, kind, selectedValue, multiple, swatches) {
    return (items || []).map(function (item) {
      var slug = String(item.slug || '');
      var selected = multiple ? selectedValue.indexOf(slug) !== -1 : selectedValue === slug;
      var name = item.label || item.name || slug;
      var detail = item.description || item.category || item.origin_note || '';
      var imageUrl = catalogImageUrl(item);
      var media = imageUrl
        ? '<span class="studio-option__media has-image"><img src="' + escapeHtml(imageUrl) +
          '" alt="Ảnh tham khảo ' + escapeHtml(name) + '" loading="lazy"></span>'
        : '';
      var swatch = swatches
        ? '<span class="studio-option__swatch" style="background:' + escapeHtml(item.value || '#d6d6cf') + '"></span>'
        : '';
      return '<button type="button" class="studio-option' + (selected ? ' is-selected' : '') + (swatches ? ' studio-option--swatch' : '') +
        '" data-option-kind="' + escapeHtml(kind) + '" data-option-value="' + escapeHtml(slug) +
        '" aria-pressed="' + String(selected) + '">' + media + swatch +
        '<span class="studio-option__copy"><span class="studio-option__name">' + escapeHtml(name) + '</span>' +
        (detail ? '<span class="studio-option__meta">' + escapeHtml(detail) + '</span>' : '') +
        (imageUrl ? '<span class="studio-option__source">Ảnh tham chiếu có nguồn</span>' : '') +
        '</span><span class="studio-option__check" aria-hidden="true">✓</span></button>';
    }).join('');
  }

  function catalogImageUrl(item) {
    var value = String(item.thumbnail_url || item.image_url || '').trim();
    if (/^https?:\/\//i.test(value)) return value;
    if (/^assets\/media\/catalog\/[a-z0-9._/-]+$/i.test(value)) return value;
    return '';
  }

  function renderInspirationStrip() {
    if (!variantStrip) return;
    var buttons = variantStrip.querySelectorAll('[data-variant]');
    buttons.forEach(function (button, index) {
      var garment = (catalog.garments || [])[index];
      if (!garment) { button.hidden = true; return; }
      button.dataset.catalogKind = 'garment';
      button.dataset.optionValue = garment.slug;
      button.classList.remove('is-active');
      button.setAttribute('aria-label', 'Chọn ' + garment.name + ' · ảnh tham khảo');
      var url = catalogImageUrl(garment);
      if (url) {
        var image = document.createElement('img');
        image.src = url; image.alt = 'Ảnh tham khảo ' + garment.name; image.loading = 'lazy';
        button.prepend(image);
      }
      button.querySelector('strong').textContent = garment.name;
    });
  }

  function bindCatalogImageFallback(root) {
    Array.prototype.forEach.call(root.querySelectorAll('img'), function (image) {
      image.addEventListener('error', function () {
        var media = image.closest('.has-image');
        if (media) media.classList.remove('has-image');
        image.remove();
      }, { once: true });
    });
  }

  function compactCatalogList(items, kind, selectedValue, multiple, limit) {
    var availableItems = (items || []).slice(0, limit);
    if (availableItems.length === 0) {
      return '<p class="studio-catalog-empty">Mục này đang được cập nhật. Bạn có thể chọn một mục khác để tiếp tục.</p>';
    }
    return availableItems.map(function (item, index) {
      var slug = String(item.slug || '');
      var selected = multiple ? selectedValue.indexOf(slug) !== -1 : selectedValue === slug;
      var name = item.label || item.name || slug;
      var imageUrl = catalogImageUrl(item);
      var image = imageUrl
        ? '<img src="' + escapeHtml(imageUrl) + '" alt="Ảnh tham khảo ' + escapeHtml(name) + '" loading="lazy">'
        : '';
      var visualStyle = kind === 'color'
        ? ' style="background:' + escapeHtml(item.value || '#d6d1c8') + '"'
        : '';
      return '<button type="button" class="studio-catalog-item' + (selected ? ' is-selected' : '') +
        '" data-catalog-kind="' + escapeHtml(kind) + '" data-option-value="' + escapeHtml(slug) +
        '" aria-pressed="' + String(selected) + '" title="' + escapeHtml(name) + '">' +
        '<span class="studio-catalog-item__visual' + (imageUrl ? ' has-image' : '') + '"' + visualStyle + '>' + image +
        '<span class="studio-catalog-item__glyph" aria-hidden="true">' +
        escapeHtml(String(index + 1).padStart(2, '0')) + '</span></span>' +
        '<span class="studio-catalog-item__name">' + escapeHtml(name) + '</span></button>';
    }).join('');
  }

  function renderCatalogPanels() {
    var definitions = [
      { kind: 'event', items: catalog.events, selected: state.event, multiple: false, limit: 4 },
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
      bindCatalogImageFallback(panel);
    });
    renderVariantPanels();
  }

  function variantCards(items, kind, selected) {
    return items.map(function (item) {
      var imageUrl = catalogImageUrl(item);
      var meta = [item.material, item.pattern_notes].filter(Boolean).join(' · ');
      return '<button type="button" class="studio-variant-card' +
        (selected.indexOf(item.slug) !== -1 ? ' is-selected' : '') +
        '" data-catalog-kind="' + escapeHtml(kind) + '" data-option-value="' + escapeHtml(item.slug) +
        '" aria-pressed="' + String(selected.indexOf(item.slug) !== -1) + '">' +
        '<span class="studio-variant-card__media' + (imageUrl ? ' has-image' : '') + '">' +
        (imageUrl ? '<img src="' + escapeHtml(imageUrl) + '" alt="Mẫu ' + escapeHtml(item.name) + '" loading="lazy">' : '') +
        '</span><span class="studio-variant-card__copy"><strong>' + escapeHtml(item.name) + '</strong>' +
        (meta ? '<small>' + escapeHtml(meta) + '</small>' : '') +
        '<small class="studio-variant-card__source">' + escapeHtml(item.source_provider === 'wikimedia' ? 'Wikimedia · đã duyệt' : 'Nguồn biên tập') +
        '</small></span></button>';
    }).join('');
  }

  function renderVariantPanels() {
    var garmentVariants = variantsForGarment();
    if (garmentVariantSection && garmentVariantGrid) {
      garmentVariantSection.hidden = !state.garment || garmentVariants.length === 0;
      garmentVariantGrid.innerHTML = variantCards(garmentVariants, 'garmentVariant', [state.garmentVariant]);
      if (garmentVariantCount) garmentVariantCount.textContent = garmentVariants.length + ' mẫu';
      bindCatalogImageFallback(garmentVariantGrid);
    }
    var accessoryVariants = variantsForAccessories();
    if (accessoryVariantSection && accessoryVariantGrid) {
      accessoryVariantSection.hidden = state.accessories.length === 0 || accessoryVariants.length === 0;
      accessoryVariantGrid.innerHTML = variantCards(accessoryVariants, 'accessoryVariant', state.accessoryVariants);
      if (accessoryVariantCount) accessoryVariantCount.textContent = accessoryVariants.length + ' mẫu';
      bindCatalogImageFallback(accessoryVariantGrid);
    }
  }

  function chooseOption(kind, value) {
    if (kind === 'garmentVariant') {
      state.garmentVariant = value;
    } else if (kind === 'accessoryVariant') {
      var selectedVariant = lookup(catalog.accessoryVariants, value);
      state.accessoryVariants = state.accessoryVariants.filter(function (slug) {
        return lookup(catalog.accessoryVariants, slug).accessory_id !== selectedVariant.accessory_id;
      });
      if (selectedVariant.slug) state.accessoryVariants.push(selectedVariant.slug);
    } else if (kind === 'accessory') {
      var position = state.accessories.indexOf(value);
      if (position === -1) state.accessories.push(value);
      else state.accessories.splice(position, 1);
    } else {
      state[kind] = value;
      if (kind === 'event') {
        applyEventPreset(value, false);
        renderQuickStart();
      } else if (kind === 'scene' && !state.event) {
        var inferredEvent = {
          campus: 'school',
          'old-quarter': 'street',
          temple: 'ceremony',
          citadel: 'ceremony',
          studio: 'portrait',
          'ceremonial-space': 'ceremony'
        }[value];
        if (inferredEvent && lookup(catalog.events, inferredEvent).slug) {
          state.event = inferredEvent;
          renderQuickStart();
        }
      }
    }
    syncVariantSelections();
    if (state.openMode) renderDockContent(state.openMode);
    renderCatalogPanels();
    updateSummary(kind);
    // Catalog rendering replaces its buttons. Keep a keyboard user's place
    // when the guide stays on the same question (e.g. choosing a child sample).
    var visibleChoice = Array.from(experience.querySelectorAll('[data-catalog-kind]')).find(function (button) {
      return button.dataset.catalogKind === kind && button.dataset.optionValue === value && button.offsetParent !== null;
    });
    if (visibleChoice) visibleChoice.focus({ preventScroll: true });
    var updatedLabel = kind === 'garmentVariant'
      ? 'mẫu trang phục'
      : kind === 'accessoryVariant' ? 'mẫu phụ kiện' : modeById(kind).title.toLowerCase();
    setStatus('Đã cập nhật ' + updatedLabel + '.');
    scheduleAutoGeneration();
  }

  function updateSummary(changedKind) {
    var event = lookup(catalog.events, state.event);
    var garment = lookup(catalog.garments, state.garment);
    var garmentVariant = lookup(catalog.garmentVariants, state.garmentVariant);
    var color = lookup(catalog.colors, state.color);
    var pattern = lookup(catalog.patterns, state.pattern);
    var style = lookup(catalog.styles, state.style);
    var scene = lookup(catalog.scenes, state.scene);
    var accessoryNames = state.accessories.map(function (slug) {
      return lookup(catalog.accessories, slug).name;
    }).filter(Boolean);

    var selectedSummary = [
      event.label,
      garment.name,
      garmentVariant.name !== garment.name ? garmentVariant.name : '',
      color.label,
      pattern.label,
      style.label,
      scene.label,
      accessoryNames.length ? accessoryNames.length + ' phụ kiện' : ''
    ].filter(Boolean).join(' · ');
    var nextStep = !state.event ? 'Bắt đầu bằng việc chọn dịp bạn sẽ mặc.'
      : !state.garment ? 'Tiếp theo: chọn dáng Việt phục bạn thích.'
      : !state.style ? 'Cuối cùng: chọn phong cách để xem bản phối.' : '';
    summary.textContent = [selectedSummary, nextStep].filter(Boolean).join(' — ');

    document.getElementById('footerEvent').textContent = event.label || 'Chưa chọn';
    document.getElementById('footerGarment').textContent = garmentVariant.name || garment.name || 'Chưa chọn';
    document.getElementById('footerColor').textContent = color.label || 'Chưa chọn';
    document.getElementById('footerPattern').textContent = pattern.label || 'Chưa chọn';
    document.getElementById('footerStyle').textContent = style.label || 'Chưa chọn';
    document.getElementById('footerScene').textContent = scene.label || 'Chưa chọn';
    document.getElementById('footerAccessory').textContent = accessoryNames.length ? accessoryNames.join(', ') : 'Không phụ kiện';
    document.getElementById('frameBSummary').textContent = scene.label ? 'Đổi nền: ' + scene.label : event.label ? 'Đổi nền: ' + event.label : 'Đổi phông nền';
    document.getElementById('frameCSummary').textContent = style.label ? 'Đổi sáng: ' + style.label : 'Đổi thời điểm trong ngày';
    document.getElementById('frameDSummary').textContent = garment.name
      ? 'Quần áo: ' + (garmentVariant.name || garment.name)
      : 'Chỉ thay quần áo';
    document.getElementById('frameESummary').textContent = 'Giữ vị trí và khung hình';
    var hasBaseLook = Boolean(state.event && state.garment && state.style);
    if (previewEmpty) previewEmpty.classList.toggle('is-ready', hasBaseLook);
    if (frame) frame.classList.toggle('has-look', hasBaseLook);
    if (projectKicker) projectKicker.textContent = state.event ? ('Bản phối · ' + event.label) : 'Bản phối mới';
    if (projectTitle) projectTitle.textContent = state.event
      ? 'Một bản phối để ' + event.label.toLowerCase() + '.'
      : 'Việt phục, theo cách bạn.';
    if (projectContext) {
      var preset = event.preset || {};
      projectContext.textContent = state.event
        ? [preset.location, preset.season, preset.weather, garment.name].filter(Boolean).join(' · ')
        : 'Chỉ cần chọn dịp mặc. V-Remix sẽ gợi ý và tạo ảnh cho bạn.';
    }
    updatePassport();
    updateRecommendations();
    updateProgress(changedKind);
  }

  function updateProgress(changedKind) {
    var required = ['event', 'garment', 'style'];
    var labels = { event: 'dịp bạn sẽ mặc', garment: 'dáng Việt phục bạn thích', style: 'phong cách bạn muốn' };
    var firstMissing = required.find(function (key) { return !state[key]; });
    Array.prototype.forEach.call(progressSteps, function (step) {
      var key = step.dataset.progressStep;
      step.classList.toggle('is-done', Boolean(state[key]));
      step.classList.toggle('is-current', key === firstMissing || (!firstMissing && key === 'style'));
      step.setAttribute('aria-current', key === firstMissing ? 'step' : 'false');
    });
    if (nextHint) nextHint.textContent = firstMissing
      ? 'Tiếp theo: chọn ' + labels[firstMissing] + '.'
      : 'Đã đủ lựa chọn. Ảnh tự tạo, không cần bấm thêm.';
    // One snapshot from the real selection state drives the beginner guide,
    // including database presets and restored jobs. No duplicate catalog state.
    var guide = {
      next: firstMissing || 'review',
      ready: !firstMissing,
      changed: changedKind || '',
      choices: { event: state.event, garment: state.garment, style: state.style },
      labels: {
        event: lookup(catalog.events, state.event).label || '',
        garment: lookup(catalog.garmentVariants, state.garmentVariant).name || lookup(catalog.garments, state.garment).name || '',
        style: lookup(catalog.styles, state.style).label || ''
      },
      variantCount: variantsForGarment().length
    };
    experience.studioGuide = guide;
    experience.dispatchEvent(new CustomEvent('studio:selection', { detail: guide }));
  }

  function updatePassport() {
    var garment = lookup(catalog.garments, state.garment);
    var garmentVariant = lookup(catalog.garmentVariants, state.garmentVariant);
    var event = lookup(catalog.events, state.event);
    var color = lookup(catalog.colors, state.color);
    var style = lookup(catalog.styles, state.style);
    var scene = lookup(catalog.scenes, state.scene);
    if (passportTitle) passportTitle.textContent = garmentVariant.name || garment.name || 'Chưa chọn Việt phục';
    if (passportOrigin) passportOrigin.textContent = garment.origin_note || 'Chọn một trang phục để xem nội dung đã được duyệt.';
    if (passportFeature) passportFeature.textContent = [
      garmentVariant.description || garment.description,
      garmentVariant.material ? 'Chất liệu: ' + garmentVariant.material : '',
      garmentVariant.pattern_notes ? 'Họa tiết: ' + garmentVariant.pattern_notes : ''
    ].filter(Boolean).join(' · ') || '—';
    if (passportMeaning) passportMeaning.textContent = garment.significance_note || '—';
    var source = (catalog.sources || []).find(function (item) { return item.id === garment.source_id; });
    if (passportSource) passportSource.textContent = source ? source.title : 'Nguồn đã được duyệt sẽ hiển thị tại đây.';
    if (passportVisual) {
      var passportImage = catalogImageUrl(garmentVariant) || catalogImageUrl(garment);
      passportVisual.hidden = !passportImage;
      passportVisual.style.backgroundImage = passportImage
        ? 'url("' + passportImage.replace(/["\\]/g, '') + '")'
        : '';
      passportVisual.classList.toggle('has-image', Boolean(passportVisual.style.backgroundImage));
      var mark = passportVisual.querySelector('span');
      if (mark) mark.textContent = (garmentVariant.name || garment.name || 'V').charAt(0).toUpperCase();
    }
    if (tipLocation) tipLocation.textContent = [scene.label, event.label].filter(Boolean).join(' · ') || 'Khuôn viên · Phố cổ · Văn Miếu';
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

  function formatMoney(value) {
    var amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return '';
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  }

  function safeExternalUrl(value, fallback) {
    try {
      var url = new URL(String(value || fallback || ''), window.location.href);
      return /^https?:$/i.test(url.protocol) ? url.href : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function updateRecommendations() {
    var listingsPanel = document.getElementById('studioListings');
    var locationsPanel = document.getElementById('studioLocations');
    var listingSearchLink = document.getElementById('listingSearchLink');
    var locationSearchLink = document.getElementById('locationSearchLink');
    if (!listingsPanel || !locationsPanel) return;

    var garment = lookup(catalog.garments, state.garment);
    var selectedAccessories = state.accessories.map(function (slug) { return lookup(catalog.accessories, slug); });
    var listings = (catalog.listings || []).filter(function (item) {
      return item && item.is_active !== false && item.item_type &&
        ((item.item_type === 'garment' && item.garment_id === garment.id) ||
          (item.item_type === 'accessory' && selectedAccessories.some(function (accessory) { return accessory.id === item.accessory_id; })));
    }).slice(0, 3);
    if (listings.length === 0) {
      listingsPanel.innerHTML = '<p class="studio-recommendation-empty">Chưa có đối tác được biên tập cho lựa chọn này. Bạn có thể mở bản đồ để tìm nơi mua hoặc thuê gần mình.</p>';
    } else {
      listingsPanel.innerHTML = listings.map(function (item) {
        var price = [formatMoney(item.price_from_vnd), formatMoney(item.price_to_vnd)].filter(Boolean).join(' – ');
        var typeLabel = item.listing_type === 'rent' ? 'Thuê' : item.listing_type === 'buy' ? 'Mua' : 'Mua · thuê';
        return '<a class="studio-recommendation" href="' + escapeHtml(safeExternalUrl(item.external_url, '#')) + '" target="_blank" rel="noopener noreferrer">' +
          '<span><strong>' + escapeHtml(item.provider_name || item.title) + '</strong><small>' +
          escapeHtml([typeLabel, item.province, price].filter(Boolean).join(' · ')) + '</small></span><span aria-hidden="true">↗</span></a>';
      }).join('');
    }
    var locationQuery = [lookup(catalog.scenes, state.scene).label, lookup(catalog.events, state.event).label, 'Hà Nội'].filter(Boolean).join(' ');
    if (listingSearchLink) {
      var listingQuery = [garment.name].concat(selectedAccessories.map(function (item) { return item.name; })).filter(Boolean).join(' ');
      listingSearchLink.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('mua thuê ' + (listingQuery || 'cổ phục') + ' ' + ((lookup(catalog.events, state.event).preset || {}).location || 'Hà Nội'));
    }
    var suitableContexts = [state.scene, state.event].filter(Boolean);
    var locations = (catalog.locations || []).filter(function (item) {
      var contexts = Array.isArray(item.suitable_contexts) ? item.suitable_contexts : [];
      return contexts.length === 0 || suitableContexts.some(function (context) { return contexts.indexOf(context) !== -1; });
    }).slice(0, 3);
    if (!locations.length) locations = (catalog.locations || []).slice(0, 3);
    if (!locations.length) {
      locationsPanel.innerHTML = '<p class="studio-recommendation-empty">Chưa có địa điểm đã xác minh cho lựa chọn này.</p>';
    } else {
      locationsPanel.innerHTML = locations.map(function (item) {
        return '<a class="studio-recommendation" href="' + escapeHtml(safeExternalUrl(item.map_url, '#')) + '" target="_blank" rel="noopener noreferrer">' +
          '<span><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml([item.address, item.province].filter(Boolean).join(' · ')) + '</small></span><span aria-hidden="true">↗</span></a>';
      }).join('');
    }
    if (locationSearchLink) locationSearchLink.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(locationQuery || 'địa điểm chụp ảnh Việt phục Hà Nội');
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
      ? 'Bản gốc đã được giữ nguyên: người mẫu, dáng và khung hình.'
      : 'Đang xem thay đổi ' + state.activeFrame + '. Chỉ phần bạn chọn sẽ thay đổi.');
  }

  // Delegation keeps the cinematic controller interactive even when the
  // responsive layout changes its internal hit areas.
  experience.addEventListener('click', function (event) {
    var step = event.target.closest('[data-frame-step]');
    if (step) selectFrame(step);
    var variant = event.target.closest('[data-variant]');
    if (variant && variant.dataset.previewIndex !== undefined) selectPreviewAsset(variant.dataset.previewIndex);
    var modeButton = event.target.closest('.studio-tool-list [data-mode]');
    if (modeButton) {
      if (state.openMode === modeButton.dataset.mode) closeDock(true);
      else openMode(modeButton.dataset.mode);
    }
    var progressButton = event.target.closest('[data-progress-step][data-mode]');
    if (progressButton) openMode(progressButton.dataset.mode);
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
  // Aspect ratio, resolution, provider and output type are intentionally
  // admin-owned. Studio only displays the active preset and sends it along.

  function setStatus(message) {
    studioStatus.textContent = message;
    srStatus.textContent = message;
    if (previewGenerationMessage && previewGenerationStatus && !generationPending) {
      previewGenerationMessage.textContent = message;
    }
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
      if (!generationPending && !state.event) setStatus('Chọn một dịp mặc để bắt đầu.');
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
      setStatus('Đã bỏ ảnh của bạn. Bạn vẫn có thể phối đồ không cần ảnh.');
      scheduleAutoGeneration();
      return;
    }
    if (!/^(image\/jpeg|image\/png|image\/webp)$/.test(file.type)) {
      imageInput.value = '';
      setStatus('Hãy chọn ảnh JPG, PNG hoặc WebP.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      imageInput.value = '';
      uploadName.textContent = 'Ảnh vượt quá 8 MB';
      setStatus('Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn 8 MB.');
      return;
    }
    uploadName.textContent = file.name;
    setStatus('Đã thêm ảnh của bạn để làm tham khảo cho bản phối.');
    scheduleAutoGeneration();
  });

  function selectionFingerprint() {
    return JSON.stringify({
      event: state.event,
      garment: state.garment,
      garmentVariant: state.garmentVariant,
      color: state.color,
      pattern: state.pattern,
      style: state.style,
      scene: state.scene,
      accessories: state.accessories.slice().sort(),
      accessoryVariants: state.accessoryVariants.slice().sort(),
      outputType: state.outputType,
      image: imageInput.files && imageInput.files[0] ? imageInput.files[0].name + ':' + imageInput.files[0].size : ''
    });
  }

  function scheduleAutoGeneration() {
    if (!state.event || !state.garment || !state.style) return;
    // Do not save/download the preceding image with newly changed metadata
    // during the debounce window before the next job actually starts.
    if (saveLookButton) saveLookButton.disabled = true;
    if (compareLooksButton) compareLooksButton.disabled = true;
    resultDownload.hidden = true;
    var retry = document.getElementById('retryGeneration');
    if (retry) retry.hidden = true;
    pendingAutoFingerprint = selectionFingerprint();
    if (autoGenerateTimer) window.clearTimeout(autoGenerateTimer);
    if (generationPending) {
      queuedAutoGeneration = true;
      setStatus('Đã nhận thay đổi. Bản xem trước sẽ cập nhật sau khi hoàn tất.');
      return;
    }
    setStatus('Đã đủ lựa chọn chính. Đang chuẩn bị ảnh xem trước…');
    autoGenerateTimer = window.setTimeout(function () {
      autoGenerateTimer = null;
      queuedAutoGeneration = false;
      generateLook();
    }, 850);
  }

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
      setStatus('Bạn đã chọn dùng ảnh của mình, hãy tải ảnh nguồn lên trước.');
      imageInput.focus();
      return;
    }
    var requestFingerprint = selectionFingerprint();
    if (compareLayer) compareLayer.hidden = true;
    if (compareLooksButton) compareLooksButton.textContent = 'So sánh ảnh';
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
        garmentVariant: state.garmentVariant,
        color: state.color,
        pattern: state.pattern,
        style: state.style,
        scene: state.scene,
        accessories: state.accessories.slice(),
        accessoryVariants: state.accessoryVariants.slice(),
        locks: Object.assign({}, state.locks),
        generationType: state.outputType,
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
      weather: (lookup(catalog.events, state.event).preset || {}).weather || '',
      audience: (lookup(catalog.events, state.event).preset || {}).audience || '',
      garmentSlug: state.garment,
      garmentVariantSlug: state.garmentVariant,
      accessorySlugs: state.accessories.slice(),
      accessoryVariantSlugs: state.accessoryVariants.slice(),
      colorSlug: state.color,
      patternSlug: state.pattern,
      styleSlug: state.style,
      sceneSlug: state.scene,
      locks: Object.assign({}, state.locks),
      generationType: state.outputType,
      aspectRatio: state.aspectRatio,
      targetResolution: state.resolution,
      generationMode: state.mode,
      framePlan: {
        A: { changeScope: 'fixed subject identity, face, pose, camera angle and composition' },
        B: { branch: 'event', changeScope: 'background and scene only', value: state.scene || state.event },
        C: { branch: 'lighting', changeScope: 'lighting and time of day only', value: state.style },
        D: { branch: 'garment', changeScope: 'clothing only', value: state.garmentVariant || state.garment },
        E: { branch: 'character', changeScope: 'subject identity only; preserve position and scale', value: state.accessoryVariants.length ? state.accessoryVariants : state.accessories }
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
        payload.generationMode = 'image-to-image';
      }

      if (!catalog.generationEndpoint) {
        terminalFailure = true;
        throw new Error('Dịch vụ tạo ảnh chưa sẵn sàng.');
      }

      setResultState('processing', 'Đang tạo bản phối và kiểm tra độ phù hợp văn hóa…');
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
      if (pendingAutoFingerprint && pendingAutoFingerprint !== requestFingerprint) {
        queuedAutoGeneration = false;
        scheduleAutoGeneration();
      }
    } catch (error) {
      if (terminalFailure) clearActiveJob();
      generationPending = false;
      syncSubmitButton();
      var message = humanizeGenerationError(error && error.message
        ? error.message
        : 'Không thể hoàn thành bản phối.');
      setResultState('failed', message + ' Lựa chọn của bạn vẫn được giữ. Bấm “Thử tạo lại” khi muốn tiếp tục.');
      if (pendingAutoFingerprint && pendingAutoFingerprint !== requestFingerprint) {
        queuedAutoGeneration = false;
        scheduleAutoGeneration();
      }
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
    setResultState('processing', 'Đang tiếp tục bản phối trước đó…');
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
        : 'Không thể tiếp tục bản phối.');
      setResultState('failed', message + ' Lựa chọn của bạn vẫn được giữ. Bấm “Thử tạo lại” khi muốn tiếp tục.');
    } finally {
      generationPending = false;
      syncSubmitButton();
    }
  }

  function humanizeGenerationError(message) {
    var text = String(message || '');
    if (/no available quota|resource_exhausted|enable billing/i.test(text)) {
      var provider = /veo|video/i.test(text) ? 'video' : 'ảnh';
      return 'Dịch vụ tạo ' + provider + ' đang tạm hết lượt. Bạn có thể thử lại sau hoặc chọn một bản phối khác.';
    }
    if (/no prepaid gemini api balance|prepayment credits are depleted/i.test(text)) {
      return 'Dịch vụ tạo ảnh chưa sẵn sàng. Bạn có thể thử lại sau hoặc báo đội ngũ quản trị.';
    }
    if (/generation|edge function|unable to read|job did not|job vẫn|not configured/i.test(text)) {
      return 'Dịch vụ tạo bản phối đang bận. Bạn có thể thử lại sau ít phút.';
    }
    if (/HTTP|Gemini|bridge|unauthenticated|expired|failed to fetch|network|timeout|Supabase|Veo|method not allowed|unexpected token|JSON/i.test(text)) {
      return 'Chưa tạo được ảnh lúc này. Hãy thử lại sau ít phút; nếu vẫn lỗi, báo người quản trị.';
    }
    return /[à-ỹđ]/i.test(text) ? text : 'Chưa tạo được ảnh. Hãy thử lại sau ít phút.';
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
        ? 'Ảnh đã sẵn sàng; video đang được hoàn thiện.'
        : 'Đang dựng các phương án ảnh cho bạn…');
    }
    throw new Error('Bản phối vẫn đang được xử lý. Hãy mở lại sau ít phút để xem kết quả.');
  }

  function resultMessage(output) {
    if (output.video && output.video.url) return 'Video chuyển cảnh và các bản phối đã sẵn sàng.';
    if (output.videoError) return 'Ảnh đã sẵn sàng; video chưa hoàn tất nhưng bạn vẫn có thể dùng các bản phối.';
    if (output.imageSource === 'catalog-fallback') {
      return 'Đang dùng ảnh mẫu đã duyệt để bạn xem trước; bạn có thể thử lại để tạo ảnh mới.';
    }
    if (output.imageSource === 'gemini-webapi-partial-fallback') {
      return 'Các bản phối đã sẵn sàng; một số ảnh đang dùng bản gốc làm dự phòng.';
    }
    if (output.copySource === 'catalog-fallback') {
      return 'Các bản phối đã sẵn sàng; phần giới thiệu dùng dữ liệu đã được duyệt.';
    }
    return 'Bản phối và các phương án so sánh đã sẵn sàng.';
  }

  function applyOutput(output) {
    var items = output.lookbook && Array.isArray(output.lookbook.items)
      ? output.lookbook.items.filter(function (item) { return item && item.url; })
      : [];
    var fingerprint = JSON.stringify({
      story: output.story || '',
      guardrail: output.guardrail || '',
      culturalScore: output.culturalScore || '',
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
    if (resultCulturalScore) {
      var score = Number(output.culturalScore);
      resultCulturalScore.textContent = Number.isFinite(score)
        ? Math.round(score) + '/100 · ' + (score >= 85 ? 'Phù hợp' : score >= 70 ? 'Nên cân chỉnh' : 'Cần xem lại')
        : 'Chưa có dữ liệu';
      resultCulturalScore.classList.toggle('is-warning', Number.isFinite(score) && score < 85);
    }
    resultGenZTip.textContent = output.genZTip || resultGenZTip.textContent;

    resultImages.innerHTML = '';
    resultImages.hidden = items.length === 0;
    currentLookbookItems = items.slice(0, 5);
    if (frame && items.length) frame.classList.toggle('has-catalog-preview', output.imageSource === 'catalog-fallback');
    experience.classList.toggle('has-generated-output', items.length > 0);
    var outputDetails = document.getElementById('outputDetails');
    if (outputDetails) outputDetails.hidden = items.length === 0;
    var advancedOptions = document.getElementById('guideAdvanced');
    if (advancedOptions) advancedOptions.hidden = items.length === 0;
    var gallery = document.getElementById('studioVariants');
    if (gallery) gallery.hidden = items.length === 0;
    if (addVariantButton) addVariantButton.hidden = items.length === 0;
    experience.querySelectorAll('[data-workspace-variants]').forEach(function (button) {
      button.disabled = items.length === 0;
      button.title = items.length ? 'Xem các ảnh đã tạo' : 'Chưa có ảnh đã tạo';
    });
    var outputAspect = output.lookbook && output.lookbook.aspectRatio || state.aspectRatio || '16:9';
    if (frame) frame.style.aspectRatio = outputAspect.replace(':', ' / ');
    if (previewImage && items[0]) {
      previewImage.alt = output.imageSource === 'catalog-fallback' ? 'Ảnh mẫu trang phục đã duyệt' : 'Ảnh bản phối của bạn';
      previewImage.onload = function () {
        frame.classList.add('has-ai-preview', 'has-look');
        if (previewEmpty) previewEmpty.classList.add('is-ready');
      };
      previewImage.src = items[0].url;
      previewImage.hidden = false;
    }
    resultVisual.style.aspectRatio = outputAspect.replace(':', ' / ');
    resultVisual.classList.toggle('is-landscape', outputAspect === '16:9');
    resultVisual.classList.toggle('has-images', items.length > 0);
    var videos = Array.isArray(output.videos) ? output.videos.filter(function (item) { return item && item.url; }) : [];
    var video = output.video && output.video.url ? output.video : (videos[0] || null);
    if (outputDetails && video) outputDetails.hidden = false;
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
          resultDownload.textContent = 'Tải ảnh ' + String.fromCharCode(8595);
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
      var branchNames = { B: 'Đổi nền', C: 'Đổi ánh sáng', D: 'Đổi trang phục', E: 'Đổi người mẫu' };
      var branch = String(item.key || ['B', 'C', 'D', 'E'][index] || String(index + 1));
      return '<button type="button" data-video-index="' + index + '"' + (index === 0 ? ' class="is-active"' : '') +
        '>' + escapeHtml(branchNames[branch] || 'Phương án ' + (index + 1)) + '</button>';
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
        resultDownload.textContent = 'Tải video chuyển cảnh ' + String.fromCharCode(8595);
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
      resultDownload.textContent = 'Tải ảnh ' + String.fromCharCode(8595);
    }
    if (saveLookButton) saveLookButton.disabled = items.length === 0;
    if (compareLooksButton) compareLooksButton.disabled = items.length < 2;
    if (variantStrip && items.length) {
      var stripLabel = document.getElementById('workspaceVariantLabel');
      if (stripLabel) stripLabel.textContent = 'Các bản phối của bạn';
      while (variantStrip.querySelectorAll('[data-variant]').length < items.length) {
        var extra = document.createElement('button');
        extra.type = 'button';
        extra.dataset.variant = String(variantStrip.children.length);
        extra.innerHTML = '<span></span><strong></strong><small></small>';
        variantStrip.appendChild(extra);
      }
      var variantButtons = variantStrip.querySelectorAll('[data-variant]');
      variantButtons.forEach(function (button, index) {
        var hasImage = Boolean(items[index]);
        button.hidden = !hasImage;
        delete button.dataset.catalogKind;
        delete button.dataset.optionValue;
        var oldImage = button.querySelector('img');
        if (oldImage) oldImage.remove();
        if (hasImage) {
          var thumbnail = document.createElement('img');
          thumbnail.src = items[index].url;
          thumbnail.alt = index === 0 ? 'Bản phối gốc' : 'Phương án ' + index;
          button.prepend(thumbnail);
        }
        button.querySelector('strong').textContent = index === 0 ? 'Bản gốc' : 'Phương án ' + index;
        button.setAttribute('aria-label', index === 0 ? 'Xem bản phối gốc' : 'Xem phương án ' + index);
        button.classList.toggle('is-ready', hasImage);
        button.classList.toggle('is-active', index === 0);
        var detail = button.querySelector('small');
        if (detail) detail.textContent = hasImage ? 'Đã có ảnh' : 'Chưa tạo';
        button.dataset.previewIndex = String(index);
      });
    }
  }

  function selectPreviewAsset(index) {
    var item = currentLookbookItems[Number(index)];
    if (!item || !previewImage) return;
    if (compareLayer) compareLayer.hidden = true;
    if (compareLooksButton) compareLooksButton.textContent = 'So sánh ảnh';
    previewImage.src = item.url;
    previewImage.hidden = false;
    frame.classList.add('has-ai-preview', 'has-look');
    if (previewEmpty) previewEmpty.classList.add('is-ready');
    Array.prototype.forEach.call(variantStrip ? variantStrip.querySelectorAll('[data-variant]') : [], function (button, buttonIndex) {
      button.classList.toggle('is-active', buttonIndex === Number(index));
    });
    setStatus('Đang xem ' + (Number(index) === 0 ? 'bản gốc' : 'phương án ' + Number(index)) + '.');
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
    var visibleStates = { queued: 'Chuẩn bị', processing: 'Đang tạo', completed: 'Đã xong', failed: 'Có lỗi' };
    resultState.textContent = visibleStates[value] || value;
    resultProgress.textContent = message;
    experience.setAttribute('aria-busy', String(value === 'queued' || value === 'processing'));
    experience.dataset.generationState = value;
    var retry = document.getElementById('retryGeneration');
    if (retry) retry.hidden = value !== 'failed';
    srStatus.textContent = message;
    studioStatus.textContent = message;
    if (previewGenerationStatus && previewGenerationMessage) {
      previewGenerationStatus.hidden = !(value === 'queued' || value === 'processing');
      previewGenerationStatus.classList.toggle('is-error', value === 'failed');
      previewGenerationMessage.textContent = message;
    }
  }

  function showResult() {
    result.hidden = false;
    document.body.style.overflow = '';
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
    if (saveLookButton) saveLookButton.disabled = true;
    if (compareLooksButton) compareLooksButton.disabled = true;
    syncSubmitButton();
    // Automatic generation must not steal keyboard focus from a choice.
  }

  function hideResult() {
    var details = document.getElementById('outputDetails');
    result.hidden = !details;
    document.body.style.overflow = '';
    if (!generationPending) experience.setAttribute('aria-busy', 'false');
    syncSubmitButton();
    if (previewGenerationStatus && !generationPending) previewGenerationStatus.hidden = true;
    if (details) {
      details.open = false;
      var detailsSummary = details.querySelector('summary');
      if (detailsSummary) detailsSummary.focus();
    }
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
    if (!catalog.auth || !catalog.auth.authenticated) {
      window.location.href = catalog.auth && catalog.auth.loginUrl
        ? catalog.auth.loginUrl
        : 'auth.php?next=studio.php';
      return;
    }
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
            garmentVariant: state.garmentVariant,
            color: state.color,
            pattern: state.pattern,
            style: state.style,
            scene: state.scene,
            accessories: state.accessories.slice(),
            accessoryVariants: state.accessoryVariants.slice()
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
    if (compareLayer) {
      if (!compareLayer.hidden) {
        compareLayer.hidden = true;
        compareLooksButton.textContent = 'So sánh ảnh';
        setStatus('Đã trở về bản xem trước.');
        return;
      }
      compareLayer.innerHTML = '';
      currentLookbookItems.slice(0, 2).forEach(function (item, index) {
        var figure = document.createElement('figure');
        var image = document.createElement('img');
        image.src = item.url; image.alt = 'Bản phối ' + (index + 1);
        var caption = document.createElement('figcaption');
        caption.textContent = index === 0 ? 'Bản gốc' : 'Phương án 1';
        figure.appendChild(image); figure.appendChild(caption); compareLayer.appendChild(figure);
      });
      compareLayer.hidden = false;
      compareLooksButton.textContent = 'Đóng so sánh';
      setStatus('Đang so sánh hai bản phối trong khung xem trước.');
      return;
    }
    showResult();
    resultImages.scrollTo({ left: resultImages.clientWidth, behavior: 'smooth' });
    setStatus('Đang so sánh hai phương án lookbook.');
  }

  if (saveLookButton) saveLookButton.addEventListener('click', saveCurrentLook);
  if (compareLooksButton) compareLooksButton.addEventListener('click', compareCurrentLooks);
  if (addVariantButton) addVariantButton.addEventListener('click', function () {
    openMode('accessory');
    setStatus('Chọn một thay đổi nhỏ để tạo thêm một bản phối.');
  });
  var retryGenerationButton = document.getElementById('retryGeneration');
  if (retryGenerationButton) retryGenerationButton.addEventListener('click', function () {
    if (autoGenerateTimer) window.clearTimeout(autoGenerateTimer);
    autoGenerateTimer = null;
    generateLook();
  });

  dockClose.addEventListener('click', function () {
    closeDock(true);
  });
  resultClose.addEventListener('click', hideResult);
  resultDownload.addEventListener('click', function (event) {
    if (resultDownload.getAttribute('aria-disabled') === 'true') {
      event.preventDefault();
      return;
    }
    if (currentVideo || currentLookbookItems.length === 0) return;
    event.preventDefault();
    var previousLabel = resultDownload.textContent;
    resultDownload.setAttribute('aria-disabled', 'true');
    resultDownload.textContent = 'Đang chuẩn bị file ảnh…';
    downloadLookbookComposite(currentLookbookItems)
      .then(function () {
        setStatus('Đã tải ảnh về máy của bạn.');
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
    if (state.openMode) closeDock(true);
    else {
      var details = document.getElementById('outputDetails');
      if (details && details.open) hideResult();
    }
  });

  buildHotspots();
  renderQuickStart();
  renderCatalogPanels();
  renderInspirationStrip();
  renderDock();
  updateSummary();
  prepareMedia();
  var pendingJob = readActiveJob();
  if (pendingJob) resumeGeneration(pendingJob);
  else if (hasContext) scheduleAutoGeneration();
})();
