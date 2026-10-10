(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.VRemixIntelligence = api; api.init(root); }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  function privateSelection(selection) {
    var result = JSON.parse(JSON.stringify(selection));
    if (result.planning) {
      result.planning.occasionNote = ''; result.planning.customOccasion = '';
      result.planning.people = result.planning.people.map(function (p) { return { id: p.id, outfit: p.outfit, customized: p.customized }; });
    }
    return result;
  }
  function guards(selection, intent, knowledge) {
    var result = [];
    ((selection.planning || {}).people || []).forEach(function (p) {
      var o = p.outfit, facts = knowledge.heritage[o.garment]; if (!facts) return;
      var modern = o.accessories.some(function (a) { return ['sneaker-trang', 'tui-tote', 'dong-ho-thong-minh', 'kinh-ram'].indexOf(a) >= 0; }) || ['streetwear', 'street-soft', 'school-polished'].indexOf(o.style) >= 0;
      if (modern) result.push({ personId: p.id, code: 'modern-remix', severity: intent === 'historical' ? 'warning' : 'info',
        message: intent === 'historical' ? 'Chi tiết hiện đại không phù hợp với tuyên bố phục dựng lịch sử. Đổi sang Remix hoặc đối chiếu và bỏ chi tiết hiện đại.' : 'Bản phối hiện đại, không phải phục dựng lịch sử. Sneaker/tote không mặc nhiên là sai văn hóa.', sources: facts.sources });
      if (o.garment === 'ao-nhat-binh') result.push({ personId: p.id, code: 'rank-not-verified', severity: 'info', message: 'Không gán phẩm cấp cung đình chỉ từ màu áo trong bản phối hiện đại.', sources: facts.sources });
      result.push({ personId: p.id, code: 'preserve-construction', severity: 'info', message: facts.structure + ' Đối chiếu ảnh tạo ra ở phần Kết quả.', sources: facts.sources });
    });
    return result;
  }
  function recipeFeedback(before, after, catalog) {
    var plan = after.planning, person = plan.people[plan.activePerson - 1], outfit = person.outfit;
    function label(rows, slug) { var row = (rows || []).find(function (r) { return r.slug === slug; }); return row && (row.name || row.label); }
    var previous = before.planning.people[person.id - 1];
    return {
      title: (previous && JSON.stringify(previous.outfit) === JSON.stringify(outfit) ? 'Đang dùng mẫu này' : 'Đã áp dụng mẫu') + ' · Người ' + person.id,
      choices: [label(catalog.garmentVariants, outfit.garmentVariant) || label(catalog.garments, outfit.garment),
        label(catalog.colors, outfit.color), label(catalog.patterns, outfit.pattern), label(catalog.styles, outfit.style),
        label(catalog.scenes, outfit.scene), outfit.accessories.length ? outfit.accessories.map(function (slug) { return label(catalog.accessories, slug) || slug; }).join(', ') : 'Không thêm phụ kiện'].filter(Boolean).join(' · ')
    };
  }
  function init(win) {
    var doc = win.document, panel = doc.getElementById('studioIntelligence'), experience = doc.getElementById('studioExperience');
    if (!panel || !experience || !experience.plannerApi) return;
    var catalog = win.VREMIX_STUDIO || {}, knowledge = catalog.intelligence;
    if (!knowledge) return;
    var planner = experience.plannerApi, context = null, contextId = '', busy = false;
    var get = function (id) { return doc.getElementById(id); };
    var status = get('adviceStatus'), books = get('adviceLookbooks'), text = get('adviceText'), contextView = get('adviceContext');
    function showAdvicePane(name) {
      get('adviceLookbookPane').hidden = name !== 'lookbooks';
      get('adviceStylistPane').hidden = name !== 'stylist';
      panel.querySelectorAll('[data-advice-pane]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.advicePane === name)); });
    }
    panel.querySelectorAll('[data-advice-pane]').forEach(function (button) { button.addEventListener('click', function () { showAdvicePane(button.dataset.advicePane); }); });
    function node(tag, value, className) { var e = doc.createElement(tag); if (value) e.textContent = value; if (className) e.className = className; return e; }
    function source(url, title) { var a = node('a', title + ' ↗'); if (/^https:\/\//.test(url)) a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
    function current() { return privateSelection(planner.selection()); }
    function samePeriod() { return context && JSON.stringify(context.period) === JSON.stringify(current().planning.period); }
    function renderGuards(rows) {
      var view = get('adviceGuards'); view.replaceChildren();
      if (!rows.length) { view.append(node('p', 'Chọn một dáng áo để xem lưu ý văn hóa.', 'studio-intelligence__note')); return; }
      view.append(node('p', 'Lưu ý văn hóa · quy tắc biên tập, không phải chứng nhận', 'studio-intelligence__note'));
      rows.forEach(function (r) {
        var box = node('div', '', 'studio-intelligence__guard' + (r.severity === 'warning' ? ' is-warning' : ''));
        box.append(node('p', 'Người ' + r.personId + ' · ' + r.message));
        (r.sources || []).forEach(function (s) { box.append(source(s.url, s.publisher)); }); view.append(box);
      });
    }
    function renderBooks(rows) {
      books.replaceChildren();
      rows.forEach(function (r) {
        var article = node('article', '', 'studio-intelligence__lookbook'), img = node('img'), body = node('div');
        img.src = r.image; img.alt = r.title + ' · ảnh tư liệu'; img.loading = 'lazy';
        body.append(node('h4', r.title));
        var notes = node('details', '', 'studio-intelligence__reference');
        notes.append(node('summary', 'Lưu ý về mẫu'), node('p', r.note)); body.append(notes);
        if (r.reasons) body.append(node('p', r.reasons.join(' '), 'studio-intelligence__note'));
        body.append(source(r.source, r.credit));
        var apply = node('button', 'Dùng làm bản phối'); apply.type = 'button';
        var feedback = node('div', '', 'studio-intelligence__apply-feedback'); feedback.hidden = true; feedback.setAttribute('role', 'status'); feedback.tabIndex = -1;
        apply.addEventListener('click', function () {
          feedback.hidden = true; feedback.replaceChildren();
          try {
            if (busy) throw new Error('Chờ tư vấn xong trước khi đổi lựa chọn.');
            var before = planner.selection();
            if (!planner.applyRecipe(r.id)) return;
            var result = recipeFeedback(before, planner.selection(), catalog);
            get('recipeAppliedTitle').textContent = result.title;
            get('recipeAppliedChoices').textContent = result.choices;
            get('recipeAppliedNotice').hidden = false;
            status.textContent = result.title + '. Chưa tạo ảnh mới.';
            panel.open = false;
            experience.dispatchEvent(new win.Event('studio:recipe-applied'));
            get('recipeAppliedNotice').focus({preventScroll:true});
            get('recipeAppliedNotice').scrollIntoView({behavior:'instant', block:'start'});
          } catch (error) {
            status.textContent = error.message;
            feedback.append(node('p', error.message));
            var guide = experience.studioGuide;
            if (!busy && guide && !guide.ready) {
              var next = node('button', {event:'Chọn dịp mặc', people:'Chọn số người', time:'Chọn thời gian', garment:'Chọn trang phục'}[guide.next] || 'Hoàn tất lựa chọn'); next.type = 'button';
              next.addEventListener('click', function () { panel.open = false; experience.dispatchEvent(new win.Event('studio:recipe-applied')); });
              feedback.append(next);
            }
            feedback.hidden = false; feedback.focus({preventScroll:true});
            feedback.scrollIntoView({behavior:'instant', block:'nearest'});
          }
        });
        body.append(apply, feedback); article.append(img, body); books.append(article);
      });
    }
    function renderContext() {
      contextView.replaceChildren(); if (!context) return;
      contextView.append(node('p', context.label + (context.current ? ' · Hiện tại ' + context.current.temperature + '°C' : '')));
      if (!samePeriod()) contextView.append(node('p', 'Ngày mặc đã đổi. Bấm Xem thời tiết để cập nhật; bối cảnh cũ không gửi cho AI.', 'studio-intelligence__note'));
      else {
        if (context.forecast) contextView.append(node('p', context.forecast.start + ' – ' + context.forecast.end + ': cao nhất ' + context.forecast.temperatureMax + '°C · khả năng mưa cao nhất ' + context.forecast.rainProbability + '%' + (context.forecast.coverage === 'partial' ? ' · chỉ có một phần khoảng ngày' : '')));
        contextView.append(node('p', context.scopeNote, 'studio-intelligence__note'));
        context.festivals.forEach(function (f) { var row = node('p', f.title + ' · ' + f.start + ' – ' + f.end + ' '); row.append(source(f.source, 'Nguồn lịch')); contextView.append(row); });
        contextView.append(node('p', context.festivalCoverage, 'studio-intelligence__note'));
      }
      var date = new Date(context.fetchedAt); contextView.append(source(context.source, 'Open-Meteo · CC BY 4.0 · lấy lúc ' + date.toLocaleTimeString('vi-VN')));
    }
    function setBusy(value) { busy = value; ['adviceWeather', 'adviceLocate', 'adviceRecommend', 'adviceAI'].forEach(function (id) { get(id).disabled = value; }); }
    async function request(action, extra) {
      if (busy) return;
      var selection = current(), stamp = JSON.stringify(selection);
      var requestStatus = action === 'context' ? get('adviceWeatherStatus') : status;
      setBusy(true); requestStatus.textContent = action === 'stylist' ? 'AI đang tư vấn bằng văn bản… Không tạo ảnh.' : 'Đang lấy gợi ý…';
      try {
        var response = await win.fetch(catalog.advisorEndpoint, {method: 'POST', headers: {'Content-Type': 'application/json', 'X-VRemix-CSRF': catalog.lookCsrf || ''}, body: JSON.stringify(Object.assign({action: action, selection: selection, intent: get('adviceIntent').value, contextId: samePeriod() ? contextId : ''}, extra || {}))});
        var body = await response.json(); if (!response.ok) throw new Error(body.error || 'Tư vấn chưa sẵn sàng.');
        if (stamp !== JSON.stringify(current())) { requestStatus.textContent = 'Lựa chọn đã đổi trong lúc tư vấn. Không áp dụng câu trả lời cũ; không tự gọi AI lại.'; return; }
        if (action === 'context') { context = body.context; contextId = body.contextId; renderContext(); requestStatus.textContent = 'Đã cập nhật bối cảnh. Bản phối không bị thay đổi.'; }
        else {
          renderBooks(body.recommendations); renderGuards(body.guards); text.replaceChildren();
          (body.tips || []).forEach(function (tip) { text.append(node('p', tip)); });
          if (body.ai) {
            text.append(node('p', 'AI Stylist · tư vấn tham khảo, không tự đổi lựa chọn', 'studio-intelligence__note'), node('p', body.ai.summary));
            body.ai.reasons.forEach(function (reason) { text.append(node('p', reason)); });
            if (body.ai.recommendationIds.length) renderBooks(body.recommendations.filter(function (r) { return body.ai.recommendationIds.indexOf(r.id) >= 0; }));
          }
          status.textContent = body.ai ? 'AI đã tư vấn. Chỉ áp dụng khi bạn chọn một bản phối.' : 'Gợi ý theo catalog và lựa chọn của bạn; chưa gọi AI.';
        }
      } catch (error) { requestStatus.textContent = error.message; } finally { setBusy(false); }
    }
    get('adviceWeather').addEventListener('click', function () { var city = get('adviceCity').value; if (!city) { get('adviceWeatherStatus').textContent = 'Chọn khu vực trước khi xem thời tiết.'; return; } request('context', {city: city}); });
    get('adviceCity').addEventListener('change', function () { context = null; contextId = ''; renderContext(); text.replaceChildren(); });
    get('adviceLocate').addEventListener('click', function () {
      if (busy) return;
      if (!win.navigator.geolocation) { get('adviceWeatherStatus').textContent = 'Trình duyệt chưa hỗ trợ vị trí. Hãy chọn khu vực thủ công.'; return; }
      if (!win.confirm('Bạn đồng ý lấy vị trí rồi làm tròn khoảng 10 km, gửi khu vực gần đúng cho máy chủ V-Remix và Open-Meteo để lấy thời tiết? Không gửi tọa độ chính xác, không lưu vào bản phối.')) return;
      setBusy(true); get('adviceWeatherStatus').textContent = 'Đang nhận diện khu vực…';
      win.navigator.geolocation.getCurrentPosition(function (position) { setBusy(false); request('context', {locationConsent: true, latitude: Math.round(position.coords.latitude * 10) / 10, longitude: Math.round(position.coords.longitude * 10) / 10}); }, function () { setBusy(false); get('adviceWeatherStatus').textContent = 'Không nhận được vị trí. Bạn có thể chọn khu vực thủ công.'; }, {enableHighAccuracy: false, timeout: 10000, maximumAge: 300000});
    });
    get('adviceRecommend').addEventListener('click', function () { request('recommend'); });
    get('adviceAI').addEventListener('click', function () {
      if (!win.confirm('Gửi một lượt AI tư vấn văn bản từ lựa chọn, sở thích và thời tiết đã xác nhận? Không tạo ảnh, không gửi tên, ảnh khuôn mặt hoặc số đo; có thể tiêu tốn một lượt AI.')) return;
      request('stylist', {aiConsent: true, requestId: win.crypto.randomUUID(), preference: get('advicePreference').value.trim()});
    });
    function changed() { get('recipeAppliedNotice').hidden = true; text.replaceChildren(); renderGuards(guards(current(), get('adviceIntent').value, knowledge)); renderContext(); }
    get('adviceIntent').addEventListener('change', changed);
    experience.addEventListener('studio:selection', changed);
    renderBooks(knowledge.lookbooks); changed();
    experience.adviceContextId = function () { return samePeriod() ? contextId : ''; };
  }
  return { privateSelection: privateSelection, guards: guards, recipeFeedback: recipeFeedback, init: init };
});
