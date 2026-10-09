(function () {
  'use strict';
  var nav = document.getElementById('adminNavigation');
  if (!nav) return;
  var search = document.getElementById('adminSearch');
  var toggle = document.getElementById('adminMenuToggle');
  var backdrop = document.getElementById('adminMenuBackdrop');
  var title = document.getElementById('adminGroupTitle');
  var empty = document.getElementById('adminSearchEmpty');
  var groupButtons = Array.from(document.querySelectorAll('[data-admin-group]'));
  var items = Array.from(nav.querySelectorAll('[data-resource], .admin-nav__link'));
  var groups = {
    ai: ['ai-settings', 'studio-generation'],
    catalog: ['events', 'garments', 'garment-variants', 'accessories', 'accessory-variants', 'options', 'marketplace', 'locations', 'rules'],
    editorial: ['branches', 'sources', 'prompts', 'pages'],
    accounts: ['users', 'roles', 'google-auth'],
    operations: ['looks', 'discovery', 'jobs']
  };
  var activeGroup = 'ai';
  function normalize(text) {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  }
  function groupFor(item) {
    return Object.keys(groups).find(function (key) { return groups[key].includes(item.dataset.resource); }) || 'catalog';
  }
  function render() {
    var query = normalize(search.value.trim());
    var count = 0;
    items.forEach(function (item) {
      item.hidden = query ? !normalize(item.textContent).includes(query) : groupFor(item) !== activeGroup;
      if (!item.hidden) count++;
    });
    nav.querySelectorAll('.admin-nav__label').forEach(function (label) { label.hidden = true; });
    title.textContent = query ? 'Kết quả tìm kiếm' : groupButtons.find(function (button) { return button.dataset.adminGroup === activeGroup; }).getAttribute('aria-label');
    empty.hidden = count > 0;
    groupButtons.forEach(function (button) {
      var selected = button.dataset.adminGroup === activeGroup;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  function setOpen(open, returnFocus) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    backdrop.hidden = !open;
    if (open && window.matchMedia('(max-width: 900px)').matches) {
      nav.focus();
    } else if (returnFocus) toggle.focus();
  }
  groupButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var nextGroup = button.dataset.adminGroup;
      if (activeGroup !== nextGroup) {
        // Reuse the existing resource handler, including its unsaved Google-form guard.
        var target = items.find(function (item) { return item.dataset.resource === groups[nextGroup][0]; });
        target.click();
        if (!target.classList.contains('is-active')) return;
      }
      activeGroup = nextGroup;
      search.value = '';
      render();
      setOpen(true, false);
    });
  });
  toggle.addEventListener('click', function () {
    // Full directory on small screens, including groups omitted from the bottom rail.
    var opening = !nav.classList.contains('is-open');
    if (opening) {
      search.value = '';
      render();
      items.forEach(function (item) { item.hidden = false; });
      nav.querySelectorAll('.admin-nav__label').forEach(function (label) { label.hidden = false; });
      title.textContent = 'Tất cả mục quản trị';
    }
    setOpen(opening, !opening);
  });
  document.getElementById('adminMenuClose').addEventListener('click', function () { setOpen(false, true); });
  backdrop.addEventListener('click', function () { setOpen(false, true); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) setOpen(false, true);
    if (event.key === 'Tab' && nav.classList.contains('is-open') && window.matchMedia('(max-width: 900px)').matches) {
      var controls = Array.from(nav.querySelectorAll('button:not([hidden]), a:not([hidden])')).filter(function (node) { return node.getClientRects().length > 0; });
      var first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === nav)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  search.addEventListener('input', function () { render(); setOpen(true, false); search.focus(); });
  document.addEventListener('admin:resource', function (event) {
    var selected = items.find(function (item) { return item.dataset.resource === event.detail.resource; });
    if (!selected) return;
    activeGroup = groupFor(selected);
    search.value = '';
    render();
    setOpen(false, false);
    if (window.matchMedia('(max-width: 900px)').matches) document.getElementById('adminContent').focus();
  });
  window.matchMedia('(max-width: 900px)').addEventListener('change', function () { setOpen(false, false); });
  var selected = nav.querySelector('.is-active[data-resource]');
  if (selected) selected.setAttribute('aria-current', 'page');
  render();
}());
