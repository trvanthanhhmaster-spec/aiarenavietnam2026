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
    people: ['Bạn phối cho bao nhiêu người?', 'Một mình, cùng một người hay cả nhóm?'],
    time: ['Bạn dự định mặc khi nào?', 'Chọn thời gian hoặc để chưa xác định.'],
    garment: ['Chọn bộ bạn thích', 'Nhìn ảnh và chọn. Bạn không cần biết tên trang phục.'],
    review: ['Sẵn sàng cho bản phối của bạn', 'Kiểm tra rồi xác nhận để tạo một ảnh.']
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
    if (step === 'review') return guide.ready;
    var steps = ['event', 'people', 'time', 'garment'];
    var index = steps.indexOf(step);
    return index >= 0 && steps.slice(0, index).every(function (key) { return Boolean(guide.choices[key]); });
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
    document.getElementById('guidePeopleValue').textContent = guide.labels.people || 'Chưa chọn';
    document.getElementById('guideTimeValue').textContent = guide.labels.time || 'Chưa chọn';
    var activeOutfit = guide.planning && guide.planning.people[guide.planning.activePerson - 1];
    document.getElementById('guideCustomize').hidden = guideStep !== 'garment' || !activeOutfit || !activeOutfit.outfit.garment;
    document.getElementById('garmentVariantSection').hidden = guideStep !== 'garment' || !activeOutfit || !activeOutfit.outfit.garment;
    guideNavigation.hidden = guideStep === 'review';
    guideBack.hidden = guideStep === 'event';
    var active = guide.planning && guide.planning.people[guide.planning.activePerson - 1];
    guideContinue.disabled = guideStep === 'garment' ? !active || !active.outfit.garment : !guide.choices[guideStep];
    guideContinue.textContent = guideStep === 'garment' ? (guide.ready ? 'Kiểm tra bản phối' : 'Chọn người tiếp theo') : 'Tiếp tục';
    if (activePanel === 'catalog') {
      title.textContent = guideCopy[guideStep][0];
      hint.textContent = guideCopy[guideStep][1];
    }
    if (focus && activePanel === 'catalog') {
      catalog.scrollTop = 0;
      if (window.matchMedia('(max-width: 1023px)').matches) {
        document.querySelector('.workspace-panel-header').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }
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
    experience.dispatchEvent(new Event('studio:guide-step'));
  }

  experience.addEventListener('studio:selection', function (event) {
    guide = event.detail;
    if (!canVisit(guideStep)) guideStep = guide.next;
    renderGuide(false);
  });
  experience.addEventListener('studio:restore-step', function (event) {
    guideStep = canVisit(event.detail) ? event.detail : guide.next;
    renderGuide(false);
  });
  // Recipe application changes selections only. Bring their actual review (or
  // the next incomplete step) into view, never trigger provider generation.
  experience.addEventListener('studio:recipe-applied', function () { visitGuide(guide.next); });
  guideContinue.addEventListener('click', function () {
    if (guideContinue.disabled) return;
    if (guideStep === 'garment' && !guide.ready) {
      var missing = guide.planning.people.find(function (p) { return !p.outfit.garment; });
      if (missing) experience.plannerApi.person(missing.id);
      return;
    }
    var steps = ['event', 'people', 'time', 'garment', 'review'];
    guideStep = steps[steps.indexOf(guideStep) + 1];
    renderGuide(true);
    experience.dispatchEvent(new Event('studio:guide-step'));
  });
  guideBack.addEventListener('click', function () {
    var steps = ['event', 'people', 'time', 'garment']; visitGuide(steps[Math.max(0, steps.indexOf(guideStep) - 1)]);
  });
  experience.addEventListener('click', function (event) {
    var start = event.target.closest('[data-workspace-start]');
    if (start) {
      visitGuide(guide.next);
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
    // The workspace also has data-guide-step for layout/state. Only actual
    // navigation buttons should change steps; form clicks must keep focus.
    var guideButton = event.target.closest('button[data-guide-step]');
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
  experience.addEventListener('studio:visit', function (event) { visitGuide(event.detail); });
  showPanel('catalog', false);
  renderGuide(false);
})();
