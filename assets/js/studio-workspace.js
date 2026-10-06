(function () {
  'use strict';
  var experience = document.getElementById('studioExperience');
  var catalog = document.getElementById('workspaceCatalog');
  var insights = document.getElementById('workspaceInsights');
  var title = document.getElementById('workspacePanelTitle');
  var hint = document.getElementById('workspacePanelHint');
  var guide = experience.studioGuide || { next: 'event', ready: false, choices: {}, labels: {}, variantCount: 0 };
  var guideStep = guide.next;
  var activePanel = 'catalog';
  var guideCards = catalog.querySelectorAll('[data-guide-card]');
  var guideSteps = catalog.querySelectorAll('[data-progress-step]');
  var guideReview = document.getElementById('guideReview');
  var guideNavigation = document.getElementById('guideNavigation');
  var guideContinue = document.getElementById('guideContinue');
  var guideBack = document.getElementById('guideBack');
  var guideCopy = {
    event: ['Bạn sẽ mặc đi đâu?', 'Chọn một dịp bên dưới. Chưa biết mặc gì cũng không sao.'],
    garment: ['Chọn bộ bạn thích', 'Nhìn ảnh và chọn. Bạn không cần biết tên trang phục.'],
    style: ['Bạn muốn trông thế nào?', 'Chọn một phong cách. V-Remix sẽ tự tạo ảnh cho bạn.'],
    review: ['Bộ đồ này là của bạn', 'Ảnh tự tạo theo lựa chọn. Bạn vẫn có thể đổi từng món.']
  };
  var panelCopy = {
    catalog: guideCopy.event,
    heritage: ['Câu chuyện của dáng áo', 'Nguồn gốc, nét riêng và những điều cần lưu ý.'],
    places: ['Mang bản phối ra đời thật', 'Gợi ý mua, thuê và địa điểm chụp có nguồn.']
  };

  function showPanel(name, scroll) {
    if (!panelCopy[name]) return;
    activePanel = name;
    var close = document.getElementById('dockClose');
    var dock = document.getElementById('studioDock');
    if (name !== 'catalog' && dock.classList.contains('is-open')) close.click();
    catalog.hidden = name !== 'catalog';
    insights.hidden = name === 'catalog';
    insights.querySelectorAll('.studio-insight').forEach(function (section) {
      var place = section.classList.contains('studio-sourcing') || section.classList.contains('studio-places');
      section.hidden = name === 'places' ? !place : place;
    });
    var copy = name === 'catalog' ? guideCopy[guideStep] : panelCopy[name];
    title.textContent = copy[0];
    hint.textContent = copy[1];
    experience.querySelectorAll('[data-workspace-panel]').forEach(function (button) {
      var active = button.dataset.workspacePanel === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (scroll && window.matchMedia('(max-width: 1023px)').matches) {
      document.querySelector('.workspace-panel-header').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }
  }
  function reducedMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function canVisit(step) {
    return step === 'event' || (step === 'garment' && Boolean(guide.choices.event))
      || (step === 'style' && Boolean(guide.choices.event && guide.choices.garment));
  }

  function renderGuide(focus) {
    experience.dataset.guideStep = guideStep;
    guideCards.forEach(function (card) { card.hidden = card.dataset.guideCard !== guideStep; });
    guideSteps.forEach(function (button) {
      var step = button.dataset.progressStep;
      button.disabled = !canVisit(step);
      button.classList.toggle('is-current', step === guideStep);
      button.setAttribute('aria-current', step === guideStep ? 'step' : 'false');
    });
    guideReview.hidden = guideStep !== 'review';
    document.getElementById('guideEventValue').textContent = guide.labels.event || 'Chưa chọn';
    document.getElementById('guideGarmentValue').textContent = guide.labels.garment || 'Chưa chọn';
    document.getElementById('guideStyleValue').textContent = guide.labels.style || 'Chưa chọn';
    document.getElementById('guideCustomize').hidden = !guide.ready;
    document.getElementById('garmentVariantSection').hidden = guideStep !== 'garment' || guide.variantCount < 2;
    guideNavigation.hidden = guideStep === 'event' || guideStep === 'review';
    guideContinue.disabled = !guide.choices[guideStep];
    guideContinue.firstChild.textContent = guide.ready ? 'Xong, xem bản phối ' : 'Tiếp tục ';
    if (activePanel === 'catalog') {
      title.textContent = guideCopy[guideStep][0];
      hint.textContent = guideCopy[guideStep][1];
    }
    if (focus && activePanel === 'catalog') {
      catalog.scrollTop = 0;
      var heading = guideStep === 'review' ? document.getElementById('guideReviewTitle')
        : catalog.querySelector('[data-guide-card="' + guideStep + '"] h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    }
  }

  function visitGuide(step) {
    if (!canVisit(step)) return;
    var dock = document.getElementById('studioDock');
    if (dock.classList.contains('is-open')) document.getElementById('dockClose').click();
    guideStep = step;
    showPanel('catalog', true);
    renderGuide(true);
  }

  experience.addEventListener('studio:selection', function (event) {
    var oldStep = guideStep;
    guide = event.detail;
    // Stay on garment choices so a user can pick a concrete child variant.
    // Event presets may already satisfy all three choices; don't force repeats.
    if (!(oldStep === 'garment' && /^(garment|garmentVariant)$/.test(guide.changed))) guideStep = guide.next;
    renderGuide(Boolean(guide.changed && oldStep !== guideStep));
  });
  guideContinue.addEventListener('click', function () {
    if (guideContinue.disabled) return;
    guideStep = guide.ready ? 'review' : guide.next;
    renderGuide(true);
  });
  guideBack.addEventListener('click', function () { visitGuide(guideStep === 'style' ? 'garment' : 'event'); });
  experience.addEventListener('click', function (event) {
    var start = event.target.closest('[data-workspace-start]');
    if (start) {
      visitGuide(guide.next === 'review' ? 'event' : guide.next);
      catalog.scrollTop = 0;
      var firstChoice = catalog.querySelector('#catalogEvents button');
      if (firstChoice) firstChoice.focus({ preventScroll: true });
    }
    var panel = event.target.closest('[data-workspace-panel]');
    if (panel) {
      showPanel(panel.dataset.workspacePanel, true);
      panel.focus({ preventScroll: true });
    }
    var mode = event.target.closest('[data-workspace-mode]');
    if (mode) {
      if (canVisit(mode.dataset.workspaceMode)) { visitGuide(mode.dataset.workspaceMode); return; }
      showPanel('catalog', true);
      visitGuide(guide.next);
    }
    var guideButton = event.target.closest('[data-guide-step]');
    if (guideButton) visitGuide(guideButton.dataset.guideStep);
    var viewPreview = event.target.closest('[data-workspace-preview]');
    if (viewPreview) {
      var previewPanel = document.querySelector('.studio-preview');
      previewPanel.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      previewPanel.focus({ preventScroll: true });
    }
    var variants = event.target.closest('[data-workspace-variants]');
    if (variants) {
      if (variants.disabled) return;
      var strip = document.getElementById('variantStrip');
      var preview = document.querySelector('.studio-preview');
      preview.classList.add('is-highlighted');
      strip.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
      var first = strip.querySelector('button');
      if (first) first.focus({ preventScroll: true });
      window.setTimeout(function () { preview.classList.remove('is-highlighted'); }, 1200);
    }
  });

  var fullscreen = document.getElementById('workspaceFullscreen');
  var upload = document.getElementById('workspaceUpload');
  upload.addEventListener('click', function () { document.getElementById('inputImage').click(); });
  document.getElementById('inputImage').addEventListener('change', function () {
    var file = this.files && this.files[0];
    upload.querySelector('small').textContent = file && this.value ? file.name : 'Không bắt buộc · tối đa 8 MB';
    document.getElementById('workspaceRemoveUpload').hidden = !(file && this.value);
  });
  document.getElementById('workspaceRemoveUpload').addEventListener('click', function () {
    var input = document.getElementById('inputImage');
    input.value = '';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    upload.focus({ preventScroll: true });
  });
  if (!experience.requestFullscreen) fullscreen.hidden = true;
  fullscreen.addEventListener('click', function () {
    var request = document.fullscreenElement ? document.exitFullscreen() : experience.requestFullscreen();
    if (request && request.catch) request.catch(function () {
      document.getElementById('studioSrStatus').textContent = 'Trình duyệt không cho phép mở toàn màn hình.';
    });
  });
  document.addEventListener('fullscreenchange', function () {
    fullscreen.setAttribute('aria-label', document.fullscreenElement ? 'Thoát toàn màn hình' : 'Mở toàn màn hình');
  });
  showPanel('catalog', false);
  renderGuide(false);
})();
