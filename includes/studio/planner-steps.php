<div class="studio-progress" aria-label="Bốn bước để chuẩn bị bản phối">
    <?php foreach (['event' => 'Dịp mặc', 'people' => 'Số người', 'time' => 'Thời gian', 'garment' => 'Trang phục'] as $step => $label): ?>
        <button type="button" class="studio-progress__step" data-progress-step="<?= $step ?>" data-guide-step="<?= $step ?>">
            <span><?= sprintf('%02d', array_search($step, ['event', 'people', 'time', 'garment'], true) + 1) ?></span><strong><?= $label ?></strong>
        </button>
    <?php endforeach; ?>
    <p id="studioNextHint">Bắt đầu bằng cách chọn dịp bạn sẽ mặc.</p>
</div>

<section class="studio-catalog-card studio-catalog-card--event" data-guide-card="event" aria-labelledby="catalogEventTitle">
    <div class="studio-catalog-card__head"><h2 id="catalogEventTitle">Bạn sẽ mặc đi đâu?</h2></div>
    <label class="planner-field">Tìm dịp mặc<input id="occasionSearch" type="search" placeholder="Đi học, dự lễ, chụp ảnh…" autocomplete="off"></label>
    <div class="studio-catalog-grid studio-catalog-grid--event" id="catalogEvents"></div>
    <p id="occasionNoResults" class="guide-card-note" hidden>Chưa có dịp phù hợp. Bạn có thể chọn dịp gần nhất và thêm mô tả bên dưới.</p>
    <details class="planner-details"><summary>Cần gợi ý hoặc có dịp khác?</summary>
        <p class="guide-card-note">Gợi ý từ bộ sưu tập đã duyệt, không gọi AI hay tạo ảnh ở bước này.</p>
        <div id="occasionSuggestions" class="planner-suggestions"></div>
        <label class="planner-field">Mô tả thêm dịp của bạn<textarea id="occasionNote" maxlength="400" placeholder="Ví dụ: chụp kỷ yếu cùng bạn thân ở sân trường"></textarea></label>
        <small>Chọn một dịp gần nhất ở trên. Mô tả này là nhu cầu của bạn, không phải thông tin văn hóa đã xác minh.</small>
    </details>
</section>

<section class="studio-catalog-card" data-guide-card="people" aria-labelledby="plannerPeopleTitle" hidden>
    <div class="studio-catalog-card__head"><h2 id="plannerPeopleTitle">Bạn phối cho bao nhiêu người?</h2></div>
    <div class="planner-choices">
        <button type="button" data-person-count="1">Một mình<small>1 người</small></button>
        <button type="button" data-person-count="2">Hai người<small>Phối cùng nhau</small></button>
        <button type="button" id="chooseGroup">Một nhóm<small>Nhập số người</small></button>
    </div>
    <div id="groupCountFields" hidden>
        <label class="planner-field">Số người trong nhóm<input type="number" id="groupCount" min="1" max="12" step="1" inputmode="numeric" placeholder="Ví dụ: 4"></label>
        <button type="button" class="planner-secondary" id="applyGroupCount">Chọn số người này</button>
        <p class="guide-card-note">Bản demo hỗ trợ 1–12 người. Giảm số người sẽ bỏ lựa chọn của những người ở cuối danh sách.</p>
    </div>
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
    <p class="guide-card-note">Đây là ngày mặc, không phải thời điểm trong ảnh. Studio không dùng dự báo thời tiết trực tiếp.</p>
</section>
<p id="plannerError" class="planner-error" role="alert" hidden></p>
