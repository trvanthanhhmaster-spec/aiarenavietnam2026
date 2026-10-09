(function () {
  'use strict';
  var experience = document.getElementById('studioExperience');
  var api = experience.plannerApi;
  function id(name) { return document.getElementById(name); }
  function error(message) { id('plannerError').hidden = !message; id('plannerError').textContent = message || ''; }
  function action(fn) { try { fn(); error(''); return true; } catch (e) { error(e.message); return false; } }
  function commitProfile() {
    var plan = api.get(), person = plan.people[plan.activePerson - 1];
    if (!person) return true;
    var name = id('personName').value, height = id('personHeight').value, weight = id('personWeight').value, gender = id('personGender').value;
    if (name === person.name && height === String(person.heightCm == null ? '' : person.heightCm)
        && weight === String(person.weightKg == null ? '' : person.weightKg) && gender === (person.gender || '')) return true;
    return action(function () { api.profile(name, height, weight, gender); });
  }
  function render() {
    var guide = experience.studioGuide, plan = guide.planning, data = window.VREMIX_STUDIO;
    id('plannerGroupMode').hidden = plan.count < 2;
    id('plannerPeople').replaceChildren(); id('plannerReviewPeople').replaceChildren();
    plan.people.forEach(function (p) {
      var variant = (data.garmentVariants || []).find(function (v) { return v.slug === p.outfit.garmentVariant; });
      var garment = (data.garments || []).find(function (g) { return g.slug === p.outfit.garment; });
      var label = p.name || 'Người ' + p.id;
      var button = document.createElement('button'); button.type = 'button';
      button.dataset.plannerPerson = p.id;
      button.textContent = label + ' · ' + (p.outfit.garment ? 'Đã chọn' : 'Chưa chọn');
      button.setAttribute('aria-pressed', String(p.id === plan.activePerson));
      button.addEventListener('click', function () { api.person(p.id); }); id('plannerPeople').appendChild(button);
      var row = document.createElement('p'); row.textContent = label + ': ' + (variant ? variant.name : garment ? garment.name : 'Chưa chọn') + (window.VRemixPlanner.genderLabel(p.gender) ? ' · ' + window.VRemixPlanner.genderLabel(p.gender) : '') + (p.outfit.accessories.length ? ' · ' + p.outfit.accessories.length + ' phụ kiện' : '') + (p.faceSupplied ? ' · có ảnh tham khảo' : '');
      id('plannerReviewPeople').appendChild(row);
    });
    id('plannerPeriodSummary').textContent = guide.labels.time;
    id('customOccasionStatus').hidden = !plan.customOccasion;
    id('customOccasionStatus').textContent = plan.customOccasion ? plan.customOccasion : '';
    id('customOccasionStatus').setAttribute('aria-label', 'Dịp đã chọn: ' + (plan.customOccasion || ''));
    id('useNoteOccasion').disabled = id('occasionNote').value.trim().length < 2;
    id('groupCount').value = plan.count || '';
    id('chooseGroup').setAttribute('aria-pressed', String(plan.count > 2));
    id('groupCountFields').hidden = !(plan.count > 2);
    id('plannerPeopleSummary').hidden = !plan.count;
    id('plannerPeopleSummary').textContent = plan.count ? 'Đã chọn ' + plan.count + ' người. Tiếp tục để chọn thời gian.' : '';
    document.querySelectorAll('[data-person-count]').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.personCount) === plan.count)); });
    document.querySelectorAll('[data-period]').forEach(function (b) { b.setAttribute('aria-pressed', String(Boolean(plan.period && b.dataset.period === plan.period.kind))); });
    document.querySelectorAll('[data-group-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String((b.dataset.groupMode === 'shared') === plan.shared)); });
    var p = plan.people[plan.activePerson - 1]; if (!p) return;
    id('plannerPersonHint').textContent = plan.count === 1 ? 'Chọn bộ bạn thích rồi tiếp tục.' : 'Đang phối cho ' + (p.name || 'Người ' + p.id) + '. ' + (plan.shared && p.id === 1 ? 'Bộ này là gợi ý chung cho những người chưa tùy chỉnh.' : 'Bạn có thể chọn trang phục và phụ kiện riêng.');
    id('personName').value = p.name; id('personHeight').value = p.heightCm == null ? '' : p.heightCm; id('personWeight').value = p.weightKg == null ? '' : p.weightKg;
    id('personGender').value = p.gender || '';
    id('personDetailsTitle').textContent = 'Thông tin · ' + (p.name || 'Người ' + p.id);
    var url = api.faceUrl();
    id('personFace').value = ''; id('personFacePreview').hidden = !url; id('removePersonFace').hidden = !url;
    id('personFaceConsent').checked = Boolean(url);
    if (url) { id('personFacePreview').src = url; }
    else id('personFacePreview').removeAttribute('src');
    id('personFace').disabled = !id('personFaceConsent').checked;
  }
  experience.addEventListener('studio:selection', function (event) {
    if (event.detail.changed === 'person') { id('personFaceConsent').checked = false; id('personDetails').open = false; }
    render();
  });
  experience.addEventListener('click', function (event) {
    var count = event.target.closest('[data-person-count]'); if (count) action(function () { api.count(Number(count.dataset.personCount)); });
    var period = event.target.closest('[data-period]'); if (period) action(function () { api.period(period.dataset.period); });
    var group = event.target.closest('[data-group-mode]'); if (group) action(function () { api.shared(group.dataset.groupMode === 'shared'); });
  });
  id('chooseGroup').addEventListener('click', function () { id('groupCountFields').hidden = false; id('groupCount').focus(); });
  id('applyGroupCount').addEventListener('click', function () { action(function () { api.count(Number(id('groupCount').value)); }); });
  id('applyCustomPeriod').addEventListener('click', function () { action(function () { api.period('custom', id('periodStart').value, id('periodEnd').value); }); });
  id('occasionNote').addEventListener('input', function () { api.occasionNote(this.value); });
  id('useSearchOccasion').addEventListener('click', function () { action(function () { api.customOccasion(id('occasionSearch').value); }); });
  id('useNoteOccasion').addEventListener('click', function () { action(function () { api.customOccasion(id('occasionNote').value); }); });
  ['personName', 'personHeight', 'personWeight', 'personGender'].forEach(function (name) { id(name).addEventListener('change', commitProfile); });
  // Capture before the workspace's navigation handlers: invalid measurements
  // must not silently create a look using the previously saved profile.
  experience.addEventListener('click', function (event) {
    if (experience.dataset.guideStep !== 'garment') return;
    if (!event.target.closest('#guideContinue, #plannerGenerate, [data-planner-person]')) return;
    if (!commitProfile()) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  id('personFaceConsent').addEventListener('change', function () {
    id('personFace').disabled = !this.checked; if (!this.checked) api.face(null, false);
  });
  id('personFace').addEventListener('change', function () { var file = this.files[0]; action(function () { api.face(file, id('personFaceConsent').checked); }); });
  id('removePersonFace').addEventListener('click', function () { api.face(null, false); id('personFaceConsent').checked = false; id('personFace').disabled = true; });
  id('plannerGenerate').addEventListener('click', function () { if (!this.disabled) api.generate(); });
  var today = window.VRemixPlanner.localDate(new Date()); id('periodStart').min = today; id('periodEnd').min = today;
  render();
})();
