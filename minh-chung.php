<?php
declare(strict_types=1);
require __DIR__ . '/src/Support/StudioIntelligence.php';
$knowledge = App\Support\StudioIntelligence::knowledge();
$proof = json_decode((string) file_get_contents(__DIR__ . '/assets/data/audition-proof.json'), true, 64, JSON_THROW_ON_ERROR);
$escape = static fn($value) => htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Bản phối đã kiểm chứng — V-Remix</title>
    <meta name="description" content="Đối chiếu lựa chọn, mẫu áo và kết quả Gemini của một ca V-Remix đã chạy thật, kèm nguồn văn hóa và phạm vi kiểm thử.">
    <link rel="icon" href="assets/media/favicon.svg">
    <link rel="stylesheet" href="assets/css/audition-proof.css?v=<?= filemtime(__DIR__ . '/assets/css/audition-proof.css') ?>">
    <link rel="stylesheet" href="assets/css/studio-assessment.css?v=<?= filemtime(__DIR__ . '/assets/css/studio-assessment.css') ?>">
</head>
<body>
<a class="proof-skip" href="#proof">Đi tới minh chứng</a>
<header class="proof-header"><a href="index.php">V-Remix</a><nav aria-label="Điều hướng"><a href="studio.php">Mở Studio ↗</a><a href="https://github.com/trvanthanhhmaster-spec/aiarenavietnam2026" target="_blank" rel="noopener noreferrer">Mã nguồn ↗</a></nav></header>
<main id="proof">
    <section class="proof-intro">
        <p class="proof-eyebrow">Việt phục Remix / Minh chứng sản phẩm</p>
        <h1>Từ lựa chọn của bạn<br>đến một bản phối thật.</h1>
        <p>Chọn dáng áo và mẫu có nguồn, gửi ảnh tham chiếu cho Gemini, rồi đối chiếu kết quả với lựa chọn. Đây là một ca tạo ảnh đã hoàn tất trên bản demo production ngày 10/10/2026.</p>
        <a class="proof-button" href="studio.php">Tự phối Việt phục ↗</a>
    </section>
    <section aria-labelledby="case-title">
        <p class="proof-eyebrow">01 / Ca chạy thực tế</p>
        <h2 id="case-title">Một người · áo tấc · không thêm phụ kiện</h2>
        <p class="proof-note">Mẫu đã chọn: áo tấc đỏ son. Không ghi đè màu hay họa tiết. Ngữ cảnh kiểm thử yêu cầu một người trưởng thành hư cấu trong sân; không tải ảnh mặt hoặc thay đổi bộ sưu tập.</p>
        <div class="proof-images">
            <figure><a href="assets/media/catalog/garment-ao-tac.webp" target="_blank" rel="noopener"><img src="assets/media/catalog/garment-ao-tac.webp" alt="Ảnh tư liệu áo tấc có tay rộng dùng trong catalog" width="600" height="800"></a><figcaption><strong>Ảnh mẫu trong catalog</strong><span>Ptdtch · CC BY-SA 4.0 · <a href="https://commons.wikimedia.org/wiki/File:Rio_m%C3%A3_ch%C3%A2u_%C3%A1o_t%E1%BA%A5c.jpg" target="_blank" rel="noopener noreferrer">Nguồn và giấy phép ↗</a></span><span>Phụ kiện trong ảnh mẫu không tự trở thành lựa chọn của người dùng.</span></figcaption></figure>
            <figure><a href="<?= $escape($proof['image']) ?>" target="_blank" rel="noopener"><img src="<?= $escape($proof['image']) ?>" alt="Ảnh Gemini tạo: một người mặc áo tấc đỏ tay rộng với quần trắng trong sân" width="<?= (int)$proof['width'] ?>" height="<?= (int)$proof['height'] ?>"></a><figcaption><strong>Ảnh kết quả Gemini</strong><span><?= (int)$proof['width'] ?> × <?= (int)$proof['height'] ?> px · một lượt tạo ảnh và một lượt đánh giá.</span><span>Ảnh tạo sinh; người trong ảnh là nhân vật hư cấu. Bấm ảnh để xem đầy đủ.</span></figcaption></figure>
        </div>
        <div id="proofAssessment" class="studio-assessment"></div>
        <dl class="proof-facts"><div><dt>Thời điểm hoàn tất</dt><dd>10/10/2026 · 15:58 (Việt Nam)</dd></div><div><dt>Ảnh mẫu đã gửi</dt><dd>1 mẫu · áo-tấc đỏ son</dd></div><div><dt>Phạm vi kết luận</dt><dd>Một ca hoạt động; chưa đại diện toàn bộ catalog</dd></div></dl>
        <p class="proof-note">Kiểm tra bằng mắt cho thấy tay rộng, dáng áo đỏ và quần trắng trong sân. Không thể xác nhận đường may hoặc các thân áo bị che chỉ từ ảnh. Nhận xét AI được giữ nguyên trong bản ghi; đây chưa phải thẩm định của chuyên gia Việt phục.</p>
        <a class="proof-download" href="assets/data/audition-proof.json" download>Tải bản ghi minh chứng (JSON) ↓</a>
    </section>
    <section aria-labelledby="scope-title">
        <p class="proof-eyebrow">02 / Phạm vi đã kiểm tra</p><h2 id="scope-title">Phân biệt chạy thật và kiểm thử mô phỏng.</h2>
        <div class="proof-table-wrap"><table class="proof-scope"><thead><tr><th scope="col">Tình huống</th><th scope="col">Bằng chứng hiện có</th><th scope="col">Còn cần kiểm tra</th></tr></thead><tbody>
            <tr><th scope="row">Áo tấc, một người</th><td>Tạo ảnh và đối chiếu trên production; ảnh và bản ghi ở trên</td><td>Các màu, phụ kiện và bối cảnh khác</td></tr>
            <tr><th scope="row">Ngũ thân, Nhật Bình, tứ thân</th><td>Catalog và nguồn văn hóa; kiểm thử dữ liệu đối chiếu</td><td>Ca tạo ảnh thật cho từng dáng áo trong bộ minh chứng này</td></tr>
            <tr><th scope="row">Bản phối nhiều người</th><td>Kiểm thử kế hoạch, mẫu và kết quả riêng từng người bằng dữ liệu mô phỏng</td><td>Ảnh thật thể hiện đúng lựa chọn của cả nhóm</td></tr>
            <tr><th scope="row">Tay áo sai hoặc bị che</th><td>Kiểm thử phản hồi mô phỏng: báo lệch hoặc chưa rõ, không cho đạt khi thiếu thông tin</td><td>Khả năng Gemini nhận ra lỗi trên bộ ảnh thực tế</td></tr>
            <tr><th scope="row">Yêu cầu cũ không còn tồn tại</th><td>Kiểm thử phục hồi; trạng thái chờ cũ được bỏ, lựa chọn được giữ</td><td>Độ ổn định dài hạn của dịch vụ tạo ảnh</td></tr>
        </tbody></table></div>
        <p class="proof-note">Kiểm thử mô phỏng xác nhận cách phần mềm xử lý dữ liệu; không chứng minh độ chính xác thị giác của Gemini. Phiên dịch vụ AI có thể hết hạn; Studio vẫn cung cấp thẻ lựa chọn có nguồn.</p>
    </section>
    <section aria-labelledby="heritage-title">
        <p class="proof-eyebrow">03 / Căn cứ văn hóa</p><h2 id="heritage-title">Giữ đặc trưng, hiểu phạm vi của nguồn.</h2>
        <div class="proof-heritage">
        <?php foreach ($knowledge['heritage'] as $slug => $profile): ?>
            <article><h3><?= $escape(['ao-ngu-than-tay-chen'=>'Ngũ thân tay chẽn','ao-tac'=>'Áo tấc','ao-nhat-binh'=>'Nhật Bình','ao-tu-than'=>'Tứ thân'][$slug]) ?></h3><p><?= $escape($profile['structure']) ?></p>
            <?php foreach ($profile['sources'] as $source): ?><a href="<?= $escape($source['url']) ?>" target="_blank" rel="noopener noreferrer"><?= $escape($source['title']) ?> ↗</a><small><?= $escape($source['publisher'] . ' · ' . $source['scope']) ?></small><?php endforeach; ?>
            </article>
        <?php endforeach; ?>
        </div>
        <p class="proof-note">Nội dung được biên tập kèm nguồn. Chưa có xác nhận chuyên gia cho toàn bộ catalog. Phối hiện đại và phục dựng lịch sử cần được đánh giá theo mục đích khác nhau.</p>
    </section>
    <footer><a href="studio.php">Mở Studio để khám phá và phối ↗</a><p>V-Remix · Demo Audition Việt phục Remix</p></footer>
</main>
<script src="assets/js/studio-assessment.js?v=<?= filemtime(__DIR__ . '/assets/js/studio-assessment.js') ?>"></script>
<script>
const proof = <?= json_encode($proof, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR) ?>;
const catalog = {garments:[{slug:'ao-tac',name:'Áo tấc'}],garmentVariants:[{slug:'ao-tac-do-son',name:'Áo tấc đỏ son'}],intelligence:{heritage:<?= json_encode($knowledge['heritage'], JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR) ?>}};
VRemixAssessment.render(document.getElementById('proofAssessment'), VRemixAssessment.build(proof.selection, {reviewStatus:proof.reviewStatus,imageAssessment:proof.assessment}, catalog));
</script>
</body></html>
