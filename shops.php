<?php
declare(strict_types=1);
require __DIR__.'/includes/website-bootstrap.php';
require __DIR__.'/src/Support/SupabaseAuth.php';
require __DIR__.'/src/Infrastructure/SupabaseAdminClient.php';
require __DIR__.'/src/Support/FashionNetwork.php';
require __DIR__.'/src/Repositories/FashionRepository.php';

use App\Support\FashionNetwork;
use App\Support\SupabaseAuth;
use App\Repositories\FashionRepository;
use App\Infrastructure\SupabaseClient;
use App\Infrastructure\SupabaseAdminClient;

$auth=new SupabaseAuth((string)getenv('SUPABASE_URL'),(string)getenv('SUPABASE_ANON_KEY'),(string)getenv('SUPABASE_SERVICE_ROLE_KEY'));
$auth->boot();
$mode=in_array($_GET['mode']??'',['merchant','review'],true)?$_GET['mode']:'directory';
$user=$mode==='directory'?null:$auth->user();
if ($mode!=='directory'&&$user===null) { header('Location: auth.php?next='.rawurlencode('shops.php?mode='.$mode)); exit; }
$admin=$mode==='review'&&$auth->isAdmin();
if ($mode==='review'&&!$admin) { http_response_code(403); $error='Tài khoản không có quyền duyệt cửa hàng.'; }
header('Cache-Control: no-store');
$error=$error??''; $message=''; $data=['shops'=>[],'products'=>[],'variants'=>[],'media'=>[],'offers'=>[]]; $garments=[];
$query=is_string($_GET['q']??null)?mb_substr($_GET['q'],0,100):'';
$province=is_string($_GET['province']??null)?mb_substr($_GET['province'],0,120):'';
$page=max(1,min(1000,(int)($_GET['page']??1)));
$shopId=is_string($_GET['shop']??null)?$_GET['shop']:'';
$garmentId=is_string($_GET['garment']??null)?$_GET['garment']:'';
$escape=static fn(mixed $v):string=>htmlspecialchars((string)$v,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
$repo=null;
try {
    if ($error==='') {
        $client=$mode==='directory'?new SupabaseClient((string)getenv('SUPABASE_URL'),(string)getenv('SUPABASE_ANON_KEY')):new SupabaseAdminClient((string)getenv('SUPABASE_URL'),(string)getenv('SUPABASE_SERVICE_ROLE_KEY'));
        $repo=new FashionRepository($client);
        if ($_SERVER['REQUEST_METHOD']==='POST') {
            if ($mode==='directory'||!$auth->verifyCsrf(is_string($_POST['csrf']??null)?$_POST['csrf']:'')) { http_response_code(403); throw new InvalidArgumentException('Phiên làm việc không hợp lệ. Tải lại trang trước khi gửi.'); }
            $action=FashionNetwork::text($_POST,'action',20,1);
            if ($action==='review'&&$admin) $repo->review($user['id'],$_POST);
            elseif ($action==='shop'&&$mode==='merchant') $repo->submitShop($user['id'],FashionNetwork::uuid(FashionNetwork::text($_POST,'id',36,36)),FashionNetwork::revision($_POST['revision']??null),$_POST);
            elseif ($action==='product'&&$mode==='merchant') $repo->submitProduct($user['id'],FashionNetwork::text($_POST,'shop_id',36,36),FashionNetwork::uuid(FashionNetwork::text($_POST,'id',36,36)),FashionNetwork::revision($_POST['revision']??null),$_POST);
            else throw new InvalidArgumentException('Thao tác không hợp lệ.');
            header('Location: shops.php?mode='.$mode.'&saved=1'); exit;
        }
    }
} catch (InvalidArgumentException $e) { $error=$e->getMessage(); http_response_code(http_response_code()===403?403:422); }
catch (Throwable $e) {
    error_log('[V-Remix] Fashion network operation failed ('.get_class($e).').');
    $error=str_contains($e->getMessage(),'CONFLICT')?'Dữ liệu đã thay đổi. Mở lại bản ghi trước khi gửi; không tự gửi lại.':(str_contains($e->getMessage(),'SHOP_NOT_PUBLISHED')?'Cần duyệt hồ sơ cửa hàng trước sản phẩm.':(str_contains($e->getMessage(),'PERMISSION_REQUIRED')?'Chưa đủ căn cứ quyền sử dụng ảnh để xuất bản.':'Chưa xử lý được dữ liệu cửa hàng. Kiểm tra lại trạng thái trước khi gửi tiếp.'));
    http_response_code(503);
}
try {
    if ($repo) {
        $garments=$repo->garments();
        if ($mode==='directory') {
            if ($shopId!=='') { $data=$repo->shop($shopId,$garmentId); if (!$data['shops']) { http_response_code(404); $error='Cửa hàng chưa xuất bản hoặc không còn hiển thị.'; } }
            else $data['shops']=$repo->directory($query,$province,$page);
        } elseif ($mode!=='review'||$admin) $data=$repo->workspace($user['id'],$admin,$shopId,$page);
    }
} catch (Throwable $e) { error_log('[V-Remix] Fashion network read unavailable.'); if ($error==='') $error='Danh mục cửa hàng chưa sẵn sàng. Vui lòng thử lại sau.'; http_response_code(503); }
if (($_GET['saved']??'')==='1'&&$error==='') $message=$admin?'Đã lưu quyết định duyệt.':'Đã gửi chờ duyệt. Thay đổi chỉ xuất hiện công khai sau khi quản trị viên duyệt.';
require __DIR__.'/includes/network/page.php';
