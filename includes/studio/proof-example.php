<?php
declare(strict_types=1);
$proof = json_decode((string) file_get_contents(__DIR__ . '/../../assets/data/audition-proof.json'), true, 64, JSON_THROW_ON_ERROR);
$proofKnowledge = App\Support\StudioIntelligence::knowledge();
$proofData = ['selection' => $proof['selection'], 'output' => ['reviewStatus' => $proof['reviewStatus'], 'imageAssessment' => $proof['assessment']],
    'catalog' => ['garments' => [['slug'=>'ao-tac','name'=>'Áo tấc']], 'garmentVariants' => [['slug'=>'ao-tac-do-son','name'=>'Áo tấc đỏ son']], 'intelligence'=>['heritage'=>$proofKnowledge['heritage']]]];
?>
<details class="studio-example" id="studioExample">
    <summary><span><strong>Bản phối mẫu đã tạo</strong><small>Áo tấc · xem ảnh mẫu, kết quả và đối chiếu</small></span></summary>
    <div class="studio-example__body">
        <h2>Một người · áo tấc · không thêm phụ kiện</h2>
        <p class="studio-example__note">Đây là bản phối mẫu đã tạo ngày 10/10/2026, không phải kết quả của lựa chọn bạn đang chỉnh. Mẫu áo tấc đỏ son, không ghi đè màu hoặc họa tiết; yêu cầu một nhân vật trưởng thành hư cấu trong sân.</p>
        <div class="studio-example__images">
            <figure><a href="assets/media/catalog/garment-ao-tac.webp" target="_blank" rel="noopener"><img src="assets/media/catalog/garment-ao-tac.webp" alt="Ảnh mẫu áo tấc tay rộng trong catalog" width="960" height="1440" loading="lazy"></a><figcaption><strong>Ảnh mẫu tham chiếu</strong><span>Ptdtch · CC BY-SA 4.0 · <a href="https://commons.wikimedia.org/wiki/File:Rio_m%C3%A3_ch%C3%A2u_%C3%A1o_t%E1%BA%A5c.jpg" target="_blank" rel="noopener noreferrer">Nguồn ảnh ↗</a></span><span>Phụ kiện trong ảnh mẫu không tự được thêm vào bản phối.</span></figcaption></figure>
            <figure><a href="<?= $escape($proof['image']) ?>" target="_blank" rel="noopener"><img src="<?= $escape($proof['image']) ?>" alt="Kết quả Gemini: áo tấc đỏ tay rộng với quần trắng trong sân" width="<?= (int)$proof['width'] ?>" height="<?= (int)$proof['height'] ?>" loading="lazy"></a><figcaption><strong>Ảnh Gemini đã tạo</strong><span><?= (int)$proof['width'] ?> × <?= (int)$proof['height'] ?> px · bấm ảnh để xem đầy đủ.</span><span>Ảnh tạo sinh từ kế hoạch phối đồ.</span></figcaption></figure>
        </div>
        <div id="studioExampleAssessment" class="studio-assessment"></div>
        <details class="studio-example__sources">
            <summary>Nguồn văn hóa và phạm vi kiểm chứng</summary>
            <p class="studio-example__note">Một ca tạo ảnh và đối chiếu đã hoàn tất trên bản demo. Tay rộng và dáng áo nhìn thấy có thể kiểm tra bằng mắt; các đường may và thân áo bị che cần thêm tư liệu. Nhận xét AI không thay thẩm định chuyên gia.</p>
            <div class="studio-example__heritage">
            <?php foreach ($proofKnowledge['heritage'] as $slug => $profile): ?>
                <article><h3><?= $escape(['ao-ngu-than-tay-chen'=>'Ngũ thân tay chẽn','ao-tac'=>'Áo tấc','ao-nhat-binh'=>'Nhật Bình','ao-tu-than'=>'Tứ thân'][$slug]) ?></h3><p><?= $escape($profile['structure']) ?></p>
                <?php foreach ($profile['sources'] as $source): ?><a href="<?= $escape($source['url']) ?>" target="_blank" rel="noopener noreferrer"><?= $escape($source['title']) ?> ↗</a><small><?= $escape($source['publisher'] . ' · ' . $source['scope']) ?></small><?php endforeach; ?></article>
            <?php endforeach; ?>
            </div>
            <div class="studio-example__table-wrap"><table><caption>Phạm vi đã kiểm tra</caption><thead><tr><th scope="col">Tình huống</th><th scope="col">Bằng chứng hiện có</th><th scope="col">Còn cần kiểm tra</th></tr></thead><tbody>
                <tr><th scope="row">Áo tấc, một người</th><td>Ảnh thực tế và bản ghi của ca bên trên</td><td>Màu, phụ kiện và bối cảnh khác</td></tr>
                <tr><th scope="row">Ngũ thân, Nhật Bình, tứ thân</th><td>Catalog, nguồn văn hóa và kiểm thử dữ liệu</td><td>Ca tạo ảnh thật trong bộ minh chứng này</td></tr>
                <tr><th scope="row">Bản phối nhiều người</th><td>Kiểm thử mô phỏng lựa chọn, mẫu và kết quả từng người</td><td>Ảnh thật khớp lựa chọn cả nhóm</td></tr>
                <tr><th scope="row">Tay áo sai hoặc bị che</th><td>Phản hồi mô phỏng được báo lệch hoặc chưa rõ</td><td>Khả năng AI phát hiện trên ảnh thực tế</td></tr>
                <tr><th scope="row">Yêu cầu cũ không còn tồn tại</th><td>Kiểm thử phục hồi trạng thái chờ, giữ lựa chọn</td><td>Độ ổn định dài hạn của dịch vụ</td></tr>
            </tbody></table></div>
            <p class="studio-example__note">Kiểm thử mô phỏng xác nhận cách phần mềm xử lý dữ liệu, không chứng minh độ chính xác thị giác của Gemini. Chưa có xác nhận chuyên gia cho toàn bộ catalog.</p>
            <a href="assets/data/audition-proof.json" download>Tải bản ghi kiểm chứng (JSON) ↓</a>
        </details>
    </div>
</details>
<script id="studioExampleData" type="application/json"><?= json_encode($proofData, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR) ?></script>
