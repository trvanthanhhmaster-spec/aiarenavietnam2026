<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/src/Support/WebsiteMetadata.php';
require dirname(__DIR__).'/src/Support/FashionNetwork.php';
function networkPreview(string $state):string {
    $websiteSettings=App\Support\WebsiteMetadata::defaults(); $websiteHome=[]; $websiteCanonicalHost=false;
    $auth=new class { function csrfToken():string { return 'synthetic-qa-csrf'; } };
    $escape=static fn(mixed $v):string=>htmlspecialchars((string)$v,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
    $mode=in_array($state,['merchant','review'],true)?$state:'directory'; $admin=$mode==='review'; $shopId=$state==='detail'?'11111111-1111-4111-8111-111111111111':'';
    $query=''; $province=''; $page=1; $garmentId=''; $message=''; $error=$state==='error'?'Mô phỏng QA: danh mục chưa sẵn sàng.':'';
    $garments=[['id'=>'22222222-2222-4222-8222-222222222222','name'=>'Áo tấc']];
    $data=['shops'=>[],'products'=>[],'variants'=>[],'media'=>[],'offers'=>[]];
    if (in_array($state,['detail','merchant','review','directory'],true)) {
        $shop=['id'=>'11111111-1111-4111-8111-111111111111','name'=>'Cửa hàng minh họa QA','description'=>'Dữ liệu mô phỏng kiểm tra giao diện; không phải đối tác hoặc sản phẩm thật.','province'=>'Hà Nội','address'=>'Địa chỉ QA','contact_url'=>'https://example.com/contact','website_url'=>'https://example.com','status'=>'pending','review_note'=>'','revision'=>1,'verified_at'=>'2026-10-10'];
        $data['shops']=[$shop];
        $id='33333333-3333-4333-8333-333333333333';
        $data['products']=[['id'=>$id,'shop_id'=>$shop['id'],'garment_id'=>$garments[0]['id'],'name'=>'Mẫu áo tấc · QA <script>bad()</script>','description'=>'Mẫu kiểm tra ảnh và giá, không phải hàng đang bán.','source_url'=>'https://example.com/sample','status'=>'pending','review_note'=>'','revision'=>1,'verified_at'=>'2026-10-10']];
        $data['variants']=[['product_id'=>$id,'name'=>'Mẫu màu đỏ · QA','color'=>'Đỏ','material'=>'Lụa · minh họa','pattern'=>'Trơn','sizes'=>'Liên hệ','included_accessories'=>'Không kèm phụ kiện']];
        $data['media']=[['product_id'=>$id,'image_url'=>'assets/images/v-remix-leaf-logo.png','ai_permission'=>'requested','permission_evidence'=>'Thông tin minh họa QA; không phải giấy phép shop thật.']];
        $data['offers']=[['product_id'=>$id,'kind'=>'rent','price_vnd'=>null,'deposit_vnd'=>null,'unit'=>'bộ / ngày','terms'=>'Liên hệ để xác nhận','checked_at'=>'2026-10-10']];
    }
    $_SERVER['REQUEST_METHOD']='GET';
    ob_start(); require dirname(__DIR__).'/includes/network/page.php'; return (string)ob_get_clean();
}
if (realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__) {
    $dir=$argv[1]??'';
    if (!is_dir($dir)||!str_starts_with(realpath($dir)?:'','/private/tmp/')) throw new RuntimeException('Use an existing private temporary directory');
    foreach (['empty','error','directory','detail','merchant','review'] as $state) file_put_contents($dir.'/'.$state.'.html',networkPreview($state));
    echo "Synthetic network previews rendered; no remote data or writes.\n";
}
