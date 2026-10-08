<?php
declare(strict_types=1);
require __DIR__.'/src/Support/Env.php';
require __DIR__.'/src/Support/SupabaseAuth.php';
require __DIR__.'/src/Support/StudioDraft.php';
require __DIR__.'/src/Support/StudioHistory.php';
require __DIR__.'/src/Infrastructure/SupabaseAdminClient.php';
require __DIR__.'/src/Infrastructure/StudioStorage.php';
use App\Support\{Env,SupabaseAuth,StudioDraft,StudioHistory};
use App\Infrastructure\{SupabaseAdminClient,StudioStorage};
header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store');
$respond=static function(array $data,int $status=200): never {http_response_code($status);echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);exit;};
Env::load(__DIR__.'/.env');
$url=(string)getenv('SUPABASE_URL');$key=(string)getenv('SUPABASE_SERVICE_ROLE_KEY');
$auth=new SupabaseAuth($url,(string)getenv('SUPABASE_ANON_KEY'),$key);$auth->boot();$user=$auth->user();
if(!$user) $respond(['error'=>'Đăng nhập để giữ bộ sưu tập.'],401);
if(!$auth->verifyCsrf((string)($_SERVER['HTTP_X_VREMIX_CSRF']??'')) || ($_SERVER['HTTP_X_VREMIX_ACCOUNT']??'')!==$user['id']) $respond(['error'=>'Phiên tài khoản đã đổi. Tải lại Studio.'],403);
$owner=hash('sha256',(string)($_SESSION['studio_generation_owner']??''));session_write_close();
try {
 $db=new SupabaseAdminClient($url,$key);$storage=new StudioStorage($url,$key);$history=new StudioHistory($db,$storage,$user['id'],$owner);
 if($_SERVER['REQUEST_METHOD']==='GET') {
  $rows=[];$offset=0;
  do {$page=$db->select('studio_collections',['user_id'=>'eq.'.$user['id'],'select'=>'*','order'=>'updated_at.desc,id.asc','limit'=>'100','offset'=>(string)$offset]);$rows=array_merge($rows,$page);$offset+=count($page);}while(count($page)===100);
  $counts=[];$offset=0;
  do {
   $page=$db->select('generation_jobs',['user_id'=>'eq.'.$user['id'],'status'=>'eq.completed','deleted_at'=>'is.null','collection_id'=>'not.is.null','select'=>'collection_id','order'=>'id.asc','limit'=>'1000','offset'=>(string)$offset]);
   foreach($page as $job) $counts[$job['collection_id']]=($counts[$job['collection_id']]??0)+1;
   $offset+=count($page);
  }while(count($page)===1000);
  $items=[];
  foreach($rows as $row) {
   if($row['deleted_at']) continue;
   $record=$row['payload'];
   if(!empty($record['savedLookId']) && !$db->select('looks',['id'=>'eq.'.$record['savedLookId'],'user_id'=>'eq.'.$user['id'],'deleted_at'=>'is.null','select'=>'id','limit'=>'1'])) {$record['savedLookId']=null;$record['saveId']=null;}
   try {
    if(!empty($record['jobId'])) {
     try {$record['output']=$storage->refreshOutput($history->job($record['jobId'])['output']);}
     catch(InvalidArgumentException) {$record['jobId']=null;}
    }
    if(empty($record['output']) && !empty($record['savedLookId'])) {$look=$history->look($record['savedLookId']);$record['output']=['lookbook'=>['items'=>[['url'=>$look['storage_path']?$storage->sign($look['storage_path']):$look['image_url'],'path'=>$look['storage_path']??null]]]];}
    if(!empty($record['selection']) && empty($record['output'])) $record['mediaUnavailable']=true;
   }catch(Throwable){$record['mediaUnavailable']=true;}
   $count=$counts[$row['id']]??0;
   $cover=$record['output']['lookbook']['items'][0]['url']??null;
   if(!$cover && $count) {
    try {
     $last=$db->select('generation_jobs',['collection_id'=>'eq.'.$row['id'],'deleted_at'=>'is.null','status'=>'eq.completed','user_id'=>'eq.'.$user['id'],'select'=>'output','order'=>'created_at.desc,id.desc','limit'=>'1'])[0]??null;
     if($last) $cover=$storage->refreshOutput($last['output'])['lookbook']['items'][0]['url']??null;
    }catch(Throwable) { /* Unavailable covers do not prevent opening selections. */ }
   }
   $items[]=['id'=>$row['id'],'name'=>$row['name'],'revision'=>(int)$row['revision'],'updatedAt'=>(int)(strtotime($row['updated_at'])*1000),'count'=>$count,'hasMore'=>false,'coverUrl'=>$cover,'record'=>$record];
  }
  $respond(['items'=>$items,'hasAny'=>count($rows)>0,'deletedIds'=>array_values(array_column(array_filter($rows,static fn(array $r):bool=>$r['deleted_at']!==null),'id'))]);
 }
 if($_SERVER['REQUEST_METHOD']!=='POST') $respond(['error'=>'Method không hỗ trợ.'],405);
 $raw=(string)file_get_contents('php://input');if(strlen($raw)>2000000) $respond(['error'=>'Dữ liệu quá lớn. Hãy lưu từng bộ.'],413);
 $body=json_decode($raw,true,64,JSON_THROW_ON_ERROR);
 if(($body['action']??'')==='hideVersion') {
  if(!StudioHistory::uuid($body['collectionId']??null)||!StudioHistory::uuid($body['jobId']??null)||!is_int($body['revision']??null)) throw new InvalidArgumentException('Phiên bản không hợp lệ.');
  $row=$db->rpc('hide_studio_version',['p_user'=>$user['id'],'p_collection'=>$body['collectionId'],'p_job'=>$body['jobId'],'p_revision'=>$body['revision']])[0];
  $respond(['item'=>['id'=>$row['id'],'name'=>$row['name'],'revision'=>(int)$row['revision'],'record'=>$row['payload']]]);
 }
 $items=$body['items']??null;
 if(!is_array($items)||count($items)>100) throw new InvalidArgumentException('Danh sách không hợp lệ.');
 $normalized=[];
 foreach($items as $item) {
  if(!StudioHistory::uuid($item['id']??null)||!is_int($item['revision']??null)||$item['revision']<0) throw new InvalidArgumentException('Bộ sưu tập không hợp lệ.');
  $name=trim((string)($item['name']??''));if(mb_strlen($name)<1||mb_strlen($name)>120) throw new InvalidArgumentException('Tên bộ cần 1–120 ký tự.');
  $record=StudioDraft::normalize($item['record']??[]);unset($record['collections'],$record['collectionId']);
  // Removing a bookmark is not an ownership violation or a reason to block other collections.
  if(!empty($record['savedLookId'])) {try{$history->look($record['savedLookId']);}catch(InvalidArgumentException){$record['savedLookId']=null;}}
  if(!empty($record['jobId'])) {
   try {$history->job($record['jobId']);}
   catch(InvalidArgumentException $e) {
    $job=$db->select('generation_jobs',['id'=>'eq.'.$record['jobId'],'select'=>'id,user_id,deleted_at','limit'=>'1'])[0]??null;
    $look=!empty($record['savedLookId'])?$history->look($record['savedLookId']):null;
    if(($job && $job['user_id']===$user['id'] && !empty($job['deleted_at'])) || ($look && $look['generation_job_id']===$record['jobId'])) $record['jobId']=null;
    else throw $e;
   }
  }
  $normalized[]=['id'=>$item['id'],'name'=>$name,'revision'=>$item['revision'],'record'=>$record,'deleted'=>($item['deleted']??false)===true];
 }
 $saved=$db->rpc('write_studio_collections',['p_user'=>$user['id'],'p_items'=>$normalized,'p_owner'=>$owner]);
 $respond(['items'=>array_map(static fn(array $r):array=>['id'=>$r['id'],'revision'=>(int)$r['revision'],'deleted'=>$r['deleted_at']!==null],$saved)]);
}catch(JsonException){$respond(['error'=>'Dữ liệu JSON không hợp lệ.'],400);
}catch(InvalidArgumentException $e){$respond(['error'=>$e->getMessage()],422);
}catch(Throwable $e){
 if(str_contains($e->getMessage(),'STUDIO_COLLECTION_CONFLICT'))$respond(['error'=>'Bộ này đã đổi ở cửa sổ khác. Giữ bản đang chỉnh thành bộ riêng hoặc tải bản mới nhất.'],409);
 // Log only the failure category, never payloads, SQL values or credentials.
 $reason='internal';
 if(preg_match('/Supabase returned HTTP (\d{3})/', $e->getMessage(), $status)) $reason='upstream_http_'.$status[1];
 elseif(str_contains($e->getMessage(),'request failed:')) $reason='upstream_transport_'.(int)$e->getCode();
 error_log('[VRemix] collections unavailable: '.get_class($e).' '.$reason);
 $message=$_SERVER['REQUEST_METHOD']==='GET'?'Chưa tải được bộ sưu tập.':'Chưa lưu được bộ sưu tập.';
 $respond(['error'=>$message.' Lựa chọn trên thiết bị vẫn được giữ.'],503);
}
