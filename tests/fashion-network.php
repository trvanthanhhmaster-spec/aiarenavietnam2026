<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/Support/FashionNetwork.php';
require dirname(__DIR__).'/src/Support/SupabaseAuth.php';
use App\Support\FashionNetwork as N;
function check(bool $ok,string $message):void { if (!$ok) throw new RuntimeException($message); }
function rejects(callable $call):void { try { $call(); } catch (InvalidArgumentException $e) { return; } throw new RuntimeException('Expected rejection'); }
$id=N::newId(); check(N::uuid($id)===$id,'UUID');
foreach (['javascript:alert(1)','http://shop.example/a','https://127.0.0.1/a','https://shop.local/a','https://user:pass@shop.example/a','https://shop.example:8443/a'] as $url) rejects(fn()=>N::url($url));
check(N::url('https://shop.example/product/1')==='https://shop.example/product/1','URL');
$input=['garment_id'=>$id,'name'=>'Áo tấc đỏ','variant_name'=>'Đỏ · mẫu A','image_url'=>'https://shop.example/photo.jpg','source_url'=>'https://shop.example/a',
    'permission_evidence'=>'Shop sở hữu ảnh; giấy phép hiển thị.','display_consent'=>'yes','rent_enabled'=>'yes','rent_unit'=>'bộ / ngày','rent_price'=>'','rent_deposit'=>'100000'];
$p=N::product($input); check($p['offers'][0]['price_vnd']===null,'Unknown price is not zero'); check($p['ai_permission']==='not_granted','No implicit AI permission');
check($p['offers'][0]['deposit_vnd']===100000,'Separate rental deposit');
check(N::product($input+['ai_consent'=>'yes'])['ai_permission']==='requested','AI requires review');
rejects(fn()=>N::product(array_merge($input,['display_consent'=>''])));
rejects(fn()=>N::product(array_merge($input,['rent_price'=>'-1'])));
rejects(fn()=>N::product(array_merge($input,['rent_enabled'=>''])));
rejects(fn()=>N::product(array_merge($input,['permission_evidence'=>''])));
rejects(fn()=>N::product(array_merge($input,['name'=>['not text']])));
check(N::price(['price_vnd'=>null,'unit'=>'ngày'])==='Liên hệ để hỏi giá','Unknown price label');
check(str_contains(N::price(['price_vnd'=>0,'unit'=>'bộ']),'0 đ'),'Explicit zero');
check(App\Support\SupabaseAuth::safeNext('shops.php?mode=merchant')==='shops.php?mode=merchant','Merchant login return');
check(App\Support\SupabaseAuth::safeNext('https://evil.example/shops.php')==='studio.php','No open redirect');
echo "Fashion network validation contracts passed.\n";
