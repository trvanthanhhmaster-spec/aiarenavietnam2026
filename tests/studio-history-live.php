<?php
// Private, isolated fixture only: no AI provider call, no real user records changed.
declare(strict_types=1);
if (($argv[1] ?? '') !== '--live') exit("Use --live to test and clean up isolated history records.\n");
require __DIR__.'/../src/Support/Env.php';
require __DIR__.'/../src/Support/StudioHistory.php';
require __DIR__.'/../src/Infrastructure/SupabaseAdminClient.php';
require __DIR__.'/../src/Infrastructure/StudioStorage.php';
App\Support\Env::load(__DIR__.'/../.env');
$url=rtrim((string)getenv('SUPABASE_URL'),'/'); $key=(string)getenv('SUPABASE_SERVICE_ROLE_KEY');
$client=new App\Infrastructure\SupabaseAdminClient($url,$key); $storage=new App\Infrastructure\StudioStorage($url,$key);
$users=[]; $jobs=[]; $looks=[]; $paths=[]; $jars=[];
function verifyHistory(bool $ok,string $message): void { if (!$ok) throw new RuntimeException($message); }
function historyRemote(string $method,string $route,?array $body=null): array {
    global $url,$key;
    $h=curl_init($url.$route); curl_setopt_array($h,[CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>25,CURLOPT_HTTPHEADER=>['apikey: '.$key,'Authorization: Bearer '.$key,'Content-Type: application/json']]);
    if($body!==null) curl_setopt($h,CURLOPT_POSTFIELDS,json_encode($body));
    $raw=curl_exec($h); $code=(int)curl_getinfo($h,CURLINFO_RESPONSE_CODE); curl_close($h);
    verifyHistory($code>=200 && $code<300,'Fixture remote request failed HTTP '.$code);
    return json_decode((string)$raw,true) ?: [];
}
function historyHttp(string $jar,string $route,?array $payload=null,?string $csrf=null,bool $form=false): array {
    $h=curl_init('http://localhost/aiarenavietnam2026/'.$route);
    curl_setopt_array($h,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>true,CURLOPT_TIMEOUT=>35,CURLOPT_COOKIEFILE=>$jar,CURLOPT_COOKIEJAR=>$jar,
        CURLOPT_HTTPHEADER=>array_filter([$form?'Content-Type: application/x-www-form-urlencoded':'Content-Type: application/json',$csrf?'X-VRemix-CSRF: '.$csrf:null])]);
    if($payload!==null) curl_setopt_array($h,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$form?http_build_query($payload):json_encode($payload)]);
    $raw=curl_exec($h); $code=(int)curl_getinfo($h,CURLINFO_RESPONSE_CODE); curl_close($h);
    return ['status'=>$code,'raw'=>$raw,'body'=>json_decode((string)$raw,true)];
}
try {
    for($i=0;$i<2;$i++) {
        $email='vremix-history-qa-'.bin2hex(random_bytes(7)).'@example.invalid'; $password=bin2hex(random_bytes(24));
        $users[]=historyRemote('POST','/auth/v1/admin/users',['email'=>$email,'password'=>$password,'email_confirm'=>true]);
        $jars[]=tempnam(sys_get_temp_dir(),'vremix-history-qa-');
        $page=historyHttp($jars[$i],'auth.php?next=studio.php'); preg_match('/name="csrf" value="([^"]+)"/',(string)$page['raw'],$csrf);
        $page=historyHttp($jars[$i],'auth.php',['action'=>'login','email'=>$email,'password'=>$password,'csrf'=>$csrf[1],'next'=>'studio.php'],null,true);
        preg_match('/window.VREMIX_STUDIO = (\{.*?\});/s',(string)$page['raw'],$match); $configs[$i]=json_decode($match[1]??'',true);
        verifyHistory(!empty($configs[$i]['auth']['authenticated']),'Fixture login failed');
    }
    $owner=$configs[0]['sessionScope']; $userId=$users[0]['id'];
    $pixel='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC9sAAAAASUVORK5CYII=';
    for($i=0;$i<3;$i++) {
        $path=$userId.'/history-qa/'.bin2hex(random_bytes(8)).'.png'; $paths[]=$path;
        $signed=$storage->uploadData($path,'data:image/png;base64,'.$pixel);
        $input=['eventSlug'=>'custom','garmentSlug'=>'ao-tac','planning'=>['count'=>$i===2?2:1,'customOccasion'=>'QA only','people'=>[]]];
        if($i>0) $input['history']=['rootJobId'=>$jobs[0]['id'],'rootLookId'=>null,'parentJobId'=>$jobs[$i-1]['id']];
        $jobs[]=$client->insert('generation_jobs',['user_id'=>$userId,'owner_session_hash'=>$owner,'provider'=>'gemini-webapi-local','status'=>'completed',
            'input'=>$input,'output'=>['lookbook'=>['items'=>[['url'=>$signed,'path'=>$path]]]],'created_at'=>gmdate(DATE_ATOM,time()-30+$i)])[0];
    }
    $csrf=$configs[0]['lookCsrf'];
    verifyHistory(historyHttp($jars[0],'studio-history.php')['status']===403,'Missing CSRF accepted');
    $list=historyHttp($jars[0],'studio-history.php?jobId='.$jobs[2]['id'],null,$csrf);
    verifyHistory($list['status']===200 && count($list['body']['items'])===3,'Root history did not return three versions');
    verifyHistory($list['body']['items'][2]['selection']['planning']['count']===2,'Snapshot count not preserved');
    $page=historyHttp($jars[0],'studio-history.php?jobId='.$jobs[2]['id'].'&offset=2',null,$csrf);
    verifyHistory(count($page['body']['items'])===1 && $page['body']['items'][0]['jobId']===$jobs[2]['id'],'History paging lost selected version');
    verifyHistory(array_column($list['body']['items'],'saved')===[false,false,false],'Unbookmarked results missing or marked saved');
    $other=historyHttp($jars[1],'studio-history.php?jobId='.$jobs[0]['id'],null,$configs[1]['lookCsrf']);
    verifyHistory($other['status']===404,'Other account read private history');
    $gateway=historyHttp($jars[1],'generation-edge.php',['planning'=>['count'=>1],'referenceJobId'=>$jobs[0]['id']],$configs[1]['lookCsrf']);
    verifyHistory($gateway['status']===422,'Gateway forwarded unowned source to provider');
    $history=new App\Support\StudioHistory($client,$storage,$userId,$owner);
    $request=['referenceJobId'=>$jobs[1]['id'],'history'=>['rootJobId'=>'spoofed'],'editInstruction'=>'spoofed','planning'=>['count'=>2]];
    $image=$history->reference($request);
    verifyHistory($image['data']===$pixel,'Source image bytes were not resolved from private storage');
    verifyHistory($request['history']['rootJobId']===$jobs[0]['id'] && $request['history']['parentJobId']===$jobs[1]['id'],'Branch selected parent/root incorrectly');
    verifyHistory(str_contains($request['editInstruction'],'previousPlan') && !str_contains($request['editInstruction'],'spoofed'),'Client overwrote trusted prompt');
    $look=$client->insert('looks',['user_id'=>$userId,'name'=>'History QA bookmark','occasion_slug'=>'custom','garment_slug'=>'ao-tac',
        'generation_job_id'=>$jobs[1]['id'],'image_url'=>$list['body']['items'][1]['image_url'],'storage_path'=>$paths[1],
        'selection'=>$list['body']['items'][1]['selection']])[0]; $looks[]=$look;
    $saved=historyHttp($jars[0],'studio-history.php?lookId='.$look['id'],null,$csrf);
    verifyHistory($saved['status']===200 && $saved['body']['items'][1]['saved']===true && $saved['body']['items'][0]['saved']===false,'Bookmark state not separate from versions');
    $freshPage=historyHttp($jars[0],'studio.php');
    verifyHistory($freshPage['status']===200,'Studio refresh failed');
    $refresh=historyHttp($jars[0],'studio-history.php',null,$csrf);
    verifyHistory(count($refresh['body']['items'])===3,'Unsaved versions disappeared after refresh');
    $foreignRequest=['referenceJobId'=>$jobs[0]['id']];
    $denied=false; try { (new App\Support\StudioHistory($client,$storage,$users[1]['id'],'foreign'))->reference($foreignRequest); } catch(InvalidArgumentException) { $denied=true; }
    verifyHistory($denied,'Foreign reference accepted');
    $legacy=$client->insert('looks',['user_id'=>$userId,'name'=>'Legacy QA only','occasion_slug'=>'custom','garment_slug'=>'ao-tac',
        'image_url'=>$list['body']['items'][0]['image_url'],'storage_path'=>$paths[0],'selection'=>$list['body']['items'][0]['selection']])[0]; $looks[]=$legacy;
    $legacyRequest=['referenceLookId'=>$legacy['id'],'planning'=>['count'=>2]]; $history->reference($legacyRequest);
    verifyHistory($legacyRequest['history']['rootJobId']===null && $legacyRequest['history']['rootLookId']===$legacy['id'],'Legacy look root not retained');
    $child=$client->insert('generation_jobs',['user_id'=>$userId,'owner_session_hash'=>$owner,'provider'=>'gemini-webapi-local','status'=>'completed',
        'input'=>$legacyRequest,'output'=>$jobs[2]['output']])[0]; $jobs[]=$child;
    $branch=['referenceJobId'=>$child['id'],'planning'=>['count'=>2]]; $history->reference($branch);
    verifyHistory($branch['history']['rootJobId']===null && $branch['history']['rootLookId']===$legacy['id'],'Legacy lineage became a new root after edit');
    $legacyList=historyHttp($jars[0],'studio-history.php?jobId='.$child['id'],null,$csrf);
    verifyHistory(count($legacyList['body']['items'])===2 && $legacyList['body']['items'][0]['lookId']===$legacy['id'],'Legacy root missing from history');
    echo "Live history: three unsaved versions, private ownership, stored selection/count, root/parent lineage, trusted image bytes, bookmark distinction and refresh passed. No AI calls.\n";
} finally {
    foreach($looks as $look) $client->delete('looks',['id'=>'eq.'.$look['id']]);
    foreach($jobs as $job) $client->delete('generation_jobs',['id'=>'eq.'.$job['id']]);
    if($paths) historyRemote('DELETE','/storage/v1/object/generated-lookbooks',['prefixes'=>$paths]);
    foreach($users as $user) historyRemote('DELETE','/auth/v1/admin/users/'.$user['id']);
    foreach($jars as $jar) if(is_file($jar)) unlink($jar);
    echo "Only isolated history fixtures and objects cleaned up.\n";
}
