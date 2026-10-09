<?php declare(strict_types=1); ?>
<details class="studio-intelligence" id="studioIntelligence">
    <summary><span><strong>Gợi ý cho bạn</strong><small>Thời tiết · AI Stylist · Lookbook</small></span><span class="studio-intelligence__chevron" aria-hidden="true">›</span></summary>
    <div class="studio-intelligence__body">
        <section aria-labelledby="adviceAreaTitle">
            <h3 id="adviceAreaTitle">Bạn sẽ mặc ở đâu?</h3>
            <label for="adviceCity">Khu vực</label>
            <select id="adviceCity"><option value="">Chọn khu vực</option><?php foreach (($intelligence['cities'] ?? []) as $city): ?><option value="<?= $escape($city['id']) ?>"><?= $escape($city['name']) ?></option><?php endforeach; ?></select>
            <div class="studio-intelligence__actions"><button type="button" id="adviceWeather">Xem thời tiết</button><button type="button" id="adviceLocate">Nhận diện khu vực</button></div>
            <p class="studio-intelligence__note">Không tự lấy vị trí. Nếu bạn đồng ý nhận diện, chỉ gửi tọa độ làm tròn khoảng 10 km để lấy thời tiết; không lưu vào bản phối.</p>
            <div id="adviceContext" aria-live="polite"></div>
        </section>
        <section aria-labelledby="adviceStylistTitle">
            <h3 id="adviceStylistTitle">Phối theo cách của bạn</h3>
            <label for="adviceIntent">Mục đích</label>
            <select id="adviceIntent"><option value="remix">Remix hiện đại</option><option value="historical">Hướng tới phục dựng lịch sử</option></select>
            <label for="advicePreference">Sở thích cho AI tư vấn · không bắt buộc</label>
            <textarea id="advicePreference" rows="2" maxlength="240" placeholder="Ví dụ: thích tối giản, dễ đi lại, không muốn thêm phụ kiện"></textarea>
            <p class="studio-intelligence__note">Không nhập thông tin cá nhân. AI chỉ nhận lựa chọn trang phục, sở thích và bối cảnh; không nhận ảnh khuôn mặt, tên, giới tính hay số đo.</p>
            <div class="studio-intelligence__actions"><button type="button" id="adviceRecommend">Gợi ý biên tập</button><button type="button" id="adviceAI">AI tư vấn · 1 lượt</button></div>
            <p id="adviceStatus" role="status"></p>
            <div id="adviceText"></div>
            <div id="adviceGuards" aria-live="polite"></div>
        </section>
        <section aria-labelledby="adviceLookbookTitle">
            <h3 id="adviceLookbookTitle">Lookbook cảm hứng</h3>
            <p class="studio-intelligence__note">Bản phối biên tập từ ảnh có nguồn, không phải ảnh AI. Áp dụng chỉ khi bạn chọn; không tự tạo ảnh hoặc thêm phụ kiện trong tư liệu.</p>
            <div class="studio-intelligence__lookbooks" id="adviceLookbooks"></div>
        </section>
    </div>
</details>
