<?php
declare(strict_types=1);
require __DIR__.'/src/Support/Env.php';
require __DIR__.'/src/Support/SupabaseAuth.php';
require __DIR__.'/src/Support/StudioHistory.php';
require __DIR__.'/src/Infrastructure/SupabaseAdminClient.php';
require __DIR__.'/src/Infrastructure/StudioStorage.php';
use App\Support\{Env,SupabaseAuth,StudioHistory};
use App\Infrastructure\{SupabaseAdminClient,StudioStorage};
header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store');
$respond = static function(array $body,int $code=200): void { http_response_code($code); echo json_encode($body,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR); exit; };
Env::load(__DIR__.'/.env');
$url=(string)getenv('SUPABASE_URL'); $key=(string)getenv('SUPABASE_SERVICE_ROLE_KEY');
$auth=new SupabaseAuth($url,(string)getenv('SUPABASE_ANON_KEY'),$key); $auth->boot(); $user=$auth->user();
if (!$auth->verifyCsrf((string)($_SERVER['HTTP_X_VREMIX_CSRF']??''))) $respond(['error'=>'Phiên không hợp lệ. Tải lại Studio.'],403);
$owner=hash('sha256',(string)($_SESSION['studio_generation_owner']??'')); session_write_close();
if ($_SERVER['REQUEST_METHOD']!=='GET') $respond(['error'=>'Method không được hỗ trợ.'],405);
try {
    $client=new SupabaseAdminClient($url,$key); $storage=new StudioStorage($url,$key);
    $history=new StudioHistory($client,$storage,$user['id']??null,$owner);
    $collection=null;
    if(!empty($_GET['collectionId'])) {
        if(!StudioHistory::uuid($_GET['collectionId'])) throw new InvalidArgumentException('Bộ sưu tập không hợp lệ.');
        $collection=(string)$_GET['collectionId'];
        if($user && !$client->select('studio_collections',['id'=>'eq.'.$collection,'user_id'=>'eq.'.$user['id'],'deleted_at'=>'is.null','select'=>'id','limit'=>'1'])) throw new InvalidArgumentException('Bộ này không còn tồn tại.');
    }
    $rootJob=null; $rootLook=null;
    if (!$collection && !empty($_GET['jobId'])) {
        $selected=$history->job((string)$_GET['jobId']);
        $rootJob=isset($selected['input']['history']) ? ($selected['input']['history']['rootJobId']??null) : $selected['id'];
        $rootLook=$selected['input']['history']['rootLookId']??null;
    } elseif (!$collection && !empty($_GET['lookId'])) {
        $look=$history->look((string)$_GET['lookId']);
        if (!empty($look['generation_job_id'])) {
            try {
                $selected=$history->job($look['generation_job_id']);
                $rootJob=isset($selected['input']['history']) ? ($selected['input']['history']['rootJobId']??null) : $selected['id'];
                $rootLook=$selected['input']['history']['rootLookId']??$look['id'];
            } catch(InvalidArgumentException) { $rootLook=$look['id']; }
        } else $rootLook=$look['id'];
    }
    $offset=filter_var($_GET['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);
    if($offset===false) throw new InvalidArgumentException('Trang lịch sử không hợp lệ.');
    $filters=['status'=>'eq.completed','deleted_at'=>'is.null','select'=>'id,input,output,created_at,user_id','order'=>'created_at.asc,id.asc','limit'=>'101','offset'=>(string)$offset];
    $filters['or']=$user ? '(user_id.eq.'.$user['id'].',and(user_id.is.null,owner_session_hash.eq.'.$owner.'))' : '(and(user_id.is.null,owner_session_hash.eq.'.$owner.'))';
    if ($collection) $filters['collection_id']='eq.'.$collection;
    elseif ($rootJob) $filters['and']='(or(id.eq.'.$rootJob.',input->history->>rootJobId.eq.'.$rootJob.'))';
    elseif ($rootLook) $filters['input->history->>rootLookId']='eq.'.$rootLook;
    elseif (!$collection) $filters['order']='created_at.desc,id.desc';
    $jobs=$client->select('generation_jobs',$filters);
    $more=count($jobs)>100; $jobs=array_slice($jobs,0,100);
    if (!$collection && !$rootJob && !$rootLook) $jobs=array_reverse($jobs);
    $looks=$user ? $client->select('looks',['user_id'=>'eq.'.$user['id'],'deleted_at'=>'is.null','select'=>'id,name,generation_job_id,client_save_id','order'=>'created_at.desc','limit'=>'1000']) : [];
    $saved=[]; foreach($looks as $look) if (!empty($look['generation_job_id'])) $saved[$look['generation_job_id']]=$look;
    $items=[];
    if ($rootLook && !$rootJob && $offset===0) {
        $look=$history->look($rootLook);
        try { $image=!empty($look['storage_path'])?$storage->sign($look['storage_path']):$look['image_url']; } catch(Throwable) { $image=null; }
        $items[]=['id'=>'look:'.$look['id'],'lookId'=>$look['id'],'name'=>$look['name'],'created_at'=>$look['created_at'],'selection'=>$look['selection'],'image_url'=>$image,'storage_path'=>$look['storage_path']??null,'saved'=>true,'client_save_id'=>$look['client_save_id']??null];
    }
    foreach($jobs as $job) {
        $item=$job['output']['lookbook']['items'][0]??null;
        if (!is_array($item) || empty($item['url'])) continue;
        try { $image=!empty($item['path'])?$storage->sign($item['path']):$item['url']; } catch(Throwable) { $image=null; }
        $look=$saved[$job['id']]??null;
        $items[]=['id'=>$job['id'],'jobId'=>$job['id'],'lookId'=>$look['id']??null,'name'=>$look['name']??null,
            'selection'=>StudioHistory::selection($job['input']),'image_url'=>$image,'storage_path'=>$item['path']??null,
            'created_at'=>$job['created_at'],'saved'=>$look!==null,'client_save_id'=>$look['client_save_id']??null,
            'rootJobId'=>isset($job['input']['history']) ? ($job['input']['history']['rootJobId']??null) : $job['id'],
            'rootLookId'=>$job['input']['history']['rootLookId']??null,
            'parentJobId'=>$job['input']['history']['parentJobId']??null];
    }
    $respond(['items'=>$items,'scoped'=>($collection||$rootJob||$rootLook)?true:false,'hasMore'=>$more,'nextOffset'=>$offset+count($jobs)]);
} catch(InvalidArgumentException $e) { $respond(['error'=>$e->getMessage()],404);
} catch(Throwable) { $respond(['error'=>'Chưa mở được lịch sử phiên bản. Ảnh đang xem vẫn được giữ.'],503); }
