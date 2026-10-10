(() => {
  'use strict';
  const pending = new Map();
  document.querySelectorAll('.catalog-import form').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (event.defaultPrevented || !form.checkValidity()) return;
      if (pending.has(form)) { event.preventDefault(); return; }
      const button = form.querySelector('button[type="submit"]');
      if (!button || button.disabled) return;
      pending.set(form, { button, html: button.innerHTML });
      form.setAttribute('aria-busy', 'true');
      button.textContent = button.dataset.busyLabel || 'Đang xử lý…';
      button.disabled = true;
    });
  });
  window.addEventListener('pageshow', () => {
    pending.forEach(({ button, html }, form) => {
      button.innerHTML = html;
      button.disabled = false;
      form.removeAttribute('aria-busy');
    });
    pending.clear();
  });
  document.querySelectorAll('.catalog-source-card__image img').forEach((image) => {
    const failed = () => {
      image.hidden = true;
      const notice = image.parentElement.querySelector('.catalog-image-error');
      if (notice) notice.hidden = false;
    };
    image.addEventListener('error', failed);
    if (image.complete && image.naturalWidth === 0) failed();
  });
})();
