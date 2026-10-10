<?php declare(strict_types=1); ?>
<details class="studio-intelligence studio-intelligence--contextual" id="studioIntelligence">
    <summary><span><strong>Cần gợi ý cách phối?</strong><small>Mẫu phối sẵn hoặc AI tư vấn · tùy chọn</small></span><span class="studio-intelligence__chevron" aria-hidden="true">›</span></summary>
    <div class="studio-intelligence__body">
        <div class="studio-intelligence__switch" role="group" aria-label="Cách nhận gợi ý">
            <button type="button" data-advice-pane="lookbooks" aria-pressed="true">Mẫu phối sẵn</button>
            <button type="button" data-advice-pane="stylist" aria-pressed="false">AI tư vấn</button>
        </div>
        <p id="adviceStatus" role="status"></p>
        <section id="adviceLookbookPane" aria-labelledby="adviceLookbookTitle">
            <h3 id="adviceLookbookTitle">Chọn mẫu để bắt đầu</h3>
            <p class="studio-intelligence__note">Chỉ đổi lựa chọn của người đang chỉnh, không tự tạo ảnh. Ảnh bên dưới là tư liệu có nguồn, không phải kết quả AI.</p>
            <div class="studio-intelligence__lookbooks" id="adviceLookbooks"></div>
        </section>
        <section id="adviceStylistPane" aria-labelledby="adviceStylistTitle" hidden>
            <h3 id="adviceStylistTitle">Tư vấn cho lựa chọn của bạn</h3>
            <label for="adviceIntent">Mục đích</label>
            <select id="adviceIntent"><option value="remix">Remix hiện đại</option><option value="historical">Hướng tới phục dựng lịch sử</option></select>
            <label for="advicePreference">Sở thích · không bắt buộc</label>
            <textarea id="advicePreference" rows="2" maxlength="240" placeholder="Ví dụ: thích tối giản, dễ đi lại, không muốn thêm phụ kiện"></textarea>
            <p class="studio-intelligence__note">Không nhập thông tin cá nhân. AI chỉ nhận lựa chọn trang phục, sở thích và bối cảnh; không nhận ảnh khuôn mặt, tên, giới tính hay số đo.</p>
            <div class="studio-intelligence__actions"><button type="button" id="adviceRecommend">Gợi ý biên tập</button><button type="button" id="adviceAI">AI tư vấn · 1 lượt</button></div>
            <div id="adviceText"></div>
            <details class="studio-intelligence__reference"><summary>Lưu ý văn hóa và nguồn</summary><div id="adviceGuards" aria-live="polite"></div></details>
        </section>
    </div>
</details>
