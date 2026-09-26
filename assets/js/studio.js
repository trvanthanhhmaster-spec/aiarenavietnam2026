(function () {
  'use strict';

  var catalog = window.VREMIX_STUDIO || {};
  var form = document.getElementById('studioForm');
  var summary = document.getElementById('selectionSummary');
  var result = document.getElementById('studioResult');
  var resultGarment = document.getElementById('resultGarment');
  var resultStory = document.getElementById('resultStory');
  var resultGuardrail = document.getElementById('resultGuardrail');

  function selected(name) {
    var input = form.querySelector('input[name="' + name + '"]:checked');
    return input ? input.value : '';
  }

  function lookup(items, key) {
    return (items || []).find(function (item) { return item.slug === key; }) || {};
  }

  function updateSummary() {
    var event = lookup(catalog.events, selected('event'));
    var garment = lookup(catalog.garments, selected('garment'));
    var style = lookup(catalog.styles, selected('style'));
    summary.textContent = [event.label, garment.name, style.label].filter(Boolean).join(' · ');
  }

  form.addEventListener('change', updateSummary);
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var garment = lookup(catalog.garments, selected('garment'));
    var occasion = lookup(catalog.events, selected('event'));
    resultGarment.textContent = garment.name || 'Bản phối Việt';
    resultStory.textContent = garment.origin_note || 'Thông tin nguồn gốc sẽ được bổ sung từ kho tri thức đã duyệt.';
    resultGuardrail.textContent = occasion.cultural_context || 'Kiểm tra hoàn cảnh mặc và giữ nguyên các chi tiết nhận diện trước khi hiện đại hóa.';
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  updateSummary();
})();
