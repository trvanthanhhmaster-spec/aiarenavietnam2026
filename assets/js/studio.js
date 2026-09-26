(function () {
  'use strict';

  var catalog = window.VREMIX_STUDIO || {};
  var form = document.getElementById('studioForm');
  var summary = document.getElementById('selectionSummary');
  var result = document.getElementById('studioResult');
  var resultGarment = document.getElementById('resultGarment');
  var resultStory = document.getElementById('resultStory');
  var resultGuardrail = document.getElementById('resultGuardrail');
  var resultPlaceholder = document.querySelector('.result-placeholder p');

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
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var garment = lookup(catalog.garments, selected('garment'));
    var occasion = lookup(catalog.events, selected('event'));
    resultGarment.textContent = garment.name || 'Bản phối Việt';
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    resultPlaceholder.textContent = 'Đang chuẩn bị job tư vấn văn hóa…';
    resultStory.textContent = garment.origin_note || 'Thông tin nguồn gốc sẽ được bổ sung từ kho tri thức đã duyệt.';
    resultGuardrail.textContent = occasion.cultural_context || 'Kiểm tra hoàn cảnh mặc và giữ nguyên các chi tiết nhận diện trước khi hiện đại hóa.';

    if (!catalog.generationEndpoint) return;
    var payload = {
      eventSlug: selected('event'),
      garmentSlug: selected('garment'),
      accessorySlugs: Array.prototype.map.call(form.querySelectorAll('input[name="accessories[]"]:checked'), function (input) { return input.value; }),
      colorSlug: selected('color'),
      styleSlug: selected('style')
    };
    try {
      var response = await fetch(catalog.generationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Generation failed.');
      resultPlaceholder.textContent = 'Job đã hoàn tất phần tư vấn. Ảnh phối sẽ dùng imagePrompt trong bước sinh ảnh tiếp theo.';
      resultStory.textContent = body.output.story || resultStory.textContent;
      resultGuardrail.textContent = body.output.guardrail || resultGuardrail.textContent;
    } catch (error) {
      resultPlaceholder.textContent = 'Chưa thể gọi Gemini trong môi trường hiện tại; bản preview vẫn giữ lựa chọn và guardrail từ catalog.';
    }
  });

  updateSummary();
})();
