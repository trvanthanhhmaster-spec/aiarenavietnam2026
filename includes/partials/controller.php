<div class="controller" id="controller" role="group" aria-label="Chọn dịp mặc để xem minh hoạ" aria-describedby="previewNote">
    <div class="track glass" id="track" aria-hidden="true"></div>
    <div class="capsule glass" id="capsule" aria-hidden="true"></div>
    <div class="cells" id="cells">
        <div class="cell cell-label" id="cellLabel" aria-hidden="true">
            <?= htmlspecialchars($site['controller_label'], ENT_QUOTES, 'UTF-8') ?>
        </div>
        <?php foreach ($branches as $key => $branch): ?>
            <button class="cell" type="button" data-branch="<?= htmlspecialchars($key, ENT_QUOTES, 'UTF-8') ?>">
                <?= htmlspecialchars($branch['label'], ENT_QUOTES, 'UTF-8') ?>
            </button>
        <?php endforeach; ?>
    </div>
</div>
