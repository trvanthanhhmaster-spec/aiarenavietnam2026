<?php
$variant=$children('variants',$product['id'])[0]??[];
$media=$children('media',$product['id'])[0]??[];
$offers=$children('offers',$product['id']);
?>
<article class="network-product">
    <div class="network-product-image"><?php if ($media): ?><img src="<?=$escape($media['image_url'])?>" alt="<?=$escape($product['name'])?> — ảnh sản phẩm từ shop" loading="lazy" referrerpolicy="no-referrer"><?php endif; ?><span class="network-image-failure" <?=$media?'hidden':''?>>Không tải được ảnh mẫu. Mở nguồn để xem ảnh.</span></div>
    <div class="network-product-copy"><p class="network-muted"><?=$escape($garmentNames[$product['garment_id']]??'Việt phục')?> · Ảnh sản phẩm thật</p><h3><?=$escape($product['name'])?></h3><p><?=$escape($product['description'])?></p>
    <dl class="network-specs"><?php foreach (['name'=>'Mẫu','color'=>'Màu','material'=>'Chất liệu','pattern'=>'Họa tiết','sizes'=>'Kích cỡ','included_accessories'=>'Kèm bộ'] as $key=>$label): if (($variant[$key]??'')!==''): ?><div><dt><?=$label?></dt><dd><?=$escape($variant[$key])?></dd></div><?php endif; endforeach; ?></dl>
    <div class="network-offers"><?php foreach ($offers as $offer): ?><section><strong><?=$offerLabels[$offer['kind']]?> · <?=$escape(App\Support\FashionNetwork::price($offer))?></strong><?php if ($offer['deposit_vnd']!==null): ?><p>Tiền cọc: <?=$escape(number_format((float)$offer['deposit_vnd'],0,',','.'))?> đ</p><?php endif; ?><p><?=$escape($offer['terms'])?></p><small>Shop cung cấp: <?=$escape(substr($offer['checked_at']??'',0,10))?> · Giá tham khảo</small></section><?php endforeach; ?></div>
    <p class="network-muted">Liên hệ để xác nhận còn mẫu/kích cỡ và lịch thuê. Màu AI tùy biến không phải biến thể shop đang có.</p>
    <div class="network-actions"><a class="admin-button admin-button--solid" href="<?=$escape($shop['contact_url'])?>" target="_blank" rel="noopener noreferrer">Hỏi shop về mẫu ↗</a><a href="<?=$escape($product['source_url'])?>" target="_blank" rel="noopener noreferrer">Xem nguồn ↗</a></div></div>
</article>
