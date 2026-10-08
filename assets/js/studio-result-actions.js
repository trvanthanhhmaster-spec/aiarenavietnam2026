(function () {
  'use strict';
  var more = document.getElementById('studioResultMore');
  if (!more) return;
  var trigger = more.querySelector('summary');
  var actions = Array.from(more.querySelectorAll('button'));

  function refresh() {
    more.hidden = !actions.some(function (button) { return !button.hidden; });
    if (more.hidden) more.open = false;
  }
  var observer = new MutationObserver(refresh);
  actions.forEach(function (button) {
    observer.observe(button, { attributes: true, attributeFilter: ['hidden'] });
  });
  more.addEventListener('click', function (event) {
    if (event.target.closest('button')) { more.open = false; trigger.focus(); }
  });
  document.addEventListener('click', function (event) {
    if (!more.contains(event.target)) more.open = false;
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && more.open) {
      event.preventDefault(); event.stopPropagation();
      more.open = false; trigger.focus();
    }
  }, true);
  window.addEventListener('resize', function () { more.open = false; });
  refresh();
}());
