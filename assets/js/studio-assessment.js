(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VRemixAssessment = api;
}(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var fields = { garment: 'Dáng áo', variant: 'Mẫu tham chiếu', color: 'Màu', pattern: 'Họa tiết', style: 'Phong cách', accessories: 'Phụ kiện', scene: 'Bối cảnh' };
  var labels = { match: 'AI thấy khớp', mismatch: 'Chưa khớp', uncertain: 'Chưa rõ', 'not-requested': 'Không yêu cầu', 'not-assessed': 'Chưa đối chiếu' };
  function find(rows, slug) { return (rows || []).find(function (row) { return row.slug === slug; }) || {}; }
  function name(row, fallback) { return row.name || row.label || fallback; }
  function safeUrl(value) {
    return typeof value === 'string' && (/^https?:\/\/[^\s]+$/i.test(value) || /^assets\/[a-zA-Z0-9/_\-.]+$/.test(value)) ? value : '';
  }
  function build(selection, output, catalog) {
    catalog = catalog || {}; output = output || {};
    var plan = selection && selection.planning;
    var people = plan && Array.isArray(plan.people) ? plan.people.slice(0, 12) : selection ? [{ id: 1, outfit: selection }] : [];
    var count = plan ? plan.count : people.length;
    var assessment = output.imageAssessment || {};
    var reviewed = assessment.source === 'ai-image-review' && output.reviewStatus === 'completed';
    var allFindings = [];
    var groups = people.map(function (person) {
      var outfit = person.outfit || {}, variant = find(catalog.garmentVariants, outfit.garmentVariant);
      var matches = (Array.isArray(assessment.people) ? assessment.people : []).filter(function (row) { return row.personId === person.id; });
      var checks = reviewed && matches.length === 1 ? matches[0].checks || {} : {};
      var expected = {
        garment: name(find(catalog.garments, outfit.garment), outfit.garment || 'Chưa chọn'),
        variant: name(variant, outfit.garmentVariant || ''),
        color: name(find(catalog.colors, outfit.color), outfit.color || (outfit.garmentVariant ? 'Theo mẫu tham chiếu' : '')),
        pattern: name(find(catalog.patterns, outfit.pattern), outfit.pattern || (outfit.garmentVariant ? 'Theo mẫu tham chiếu' : '')),
        style: name(find(catalog.styles, outfit.style), outfit.style || ''),
        accessories: (Array.isArray(outfit.accessories) ? outfit.accessories : []).map(function (slug) {
          var type = find(catalog.accessories, slug);
          var sample = (Array.isArray(outfit.accessoryVariants) ? outfit.accessoryVariants : []).map(function (s) { return find(catalog.accessoryVariants, s); }).find(function (s) { return type.id && s.accessory_id === type.id; });
          return name(sample || type, slug);
        }).join(', ') || 'Không thêm',
        scene: name(find(catalog.scenes, outfit.scene), outfit.scene || (plan && plan.customOccasion) || name(find(catalog.events, selection && selection.event), 'Theo dịp mặc'))
      };
      var rows = Object.keys(fields).map(function (field) {
        var requested = ['garment', 'accessories', 'scene'].includes(field) || Boolean(expected[field]);
        var status = !requested ? 'not-requested' : !reviewed ? 'not-assessed' : ['match', 'mismatch', 'uncertain'].includes(checks[field]) ? checks[field] : 'uncertain';
        if (requested) allFindings.push(status);
        return { field: field, label: fields[field], expected: expected[field] || 'Không chọn', status: status };
      });
      var constructions = (Array.isArray(assessment.constructionChecks) ? assessment.constructionChecks : []).filter(function (row) { return row.personId === person.id; });
      var construction = reviewed && constructions.length === 1 ? constructions[0] : null;
      var validReason = construction && typeof construction.reason === 'string' && construction.reason.trim().length >= 10;
      var constructionStatus = !reviewed ? 'not-assessed' : validReason && ['match', 'mismatch', 'uncertain'].includes(construction.status) ? construction.status : 'uncertain';
      allFindings.push(constructionStatus);
      var heritage = ((catalog.intelligence || {}).heritage || {})[outfit.garment] || {};
      return { personId: person.id, rows: rows, construction: { status: constructionStatus, reason: validReason ? construction.reason.slice(0, 400) : 'Chưa có nhận xét đủ rõ về cấu trúc nhìn thấy trong ảnh.' },
        structure: heritage.structure || '', sources: (heritage.sources || []).filter(function (s) { return safeUrl(s.url); }),
        reference: { image: safeUrl(variant.image_url || variant.thumbnail_url), url: safeUrl(variant.source_url), title: expected.variant } };
    });
    var observed = reviewed && Number.isInteger(assessment.observedPeopleCount) ? assessment.observedPeopleCount : null;
    var complete = Number.isInteger(count) && count > 0 && count <= 12 && groups.length === count
      && new Set(groups.map(function (g) { return g.personId; })).size === count
      && groups.every(function (g) { return Number.isInteger(g.personId) && g.personId >= 1 && g.personId <= count; })
      && Array.isArray(assessment.people) && assessment.people.length === count;
    var status = !reviewed || !groups.length ? 'not-assessed' : observed !== null && observed !== count || allFindings.includes('mismatch') ? 'mismatch'
      : !complete || observed === null || allFindings.includes('uncertain') ? 'uncertain' : 'matched';
    return { groups: groups, expectedCount: count, observedCount: observed, status: status };
  }
  function render(container, report, doc) {
    doc = doc || document;
    container.replaceChildren(); container.hidden = !report.groups.length;
    function element(tag, text, className) { var node = doc.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node; }
    var summaries = { matched: 'AI chưa thấy sai lệch ở các mục đã đối chiếu', mismatch: 'Có chi tiết chưa khớp với lựa chọn', uncertain: 'Còn chi tiết chưa xác định được', 'not-assessed': 'Chưa có lượt đối chiếu hoàn tất' };
    container.appendChild(element('h3', 'Đối chiếu lựa chọn với ảnh'));
    container.appendChild(element('p', summaries[report.status], 'assessment-summary assessment-summary--' + report.status));
    container.appendChild(element('p', 'Số người đã chọn: ' + report.expectedCount + ' · AI quan sát: ' + (report.observedCount === null ? 'chưa xác định' : report.observedCount), 'assessment-note'));
    report.groups.forEach(function (group) {
      var section = element('section', '', 'assessment-person');
      var table = element('table', '', 'assessment-table');
      table.appendChild(element('caption', 'Người ' + group.personId));
      var head = element('thead'), headRow = element('tr');
      ['Chi tiết', 'Lựa chọn đã xác nhận', 'Đối chiếu AI'].forEach(function (text) { var th = element('th', text); th.scope = 'col'; headRow.appendChild(th); });
      head.appendChild(headRow); table.appendChild(head);
      var body = element('tbody');
      group.rows.forEach(function (row) {
        var tr = element('tr'), th = element('th', row.label); th.scope = 'row';
        var finding = element('td', labels[row.status], 'assessment-finding assessment-finding--' + row.status);
        tr.append(th, element('td', row.expected), finding); body.appendChild(tr);
      });
      table.appendChild(body); section.appendChild(table);
      section.appendChild(element('p', 'Cấu trúc áo · ' + labels[group.construction.status], 'assessment-construction'));
      section.appendChild(element('p', group.construction.reason, 'assessment-note'));
      if (group.structure) section.appendChild(element('p', 'Đặc trưng cần giữ: ' + group.structure, 'assessment-note'));
      if (group.reference.image) { var image = element('img'); image.src = group.reference.image; image.alt = 'Ảnh mẫu tham chiếu: ' + group.reference.title; image.loading = 'lazy'; image.className = 'assessment-reference'; section.appendChild(image); }
      if (group.reference.url) { var referenceLink = element('a', 'Nguồn ảnh mẫu ↗'); referenceLink.href = group.reference.url; referenceLink.target = '_blank'; referenceLink.rel = 'noopener noreferrer'; section.appendChild(referenceLink); }
      group.sources.forEach(function (source) {
        var link = element('a', source.title + ' ↗', 'assessment-source'); link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; section.appendChild(link);
        section.appendChild(element('small', source.scope, 'assessment-note'));
      });
      container.appendChild(section);
    });
    container.appendChild(element('p', 'Đây là đối chiếu thị giác của AI. Chi tiết bị che có thể chưa kiểm tra được; kết quả không xác nhận đúng lịch sử hoặc thay thế chuyên gia Việt phục.', 'assessment-note'));
  }
  return { build: build, render: render };
}));
