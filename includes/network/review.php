<?php $reviewItems=[]; foreach ($data['shops'] as $row) $reviewItems[]=['kind'=>'shop','row'=>$row]; foreach ($data['products'] as $row) $reviewItems[]=['kind'=>'product','row'=>$row]; ?>
<div class="network-actions"><a class="admin-button" href="shops.php?mode=merchant">Gửi hồ sơ / mẫu bằng tài khoản của tôi →</a><a class="admin-button" href="shops.php">Xem catalog công khai ↗</a></div>
<p class="network-muted">Ưu tiên duyệt cửa hàng trước sản phẩm. Xuất bản là duyệt nội dung và nguồn tại thời điểm kiểm tra, không chứng nhận chất lượng shop hay hàng còn sẵn. Mỗi trang hiển thị 10 cửa hàng và các mẫu của họ.</p>
<?php if (!$reviewItems): ?><section class="network-empty"><h2>Chưa có hồ sơ cần xử lý</h2><p>Hồ sơ shop tự gửi sẽ xuất hiện ở đây. Các listing cũ không tự chuyển thành đối tác.</p></section><?php endif; ?>
<?php foreach (['pending','published','rejected','archived'] as $status): $items=array_filter($reviewItems,static fn(array $i):bool=>$i['row']['status']===$status); if (!$items) continue; ?>
<section class="network-review-group"><h2><?=$labels[$status]?> <small><?=count($items)?></small></h2>
<?php foreach ($items as $item): $row=$item['row']; $kind=$item['kind']; ?>
<details class="network-panel"><summary><span><?=$kind==='shop'?'Cửa hàng':'Sản phẩm'?> · <?=$escape($row['name'])?><small><?=$escape($kind==='shop'?$row['province']:($shopNames[$row['shop_id']]??''))?></small></span><span aria-hidden="true">＋</span></summary>
<p><?=$escape($row['description'])?></p>
<?php if ($kind==='shop'): ?><p><?=$escape($row['address'])?></p><a href="<?=$escape($row['contact_url'])?>" target="_blank" rel="noopener noreferrer">Kiểm tra liên hệ shop ↗</a>
<?php else: $variant=$children('variants',$row['id'])[0]??[]; $media=$children('media',$row['id'])[0]??[]; ?>
<a href="<?=$escape($row['source_url'])?>" target="_blank" rel="noopener noreferrer">Kiểm tra trang sản phẩm nguồn ↗</a><dl class="network-specs"><?php foreach (['name'=>'Biến thể','color'=>'Màu','material'=>'Chất liệu','pattern'=>'Họa tiết','sizes'=>'Kích cỡ','included_accessories'=>'Kèm bộ'] as $key=>$label): ?><div><dt><?=$label?></dt><dd><?=$escape($variant[$key]??'')?></dd></div><?php endforeach; ?></dl>
<?php if ($media): ?><p><a href="<?=$escape($media['image_url'])?>" target="_blank" rel="noopener noreferrer">Kiểm tra ảnh gốc ↗</a></p><p>Căn cứ quyền ảnh: <?=$escape($media['permission_evidence'])?></p><p>Quyền AI: <?=$escape($media['ai_permission'])?></p><?php endif; ?>
<?php foreach ($children('offers',$row['id']) as $o): ?><p><?=$offerLabels[$o['kind']]?> · <?=$escape(App\Support\FashionNetwork::price($o))?> · Cọc <?=$o['deposit_vnd']===null?'chưa công bố':$escape(number_format((float)$o['deposit_vnd'],0,',','.').' đ')?> — <?=$escape($o['terms'])?></p><?php endforeach; endif; ?>
<?php if ($row['review_note']!==''): ?><p>Ghi chú trước: <?=$escape($row['review_note'])?></p><?php endif; ?>
<form class="network-form" method="post"><input type="hidden" name="csrf" value="<?=$escape($auth->csrfToken())?>"><input type="hidden" name="action" value="review"><input type="hidden" name="kind" value="<?=$kind?>"><input type="hidden" name="id" value="<?=$escape($row['id'])?>"><input type="hidden" name="revision" value="<?=$escape($row['revision'])?>"><label>Ghi chú kiểm tra / lý do cần sửa<textarea name="note" maxlength="2000" rows="2"></textarea></label>
<?php if ($kind==='product'&&in_array($media['ai_permission']??'',['requested','granted'],true)): ?><label class="network-check"><input type="checkbox" name="allow_ai" value="yes">Đã kiểm tra căn cứ và cho phép sử dụng ảnh làm tham chiếu AI. Chưa bật luồng tạo ảnh từ sản phẩm shop.</label><?php endif; ?>
<div class="network-actions"><button name="decision" value="published" class="admin-button admin-button--solid">Đã kiểm tra · Xuất bản</button><button name="decision" value="rejected" class="admin-button">Yêu cầu chỉnh sửa</button><button name="decision" value="archived" class="admin-button">Ngừng hiển thị</button></div></form>
</details>
<?php endforeach; ?></section>
<?php endforeach; ?>
<nav class="network-actions" aria-label="Phân trang hàng chờ"><?php if ($page>1): ?><a href="shops.php?mode=review&amp;page=<?=$page-1?>">← Trang trước</a><?php endif; ?><?php if ($data['has_next']??false): ?><a href="shops.php?mode=review&amp;page=<?=$page+1?>">Trang tiếp →</a><?php endif; ?></nav>
