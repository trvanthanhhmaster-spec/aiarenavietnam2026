(function () {
  'use strict';
  document.querySelectorAll('.network-product-image img').forEach(function (img) {
    function failed() { img.hidden = true; img.parentElement.querySelector('.network-image-failure').hidden = false; }
    img.addEventListener('error', failed);
    if (img.complete && !img.naturalWidth) failed();
  });
  document.querySelectorAll('form[method="post"]').forEach(function (form) {
    ['buy', 'rent', 'made_to_order'].forEach(function (kind) {
      var toggle = form.querySelector('[name="' + kind + '_enabled"]');
      var unit = form.querySelector('[name="' + kind + '_unit"]');
      if (!toggle || !unit) return;
      function update() { unit.required = toggle.checked; }
      toggle.addEventListener('change', update); update();
    });
    form.addEventListener('submit', function (event) {
      if (form.dataset.submitting) { event.preventDefault(); return; }
      // Keep the clicked review decision in the submitted payload. Do not disable it.
      form.dataset.submitting = 'true';
      form.setAttribute('aria-busy', 'true');
      var status = document.createElement('p');
      status.className = 'network-notice'; status.setAttribute('role', 'status');
      status.setAttribute('data-submit-status', '');
      status.textContent = 'Đang gửi dữ liệu. Chờ phản hồi trước khi gửi lại.';
      form.appendChild(status);
    });
  });
  window.addEventListener('pageshow', function () {
    document.querySelectorAll('form[aria-busy]').forEach(function (form) {
      delete form.dataset.submitting; form.removeAttribute('aria-busy');
      var status = form.querySelector('[data-submit-status]');
      if (status) status.remove();
    });
  });
})();
