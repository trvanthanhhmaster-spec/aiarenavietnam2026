<div class="studio-progress" aria-label="Bốn bước để chuẩn bị bản phối">
    <?php foreach (['event' => 'Dịp mặc', 'people' => 'Số người', 'time' => 'Thời gian', 'garment' => 'Trang phục'] as $step => $label): ?>
        <button type="button" class="studio-progress__step" data-progress-step="<?= $step ?>" data-guide-step="<?= $step ?>">
            <span><?= sprintf('%02d', array_search($step, ['event', 'people', 'time', 'garment'], true) + 1) ?></span><strong><?= $label ?></strong>
        </button>
    <?php endforeach; ?>
    <p id="studioNextHint" hidden></p>
</div>

<section class="studio-catalog-card studio-catalog-card--event" data-guide-card="event" aria-labelledby="catalogEventTitle">
    <div class="studio-catalog-card__head"><h2 id="catalogEventTitle">Bạn sẽ mặc đi đâu?</h2></div>
    <label class="planner-field">Tìm dịp mặc<input id="occasionSearch" type="search" placeholder="Đi học, dự lễ, chụp ảnh…" autocomplete="off"></label>
    <div class="studio-catalog-grid studio-catalog-grid--event" id="catalogEvents"></div>
    <p id="customOccasionStatus" class="guide-card-note" role="status" hidden></p>
    <div id="occasionNoResults" hidden><p class="guide-card-note">Chưa có dịp này trong bộ sưu tập. Bạn vẫn có thể dùng dịp tự nhập để tiếp tục.</p><button type="button" class="planner-secondary" id="useSearchOccasion"></button></div>
    <details class="planner-details"><summary>Cần gợi ý hoặc có dịp khác?</summary>
        <div id="occasionSuggestions" class="planner-suggestions"></div>
        <label class="planner-field">Mô tả nhu cầu (không bắt buộc)<textarea id="occasionNote" maxlength="400" placeholder="Ví dụ: chụp kỷ yếu cùng bạn thân ở sân trường"></textarea></label>
        <button type="button" class="planner-secondary" id="useNoteOccasion" disabled>Dùng mô tả này làm dịp mặc</button>
    </details>
</section>

<section class="studio-catalog-card" data-guide-card="people" aria-labelledby="plannerPeopleTitle" hidden>
    <div class="studio-catalog-card__head"><h2 id="plannerPeopleTitle">Bạn phối cho bao nhiêu người?</h2></div>
    <div class="planner-choices">
        <button type="button" data-person-count="1">Một mình<small>1 người</small></button>
        <button type="button" data-person-count="2">Hai người<small>Phối cùng nhau</small></button>
        <button type="button" id="chooseGroup" aria-pressed="false">Một nhóm<small>Nhập số người</small></button>
    </div>
    <div id="groupCountFields" hidden>
        <label class="planner-field">Số người trong nhóm<input type="number" id="groupCount" min="1" max="12" step="1" inputmode="numeric" placeholder="Ví dụ: 4"></label>
        <button type="button" class="planner-secondary" id="applyGroupCount">Chọn số người này</button>
        <p class="guide-card-note">Tối đa 12 người.</p>
    </div>
    <p id="plannerPeopleSummary" class="guide-card-note planner-people-summary" role="status" hidden></p>
</section>

<section class="studio-catalog-card" data-guide-card="time" aria-labelledby="plannerTimeTitle" hidden>
    <div class="studio-catalog-card__head"><h2 id="plannerTimeTitle">Bạn dự định mặc khi nào?</h2></div>
    <div class="planner-choices">
        <button type="button" data-period="this-week">Tuần này</button>
        <button type="button" data-period="next-week">Tuần sau</button>
        <button type="button" data-period="next-month">Tháng sau</button>
        <button type="button" data-period="unspecified">Chưa xác định</button>
    </div>
    <p id="plannerPeriodSummary" class="guide-card-note"></p>
    <details class="planner-details"><summary>Chọn ngày hoặc khoảng ngày</summary>
        <label class="planner-field">Ngày bắt đầu<input type="date" id="periodStart"></label>
        <label class="planner-field">Ngày kết thúc <small>Không bắt buộc</small><input type="date" id="periodEnd"></label>
        <button type="button" class="planner-secondary" id="applyCustomPeriod">Dùng ngày đã chọn</button>
    </details>
    <?php require __DIR__ . '/weather-advice.php'; ?>
</section>
<p id="plannerError" class="planner-error" role="alert" hidden></p>
