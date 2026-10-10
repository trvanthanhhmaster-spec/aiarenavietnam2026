<?php
declare(strict_types=1);
$networkRoot=dirname(__DIR__,2);
$labels=['pending'=>'Chờ duyệt','published'=>'Đã xuất bản','rejected'=>'Cần chỉnh sửa','archived'=>'Ngừng hiển thị'];
$offerLabels=['buy'=>'Mua','rent'=>'Thuê','made_to_order'=>'Đặt may'];
$children=static fn(string $type,string $id):array=>array_values(array_filter($data[$type]??[],static fn(array $row):bool=>$row['product_id']===$id));
$shopNames=array_column($data['shops'],'name','id');
$garmentNames=array_column($garments,'name','id');
$title=$mode==='merchant'?'Cửa hàng của bạn':($mode==='review'?'Duyệt mạng lưới cửa hàng':'Tìm cửa hàng Việt phục');
?>
<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<?php $websitePage='private'; $websitePrivateTitle=$title.' — V-Remix'; require $networkRoot.'/includes/partials/website-meta.php'; ?>
<link rel="stylesheet" href="assets/css/admin.css?v=<?=filemtime($networkRoot.'/assets/css/admin.css')?>">
<link rel="stylesheet" href="assets/css/admin-dashboard.css?v=<?=filemtime($networkRoot.'/assets/css/admin-dashboard.css')?>">
<link rel="stylesheet" href="assets/css/fashion-network.css?v=<?=filemtime($networkRoot.'/assets/css/fashion-network.css')?>">
<script src="assets/js/fashion-network.js?v=<?=filemtime($networkRoot.'/assets/js/fashion-network.js')?>" defer></script>
</head>
<body class="admin-page network-page">
<a class="network-skip" href="#networkMain">Đến nội dung</a>
<div class="network-shell">
<header class="network-header">
    <a class="network-brand" href="index.php#stage"><img src="<?=$escape($websiteSettings['brand']['logo_light']?:'assets/images/v-remix-leaf-logo.png')?>" alt="<?=$escape($websiteSettings['brand']['name'])?>" width="56" height="56"></a>
    <nav aria-label="Điều hướng cửa hàng"><a href="shops.php" <?=$mode==='directory'?'aria-current="page"':''?>>Tìm cửa hàng</a><a href="shops.php?mode=merchant" <?=$mode==='merchant'?'aria-current="page"':''?>>Dành cho shop</a><a href="studio.php">Về Studio ↗</a><?php if ($mode==='review'): ?><a href="admin.php">Về Admin</a><?php endif; ?></nav>
