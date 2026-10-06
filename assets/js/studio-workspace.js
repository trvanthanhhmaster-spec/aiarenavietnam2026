(function () {
  'use strict';
  var experience = document.getElementById('studioExperience');
  var catalog = document.getElementById('workspaceCatalog');
  var insights = document.getElementById('workspaceInsights');
  var title = document.getElementById('workspacePanelTitle');
  var hint = document.getElementById('workspacePanelHint');
  var panelCopy = {
    catalog: ['Cùng phối một look', 'Chọn theo gu của bạn, AI lo phần còn lại.'],
    heritage: ['Câu chuyện của dáng áo', 'Nguồn gốc, nét riêng và những điều cần lưu ý.'],
    places: ['Mang bản phối ra đời thật', 'Gợi ý mua, thuê và địa điểm chụp có nguồn.']
  };

  function showPanel(name, scroll) {
    if (!panelCopy[name]) return;
    var close = document.getElementById('dockClose');
    var dock = document.getElementById('studioDock');
    if (name !== 'catalog' && dock.classList.contains('is-open')) close.click();
    catalog.hidden = name !== 'catalog';
    insights.hidden = name === 'catalog';
    insights.querySelectorAll('.studio-insight').forEach(function (section) {
      var place = section.classList.contains('studio-sourcing') || section.classList.contains('studio-places');
      section.hidden = name === 'places' ? !place : place;
    });
    title.textContent = panelCopy[name][0];
    hint.textContent = panelCopy[name][1];
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
  experience.addEventListener('click', function (event) {
    var start = event.target.closest('[data-workspace-start]');
    if (start) {
      showPanel('catalog', true);
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
      showPanel('catalog', true);
      var trigger = catalog.querySelector('[data-mode="' + mode.dataset.workspaceMode + '"]');
      if (trigger) trigger.click();
    }
    var variants = event.target.closest('[data-workspace-variants]');
    if (variants) {
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
    upload.querySelector('small').textContent = file && this.value ? file.name : 'Tuỳ chọn · tối đa 8 MB';
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
})();
