(() => {
  'use strict';
  const trigger = document.querySelector('.workspace-profile');
  const dialog = document.getElementById('studioAuthDialog');
  const frame = document.getElementById('studioAuthFrame');
  if (!trigger || !dialog || typeof dialog.showModal !== 'function') return;
  trigger.setAttribute('aria-haspopup', 'dialog');
  let completing = false;
  const complete = () => {
    if (completing) return;
    completing = true;
    // Hide/close before the potentially slow Studio reload. Never retain the
    // callback document as the next account form.
    frame.hidden = true;
    if (dialog.open) dialog.close();
    frame.removeAttribute('src');
    window.location.reload();
  };
  window.addEventListener('message', event => {
    if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
    if (event.data?.type === 'vremix:auth-return') complete();
  });
  const open = async () => {
    if (completing) return;
    document.getElementById('studioExperience')?.resultsApi?.persist();
    // Account access must still work when saving is offline or in conflict.
    // The session store keeps the failed snapshot in its recovery record.
    if (window.VRemixSession) try { await window.VRemixSession.flush(); } catch (_) {}
    if (completing) return;
    frame.hidden = false;
    if (!frame.getAttribute('src')) frame.src = frame.dataset.src;
    if (!dialog.open) dialog.showModal();
  };
  trigger.addEventListener('click', event => {
    event.preventDefault();
    open();
  });
  document.addEventListener('vremix:open-auth', open);
  document.getElementById('studioAuthClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    frame.removeAttribute('src');
    trigger.focus();
  });
  // Escape inside the same-origin form should close the outer dialog too.
  frame.addEventListener('load', () => {
    try {
      const url = new URL(frame.contentWindow.location.href);
      if (url.href === 'about:blank') return;
      if (url.origin === window.location.origin && url.pathname.endsWith('/studio.php') && url.searchParams.get('authReturn') === '1') {
        complete();
        return;
      }
      const account = frame.contentDocument.querySelector('[data-account-name]');
      if (account) {
        const name = account.dataset.accountName;
        const avatar = trigger.querySelector('span');
        const label = trigger.querySelector('small');
        if (avatar) avatar.textContent = Array.from(name)[0].toLocaleUpperCase('vi');
        if (label) label.textContent = name;
        trigger.setAttribute('aria-label', 'Tài khoản ' + name);
        trigger.setAttribute('title', name);
      }
      const resize = () => { frame.style.height = Math.ceil(frame.contentDocument.body.getBoundingClientRect().height) + 'px'; };
      resize();
      if (frame.contentWindow.ResizeObserver) {
        const observer = new frame.contentWindow.ResizeObserver(resize);
        observer.observe(frame.contentDocument.body);
      }
      frame.contentDocument.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
      });
    } catch (_) { /* OAuth runs in the top-level window, never inside this form. */ }
  });
})();
