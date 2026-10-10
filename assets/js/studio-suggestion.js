(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.VRemixSuggestion = api; api.init(root); }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  function find(rows, slug) { return (rows || []).find(function (r) { return r.slug === slug; }); }
  function safeUrl(value) { return /^(?:https:\/\/|assets\/)/.test(String(value || '')) ? value : ''; }
  function build(selection, catalog) {
    var plan = selection.planning;
    if (!selection.event || !plan || !plan.count || plan.people.length !== plan.count) throw new Error('Hoàn tất dịp mặc và số người trước.');
    var event = find(catalog.events, selection.event);
    var occasion = selection.event === 'custom' ? plan.customOccasion : event && event.label;
    if (!occasion) throw new Error('Chọn dịp mặc trước.');
    return { occasion: occasion, people: plan.people.map(function (person) {
      var o = person.outfit, garment = find(catalog.garments, o.garment);
      if (!garment) throw new Error('Chọn trang phục cho mọi người trước.');
      var variant = find(catalog.garmentVariants, o.garmentVariant);
      if (o.garmentVariant && (!variant || variant.garment_id !== garment.id)) throw new Error('Mẫu trang phục không còn khả dụng.');
      var facts = ((catalog.intelligence || {}).heritage || {})[o.garment] || {};
      var choices = [];
      ['color','pattern','style','scene'].forEach(function (key) {
        var row = find(catalog[{color:'colors',pattern:'patterns',style:'styles',scene:'scenes'}[key]], o[key]);
        if (o[key] && !row) throw new Error('Lựa chọn không còn trong catalog.');
        if (row) choices.push(({color:'Màu',pattern:'Họa tiết',style:'Phong cách',scene:'Bối cảnh'})[key] + ': ' + (row.label || row.name));
      });
      var accessories = (o.accessories || []).map(function (slug) {
        var a = find(catalog.accessories, slug); if (!a) throw new Error('Phụ kiện không còn trong catalog.');
        return a.name || a.label;
      });
      choices.push('Phụ kiện: ' + (accessories.length ? accessories.join(', ') : 'Không thêm phụ kiện'));
      return { personId:person.id, garment:garment.name, sample:variant && variant.name || '',
        image:safeUrl(variant && (variant.thumbnail_url || variant.image_url) || garment.thumbnail_url || garment.image_url),
        imageSource:safeUrl(variant && variant.source_url || ''),
        choices:choices, origin:facts.origin || garment.origin_note || '', meaning:facts.meaning || garment.significance_note || '',
        structure:facts.structure || '', sources:(facts.sources || []).map(function (s) { return {title:s.publisher || s.title, url:safeUrl(s.url)}; }) };
    }) };
  }
  function init(win) {
    var doc = win.document, experience = doc.getElementById('studioExperience'), dialog = doc.getElementById('studioSuggestion');
    if (!experience || !experience.plannerApi || !dialog) return;
    var list = doc.getElementById('suggestionPeople'), status = doc.getElementById('suggestionStatus'), opener;
    function node(tag, text, cls) { var e = doc.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; }
    function link(url, label) { var a = node('a',label + ' ↗'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
    doc.querySelectorAll('[data-show-suggestion]').forEach(function (button) {
      button.addEventListener('click', function () {
        opener = button;
        try {
          var model = build(experience.plannerApi.selection(), win.VREMIX_STUDIO || {});
          list.replaceChildren();
          status.textContent = model.occasion + ' · ' + model.people.length + ' người · Chưa gọi AI';
          model.people.forEach(function (p) {
            var article = node('article','', 'studio-suggestion__person');
            article.append(node('h3','Người ' + p.personId + ' · ' + p.garment));
            if (p.image) { var img = node('img'); img.src = p.image; img.alt = 'Ảnh mẫu tham khảo · ' + p.garment; img.loading = 'lazy';
              img.addEventListener('error',function () { img.hidden = true; }); article.append(img); }
            if (p.sample) article.append(node('p',p.sample));
            var choices = node('ul'); p.choices.forEach(function (choice) { choices.append(node('li',choice)); }); article.append(choices);
            article.append(node('p','Ảnh mẫu không đổi màu, nền hoặc phụ kiện theo lựa chọn. Muốn xem hình tái hiện, hãy tạo ảnh AI.', 'studio-suggestion__note'));
            if (p.imageSource) article.append(link(p.imageSource,'Nguồn ảnh mẫu'));
            if (p.origin) article.append(node('h4','Nguồn gốc'),node('p',p.origin));
            if (p.meaning) article.append(node('h4','Ý nghĩa'),node('p',p.meaning));
            if (p.structure) article.append(node('p',p.structure));
            p.sources.forEach(function (s) { if (s.url) article.append(link(s.url,s.title)); });
            list.append(article);
          });
          if (!dialog.open) dialog.showModal();
        } catch (error) { doc.getElementById('studioSrStatus').textContent = error.message; button.textContent = error.message; }
      });
    });
    doc.getElementById('closeSuggestion').addEventListener('click',function () { dialog.close(); });
    dialog.addEventListener('close',function () { if (opener) opener.focus(); });
    experience.addEventListener('studio:selection', function () { if (dialog.open) status.textContent = 'Lựa chọn đã đổi. Đóng thẻ và mở lại để xem lựa chọn mới.'; });
  }
  return {build:build, init:init};
});
