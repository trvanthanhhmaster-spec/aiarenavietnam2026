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
    <summary>Thông tin và ảnh tham khảo của người này <small>Tuỳ chọn</small></summary>
    <label class="planner-field">Tên gọi<input id="personName" type="text" maxlength="60" placeholder="Ví dụ: Linh"></label>
    <div class="planner-measurements">
        <label class="planner-field">Chiều cao (cm)<input id="personHeight" type="number" min="50" max="250" step="1" inputmode="numeric" placeholder="Không bắt buộc"></label>
        <label class="planner-field">Cân nặng (kg)<input id="personWeight" type="number" min="10" max="300" step="1" inputmode="numeric" placeholder="Không bắt buộc"></label>
    </div>
    <p class="guide-card-note">Số đo chỉ giúp minh họa vóc dáng, không dùng để xác định kích cỡ mua/thuê.</p>
    <label class="planner-consent"><input id="personFaceConsent" type="checkbox"> Tôi có quyền sử dụng và đồng ý gửi ảnh này đến dịch vụ AI để tạo bản phối.</label>
    <label class="planner-field">Ảnh tham khảo khuôn mặt<input id="personFace" type="file" accept="image/jpeg,image/png,image/webp" disabled></label>
    <p class="guide-card-note">JPG, PNG, WebP · tối đa 8 MB/ảnh. Ảnh nguồn chỉ giữ trong tab này, không lưu vào bản nháp hay thư viện; sẽ được gửi đến nhà cung cấp khi bạn bấm tạo. Kết quả có thể không giữ khuôn mặt chính xác.</p>
    <img id="personFacePreview" class="planner-face-preview" alt="Ảnh tham khảo của người đang chọn" hidden>
    <button id="removePersonFace" type="button" class="planner-secondary" hidden>Xóa ảnh tham khảo</button>
</details>