</header>
<main id="networkMain">
    <?php if ($mode!=='directory'||$shopId===''): ?><section class="network-intro"><p class="admin-eyebrow">V-Remix / Mạng lưới cửa hàng</p><h1><?=$escape($title)?></h1><p><?=$mode==='directory'?'Mẫu thật, thông tin có nguồn. Tìm nơi mua, thuê hoặc đặt may; liên hệ shop để xác nhận giá, kích cỡ và lịch thuê.':($mode==='merchant'?'Gửi hồ sơ và mẫu thật của cửa hàng. Quản trị viên kiểm tra trước khi công bố; đăng ký không đồng nghĩa đã xác minh đối tác.':'Kiểm tra hồ sơ, nguồn sản phẩm và quyền sử dụng ảnh trước khi xuất bản. Không xác nhận tồn kho chỉ từ một trang web.')?></p></section><?php endif; ?>
    <?php if ($message!==''): ?><p class="network-notice" role="status"><?=$escape($message)?></p><?php endif; ?>
    <?php if ($error!==''): ?><p class="network-notice is-error" role="alert"><?=$escape($error)?></p><?php endif; ?>
    <?php if ($mode==='directory'): ?>
        <?php if ($shopId===''): ?>
            <form class="network-search" method="get"><label>Tên cửa hàng<input name="q" value="<?=$escape($query)?>" maxlength="100" placeholder="Tìm theo tên shop"></label><label>Tỉnh / thành<input name="province" value="<?=$escape($province)?>" maxlength="120" placeholder="Ví dụ: Hà Nội"></label><button class="admin-button admin-button--solid">Tìm cửa hàng</button></form>
            <?php $hasNext=count($data['shops'])>20; $visibleShops=array_slice($data['shops'],0,20); ?>
            <div class="network-shop-grid">
            <?php foreach ($visibleShops as $shop): ?>
                <article class="network-shop"><span class="network-location"><?=$escape($shop['province'])?></span><h2><a href="shops.php?shop=<?=$escape($shop['id'])?>"><?=$escape($shop['name'])?></a></h2><p><?=$escape($shop['description'])?></p><p class="network-muted"><?=$escape($shop['address'])?></p><small>Hồ sơ được rà soát: <?=$escape(substr($shop['verified_at']??'',0,10))?> · Không xác nhận tồn kho</small><a class="admin-button" href="shops.php?shop=<?=$escape($shop['id'])?>">Xem mẫu & liên hệ →</a></article>
            <?php endforeach; ?>
            </div>
            <?php if (!$visibleShops&&$error===''): ?><section class="network-empty"><h2><?=$query!==''||$province!==''?'Chưa tìm thấy cửa hàng phù hợp':'Mạng lưới đang tiếp nhận cửa hàng'?></h2><p>Chỉ hồ sơ đã duyệt mới xuất hiện tại đây. Không tự xem các liên kết shop cũ là đối tác đã xác minh.</p><a class="admin-button" href="shops.php?mode=merchant">Gửi hồ sơ cửa hàng →</a></section><?php endif; ?>
            <nav class="network-actions" aria-label="Phân trang"><?php if ($page>1): ?><a href="shops.php?<?=$escape(http_build_query(['q'=>$query,'province'=>$province,'page'=>$page-1]))?>">← Trang trước</a><?php endif; ?><?php if ($hasNext): ?><a href="shops.php?<?=$escape(http_build_query(['q'=>$query,'province'=>$province,'page'=>$page+1]))?>">Trang tiếp →</a><?php endif; ?></nav>
        <?php elseif ($data['shops']): $shop=$data['shops'][0]; ?>
            <p><a class="network-back" href="shops.php">← Tất cả cửa hàng</a></p>
            <section class="network-shop-heading"><div><span class="network-location"><?=$escape($shop['province'])?></span><h1><?=$escape($shop['name'])?></h1><p><?=$escape($shop['description'])?></p><p class="network-muted"><?=$escape($shop['address'])?></p></div><div class="network-actions"><a class="admin-button admin-button--solid" href="<?=$escape($shop['contact_url'])?>" target="_blank" rel="noopener noreferrer">Liên hệ shop ↗</a><?php if ($shop['website_url']!==''): ?><a href="<?=$escape($shop['website_url'])?>" target="_blank" rel="noopener noreferrer">Website nguồn ↗</a><?php endif; ?></div></section>
            <form class="network-search" method="get"><input type="hidden" name="shop" value="<?=$escape($shopId)?>"><label>Loại Việt phục<select name="garment"><option value="">Tất cả loại áo</option><?php foreach ($garments as $g): ?><option value="<?=$escape($g['id'])?>" <?=$g['id']===$garmentId?'selected':''?>><?=$escape($g['name'])?></option><?php endforeach; ?></select></label><button class="admin-button">Lọc mẫu</button></form>
            <div class="network-product-grid"><?php foreach ($data['products'] as $product): require $networkRoot.'/includes/network/product.php'; endforeach; ?></div>
            <?php if (!$data['products']): ?><section class="network-empty"><h3>Chưa có mẫu đã duyệt cho lựa chọn này</h3><p>Bạn vẫn có thể liên hệ cửa hàng để hỏi thông tin.</p></section><?php endif; ?>
        <?php endif; ?>
    <?php elseif ($mode==='merchant'): require $networkRoot.'/includes/network/merchant.php'; ?>
    <?php elseif ($admin): require $networkRoot.'/includes/network/review.php'; endif; ?>
    <footer class="network-footer"><p>V-Remix kết nối thông tin, chưa nhận đặt hàng hoặc thanh toán. Ảnh sản phẩm của shop khác với ảnh AI; giá và khả năng cung cấp cần xác nhận trực tiếp.</p></footer>
</main>
</div>
</body>
</html>
