<?php declare(strict_types=1); ?>
<details class="studio-intelligence studio-intelligence--contextual" id="studioWeatherAdvice">
    <summary><span><strong>Xem thời tiết nơi bạn mặc</strong><small>Theo khu vực và ngày đã chọn · tùy chọn</small></span><span class="studio-intelligence__chevron" aria-hidden="true">›</span></summary>
    <div class="studio-intelligence__body">
        <label for="adviceCity">Khu vực</label>
        <select id="adviceCity"><option value="">Chọn khu vực</option><?php foreach (($intelligence['cities'] ?? []) as $city): ?><option value="<?= $escape($city['id']) ?>"><?= $escape($city['name']) ?></option><?php endforeach; ?></select>
        <div class="studio-intelligence__actions"><button type="button" id="adviceWeather">Xem thời tiết</button><button type="button" id="adviceLocate">Nhận diện khu vực</button></div>
        <p class="studio-intelligence__note">Không tự lấy vị trí. Nếu bạn đồng ý nhận diện, chỉ gửi tọa độ làm tròn khoảng 10 km để lấy thời tiết; không lưu vào bản phối.</p>
        <p id="adviceWeatherStatus" role="status"></p>
        <div id="adviceContext" aria-live="polite"></div>
    </div>
</details>
