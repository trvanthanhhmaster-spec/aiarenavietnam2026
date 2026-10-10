(function () {
  'use strict';

  var catalog = window.VREMIX_STUDIO || {};
  var CatalogChoices = window.VRemixCatalogChoices;
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
  var activeJobKey = 'vremix.active-generation-job.v3.' + catalog.sessionScope;
  var generationPending = false;
  var lastOutputFingerprint = '';
  var currentLookbookItems = [];
  var currentVideo = null;
  var Planner = window.VRemixPlanner;
  var planning = Planner.create();
  var faceFiles = new Map();
  var currentResultSelection = null;
  var currentRequestSelection = null;
  var requestFingerprint = '';
  var currentOutput = null;
  var currentResultJobId = null;
  var resultSaveId = null;
  var savedLookId = null;
  var saveAfterLogin = false;
  var draftEdited = false;
  var collectionReady = false, restoringCollection = false;
  var collectionBusy = false, savingLook = false;
  var collections = window.VRemixCollections.create(createRequestId, function (selection) {
    return selection ? selectedEvent(selection.event, selection.planning).label || 'Bộ sưu tập mới' : '';
  });
  function notifyHistory(selectionOnly) { experience.dispatchEvent(new CustomEvent('studio:history-change', { detail: { selectionOnly: selectionOnly === true } })); }

  function persistStudio() {
    if (!window.VRemixSession || !collectionReady || restoringCollection) return;
    var record = collections.capture({ draft: Object.assign({}, state, { planning: Planner.clone(planning) }),
      selection: currentResultSelection, output: currentOutput, jobId: currentResultJobId,
      saveId: resultSaveId, savedLookId: savedLookId, saveAfterLogin: saveAfterLogin, guideStep: experience.dataset.guideStep });
    experience.dispatchEvent(new Event('studio:collections-change'));
    return window.VRemixSession.save(record);
  }

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
  var blankState = Planner.clone(state);
  blankState.event = '';

  function applyEventPreset(eventSlug, announce) {
    var event = lookup(catalog.events, eventSlug);
    if (!event.slug) return;
    state.event = event.slug;
    var preset = event.preset && typeof event.preset === 'object' ? event.preset : {};
    // A preset is a recommendation, never an implicit garment selection.
    if (announce) setStatus('Đã chọn ' + event.label + '. Gợi ý trang phục sẽ hiện ở bước cuối.');
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
        selectionChanged();
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
    var confirm = document.getElementById('plannerGenerate');
    if (confirm) {
      confirm.disabled = generationPending || Planner.missing(planning, state.event) !== 'review';
      confirm.textContent = generationPending ? 'Đang tạo ảnh…' : 'Tạo ảnh bản phối';
    }
  }

  function restoreSelection(selection) {
    if (!selection) return;
    var restored = Object.assign({}, selection);
    planning = Planner.restore(selection);
    planning.people.forEach(function (person) {
      person.faceSupplied = false;
      if (!lookup(catalog.garments, person.outfit.garment).slug) { person.outfit.garment = ''; person.outfit.garmentVariant = ''; }
      ['color', 'pattern', 'style', 'scene'].forEach(function (kind) {
        var table = { color: 'colors', pattern: 'patterns', style: 'styles', scene: 'scenes' }[kind];
        if (!lookup(catalog[table], person.outfit[kind]).slug) person.outfit[kind] = '';
      });
      person.outfit.accessories = person.outfit.accessories.filter(function (slug) { return Boolean(lookup(catalog.accessories, slug).slug); });
      Object.assign(state, person.outfit);
      syncVariantSelections();
      person.outfit = Planner.outfit(state);
      person.customized = person.id > 1 && JSON.stringify(person.outfit) !== JSON.stringify(planning.people[0].outfit);
    });
    Object.assign(state, Planner.outfit({}));
    Planner.load(planning, state);
    // Top-level fields describe Person 1; the controls must describe the active
    // person. Never overwrite Person 2's outfit with those summary fields.
    var activePerson = planning.people[planning.activePerson - 1];
    selection = Object.assign(restored, activePerson ? activePerson.outfit : Planner.outfit({}), { planning: planning });
    state.event = '';
    if (selectedEvent(selection.event, selection.planning).slug) state.event = selection.event;
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
    renderCatalogPanels();
    updateSummary();
  }

  function prepareResultCopy() {
    var garment = lookup(catalog.garments, state.garment);
    var occasion = selectedEvent(state.event);
    resultTitle.textContent = planning.count ? 'Bản phối cho ' + planning.count + ' người' : garment.name
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

  function selectedEvent(slug, plan) {
    var custom = (plan || planning).customOccasion;
    if (slug === 'custom' && custom) return { slug: 'custom', label: custom, description: 'Dịp tự nhập của người dùng; chưa được biên tập duyệt.', cultural_context: 'Dịp tự nhập, không phải kiến thức văn hóa đã xác minh.', preset: {} };
    return lookup(catalog.events, slug);
  }

  function variantsForGarment() {
    return CatalogChoices.samples(catalog, state.garment);
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
      dockContent.innerHTML = '<button type="button" class="studio-reference-reset" data-option-kind="color" data-option-value="">Theo mẫu áo</button>' + optionList(CatalogChoices.colors(catalog, state.garment, state.color), 'color', state.color, false, true);
    } else if (modeId === 'pattern') {
      dockContent.innerHTML = '<p class="studio-catalog-card__note">Họa tiết đi cùng mẫu của đúng loại áo, không dùng chung một danh sách cho mọi trang phục.</p>' + garmentSampleCards();
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
      var name = (item.label || item.name || slug) + (item.legacyOverride ? ' · biến tấu đang giữ' : '');
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
    // These place photographs and their licenses ship with the catalog. Do
    // not apply the old generic textile illustrations to garment patterns.
    if (!value && (catalog.scenes || []).indexOf(item) !== -1) return CatalogChoices.sceneImage(item.slug);
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
      var name = (item.label || item.name || slug) + (item.legacyOverride ? ' · biến tấu đang giữ' : '');
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
      { kind: 'event', items: (catalog.events || []).filter(function (item) {
        var search = document.getElementById('occasionSearch');
        var query = search ? search.value.trim().toLocaleLowerCase('vi') : '';
        var normalize = function (s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd'); };
        return normalize((item.label + ' ' + (item.description || '')).toLocaleLowerCase('vi')).includes(normalize(query));
      }), selected: state.event, multiple: false, limit: 100 },
      { kind: 'garment', items: catalog.garments, selected: state.garment, multiple: false, limit: 4 },
      { kind: 'color', items: CatalogChoices.colors(catalog, state.garment, state.color), selected: state.color, multiple: false, limit: 100 },
      { kind: 'accessory', items: catalog.accessories, selected: state.accessories, multiple: true, limit: 5 },
      { kind: 'style', items: catalog.styles, selected: state.style, multiple: false, limit: 4 },
      { kind: 'scene', items: catalog.scenes, selected: state.scene, multiple: false, limit: 5 }
    ];
    definitions.forEach(function (definition) {
      var panel = catalogPanels[definition.kind];
      if (!panel) return;
      panel.innerHTML = definition.kind === 'event' && definition.items.length === 0 ? '' : compactCatalogList(
        definition.items,
        definition.kind,
        definition.selected,
        definition.multiple,
        definition.limit
      );
      bindCatalogImageFallback(panel);
      if (definition.kind === 'event') {
        var term = document.getElementById('occasionSearch').value.trim();
        document.getElementById('occasionNoResults').hidden = definition.items.length > 0 || term.length < 2;
        document.getElementById('useSearchOccasion').textContent = 'Dùng dịp “' + term.slice(0, 120) + '”';
      }
      if (definition.kind === 'garment') {
        var preset = lookup(catalog.events, state.event).preset || {};
        panel.querySelectorAll('[data-catalog-kind]').forEach(function (button) {
          if (button.dataset.optionValue === preset.garment) {
            var badge = document.createElement('small'); badge.className = 'planner-recommended'; badge.textContent = 'Gợi ý'; button.appendChild(badge);
          }
        });
      }
    });
    var legacyPatternSection = document.getElementById('legacyPatternSection');
    if (legacyPatternSection) legacyPatternSection.hidden = !state.pattern;
    if (catalogPanels.pattern) catalogPanels.pattern.textContent = state.pattern
      ? (lookup(catalog.patterns, state.pattern).label || state.pattern) + ' · Lựa chọn từ bản phối trước, không phải mẫu thực tế đã xác minh của loại áo này.' : '';
    var sampleColor = document.getElementById('useSampleColor');
    if (sampleColor) sampleColor.setAttribute('aria-pressed', String(!state.color));
    var sceneSummary = document.getElementById('catalogSceneSummary');
    if (sceneSummary) sceneSummary.textContent = lookup(catalog.scenes, state.scene).label || 'Theo dịp mặc';
    var occasionScene = document.getElementById('useOccasionScene');
    if (occasionScene) occasionScene.setAttribute('aria-pressed', String(!state.scene));
    renderVariantPanels();
  }

  function variantCards(items, kind, selected) {
    return items.map(function (item) {
      var imageUrl = catalogImageUrl(item);
      var meta = [item.material, item.pattern_notes].filter(Boolean).join(' · ');
      var palette = (Array.isArray(item.color_palette) ? item.color_palette : []).map(function (slug) { return lookup(catalog.colors, slug).label; }).filter(Boolean).join(' · ');
      var source = CatalogChoices.sourceUrl(item.source_url);
      return '<div class="studio-reference-sample"><button type="button" class="studio-variant-card' +
        (selected.indexOf(item.slug) !== -1 ? ' is-selected' : '') +
        '" data-catalog-kind="' + escapeHtml(kind) + '" data-option-value="' + escapeHtml(item.slug) +
        '" aria-pressed="' + String(selected.indexOf(item.slug) !== -1) + '">' +
        '<span class="studio-variant-card__media' + (imageUrl ? ' has-image' : '') + '">' +
        (imageUrl ? '<img src="' + escapeHtml(imageUrl) + '" alt="Mẫu ' + escapeHtml(item.name) + '" loading="lazy">' : '') +
        '</span><span class="studio-variant-card__copy"><strong>' + escapeHtml(item.name) + '</strong>' +
        (meta ? '<small>' + escapeHtml(meta) + '</small>' : '') +
        (palette ? '<small>Màu gợi ý: ' + escapeHtml(palette) + '</small>' : '') +
        '<small class="studio-variant-card__source">' + escapeHtml(item.source_provider === 'wikimedia' ? 'Nguồn Wikimedia · mẫu đã duyệt' : 'Mẫu biên tập') +
        '</small></span></button>' + (source ? '<a class="studio-reference-source" href="' + escapeHtml(source) + '" target="_blank" rel="noopener noreferrer">Xem nguồn ảnh ↗</a>' : '') + '</div>';
    }).join('');
  }

  function garmentSampleCards() {
    var items = variantsForGarment();
    return items.length ? variantCards(items, 'garmentVariant', [state.garmentVariant])
      : '<p class="studio-catalog-empty">Chưa có mẫu màu và họa tiết được duyệt cho loại áo này. Vẫn có thể phối theo dáng áo; không tự thêm mẫu không rõ nguồn.</p>';
  }

  function renderVariantPanels() {
    var garmentVariants = variantsForGarment();
    if (garmentVariantSection && garmentVariantGrid) {
      garmentVariantSection.hidden = experience.dataset.guideStep !== 'garment' || !state.garment;
      garmentVariantGrid.innerHTML = garmentSampleCards();
      var sampleTitle = document.getElementById('catalogGarmentVariantTitle');
      if (sampleTitle) sampleTitle.textContent = 'Mẫu ' + (lookup(catalog.garments, state.garment).name || 'màu và họa tiết');
      var research = document.getElementById('catalogGarmentResearch');
      if (research) {
        research.hidden = !(catalog.auth && catalog.auth.isAdmin);
        research.href = 'catalog-search.php?type=garment&q=' + encodeURIComponent(lookup(catalog.garments, state.garment).name || '') + '&parent=' + encodeURIComponent(lookup(catalog.garments, state.garment).id || '');
      }
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
    if (generationPending) { setStatus('Đang tạo ảnh theo thông tin đã xác nhận. Bạn có thể sửa khi ảnh hoàn tất.'); return; }
    if (kind !== 'event' && (!planning.count || !planning.period)) return;
    if (kind === 'garmentVariant') {
      if (!CatalogChoices.selectSample(state, catalog, value)) return;
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
      if (kind === 'garment' && state.garment !== value) {
        state.color = '';
        state.pattern = '';
      }
      state[kind] = value;
      if (kind === 'event') {
        planning.customOccasion = '';
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
    if (kind !== 'event') Planner.capture(planning, state);
    if (kind === 'scene') planning.people.forEach(function (p) { p.outfit.scene = value; });
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
    selectionChanged();
  }

  function updateSummary(changedKind) {
    var event = selectedEvent(state.event);
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
    var nextStep = { event: 'Chọn dịp bạn sẽ mặc.', people: 'Chọn số người.', time: 'Chọn thời gian hoặc chưa xác định.', garment: 'Chọn trang phục cho từng người.', review: 'Kiểm tra rồi bấm Tạo ảnh bản phối.' }[Planner.missing(planning, state.event)];
    var next = Planner.missing(planning, state.event);
    var previewTitle = document.getElementById('plannerPreviewTitle');
    if (previewTitle) previewTitle.textContent = { event: 'Bắt đầu từ dịp bạn sẽ mặc.', people: 'Một mình hay cùng cả nhóm?', time: 'Lên lịch cho bản phối.', garment: 'Chọn bộ bạn thích cho từng người.', review: 'Sẵn sàng tạo bản phối của bạn.' }[next];
    var previewHint = document.getElementById('plannerPreviewHint');
    if (previewHint) previewHint.textContent = nextStep + ' Ảnh chỉ tạo sau khi bạn xác nhận.';
    var previewAction = document.getElementById('plannerPreviewAction');
    if (previewAction) previewAction.textContent = { event: 'Chọn dịp mặc', people: 'Chọn số người', time: 'Chọn thời gian', garment: 'Chọn trang phục', review: 'Kiểm tra bản phối' }[next];
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
    var hasBaseLook = Boolean(currentLookbookItems.length);
    if (previewEmpty) previewEmpty.classList.toggle('is-ready', hasBaseLook);
    if (frame) frame.classList.toggle('has-look', hasBaseLook);
    if (projectKicker) projectKicker.textContent = state.event ? ('Bản phối · ' + event.label) : 'Bản phối mới';
    if (projectTitle) projectTitle.textContent = state.event
      ? 'Một bản phối để ' + event.label.toLowerCase() + '.'
      : 'Việt phục, theo cách bạn.';
    if (projectContext) {
      projectContext.textContent = state.event
        ? [planning.count ? planning.count + ' người' : '', planning.period ? Planner.periodLabel(planning.period) : '', planning.count > 1 ? (planning.shared ? 'Phối đồng điệu' : 'Mỗi người một bộ') : garment.name].filter(Boolean).join(' · ')
        : 'Chuẩn bị bản phối qua bốn bước. Ảnh chỉ tạo khi bạn xác nhận.';
    }
    updatePassport();
    updateRecommendations();
    updateProgress(changedKind);
  }

  function updateProgress(changedKind) {
    var next = Planner.missing(planning, state.event);
    var choices = { event: state.event, people: planning.count, time: planning.period,
      garment: planning.count && planning.people.every(function (p) { return p.outfit.garment; }) };
    Array.prototype.forEach.call(progressSteps, function (step) {
      var key = step.dataset.progressStep;
      step.classList.toggle('is-done', Boolean(choices[key]));
    });
    if (nextHint) nextHint.textContent = { event: 'Chọn dịp mặc để bắt đầu.', people: 'Tiếp theo: chọn số người.', time: 'Tiếp theo: chọn thời gian.', garment: 'Chọn trang phục cho mọi người.', review: 'Đã đủ thông tin. Kiểm tra trước khi tạo ảnh.' }[next];
    var guide = {
      next: next,
      ready: next === 'review',
      changed: changedKind || '',
      choices: choices,
      labels: {
        event: (selectedEvent(state.event).label || '') + (state.event === 'custom' ? ' · dịp tự nhập' : ''),
        people: planning.count ? planning.count + ' người' : '',
        time: Planner.periodLabel(planning.period),
        garment: lookup(catalog.garmentVariants, state.garmentVariant).name || lookup(catalog.garments, state.garment).name || '',
        style: lookup(catalog.styles, state.style).label || ''
      },
      planning: Planner.clone(planning),
      variantCount: variantsForGarment().length
    };
    if (planning.count > 1) guide.labels.garment = planning.people.filter(function (p) { return p.outfit.garment; }).length + '/' + planning.count + ' người đã chọn';
    experience.studioGuide = guide;
    experience.dispatchEvent(new CustomEvent('studio:selection', { detail: guide }));
  }

  function updatePassport() {
    var heritage = (catalog.intelligence || {}).heritage && catalog.intelligence.heritage[state.garment];
    var garment = lookup(catalog.garments, state.garment);
    var garmentVariant = lookup(catalog.garmentVariants, state.garmentVariant);
    var event = selectedEvent(state.event);
    var color = lookup(catalog.colors, state.color);
    var style = lookup(catalog.styles, state.style);
    var scene = lookup(catalog.scenes, state.scene);
    if (passportTitle) passportTitle.textContent = garmentVariant.name || garment.name || 'Chưa chọn Việt phục';
    if (passportOrigin) passportOrigin.textContent = heritage ? heritage.origin : garment.origin_note || 'Chọn một trang phục để xem nội dung đã được duyệt.';
    if (passportFeature) passportFeature.textContent = [
      garmentVariant.description || garment.description,
      garmentVariant.material ? 'Chất liệu: ' + garmentVariant.material : '',
      garmentVariant.pattern_notes ? 'Họa tiết: ' + garmentVariant.pattern_notes : ''
    ].filter(Boolean).join(' · ') || '—';
    if (passportMeaning) passportMeaning.textContent = heritage ? heritage.meaning : garment.significance_note || '—';
    var source = (catalog.sources || []).find(function (item) { return item.id === garment.source_id; });
    if (passportSource) {
      passportSource.textContent = source ? source.title : 'Nguồn đã được duyệt sẽ hiển thị tại đây.';
      var sourceUrl = source && safeExternalUrl(source.source_url || source.url, '');
      if (sourceUrl) {
        var sourceLink = document.createElement('a');
        sourceLink.href = sourceUrl; sourceLink.target = '_blank'; sourceLink.rel = 'noopener noreferrer';
        sourceLink.textContent = source.title + ' ↗';
        passportSource.replaceChildren(sourceLink);
      }
      var sourceNote = document.createElement('small');
      sourceNote.textContent = source && /commons\.wikimedia\.org\/wiki\/File:/i.test(source.source_url || '')
        ? 'Tư liệu hình ảnh: dùng đối chiếu dáng áo, không đủ để chứng minh nhận định lịch sử.'
        : 'Nguồn tham khảo cần được đối chiếu theo từng nhận định; không phải chứng nhận phục dựng.';
      passportSource.appendChild(sourceNote);
      if (heritage) {
        passportSource.replaceChildren();
        heritage.sources.forEach(function (item) {
          var link = document.createElement('a'); link.href = safeExternalUrl(item.url, ''); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = item.title + ' ↗';
          var note = document.createElement('small'); note.textContent = item.publisher + ' · ' + item.scope + ' · Đối chiếu ' + item.checkedAt;
          passportSource.append(link, note);
        });
      }
    }
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
    if (tipLocation) tipLocation.textContent = scene.label || 'Chọn bối cảnh để xem gợi ý nơi chụp.';
    if (tipStyling) tipStyling.textContent = [color.label, style.label].filter(Boolean).join(' + ') || 'Chọn một điểm nhấn hiện đại vừa đủ.';
    var colorCheck = document.querySelector('[data-check="color"]');
    var eventCheck = document.querySelector('[data-check="event"]');
    var accessoryCheck = document.querySelector('[data-check="accessory"]');
    if (colorCheck) {
      colorCheck.textContent = color.label ? '○ Đã chọn ' + color.label + ' · xem độ hài hòa trên ảnh.' : '○ Chưa chọn màu';
      colorCheck.classList.toggle('is-ok', false);
    }
    if (eventCheck) {
      eventCheck.textContent = event.label ? '○ Dịp ' + event.label.toLowerCase() + ' · đối chiếu lưu ý trang phục bên dưới.' : '○ Chưa chọn dịp mặc';
      eventCheck.classList.toggle('is-ok', false);
    }
    if (accessoryCheck) {
      accessoryCheck.textContent = state.accessories.length ? '○ Kiểm tra phụ kiện không che cấu trúc áo trên ảnh.' : '○ Chưa thêm phụ kiện';
      accessoryCheck.classList.toggle('is-ok', false);
    }
    var rules = (catalog.rules || []).filter(function (item) {
      return (!item.garment_id || item.garment_id === garment.id) && (!item.context || item.context === 'all' || item.context === state.event);
    });
    if (culturalWarning) culturalWarning.textContent = rules.length ? rules.map(function (item) { return item.rule_text; }).join(' ') + ' Đây là lưu ý tham khảo, không phải xác nhận ảnh đã phù hợp.' : 'Chưa có lưu ý riêng cho lựa chọn này; cần đối chiếu nguồn văn hóa.';
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
    var region = (lookup(catalog.events, state.event).preset || {}).location || '';
    var locationQuery = [lookup(catalog.scenes, state.scene).label, selectedEvent(state.event).label, region].filter(Boolean).join(' ');
    if (listingSearchLink) {
      var listingQuery = [garment.name].concat(selectedAccessories.map(function (item) { return item.name; })).filter(Boolean).join(' ');
      listingSearchLink.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('mua thuê ' + (listingQuery || 'cổ phục') + ' ' + region);
      listingSearchLink.title = 'Tìm kiếm bên ngoài; kết quả chưa được V-Remix xác minh';
    }
    var suitableContexts = [state.scene, state.event].filter(Boolean);
    var locations = (catalog.locations || []).filter(function (item) {
      var contexts = Array.isArray(item.suitable_contexts) ? item.suitable_contexts : [];
      return contexts.length === 0 || suitableContexts.some(function (context) { return contexts.indexOf(context) !== -1; });
    }).slice(0, 3);
    if (!locations.length) {
      locationsPanel.innerHTML = '<p class="studio-recommendation-empty">Chưa có địa điểm được biên tập cho lựa chọn này.</p>';
    } else {
      locationsPanel.innerHTML = locations.map(function (item) {
        return '<a class="studio-recommendation" href="' + escapeHtml(safeExternalUrl(item.map_url, '#')) + '" target="_blank" rel="noopener noreferrer">' +
          '<span><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml([item.address, item.province].filter(Boolean).join(' · ')) + '</small></span><span aria-hidden="true">↗</span></a>';
      }).join('');
    }
    if (locationSearchLink) {
      locationSearchLink.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(locationQuery || 'địa điểm chụp ảnh Việt phục');
      locationSearchLink.title = 'Tìm kiếm bên ngoài; kết quả chưa được V-Remix xác minh';
    }
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
    studioStatus.hidden = !message || /^(Chọn |Bắt đầu |Đã cập nhật |Đã chọn |Đã đóng |Đang tinh chỉnh |Đã mở phiên bản|Đang xem bản phối|Đã khôi phục lựa chọn|Đã khôi phục bản phối)/.test(message);
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
    var poster = document.getElementById('studioIdlePoster');
    if (poster) {
      var showPoster = function () { frame.classList.add('is-ready'); };
      poster.addEventListener('load', showPoster, { once: true });
      poster.addEventListener('error', function () {
        poster.hidden = true;
        frame.classList.remove('has-idle-poster');
      }, { once: true });
      if (poster.complete && poster.naturalWidth > 0) showPoster();
    }
    if (!catalog.baseMedia) {
      return;
    }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var reveal = function () {
      frame.classList.add('is-ready');
      frame.classList.add('is-video-ready');
      if (!generationPending && !state.event) setStatus('Chọn một dịp mặc để bắt đầu.');
    };
    media.addEventListener('loadeddata', reveal, { once: true });
    media.addEventListener('canplay', reveal, { once: true });
    media.addEventListener('error', function () {
      frame.classList.remove('is-video-ready');
      media.hidden = true;
    }, { once: true });
    media.muted = true;
    media.loop = true;
    if (catalog.basePoster) media.poster = catalog.basePoster;
    media.src = catalog.baseMedia;
    var playback = media.play();
    if (playback && typeof playback.catch === 'function') playback.catch(function () {});
  }

  imageInput.addEventListener('change', function () {
    var file = imageInput.files && imageInput.files[0];
    if (!file) {
      uploadName.textContent = 'Tuỳ chọn';
      setStatus('Đã bỏ ảnh của bạn. Bạn vẫn có thể phối đồ không cần ảnh.');
      selectionChanged();
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
    selectionChanged();
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
      planning: planning,
      image: imageInput.files && imageInput.files[0] ? imageInput.files[0].name + ':' + imageInput.files[0].size : ''
    });
  }

  function samePlan(selection) {
    function plan(value) { var copy = Planner.clone(value || {}); delete copy.activePerson; return copy; }
    function stable(value) {
      if (Array.isArray(value)) return value.map(stable);
      if (value && typeof value === 'object') { var result = {}; Object.keys(value).sort().forEach(function (key) { result[key] = stable(value[key]); }); return result; }
      return value;
    }
    return selection.event === state.event && JSON.stringify(stable(plan(selection.planning))) === JSON.stringify(stable(plan(planning)));
  }
  function selectionChanged() {
    // Editing is never permission to consume a provider generation.
    draftEdited = !currentResultSelection || !samePlan(currentResultSelection);
    if (currentLookbookItems.length) setStatus(draftEdited ? 'Lựa chọn đã đổi. Ảnh đang hiện là bản tạo trước; kiểm tra rồi tạo ảnh mới khi bạn muốn.' : '');
    syncSubmitButton();
    persistStudio();
  }

  async function generateLook(options) {
    options = options || {};
    if (generationPending || collectionBusy || savingLook) return;
    if (['conflict','error','auth'].includes(window.VRemixSession.status().state)) { setStatus('Giải quyết lỗi lưu bộ sưu tập trước khi tạo ảnh.'); return; }
    var unresolvedJob = readActiveJob();
    if (unresolvedJob) {
      setStatus('Đang kiểm tra yêu cầu trước để tránh tạo ảnh trùng.');
      return resumeGeneration(unresolvedJob);
    }
    if ((!options.repair && !options.portrait && experience.dataset.guideStep !== 'review') || Planner.missing(planning, state.event) !== 'review') {
      setStatus('Hoàn tất bốn bước và kiểm tra thông tin trước khi tạo ảnh.');
      return;
    }
    try { await persistStudio(); await window.VRemixSession.retry(); }
    catch (e) { setStatus(e.message); return; }
    if (generationPending || collectionBusy) return;
    requestFingerprint = selectionFingerprint();
    if (compareLayer) { compareLayer.hidden = true; compareLayer.classList.remove('is-expanded'); }
    if (compareLooksButton) compareLooksButton.textContent = 'So sánh ảnh';
    showResult();
    setResultState('queued', 'Đang xếp hàng bản phối.');
    prepareResultCopy();

    var requestId = createRequestId();
    var activeJob = {
      collectionId: collections.active(),
      requestId: requestId,
      jobId: null,
      startedAt: Date.now(),
      selection: {
        planning: Planner.clone(planning),
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
    currentRequestSelection = Planner.clone(activeJob.selection);
    currentRequestSelection.generationType = 'image';
    generationPending = true;
    syncSubmitButton();
    var payload = {
      collectionId: collections.active(),
      planning: Planner.clone(planning),
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
      generationType: 'image',
      aspectRatio: state.aspectRatio,
      targetResolution: state.resolution,
      generationMode: state.mode
    };

    if (options.repair === true) {
      payload.repairRequested = true; payload.aspectRatio = currentResultSelection.aspectRatio || '16:9';
      currentRequestSelection.aspectRatio = payload.aspectRatio;
    }
    if (options.portrait === true) {
      payload.portraitRequested = true; payload.aspectRatio = '9:16';
      currentRequestSelection.aspectRatio = '9:16';
    }
    // Representative catalog fields always belong to Person 1, not the last tab.
    var primary = payload.planning.people[0].outfit;
    Object.assign(payload, { garmentSlug: primary.garment, garmentVariantSlug: primary.garmentVariant,
      accessorySlugs: primary.accessories, accessoryVariantSlugs: primary.accessoryVariants,
      colorSlug: primary.color, patternSlug: primary.pattern, styleSlug: primary.style, sceneSlug: primary.scene });
    Object.assign(currentRequestSelection, Planner.clone(primary));
    activeJob.selection = Planner.clone(currentRequestSelection);
    payload.weather = ''; payload.season = '';
    payload.adviceContextId = experience.adviceContextId ? experience.adviceContextId() : '';
    // Resolve the selected previous image on the server; never send an arbitrary image URL.
    if (savedLookId) payload.referenceLookId = savedLookId;
    else if (currentResultJobId) payload.referenceJobId = currentResultJobId;
    var terminalFailure = false;
    try {
      payload.inputImage = await buildFaceReferences(payload.planning);
      payload.generationMode = payload.inputImage ? 'image-to-image' : 'text-to-image';
      currentRequestSelection.generationMode = payload.generationMode;
      activeJob.selection = Planner.clone(currentRequestSelection);

      if (!catalog.generationEndpoint) {
        terminalFailure = true;
        throw new Error('Dịch vụ tạo ảnh chưa sẵn sàng.');
      }

      saveActiveJob(activeJob);

      setResultState('processing', 'Đang tạo bản phối và kiểm tra độ phù hợp văn hóa…');
      var response = await fetch(catalog.generationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-VRemix-CSRF': catalog.lookCsrf || '' },
        body: JSON.stringify(payload)
      });
      var body = await response.json();
      if (!response.ok) {
        terminalFailure = body.status === 'failed' || response.status >= 400 && response.status < 500;
        throw new Error(body.error || 'Generation failed.');
      }
      if (body.jobId) {
        activeJob.jobId = body.jobId;
        saveActiveJob(activeJob);
      }
      var completed = body.status === 'completed' ? body : await pollJob(activeJob);
      if (completed.status !== 'completed') {
        terminalFailure = true;
        throw new Error(completed.error || 'Generation job did not complete.');
      }
      terminalFailure = true; // A finished request with no image cannot be resumed.
      requireImageOutput(completed.output);
      currentResultSelection = Planner.clone(currentRequestSelection);
      applyOutput(completed.output || {});
      clearActiveJob();
      generationPending = false;
      syncSubmitButton();
      setResultState('completed', resultMessage(completed.output || {}));
      currentResultJobId = completed.jobId || activeJob.jobId;
      resultSaveId = createRequestId(); savedLookId = null;
      draftEdited = requestFingerprint !== selectionFingerprint();
      saveLookButton.textContent = 'Lưu bản phối';
      persistStudio();
      notifyHistory();
    } catch (error) {
      if (terminalFailure) clearActiveJob();
      generationPending = false;
      syncSubmitButton();
      if (currentLookbookItems.length) {
        saveLookButton.disabled = Boolean(savedLookId);
        resultDownload.hidden = false;
      }
      var message = humanizeGenerationError(error && error.message
        ? error.message
        : 'Không thể hoàn thành bản phối.');
      setResultState('failed', message + ' Lựa chọn của bạn vẫn được giữ. Bấm “Thử tạo lại” khi muốn tiếp tục.');
    }
  }

  async function resumeGeneration(activeJob) {
    if (activeJob.collectionId && activeJob.collectionId !== collections.active()) {
      var ownerCollection = collections.get(activeJob.collectionId);
      if (ownerCollection && !ownerCollection.deleted) {
        collections.select(activeJob.collectionId);
        if (ownerCollection.record.draft) { restoreSelection(ownerCollection.record.draft); updateSummary('restore'); }
      } else {
        clearActiveJob();
        setStatus('Bộ của yêu cầu trước không còn mở được. Yêu cầu không được tự tạo lại.'); return;
      }
    }
    if (generationPending) {
      showResult();
      return;
    }
    // Recover the result snapshot without overwriting edits made since submission.
    currentRequestSelection = Planner.clone(activeJob.selection);
    requestFingerprint = selectionFingerprint();
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
      clearActiveJob();
      requireImageOutput(completed.output);
      currentResultSelection = Planner.clone(currentRequestSelection);
      applyOutput(completed.output || {});
      currentResultJobId = completed.jobId || activeJob.jobId;
      resultSaveId = createRequestId(); savedLookId = null; persistStudio();
      draftEdited = !samePlan(currentResultSelection);
      notifyHistory();
      saveLookButton.textContent = 'Lưu bản phối';
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
    if (/CATALOG_REFERENCE_UNAVAILABLE/.test(text)) {
      return 'Ảnh mẫu trang phục chưa tải được. Chưa gọi AI tạo ảnh; hãy chọn mẫu khác hoặc báo quản trị viên kiểm tra ảnh mẫu.';
    }
    if (/PROVIDER_SESSION_EXPIRED|(?:Gemini|bridge).*session.*(?:expired|unauthenticated)/i.test(text)) {
      return 'Dịch vụ tạo ảnh cần được quản trị viên kết nối lại. Báo quản trị viên để khôi phục, sau đó thử lại.';
    }
    if (/PROVIDER_TIMEOUT/i.test(text)) {
      return 'Dịch vụ chưa trả ảnh trong thời gian chờ. Bạn có thể chủ động thử lại; hệ thống không tự tạo thêm ảnh.';
    }
    if (/PROVIDER_NO_IMAGE/i.test(text)) {
      return 'Dịch vụ chưa trả về ảnh cho lựa chọn này. Bạn có thể điều chỉnh lựa chọn rồi thử lại.';
    }
    if (/PROVIDER_BUSY/i.test(text)) {
      return 'Dịch vụ đang xử lý một bản phối khác. Hãy chờ ít phút rồi thử lại.';
    }
    if (/PROVIDER_UNAVAILABLE/i.test(text)) {
      return 'Dịch vụ tạo ảnh đang mất kết nối. Hãy thử lại sau; nếu vẫn lỗi, báo quản trị viên kiểm tra kết nối.';
    }
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
        headers: { Accept: 'application/json', 'X-VRemix-CSRF': catalog.lookCsrf || '' }
      });
      var body = await response.json();
      if (!response.ok) {
        if (response.status === 404 && !activeJob.jobId && attempt < 10) continue;
        if (response.status === 404 && activeJob.jobId) clearActiveJob();
        throw new Error(body.error || 'Unable to read generation job.');
      }
      if (body.jobId && !activeJob.jobId) {
        activeJob.jobId = body.jobId;
        saveActiveJob(activeJob);
      }
      // The caller binds the finished output to its submit snapshot before rendering.
      if (body.status === 'completed' || body.status === 'failed' || body.status === 'cancelled') return body;
      setResultState('processing', body.output && body.output.lookbook && body.output.lookbook.items && body.output.lookbook.items.length
        ? 'Ảnh đã sẵn sàng; video đang được hoàn thiện.'
        : 'Đang tạo ảnh bản phối theo thông tin đã xác nhận…');
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
    if (output.imageAssessment && output.imageAssessment.status === 'mismatch') {
      return 'AI nhận thấy chi tiết chưa khớp lựa chọn. Xem thông tin bản phối hoặc bấm “Sửa chi tiết chưa khớp” để tạo phiên bản sửa.';
    }
    if (output.copySource === 'catalog-fallback') {
      return output.reviewStatus === 'provider-forbidden' || output.reviewStatus === 'provider-session-expired'
        ? 'Ảnh đã sẵn sàng nhưng dịch vụ đánh giá cần quản trị viên kiểm tra quyền truy cập. Chưa có điểm văn hóa hoặc kết luận ảnh khớp.'
        : 'Ảnh đã sẵn sàng; phần giới thiệu dùng lựa chọn và dữ liệu catalog. Chưa xác minh ảnh khớp mọi chi tiết.';
    }
    return 'Ảnh bản phối đã sẵn sàng. Bạn có thể lưu, tải hoặc sửa lựa chọn để tạo ảnh khác.';
  }

  function resultChoiceRows(snapshot) {
    if (!snapshot) return [];
    var plan = Planner.restore(snapshot), period = plan.period;
    var time = period && (period.kind === 'unspecified' || typeof period.start === 'string' && typeof period.end === 'string') ? Planner.periodLabel(period) : 'Chưa xác định';
    var rows = [['Dịp mặc', selectedEvent(snapshot.event, plan).label], ['Số người', plan.count ? plan.count + ' người' : ''], ['Thời gian', time]];
    (plan.people || []).forEach(function (person, index) {
      var o = person.outfit || {};
      var parts = [lookup(catalog.garmentVariants || [], o.garmentVariant).name || lookup(catalog.garments || [], o.garment).name];
      Object.keys({ color:'colors', pattern:'patterns', style:'styles', scene:'scenes' }).forEach(function (kind) {
        var collection = { color:'colors', pattern:'patterns', style:'styles', scene:'scenes' }[kind];
        var option = lookup(catalog[collection] || [], o[kind]);
        if (o[kind]) parts.push({color:'Màu',pattern:'Họa tiết',style:'Phong cách',scene:'Bối cảnh'}[kind] + ': ' + (option.label || 'Lựa chọn cũ không còn trong catalog'));
      });
      var variants = (catalog.accessoryVariants || []).filter(function (item) { return (o.accessoryVariants || []).includes(item.slug); });
      var names = (o.accessories || []).map(function (slug) {
        var parent = lookup(catalog.accessories || [], slug);
        var chosen = variants.filter(function (item) { return item.accessory_id === parent.id; });
        return chosen.length ? chosen.map(function (item) { return item.name; }).join(', ') : parent.name || 'Phụ kiện cũ không còn trong catalog';
      });
      parts.push('Phụ kiện: ' + (names.length ? names.join(', ') : 'Không thêm'));
      rows.push(['Người ' + (index + 1), parts.filter(Boolean).join(' · ')]);
    });
    return rows;
  }

  function safeCatalogCopy(output, snapshot) {
    if (output.copySource !== 'catalog-fallback' || !snapshot) return output;
    // Old stored fallbacks may list the entire catalog. Rebuild on display, not in the database.
    var safe = Planner.clone(output), plan = Planner.restore(snapshot);
    var garments = (plan.people || []).map(function (person) { return lookup(catalog.garments || [], person.outfit.garment); });
    var origins = Array.from(new Set(garments.map(function (g) { return g.origin_note; }).filter(Boolean)));
    var guidance = Array.from(new Set(garments.map(function (g) { return g.significance_note; }).filter(Boolean)));
    safe.story = resultChoiceRows(snapshot).map(function (row) { return row[0] + ': ' + row[1]; }).join('. ') + '. ' + origins.join(' ');
    safe.guardrail = guidance.join(' ') + ' Lưu ý từ catalog, chưa phải kết luận ảnh đạt chuẩn văn hóa.';
    safe.genZTip = 'Muốn thử cách phối khác, hãy chọn rõ màu, phong cách hoặc phụ kiện trước khi tạo lại. Gợi ý không tự thay đổi lựa chọn của bạn.';
    safe.culturalScore = null; safe.culturalScoreSource = 'not-assessed';
    return safe;
  }

  function requireImageOutput(output) {
    var items = output && output.lookbook && output.lookbook.items;
    if (!Array.isArray(items) || !items.some(function (item) { return item && typeof item.url === 'string' && item.url.trim(); })) {
      throw new Error('Dịch vụ chưa trả ảnh bản phối. Ảnh trước vẫn được giữ; bạn có thể thử lại.');
    }
  }

  function applyOutput(output) {
    output = safeCatalogCopy(output, currentResultSelection);
    var items = output.lookbook && Array.isArray(output.lookbook.items)
      ? output.lookbook.items.filter(function (item) { return item && item.url; })
      : [];
    if (!items.length && currentLookbookItems.length) return;
    var fingerprint = JSON.stringify({
      story: output.story || '',
      guardrail: output.guardrail || '',
      culturalScore: output.culturalScore == null ? '' : output.culturalScore,
      culturalScoreSource: output.culturalScoreSource || '',
      copySource: output.copySource || '',
      imageAssessment: output.imageAssessment || null,
      dimensions: items.map(function (item) { return [item.width, item.height]; }),
      genZTip: output.genZTip || '',
      images: items.map(function (item) { return item.url; }),
      video: output.video && output.video.url || '',
      videos: (output.videos || []).map(function (item) { return item.key + ':' + item.url; }),
      videoStatus: output.videoStatus || '',
      videoError: output.videoError || ''
    });
    if (fingerprint === lastOutputFingerprint) return;
    lastOutputFingerprint = fingerprint;
    if (items.length) currentOutput = Planner.clone(output);

    resultStory.textContent = output.story || '';
    resultGuardrail.textContent = output.guardrail || '';
    if (resultCulturalScore) {
      var score = Number(output.culturalScore);
      var assessedScore = output.culturalScoreSource === 'gemini-selection-assessment' && typeof output.culturalScore === 'number' && Number.isFinite(score) && score >= 0 && score <= 100;
      resultCulturalScore.parentElement.hidden = !assessedScore;
      resultCulturalScore.textContent = assessedScore ? Math.round(score) + '/100 · Gợi ý AI về lựa chọn, chưa thẩm định văn hóa' : '';
      resultCulturalScore.classList.toggle('is-warning', assessedScore && score < 85);
    }
    resultGenZTip.textContent = output.genZTip || '';

    resultImages.innerHTML = '';
    resultImages.hidden = items.length === 0;
    currentLookbookItems = items.slice(0, 5);
    if (frame && items.length) frame.classList.toggle('has-catalog-preview', output.imageSource === 'catalog-fallback');
    experience.classList.toggle('has-generated-output', items.length > 0);
    experience.classList.toggle('has-preview-variants', items.length > 1);
    var outputDetails = document.getElementById('outputDetails');
    if (outputDetails) outputDetails.hidden = items.length === 0;
    var advancedOptions = document.getElementById('guideAdvanced');
    if (advancedOptions) advancedOptions.hidden = true; // Legacy A-E controls do not belong to the group flow.
    var gallery = document.getElementById('studioVariants');
    if (gallery) gallery.hidden = items.length < 2;
    if (addVariantButton) addVariantButton.hidden = true;
    var storyDownload = document.getElementById('downloadStory');
    if (storyDownload) storyDownload.hidden = items.length === 0;
    experience.querySelectorAll('[data-workspace-variants]').forEach(function (button) {
      button.disabled = items.length < 2;
      button.title = items.length ? 'Xem các ảnh đã tạo' : 'Chưa có ảnh đã tạo';
    });
    var outputAspect = output.lookbook && output.lookbook.aspectRatio || state.aspectRatio || '16:9';
    var aspectParts = outputAspect.split(':').map(Number);
    setPreviewAspect(aspectParts[0], aspectParts[1]);
    if (previewImage && items[0]) {
      previewImage.alt = output.imageSource === 'catalog-fallback' ? 'Ảnh mẫu trang phục đã duyệt' : 'Ảnh bản phối của bạn';
      previewImage.onload = function () {
        // Providers may return dimensions different from the requested preset.
        setPreviewAspect(previewImage.naturalWidth, previewImage.naturalHeight);
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
    if (saveLookButton) { saveLookButton.disabled = items.length === 0; saveLookButton.hidden = items.length === 0; }
    if (compareLooksButton) compareLooksButton.disabled = items.length < 2;
    if (variantStrip && items.length > 1) {
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
    if (compareLayer) { compareLayer.hidden = true; compareLayer.classList.remove('is-expanded'); }
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

  function setPreviewAspect(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    var plane = document.getElementById('studioPlane');
    if (plane) plane.style.setProperty('--studio-preview-ratio', String(width / height));
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
    canvas.width = 1080;
    canvas.height = 1920;
    var context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ xuất lookbook.');

    if (document.fonts) await document.fonts.ready;
    if (!window.VRemixLookbookCard) throw new Error('Tải lại Studio để cập nhật trình xuất thẻ.');
    window.VRemixLookbookCard.draw(canvas, images, resultChoiceRows(currentResultSelection), currentOutput || {});

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
    var busy = value === 'queued' || value === 'processing';
    document.getElementById('workspaceCatalog').inert = busy;
    if (busy) media.pause();
    var retry = document.getElementById('retryGeneration');
    if (retry) retry.hidden = value !== 'failed';
    ['repairGeneration','generatePortrait'].forEach(function (id) {
      var button = document.getElementById(id);
      if (button) button.disabled = busy || draftEdited;
    });
    srStatus.textContent = message;
    studioStatus.textContent = message;
    studioStatus.hidden = busy || !message;
    window.VRemixLoading.setBusy(busy);
    if (previewGenerationStatus && previewGenerationMessage) {
      previewGenerationStatus.hidden = !(value === 'queued' || value === 'processing');
      previewGenerationStatus.classList.toggle('is-error', value === 'failed');
      previewGenerationMessage.textContent = message;
    }
  }

  function showResult() {
    result.hidden = false;
    document.body.style.overflow = '';
    if (currentLookbookItems.length) {
      syncSubmitButton();
      return; // Keep the previous completed result until its replacement exists.
    }
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
    if (collectionBusy || savingLook) return;
    if (!catalog.lookEndpoint || currentLookbookItems.length === 0 || !currentResultSelection) return;
    if (!catalog.auth || !catalog.auth.authenticated) {
      saveAfterLogin = true; persistStudio();
      var authDialog = document.getElementById('studioAuthDialog');
      if (authDialog && typeof authDialog.showModal === 'function') {
        document.dispatchEvent(new Event('vremix:open-auth'));
        return;
      }
      window.location.href = catalog.auth && catalog.auth.loginUrl
        ? catalog.auth.loginUrl
        : 'auth.php?next=studio.php';
      return;
    }
    saveLookButton.disabled = true;
    savingLook = true;
    if (!resultSaveId) resultSaveId = createRequestId();
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
          saveId: resultSaveId || (resultSaveId = createRequestId()),
          jobId: currentResultJobId,
          name: (selectedEvent(currentResultSelection.event, currentResultSelection.planning).label || 'Bản phối') + ' / ' + currentResultSelection.planning.count + ' người',
          selection: currentResultSelection,
          locks: Object.assign({}, currentResultSelection.locks),
          images: currentLookbookItems.map(function (item) { return item.url; }),
          context: {
            occasion: currentResultSelection.event,
            branch: query.get('branch') || ''
          }
        })
      });
      var body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Không thể lưu Look.');
      savedLookId = body.lookId; saveAfterLogin = false; persistStudio();
      notifyHistory();
      saveLookButton.textContent = 'Đã lưu bản phối';
      setStatus('Đã lưu vào “Bản phối của tôi”.');
    } catch (error) {
      saveLookButton.disabled = false;
      saveLookButton.textContent = 'Lưu bản phối';
      setStatus(error.message || 'Không thể lưu Look.');
    } finally { savingLook = false; }
  }

  function compareCurrentLooks(versions) {
    var explicit = Array.isArray(versions);
    var compared = (explicit ? versions : currentLookbookItems).filter(function (item) { return item.url; });
    if (compareLayer) {
      if (!explicit && !compareLayer.hidden) {
        compareLayer.hidden = true;
        compareLayer.classList.remove('is-expanded');
        compareLooksButton.textContent = 'So sánh ảnh';
        experience.dispatchEvent(new Event('studio:compare-change'));
        setStatus('');
        return;
      }
      if (compared.length < 2) return;
      compareLayer.innerHTML = '';
      var selected = compared.findIndex(function (item) { return item.active; });
      var choices = selected < 0 ? [0, 1] : [selected > 0 ? selected - 1 : 1, selected];
      var toolbar = document.createElement('div'); toolbar.className = 'workspace-compare-toolbar';
      var pickers = [], updates = [];
      var close = document.createElement('button'); close.type = 'button'; close.textContent = 'Đóng so sánh';
      close.addEventListener('click', function () { compareCurrentLooks(); });
      var swap = document.createElement('button'); swap.type = 'button'; swap.textContent = 'Đổi bên ⇄';
      swap.addEventListener('click', function () {
        var value = pickers[0].value; pickers[0].value = pickers[1].value; pickers[1].value = value;
        updates.forEach(function (update) { update(); });
      });
      var expand = document.createElement('button'); expand.type = 'button'; expand.textContent = 'Phóng to';
      expand.setAttribute('aria-pressed', String(compareLayer.classList.contains('is-expanded')));
      expand.addEventListener('click', function () {
        var expanded = !compareLayer.classList.contains('is-expanded');
        compareLayer.classList.toggle('is-expanded', expanded);
        expand.textContent = expanded ? 'Thu nhỏ' : 'Phóng to';
        expand.setAttribute('aria-pressed', String(expanded));
      });
      toolbar.appendChild(swap); toolbar.appendChild(expand); toolbar.appendChild(close); compareLayer.appendChild(toolbar);
      [0, 1].forEach(function (index) {
        var figure = document.createElement('figure');
        var label = document.createElement('label'); label.className = 'workspace-compare-picker';
        var name = document.createElement('span'); name.textContent = index === 0 ? 'Ảnh bên trái' : 'Ảnh bên phải';
        var select = document.createElement('select'); select.setAttribute('aria-label', name.textContent);
        compared.forEach(function (item, optionIndex) {
          var option = document.createElement('option'); option.value = String(optionIndex);
          option.textContent = item.label || 'Bản ' + (optionIndex + 1); select.appendChild(option);
        });
        select.value = String(choices[index]); label.appendChild(name); label.appendChild(select);
        var image = document.createElement('img');
        var caption = document.createElement('figcaption');
        function update() {
          var item = compared[Number(select.value)];
          image.src = item.url; image.alt = item.label || 'Bản phối ' + (Number(select.value) + 1);
          caption.textContent = image.alt;
        }
        select.addEventListener('change', update); update();
        pickers.push(select); updates.push(update);
        figure.appendChild(label); figure.appendChild(image); figure.appendChild(caption); compareLayer.appendChild(figure);
      });
      compareLayer.hidden = false;
      compareLooksButton.textContent = 'Đóng so sánh';
      experience.dispatchEvent(new Event('studio:compare-change'));
      setStatus('');
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
    generateLook();
  });
  var repairGenerationButton = document.getElementById('repairGeneration');
  if (repairGenerationButton) repairGenerationButton.addEventListener('click', function () {
    if (!currentResultSelection || !samePlan(currentResultSelection)) { setStatus('Lựa chọn đã đổi. Hãy tạo phiên bản mới hoặc mở bản này để chỉnh tiếp.'); return; }
    if (window.confirm('Sửa các chi tiết AI đánh giá chưa khớp bằng một lượt tạo ảnh mới? Ảnh cũ vẫn được giữ.')) generateLook({repair:true});
  });
  var portraitGenerationButton = document.getElementById('generatePortrait');
  if (portraitGenerationButton) portraitGenerationButton.addEventListener('click', function () {
    if (!currentResultSelection || !samePlan(currentResultSelection)) { setStatus('Mở bản phối này để chỉnh tiếp trước khi tạo ảnh dọc.'); return; }
    if (window.confirm('Tạo một phiên bản ảnh AI dọc 9:16 bằng một lượt mới? Đây không phải thao tác tải thẻ.')) generateLook({portrait:true});
  });

  dockClose.addEventListener('click', function () {
    closeDock(true);
  });
  resultClose.addEventListener('click', hideResult);
  function renderResultInfo() {
    var info = document.getElementById('resultSelectionInfo');
    if (!info) return;
    info.replaceChildren();
    var snapshot = currentResultSelection;
    if (!snapshot) return;
    var rows = resultChoiceRows(snapshot);
    rows.forEach(function (row) {
      if (!row[1]) return;
      var group = document.createElement('div'), term = document.createElement('dt'), value = document.createElement('dd');
      term.textContent = row[0]; value.textContent = row[1]; group.append(term, value); info.appendChild(group);
    });
    [['resultStory', 'story'], ['resultGuardrail', 'guardrail'], ['resultGenZTip', 'genZTip']].forEach(function (entry) {
      var node = document.getElementById(entry[0]);
      var text = currentOutput && currentOutput[entry[1]];
      node.parentElement.hidden = !text;
      node.textContent = text || '';
    });
    var assessment = currentOutput && currentOutput.imageAssessment;
    var repairButton = document.getElementById('repairGeneration');
    if (repairButton) { repairButton.hidden = !assessment || assessment.status !== 'mismatch'; repairButton.disabled = generationPending || !samePlan(currentResultSelection); }
    var portraitButton = document.getElementById('generatePortrait');
    if (portraitButton) { portraitButton.hidden = !currentLookbookItems.length; portraitButton.disabled = generationPending || !samePlan(currentResultSelection); }
    var statusText = {matched:'AI chưa thấy sai lệch rõ khi đối chiếu ảnh; chưa phải thẩm định văn hóa.',mismatch:'AI nhận thấy chi tiết chưa khớp. Hãy đối chiếu ảnh với lựa chọn bên trên.',uncertain:'AI chưa xác định được một số chi tiết. Bạn cần kiểm tra ảnh.', 'not-assessed':'Ảnh chưa được AI đối chiếu với lựa chọn.'};
    var verification = document.getElementById('resultVerification');
    if (verification) {
      var findings = [], fields = {garment:'dáng áo',variant:'mẫu áo',color:'màu',pattern:'họa tiết',style:'phong cách',accessories:'phụ kiện',scene:'bối cảnh'};
      (assessment && Array.isArray(assessment.people) ? assessment.people.slice(0,12) : []).forEach(function (person) {
        if (!Number.isInteger(person.personId) || person.personId < 1 || person.personId > 12) return;
        var details = Object.keys(fields).filter(function (key) { return person.checks && ['mismatch','uncertain'].includes(person.checks[key]); }).map(function (key) { return fields[key] + (person.checks[key] === 'mismatch' ? ' chưa khớp' : ' chưa rõ'); });
        if (details.length) findings.push('Người ' + person.personId + ': ' + details.join(', '));
      });
      (assessment && Array.isArray(assessment.constructionChecks) ? assessment.constructionChecks.slice(0,12) : []).forEach(function (check) {
        if (['mismatch','uncertain'].includes(check.status) && typeof check.reason === 'string') findings.push('Cấu trúc · Người ' + check.personId + ': ' + check.reason.slice(0,400));
      });
      verification.textContent = (statusText[assessment && assessment.status] || statusText['not-assessed']) + (findings.length ? ' ' + findings.join('. ') + '.' : '');
    }
    var provenance = document.getElementById('resultCopySource');
    if (provenance) provenance.textContent = currentOutput && currentOutput.copyPolicy === 'selected-catalog-only' ? 'Mô tả từ lựa chọn và catalog · đánh giá ảnh/điểm là gợi ý AI, không phải thẩm định văn hóa' : currentOutput && currentOutput.copySource === 'gemini' ? 'Nội dung gợi ý AI · cần đối chiếu nguồn văn hóa' : currentOutput && currentOutput.copySource === 'catalog-fallback' ? 'Nội dung từ lựa chọn và catalog · không phải đánh giá ảnh' : 'Phiên bản cũ · chưa có thông tin nguồn nội dung';
    var referenceSource = document.getElementById('resultReferenceSource');
    if (referenceSource) referenceSource.textContent = currentOutput && currentOutput.garmentReferences && currentOutput.garmentReferences.status === 'attached'
      ? 'Đã gửi ảnh mẫu trang phục cho AI tham chiếu; không bảo đảm mọi chi tiết được tái hiện chính xác.' : 'Phiên bản này chưa có xác nhận đã gửi ảnh mẫu trang phục cho AI.';
    var score = currentOutput && currentOutput.culturalScore;
    var assessed = currentOutput && currentOutput.culturalScoreSource === 'gemini-selection-assessment' && typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100;
    if (resultCulturalScore) {
      resultCulturalScore.parentElement.hidden = !assessed;
      resultCulturalScore.textContent = assessed ? Math.round(score) + '/100 · Gợi ý AI về lựa chọn, chưa thẩm định văn hóa' : '';
    }
  }
  var resultDetails = document.getElementById('outputDetails');
  if (resultDetails) resultDetails.addEventListener('toggle', function () {
    if (resultDetails.open) { result.hidden = false; renderResultInfo(); }
  });
  experience.addEventListener('studio:history-change', renderResultInfo);
  experience.addEventListener('studio:selection', renderResultInfo);
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
    fetch(currentLookbookItems[0].url).then(function (response) {
      if (!response.ok) throw new Error('Không thể tải ảnh. Hãy mở lại từ thư viện để làm mới quyền truy cập.');
      return response.blob();
    }).then(function (blob) {
      var url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'v-remix-anh-goc.' + (blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png');
      link.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    })
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
  document.getElementById('downloadStory').addEventListener('click', async function () {
    if (!currentLookbookItems.length || this.disabled) return;
    this.disabled = true;
    try { await downloadLookbookComposite(currentLookbookItems); setStatus('Đã tải thẻ bản phối 1080 × 1920; giữ nguyên ảnh gốc, không phải ảnh AI tạo mới theo tỷ lệ dọc.'); }
    catch (error) { setStatus(error.message || 'Không thể xuất thẻ bản phối. Ảnh gốc vẫn được giữ.'); }
    finally { this.disabled = false; }
  });
  window.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (compareLayer && !compareLayer.hidden) { compareCurrentLooks(); return; }
    if (state.openMode) closeDock(true);
    else {
      var details = document.getElementById('outputDetails');
      if (details && details.open) hideResult();
    }
  });

  // The guide uses this API; selection and per-person outfits have one owner.
  experience.plannerApi = {
    get: function () { return Planner.clone(planning); },
    selection: function () { return { event: state.event, planning: Planner.clone(planning) }; },
    applyRecipe: function (id) {
      if (generationPending) throw new Error('Chờ tạo ảnh xong trước khi đổi bản phối.');
      var recipe = ((catalog.intelligence || {}).lookbooks || []).find(function (row) { return row.id === id; });
      if (!recipe || !lookup(catalog.garments, recipe.garment).slug) throw new Error('Mẫu này không còn trong thư viện.');
      if (!planning.count) throw new Error('Chọn số người trước khi áp dụng bản phối.');
      var p = planning.people[planning.activePerson - 1];
      if (!p) throw new Error('Chọn người cần phối.');
      if (!window.confirm('Thay lựa chọn trang phục của Người ' + p.id + ' bằng bản phối này? Không tự tạo ảnh. Các người khác giữ nguyên lựa chọn.' + (planning.shared && planning.count > 1 ? ' Chuyển nhóm sang “Mỗi người một bộ”.' : ''))) return false;
      // Applying inspiration is explicitly per-person, even in shared mode.
      p.outfit = Planner.clone(recipe.outfit); p.customized = true;
      if (planning.count > 1) planning.shared = false;
      if (!state.event && lookup(catalog.events, recipe.event).slug) state.event = recipe.event;
      Planner.load(planning, state); syncVariantSelections(); Planner.capture(planning, state); renderCatalogPanels(); updateSummary('garment'); selectionChanged();
      return true;
    },
    count: function (count) {
      if (generationPending) return;
      if (planning.count && count < planning.count && planning.people.slice(count).some(function (person) { return person.outfit.garment || person.name || person.gender || person.heightCm || person.weightKg || person.faceSupplied; })
          && !window.confirm('Giảm số người sẽ bỏ thông tin, trang phục và ảnh tham khảo của những người ở cuối danh sách. Bạn muốn tiếp tục?')) return;
      Planner.setCount(planning, count);
      faceFiles.forEach(function (value, id) { if (id > count) { URL.revokeObjectURL(value.url); faceFiles.delete(id); } });
      Planner.load(planning, state); syncVariantSelections(); renderCatalogPanels(); updateSummary('people'); selectionChanged();
    },
    period: function (kind, start, end) {
      if (generationPending) return;
      planning.period = Planner.period(kind, start, end); updateSummary('time'); selectionChanged();
    },
    occasionNote: function (note) {
      if (generationPending) return;
      planning.occasionNote = String(note).trim().slice(0, 400);
      if (!state.event || state.event === 'custom') {
        planning.customOccasion = planning.occasionNote.length >= 2 ? planning.occasionNote.slice(0, 120) : '';
        state.event = planning.customOccasion ? 'custom' : '';
      }
      updateSummary('occasionNote'); selectionChanged();
    },
    customOccasion: function (value) {
      if (generationPending) return;
      var label = String(value).trim().slice(0, 120);
      if (label.length < 2) throw new Error('Nhập tên dịp từ 2 ký tự, ví dụ: Đi biển.');
      planning.customOccasion = label; state.event = 'custom';
      renderCatalogPanels(); updateSummary('event'); selectionChanged();
    },
    shared: function (shared) {
      if (generationPending) return;
      Planner.setShared(planning, shared, state); updateSummary('groupMode'); selectionChanged();
    },
    person: function (id) {
      if (generationPending || !planning.people[id - 1]) return;
      planning.activePerson = id; Planner.load(planning, state); syncVariantSelections(); renderCatalogPanels(); updateSummary('person');
      persistStudio();
    },
    profile: function (name, height, weight, gender) {
      if (generationPending) return;
      var p = planning.people[planning.activePerson - 1]; if (!p) return;
      var h = height === '' ? null : Number(height), w = weight === '' ? null : Number(weight);
      var g = Planner.gender(gender === undefined ? p.gender : gender);
      if ((h !== null && (!Number.isFinite(h) || h < 50 || h > 250)) || (w !== null && (!Number.isFinite(w) || w < 10 || w > 300))) throw new Error('Chiều cao từ 50–250 cm, cân nặng từ 10–300 kg; có thể để trống.');
      p.name = String(name).trim().slice(0, 60); p.gender = g; p.heightCm = h; p.weightKg = w; updateSummary('profile'); selectionChanged();
    },
    face: function (file, consent) {
      if (generationPending) return;
      var p = planning.people[planning.activePerson - 1]; if (!p) return;
      if (file && (!consent || !/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024)) throw new Error('Đồng ý sử dụng ảnh và chọn JPG, PNG hoặc WebP nhỏ hơn 8 MB.');
      var old = faceFiles.get(p.id); if (old) URL.revokeObjectURL(old.url);
      if (file) faceFiles.set(p.id, { file: file, url: URL.createObjectURL(file) }); else faceFiles.delete(p.id);
      p.faceSupplied = Boolean(file); updateSummary('face'); selectionChanged();
    },
    faceUrl: function () { var item = faceFiles.get(planning.activePerson); return item ? item.url : ''; },
    generate: generateLook
  };

  async function buildFaceReferences(plan) {
    var references = plan.people.filter(function (p) { return p.faceSupplied && faceFiles.has(p.id); });
    if (!references.length) return undefined;
    var canvas = document.createElement('canvas');
    var cols = Math.min(3, references.length), cell = 320;
    canvas.width = cols * cell; canvas.height = Math.ceil(references.length / cols) * (cell + 36);
    var ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Trình duyệt không đọc được ảnh tham khảo.');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < references.length; i++) {
      var p = references[i], ref = faceFiles.get(p.id);
      var image = await new Promise(function (resolve, reject) {
        var img = new Image(); img.onload = function () { resolve(img); }; img.onerror = function () { reject(new Error('Ảnh tham khảo không đọc được. Hãy chọn ảnh khác.')); }; img.src = ref.url;
      });
      var x = (i % cols) * cell, y = Math.floor(i / cols) * (cell + 36);
      var scale = Math.min(cell / image.naturalWidth, cell / image.naturalHeight);
      ctx.drawImage(image, x + (cell - image.naturalWidth * scale) / 2, y + (cell - image.naturalHeight * scale) / 2, image.naturalWidth * scale, image.naturalHeight * scale);
      ctx.fillStyle = '#17171b'; ctx.font = '20px sans-serif'; ctx.fillText('Person ' + p.id, x + 12, y + cell + 25);
    }
    return { mimeType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', .9).split(',')[1] };
  }

  document.getElementById('occasionSearch').addEventListener('input', renderCatalogPanels);
  var suggestions = document.getElementById('occasionSuggestions');
  (catalog.events || []).filter(function (event) { return event.description; }).slice(0, 6).forEach(function (event) {
    var button = document.createElement('button'); button.type = 'button';
    var title = document.createElement('strong'); title.textContent = event.label;
    var description = document.createElement('small'); description.textContent = event.description;
    button.append(title, description);
    button.addEventListener('click', function () { chooseOption('event', event.slug); }); suggestions.appendChild(button);
  });

  buildHotspots();
  renderQuickStart();
  renderCatalogPanels();
  renderInspirationStrip();
  renderDock();
  updateSummary();
  prepareMedia();
  var pendingJob = readActiveJob();
  function resetCollectionWorkspace() {
    state = Planner.clone(blankState); planning = Planner.create();
    faceFiles.forEach(function (ref) { URL.revokeObjectURL(ref.url); }); faceFiles.clear();
    imageInput.value = ''; uploadName.textContent = 'Tuỳ chọn';
    currentLookbookItems = []; currentOutput = null; currentVideo = null;
    currentResultSelection = null; currentResultJobId = null; currentRequestSelection = null;
    savedLookId = null; resultSaveId = null; saveAfterLogin = false; draftEdited = false; lastOutputFingerprint = '';
    if (compareLayer) { compareLayer.hidden = true; compareLayer.classList.remove('is-expanded'); }
    previewImage.onload = null; previewImage.hidden = true; previewImage.removeAttribute('src');
    frame.classList.remove('has-ai-preview', 'has-look', 'has-catalog-preview');
    experience.classList.remove('has-generated-output', 'has-preview-variants', 'has-history');
    document.getElementById('studioHistory').hidden = true;
    document.getElementById('studioVariants').hidden = true;
    document.getElementById('outputDetails').hidden = true;
    document.getElementById('outputDetails').open = false;
    result.hidden = true; resultImages.replaceChildren(); resultVideo.pause();
    previewEmpty.classList.remove('is-ready');
    resultDownload.hidden = true; saveLookButton.hidden = true;
    document.getElementById('downloadStory').hidden = true;
    previewGenerationStatus.hidden = true;
    closeDock(false); renderQuickStart(); renderCatalogPanels(); updateSummary('restore');
    document.getElementById('occasionSearch').value = '';
    document.getElementById('occasionNote').value = '';
    experience.dispatchEvent(new CustomEvent('studio:restore-step', { detail: 'event' }));
    setStatus('');
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) media.play().catch(function () {});
  }
  async function refreshCollection(record) {
    if (record.jobId) {
      try {
        var response = await fetch(catalog.generationEndpoint + '?jobId=' + encodeURIComponent(record.jobId), { headers: { 'X-VRemix-CSRF': catalog.lookCsrf } });
        var body = await response.json();
        if (response.ok && body.status === 'completed' && body.output) record.output = body.output;
        else if (!record.output) record.mediaUnavailable = true;
      } catch (_) { if (!record.output) record.mediaUnavailable = true; }
    } else if (record.savedLookId) {
      try {
        var response = await fetch(catalog.historyEndpoint + '?lookId=' + encodeURIComponent(record.savedLookId), { headers: { 'X-VRemix-CSRF': catalog.lookCsrf } });
        var body = await response.json(); var item = body.items && body.items.find(function (item) { return item.lookId === record.savedLookId; });
        if (response.ok && item && item.image_url) record.output = item.output || Object.assign({}, record.output || {}, { lookbook: { items: [{ url: item.image_url, path: item.storage_path }] } });
        else if (!record.output) record.mediaUnavailable = true;
      } catch (_) { if (!record.output) record.mediaUnavailable = true; }
    }
    return record;
  }
  async function collectionOperation(action) {
    if (!collectionReady || collectionBusy || generationPending || savingLook || readActiveJob()) throw new Error('Đợi thao tác tạo hoặc lưu ảnh hoàn tất rồi chuyển bộ.');
    collectionBusy = true;
    var toolbox = document.querySelector('.studio-toolbox'); if (toolbox) toolbox.inert = true;
    experience.dispatchEvent(new Event('studio:collections-busy'));
    try { await persistStudio(); await window.VRemixSession.retry(); return await action(); }
    finally { collectionBusy = false; restoringCollection = false; if (toolbox) toolbox.inert = window.VRemixSession.status().state === 'conflict'; experience.dispatchEvent(new Event('studio:collections-busy')); }
  }
  function displayCollection(id, record) {
    restoringCollection = true;
    collections.select(id); resetCollectionWorkspace();
    if (record.draft) { restoreSelection(record.draft); updateSummary('restore'); }
    currentResultSelection = record.selection; currentResultJobId = record.jobId;
    savedLookId = record.savedLookId; resultSaveId = record.saveId; currentOutput = record.output || null;
    if (record.output && record.selection) applyOutput(record.output);
    saveLookButton.disabled = Boolean(savedLookId) || !currentLookbookItems.length;
    saveLookButton.textContent = savedLookId ? 'Đã lưu bản phối' : 'Lưu bản phối';
    experience.dispatchEvent(new CustomEvent('studio:restore-step', { detail: record.guideStep || 'event' }));
    document.getElementById('occasionNote').value = planning.occasionNote || '';
    draftEdited = Boolean(record.selection && !samePlan(record.selection));
    restoringCollection = false;
    if (record.mediaUnavailable) setStatus('Chưa tải được ảnh cũ. Lựa chọn của bộ vẫn được giữ.');
  }
  experience.collectionsApi = {
    ready: function () { return collectionReady; },
    busy: function () { return collectionBusy || savingLook || generationPending; },
    list: function () { return collections.list(); },
    active: function () { return collections.active(); },
    edited: function () { return draftEdited; },
    async openLook(look) {
      if (draftEdited && !window.confirm('Giữ lại lựa chọn hiện tại và mở bộ sưu tập của bản phối này?')) return false;
      if (!collectionReady || generationPending || readActiveJob()) throw new Error('Đợi yêu cầu tạo ảnh hoàn tất rồi chuyển bộ sưu tập.');
      await persistStudio(); await window.VRemixSession.retry();
      var chainIds = [look.generation_job_id];
      try {
        var response = await fetch(catalog.historyEndpoint + '?lookId=' + encodeURIComponent(look.id), { headers: { 'X-VRemix-CSRF': catalog.lookCsrf } });
        var chain = await response.json();
        if (response.ok) {
          chainIds = chainIds.concat((chain.items || []).map(function (item) { return item.jobId; }));
          var original = (chain.items || []).find(function (item) { return look.generation_job_id ? item.jobId === look.generation_job_id : item.lookId === look.id; });
          if (original && original.output) look = Object.assign({}, look, { output: original.output });
        }
      } catch (_) { /* The saved selection can still be opened during an outage. */ }
      var existing = collections.list().find(function (item) { return item.record.jobId && chainIds.includes(item.record.jobId) || item.record.savedLookId === look.id; });
      if (!existing) {
        collections.importHistory([{ ids: [look.generation_job_id || 'look:' + look.id], updatedAt: Date.parse(look.created_at) || Date.now(), record: {
          draft: look.selection, selection: look.selection, guideStep: 'review', jobId: look.generation_job_id || null, savedLookId: look.id,
          output: look.output || (look.image_url ? { lookbook: { items: [{ url: look.image_url, path: look.storage_path }] } } : null)
        } }]);
        existing = collections.list().find(function (item) { return item.record.savedLookId === look.id; });
      }
      await this.open(existing.id);
      experience.resultsApi.open(look, false);
      return true;
    },
    async start() {
      return collectionOperation(async function () {
        restoringCollection = true;
        collections.start(); resetCollectionWorkspace(); restoringCollection = false;
        await persistStudio(); await window.VRemixSession.retry(); notifyHistory();
      });
    },
    async open(id) {
      return collectionOperation(async function () {
        var item = collections.get(id); if (!item || item.deleted) throw new Error('Bộ này đã bị xóa.');
        if (window.VRemixSession.getCollection) { item = await window.VRemixSession.getCollection(id); collections.hydrate(item); }
        var record = await refreshCollection(item.record);
        displayCollection(id, record);
        await persistStudio(); await window.VRemixSession.retry(); notifyHistory();
      });
    },
    async remove(id) {
      return collectionOperation(async function () {
        var item = collections.get(id); if (!item) throw new Error('Không tìm thấy bộ.');
        collections.remove(id);
        if (id === collections.active()) { restoringCollection = true; collections.start(); resetCollectionWorkspace(); restoringCollection = false; }
        await persistStudio(); await window.VRemixSession.retry(); notifyHistory();
      });
    },
    async rename(id, name) {
      if (!name.trim() || name.trim().length > 120) throw new Error('Tên bộ cần 1–120 ký tự.');
      return collectionOperation(async function () { collections.rename(id,name.trim()); await persistStudio(); await window.VRemixSession.retry(); });
    },
    async removeVersion(jobId) {
      if (!window.VRemixSession.deleteVersion) throw new Error('Đăng nhập để quản lý phiên bản trong tài khoản.');
      return collectionOperation(async function () {
        var id = collections.active();
        var item = await window.VRemixSession.deleteVersion(id,jobId);
        collections.replace(id,item.record,item.revision);
        if (currentResultJobId === jobId) displayCollection(id,item.record);
        try { collections.hydrate(await window.VRemixSession.getCollection(id)); } catch (_) { /* Deletion already succeeded; history can reload later. */ }
        notifyHistory();
      });
    },
    importHistory: function (groups) { collections.importHistory(groups); return persistStudio(); }
  };
  experience.addEventListener('studio:version-count', function (event) {
    collections.setCount(event.detail.collectionId,event.detail.count,event.detail.hasMore);
  });
  experience.resultsApi = {
    isComparing: function () { return Boolean(compareLayer && !compareLayer.hidden); },
    closeCompare: function () { if (compareLayer && !compareLayer.hidden) compareCurrentLooks(); },
    current: function () { return { collectionId: collections.active(), hasCollection: Boolean(collections.get(collections.active())), jobId: currentResultJobId, lookId: savedLookId, pending: generationPending || collectionBusy || savingLook, edited: draftEdited }; },
    compare: compareCurrentLooks,
    open: function (look, edit) {
      if (generationPending) throw new Error('Hãy đợi bản phối đang tạo hoàn tất trước khi mở bản khác.');
      if (!look.image_url && !edit) throw new Error('Ảnh chưa tải được. Hãy mở lại thư viện để thử lại.');
      if (!look.selection || typeof look.selection !== 'object') throw new Error('Bản phối cũ thiếu lựa chọn để chỉnh tiếp.');
      if (look.image_url) {
      currentResultSelection = Planner.clone(look.selection);
      currentResultJobId = look.generation_job_id || look.jobId || null;
      resultSaveId = look.client_save_id || createRequestId(); savedLookId = look.lookId || (look.saved === false ? null : look.id);
      lastOutputFingerprint = '';
      var restoredOutput = Planner.clone(look.output || {});
      // Signed URLs are refreshed independently of the version's original text.
      var previousAsset = restoredOutput.lookbook && restoredOutput.lookbook.items && restoredOutput.lookbook.items[0] || {};
      restoredOutput.lookbook = { aspectRatio: look.selection.aspectRatio || '16:9', items: [Object.assign({}, previousAsset, { url: look.image_url, path: look.storage_path })] };
      applyOutput(restoredOutput);
      }
      if (edit) {
        draftEdited = false;
        faceFiles.forEach(function (ref) { URL.revokeObjectURL(ref.url); }); faceFiles.clear();
        var editable = Planner.clone(look.selection); editable.planning = Planner.restore(editable); editable.planning.activePerson = 1;
        restoreSelection(editable); updateSummary('restore');
        experience.dispatchEvent(new CustomEvent('studio:restore-step', { detail: 'garment' }));
        document.getElementById('occasionNote').value = planning.occasionNote || '';
      }
      if (look.image_url) { saveLookButton.disabled = Boolean(savedLookId); saveLookButton.textContent = savedLookId ? 'Đã lưu bản phối' : 'Lưu bản phối'; }
      setStatus(!look.image_url ? 'Đã mở lựa chọn cũ để chỉnh tiếp. Ảnh cũ không tải được; chỉ tạo ảnh mới khi bạn xác nhận.' : edit ? 'Đã mở phiên bản để chỉnh tiếp. Ảnh trước vẫn được giữ; chỉ tạo ảnh mới khi bạn xác nhận.' : 'Đang xem bản phối đã lưu. Lựa chọn đang chỉnh không bị thay đổi.');
      persistStudio();
      notifyHistory(true);
      var preview = document.querySelector('.studio-preview'), bounds = preview.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    persist: persistStudio
  };
  document.addEventListener('vremix:draft-storage-error', function () { setStatus('Trình duyệt không giữ được bản nháp. Hãy tải ảnh hoặc lưu vào tài khoản trước khi rời trang.'); });
  document.addEventListener('vremix:draft-sync', function (event) {
    var draftNotice = document.getElementById('studioDraftStatus');
    draftNotice.textContent = event.detail.message;
    draftNotice.hidden = !['error', 'conflict', 'auth'].includes(event.detail.state);
    document.getElementById('studioDraftNotice').hidden = draftNotice.hidden;
    document.getElementById('retryDraftSync').hidden = !['error', 'auth'].includes(event.detail.state);
    document.getElementById('retryDraftSync').textContent = event.detail.state === 'auth' ? 'Tải lại Studio' : 'Thử lưu lại';
    document.getElementById('keepLocalCollection').hidden = event.detail.state !== 'conflict';
    document.getElementById('loadServerCollections').hidden = event.detail.state !== 'conflict';
    var toolbox = document.querySelector('.studio-toolbox'); if (toolbox) toolbox.inert = event.detail.state === 'conflict' || collectionBusy;
  });
  document.getElementById('keepLocalCollection').addEventListener('click', async function () {
    this.disabled = true;
    try { await window.VRemixSession.forkLocal(); } catch(e) { setStatus(e.message); } finally { this.disabled = false; }
  });
  document.getElementById('loadServerCollections').addEventListener('click', function () {
    if (window.confirm('Mở bản mới nhất? Chọn “Giữ bản trên thiết bị thành bộ riêng” trước nếu muốn giữ thay đổi chưa đồng bộ.')) window.VRemixSession.discardRecovery();
  });
  document.getElementById('retryDraftSync').addEventListener('click', function () {
    if (window.VRemixSession.status().state === 'auth') { persistStudio(); window.location.reload(); return; }
    window.VRemixSession.retry().catch(function () { /* The sync status shows the error. */ });
  });
  experience.addEventListener('studio:guide-step', persistStudio);
  var bootSucceeded = false, migrateGuest = false;
  var initialToolbox = document.querySelector('.studio-toolbox'); if (initialToolbox) initialToolbox.inert = true;
  if (window.VRemixSession) window.VRemixSession.read().then(async function (record) {
    bootSucceeded = true; migrateGuest = Boolean(record && (!record.collections || record.__migration));
    restoringCollection = true; collections.ingest(record);
    if (record && !draftEdited) {
      if (record.draft) {
        restoreSelection(record.draft); updateSummary('restore'); document.getElementById('occasionNote').value = planning.occasionNote || '';
        experience.dispatchEvent(new CustomEvent('studio:restore-step', { detail: record.guideStep || Planner.missing(planning, state.event) }));
        if (planning.count || state.event) setStatus('Đã khôi phục lựa chọn trước. Bạn có thể chỉnh hoặc kiểm tra rồi tạo ảnh; chưa tiêu lượt tạo.');
      }
      if (record.mediaUnavailable) setStatus('Đã mở lựa chọn của bản nháp. Ảnh cũ chưa tải được; bạn có thể chỉnh tiếp mà chưa cần tạo lại.');
      currentResultSelection = record.selection || null; currentResultJobId = record.jobId || null;
      resultSaveId = record.saveId || null; savedLookId = record.savedLookId || null;
      if (record.output && record.selection) {
        var output = record.output;
        if (record.jobId) {
          try {
            var response = await fetch(catalog.generationEndpoint + '?jobId=' + encodeURIComponent(record.jobId), { headers: { 'X-VRemix-CSRF': catalog.lookCsrf } });
            var fresh = await response.json(); if (response.ok && fresh.status === 'completed') output = fresh.output;
          } catch (_) { /* Keep the last available result during an outage. */ }
        }
        if (draftEdited) return;
        applyOutput(output);
        notifyHistory();
        saveLookButton.disabled = Boolean(savedLookId); saveLookButton.textContent = savedLookId ? 'Đã lưu bản phối' : 'Lưu bản phối';
        setStatus('Đã khôi phục bản phối trước. Ảnh mặt tham khảo không được giữ; hãy thêm lại nếu muốn dùng cho ảnh mới.');
        if (record.saveAfterLogin && catalog.auth.authenticated) await saveCurrentLook();
      }
      draftEdited = Boolean(record.selection && !samePlan(record.selection));
    }
    if (pendingJob) resumeGeneration(pendingJob);
  }).catch(function (e) { setStatus(e.message || 'Chưa mở được bộ sưu tập. Tải lại trang khi kết nối ổn định.'); }).finally(function () {
    restoringCollection = false; collectionReady = bootSucceeded;
    if (initialToolbox) initialToolbox.inert = !bootSucceeded || window.VRemixSession.status().state === 'conflict';
    if (migrateGuest) persistStudio(); experience.dispatchEvent(new Event('studio:collections-ready')); if (bootSucceeded) notifyHistory();
  });
  else if (pendingJob) resumeGeneration(pendingJob);
})();
