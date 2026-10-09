<div id="plannerGroupMode" hidden>
    <p class="guide-card-note">Cả nhóm cùng một tinh thần hay mỗi người một bộ?</p>
    <div class="planner-choices">
        <button type="button" data-group-mode="shared">Phối đồng điệu<small>Dùng bộ của Người 1 làm gợi ý chung</small></button>
        <button type="button" data-group-mode="individual">Mỗi người một bộ<small>Chọn riêng cho từng người</small></button>
    </div>
</div>
<div id="plannerPeople" class="planner-person-tabs" aria-label="Chọn người để phối đồ"></div>
<p class="guide-card-note" id="plannerPersonHint"></p>
<details class="planner-details" id="personDetails">
    <summary class="planner-person-summary"><span><strong id="personDetailsTitle">Thông tin người mặc</strong><small>Giới tính, vóc dáng và ảnh tham khảo · Tuỳ chọn</small></span><svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg></summary>
    <div class="planner-person-fields">
    <label class="planner-field">Tên gọi<input id="personName" type="text" maxlength="60" placeholder="Ví dụ: Linh" autocomplete="off"></label>
    <label class="planner-field">Giới tính <select id="personGender" aria-describedby="personGenderHint"><option value="">Không chọn</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select></label>
    <p class="guide-card-note" id="personGenderHint">Không bắt buộc. Bạn vẫn có thể chọn mọi trang phục.</p>
    <div class="planner-measurements">
        <label class="planner-field">Chiều cao (cm)<input id="personHeight" type="number" min="50" max="250" step="1" inputmode="numeric" placeholder="Ví dụ: 170"></label>
        <label class="planner-field">Cân nặng (kg)<input id="personWeight" type="number" min="10" max="300" step="1" inputmode="numeric" placeholder="Ví dụ: 60"></label>
    </div>
    <p class="guide-card-note">Số đo chỉ giúp minh họa vóc dáng, không dùng để xác định kích cỡ mua/thuê.</p>
    <div class="planner-person-reference">
    <h3>Ảnh tham khảo khuôn mặt</h3>
    <p class="guide-card-note">Thêm ảnh nếu bạn muốn gợi ý khuôn mặt cho người này.</p>
    <label class="planner-consent"><input id="personFaceConsent" type="checkbox"> Tôi có quyền sử dụng và đồng ý gửi ảnh này đến dịch vụ AI để tạo bản phối.</label>
    <label class="planner-field">Chọn ảnh <input id="personFace" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="personFaceHint" disabled></label>
    <p class="guide-card-note" id="personFaceHint">JPG, PNG, WebP · tối đa 8 MB. Ảnh nguồn chỉ giữ trong tab, không lưu vào bản nháp hay thư viện; chỉ gửi đến dịch vụ AI khi bạn bấm tạo. Kết quả có thể không giữ khuôn mặt chính xác.</p>
    <img id="personFacePreview" class="planner-face-preview" alt="Ảnh tham khảo của người đang chọn" hidden>
    <button id="removePersonFace" type="button" class="planner-secondary" hidden>Xóa ảnh tham khảo</button>
    </div>
    </div>
</details>
