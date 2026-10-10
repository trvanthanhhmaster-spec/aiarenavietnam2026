(function () {
  'use strict';
  var example = document.getElementById('studioExample');
  var panel = document.getElementById('studioExampleAssessment');
  var data = document.getElementById('studioExampleData');
  if (!example || !panel || !data || !window.VRemixAssessment) return;
  var rendered = false;
  function render() {
    if (rendered || !example.open) return;
    var proof = JSON.parse(data.textContent);
    window.VRemixAssessment.render(panel, window.VRemixAssessment.build(proof.selection, proof.output, proof.catalog), document);
    rendered = true;
  }
  function open(scroll) {
    example.open = true;
    render();
    if (scroll) example.scrollIntoView({ block: 'start' });
  }
  example.addEventListener('toggle', render);
  document.querySelectorAll('[data-studio-example-link]').forEach(function (link) {
    link.addEventListener('click', function () { open(false); });
  });
  function fromHash() { if (window.location.hash === '#studioExample') open(true); }
  window.addEventListener('hashchange', fromHash);
  fromHash();
}());
