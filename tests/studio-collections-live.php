<?php
// Disposable account integration test; no generation calls or real user edits.
declare(strict_types=1);
if (($argv[1]??'')!=='--live') exit("Use --live to test with disposable accounts.\n");
require __DIR__.'/../src/Support/Env.php';
require __DIR__.'/../src/Support/StudioDraft.php';
App\Support\Env::load(__DIR__.'/../.env');
$users=[];$jars=[];$accounts=[];$jobIds=[];
function collectionCheck(bool $ok,string $message): void {if(!$ok) throw new RuntimeException($message);}
function collectionRemote(string $method,string $route,?array $body=null,?string $token=null): array {
 $key=(string)getenv($token?'SUPABASE_ANON_KEY':'SUPABASE_SERVICE_ROLE_KEY');
 $h=curl_init(rtrim((string)getenv('SUPABASE_URL'),'/').$route);
 curl_setopt_array($h,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_TIMEOUT=>25,CURLOPT_HTTPHEADER=>['apikey: '.$key,'Authorization: Bearer '.($token??$key),'Content-Type: application/json','Prefer: return=representation']]);
 if($body!==null) curl_setopt($h,CURLOPT_POSTFIELDS,json_encode($body));
 $raw=curl_exec($h);$status=(int)curl_getinfo($h,CURLINFO_RESPONSE_CODE);curl_close($h);
 return ['status'=>$status,'body'=>json_decode((string)$raw,true)];
}
function collectionHttp(string $jar,string $route,?array $body=null,?string $csrf=null,bool $form=false,?string $override=null): array {
 global $accounts;
 $h=curl_init('http://localhost/aiarenavietnam2026/'.$route);
 $headers=array_filter([$form?'Content-Type: application/x-www-form-urlencoded':'Content-Type: application/json',$csrf?'X-VRemix-CSRF: '.$csrf:null,($override??$accounts[$jar]??null)?'X-VRemix-Account: '.($override??$accounts[$jar]):null]);
 curl_setopt_array($h,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>true,CURLOPT_TIMEOUT=>35,CURLOPT_COOKIEFILE=>$jar,CURLOPT_COOKIEJAR=>$jar,CURLOPT_HTTPHEADER=>$headers]);
 if($body!==null) curl_setopt_array($h,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$form?http_build_query($body):json_encode($body)]);
 $raw=curl_exec($h);$status=(int)curl_getinfo($h,CURLINFO_RESPONSE_CODE);curl_close($h);
 if($status===503) fwrite(STDERR,'Live endpoint unavailable: HTTP 503 '.($body===null?'GET ':'POST ').strtok($route,'?')."\n");
 return ['status'=>$status,'body'=>json_decode((string)$raw,true),'raw'=>$raw];
}
function collectionLogin(string $jar,array $user): array {
 global $accounts;
 $page=collectionHttp($jar,'auth.php?next=studio.php');preg_match('/name="csrf" value="([^"]+)"/',$page['raw'],$csrf);
 $page=collectionHttp($jar,'auth.php',['action'=>'login','email'=>$user['email'],'password'=>$user['password'],'csrf'=>$csrf[1],'next'=>'studio.php'],null,true);
 preg_match('/window.VREMIX_STUDIO = (\{.*?\});/s',$page['raw'],$match);$config=json_decode($match[1]??'',true);
 collectionCheck(!empty($config['auth']['authenticated']) && !empty($config['collectionEndpoint']),'Updated Studio login failed');
 $accounts[$jar]=$config['auth']['userId'];return $config;
}
function collectionUuid(): string { $v=bin2hex(random_bytes(16));return substr($v,0,8).'-'.substr($v,8,4).'-4'.substr($v,13,3).'-8'.substr($v,17,3).'-'.substr($v,20); }
try {
 for($i=0;$i<3;$i++) $jars[]=tempnam(sys_get_temp_dir(),'vremix-collections-qa-');
 collectionCheck(collectionHttp($jars[0],'studio-collections-api.php')['status']===401,'Guest accessed private collections');
 for($i=0;$i<2;$i++) {
  $email='vremix-collection-qa-'.bin2hex(random_bytes(7)).'@example.invalid';$password=bin2hex(random_bytes(24));
  $created=collectionRemote('POST','/auth/v1/admin/users',['email'=>$email,'password'=>$password,'email_confirm'=>true]);
  collectionCheck($created['status']===200 && !empty($created['body']['id']),'QA account creation failed');
  $users[]=['id'=>$created['body']['id'],'email'=>$email,'password'=>$password];
 }
 $a=collectionLogin($jars[0],$users[0]);$b=collectionLogin($jars[1],$users[0]);$other=collectionLogin($jars[2],$users[1]);
 $initial=collectionHttp($jars[0],'studio-collections-api.php',null,$a['lookCsrf']);
 collectionCheck($initial['status']===200 && $initial['body']['items']===[] && !$initial['body']['hasAny'],'Fresh account must be empty: HTTP '.$initial['status'].' '.json_encode($initial['body']));
 collectionCheck(collectionHttp($jars[0],'studio-collections-api.php',['items'=>[]])['status']===403,'Missing CSRF accepted');
 collectionCheck(collectionHttp($jars[0],'studio-collections-api.php',null,$a['lookCsrf'],false,$users[1]['id'])['status']===403,'Stale-account tab accepted');
 $ids=[collectionUuid(),collectionUuid()];
 $snapshot=['draft'=>['event'=>'custom','planning'=>['version'=>1,'count'=>1,'shared'=>true,'activePerson'=>1,'customOccasion'=>'QA beach','people'=>[['name'=>'QA','outfit'=>[],'faceSupplied'=>true,'faceData'=>'not-stored']]]],'guideStep'=>'time','output'=>['not-stored'=>true]];
 $items=[['id'=>$ids[0],'name'=>'QA beach','revision'=>0,'record'=>$snapshot],['id'=>$ids[1],'name'=>'QA school','revision'=>0,'record'=>$snapshot]];
 $saved=collectionHttp($jars[0],'studio-collections-api.php',['items'=>$items],$a['lookCsrf']);
 collectionCheck($saved['status']===200 && array_column($saved['body']['items'],'revision')===[1,1],'Initial batch failed');
 $read=collectionHttp($jars[1],'studio-collections-api.php',null,$b['lookCsrf']);
 collectionCheck(count($read['body']['items'])===2,'Second device did not restore both collections');
 foreach($read['body']['items'] as $item) {
  collectionCheck(!isset($item['record']['output']) && !$item['record']['draft']['planning']['people'][0]['faceSupplied'] && !isset($item['record']['draft']['planning']['people'][0]['faceData']),'Sensitive media persisted');
 }
 foreach($items as &$item) {$item['record']=App\Support\StudioDraft::normalize($item['record']);$item['revision']=1;}unset($item);
 $noop=collectionHttp($jars[0],'studio-collections-api.php',['items'=>$items],$a['lookCsrf']);
 collectionCheck(array_column($noop['body']['items'],'revision')===[1,1],'No-op bumped revisions');
 $items[0]['name']='QA A changed';$changed=collectionHttp($jars[0],'studio-collections-api.php',['items'=>[$items[0]]],$a['lookCsrf']);
 collectionCheck($changed['status']===200 && $changed['body']['items'][0]['revision']===2,'First device write failed');
 $items[1]['name']='QA B independent';
 collectionCheck(collectionHttp($jars[1],'studio-collections-api.php',['items'=>[$items[1]]],$b['lookCsrf'])['status']===200,'Independent collection falsely conflicted');
 collectionCheck(collectionHttp($jars[1],'studio-collections-api.php',['items'=>[$items[0]]],$b['lookCsrf'])['status']===409,'Stale same-collection overwrite accepted');
 collectionCheck(collectionHttp($jars[2],'studio-collections-api.php',['items'=>[$items[0]]],$other['lookCsrf'])['status']===409,'Foreign collection write accepted');
 collectionCheck(collectionHttp($jars[2],'studio-history.php?collectionId='.$ids[0],null,$other['lookCsrf'])['status']===404,'Foreign collection history accepted');
 // A mixed batch is transactional: a late conflict must roll back earlier rows.
 $candidate=$items[1];$candidate['revision']=2;$candidate['name']='must-roll-back';
 $batchConflict=collectionHttp($jars[0],'studio-collections-api.php',['items'=>[$candidate,$items[0]]],$a['lookCsrf']);
 collectionCheck($batchConflict['status']===409,'Mixed batch rejection failed: HTTP '.$batchConflict['status'].' '.json_encode($batchConflict['body']));
 $unchanged=collectionRemote('GET','/rest/v1/studio_collections?id=eq.'.$ids[1].'&select=name,revision');
 collectionCheck($unchanged['body'][0]['name']==='QA B independent' && $unchanged['body'][0]['revision']===2,'Conflicting batch partially wrote another collection');
 // Synthetic completed jobs only; no provider calls. Attach an owned chain atomically.
 for($i=0;$i<2;$i++) {
  $input=['eventSlug'=>'custom'];if($i) $input['history']=['rootJobId'=>$jobIds[0],'parentJobId'=>$jobIds[0]];
  $job=collectionRemote('POST','/rest/v1/generation_jobs',['user_id'=>$users[0]['id'],'owner_session_hash'=>$a['sessionScope'],'provider'=>'gemini-webapi-local','status'=>'completed','input'=>$input,'output'=>['lookbook'=>['items'=>[['url'=>'http://localhost/aiarenavietnam2026/assets/media/studio-idle-ao-dai.png']]]]]);
  collectionCheck($job['status']===201,'Synthetic job insertion failed');$jobIds[]=$job['body'][0]['id'];
 }
 $items[0]['revision']=2;$items[0]['record']['jobId']=$jobIds[1];
 collectionCheck(collectionHttp($jars[0],'studio-collections-api.php',['items'=>[$items[0]]],$a['lookCsrf'])['status']===200,'Chain attachment failed');
 $history=collectionHttp($jars[0],'studio-history.php?collectionId='.$ids[0],null,$a['lookCsrf']);
 collectionCheck($history['status']===200 && count($history['body']['items'])===2,'Collection does not own both versions');
 $guestIds=[];
 for($i=0;$i<2;$i++) {
  $input=['eventSlug'=>'custom'];if($i)$input['history']=['rootJobId'=>$guestIds[0],'parentJobId'=>$guestIds[0]];
  $guest=collectionRemote('POST','/rest/v1/generation_jobs',['owner_session_hash'=>$a['sessionScope'],'provider'=>'gemini-webapi-local','status'=>'completed','input'=>$input,'output'=>['lookbook'=>['items'=>[['url'=>'http://localhost/aiarenavietnam2026/assets/media/studio-atelier-poster.png']]]]]);
  collectionCheck($guest['status']===201,'Guest chain fixture failed');$guestIds[]=$guest['body'][0]['id'];$jobIds[]=$guest['body'][0]['id'];
 }
 $claim=$items[1];$claim['revision']=2;$claim['record']['jobId']=$guestIds[1];
 collectionCheck(collectionHttp($jars[0],'studio-collections-api.php',['items'=>[$claim]],$a['lookCsrf'])['status']===200,'Guest chain was not claimed after login');
 $claimed=collectionRemote('GET','/rest/v1/generation_jobs?id=in.('.implode(',',$guestIds).')&select=user_id,collection_id');
 foreach($claimed['body'] as $job) collectionCheck($job['user_id']===$users[0]['id'] && $job['collection_id']===$ids[1],'Only part of the guest chain was claimed');
 $foreignGuest=collectionRemote('POST','/rest/v1/generation_jobs',['owner_session_hash'=>$other['sessionScope'],'provider'=>'gemini-webapi-local','status'=>'completed','input'=>[],'output'=>[]]);$foreignId=$foreignGuest['body'][0]['id'];$jobIds[]=$foreignId;
 $forbidden=['id'=>collectionUuid(),'name'=>'must-not-exist','revision'=>0,'record'=>App\Support\StudioDraft::normalize(['jobId'=>$foreignId])];
 $denied=collectionRemote('POST','/rest/v1/rpc/write_studio_collections',['p_user'=>$users[0]['id'],'p_items'=>[$forbidden],'p_owner'=>$a['sessionScope']]);
 collectionCheck($denied['status']>=400,'SQL NULL ownership check accepted a foreign guest job');
 $absent=collectionRemote('GET','/rest/v1/studio_collections?id=eq.'.$forbidden['id'].'&select=id');collectionCheck($absent['body']===[],'Foreign guest attempt left a collection behind');
 $hidden=collectionHttp($jars[0],'studio-collections-api.php',['action'=>'hideVersion','collectionId'=>$ids[0],'jobId'=>$jobIds[1],'revision'=>3],$a['lookCsrf']);
 collectionCheck($hidden['status']===200 && $hidden['body']['item']['revision']===4 && $hidden['body']['item']['record']['jobId']===null,'Deleting current version failed');
 $history=collectionHttp($jars[0],'studio-history.php?collectionId='.$ids[0],null,$a['lookCsrf']);
 collectionCheck(count($history['body']['items'])===1,'Deleted version reappeared');
 collectionCheck(collectionHttp($jars[0],'local-generate.php?jobId='.$jobIds[1],null,$a['lookCsrf'])['status']===404,'Deleted version read via job endpoint');
 collectionCheck(collectionHttp($jars[0],'generation-edge.php?jobId='.$jobIds[1],null,$a['lookCsrf'])['status']===404,'Deleted version read via gateway');
 collectionRemote('PATCH','/rest/v1/generation_jobs?id=eq.'.$jobIds[0],['owner_session_hash'=>$other['sessionScope']]);
 collectionCheck(collectionHttp($jars[2],'local-generate.php?jobId='.$jobIds[0],null,$other['lookCsrf'])['status']===404,'Session owner bypassed account ownership');
 $foreignGateway=collectionHttp($jars[2],'generation-edge.php?jobId='.$jobIds[0],null,$other['lookCsrf']);
 collectionCheck($foreignGateway['status']===404,'Gateway ownership rejection failed: HTTP '.$foreignGateway['status'].' '.json_encode($foreignGateway['body']));
 $items[0]['record']=$hidden['body']['item']['record'];$items[0]['revision']=4;$items[0]['deleted']=true;
 collectionCheck(collectionHttp($jars[0],'studio-collections-api.php',['items'=>[$items[0]]],$a['lookCsrf'])['status']===200,'Collection deletion failed');
 $items[0]['deleted']=false;$items[0]['revision']=5;
 collectionCheck(collectionHttp($jars[1],'studio-collections-api.php',['items'=>[$items[0]]],$b['lookCsrf'])['status']===409,'Deleted collection resurrected');
 $after=collectionHttp($jars[0],'studio-collections-api.php',null,$a['lookCsrf']);
 collectionCheck(count($after['body']['items'])===1 && $after['body']['hasAny'],'Deleted collection still listed or tombstone lost');
 $before=collectionRemote('GET','/rest/v1/studio_collections?user_id=eq.'.$users[0]['id'].'&select=id,revision,deleted_at');
 collectionHttp($jars[0],'studio-collections-api.php',null,$a['lookCsrf']);
 $again=collectionRemote('GET','/rest/v1/studio_collections?user_id=eq.'.$users[0]['id'].'&select=id,revision,deleted_at');
 collectionCheck($before['body']===$again['body'],'Opening list mutates records');
 $token=collectionRemote('POST','/auth/v1/token?grant_type=password',['email'=>$users[1]['email'],'password'=>$users[1]['password']]);
 $foreign=collectionRemote('GET','/rest/v1/studio_collections?user_id=eq.'.$users[0]['id'].'&select=*',null,$token['body']['access_token']);
 collectionCheck($foreign['status']===200 && $foreign['body']===[],'RLS exposed foreign collections');
 $rpc=collectionRemote('POST','/rest/v1/rpc/write_studio_collections',['p_user'=>$users[0]['id'],'p_items'=>[],'p_owner'=>'wrong'], $token['body']['access_token']);
 collectionCheck(in_array($rpc['status'],[401,403],true),'Authenticated client can invoke service-only writer');
 echo "Live collections: empty account, private ownership, CSRF, media stripping, no-op, independent CAS, conflict, chain attachment, version/collection tombstones and RLS passed. No AI calls.\n";
} finally {
 foreach($jobIds as $id) collectionRemote('DELETE','/rest/v1/generation_jobs?id=eq.'.$id);
 foreach($users as $user) {
  $deleted=collectionRemote('DELETE','/auth/v1/admin/users/'.$user['id']);collectionCheck($deleted['status']>=200 && $deleted['status']<300,'QA cleanup failed');
 }
 foreach($jars as $jar) if(is_file($jar)) unlink($jar);
 echo "Only disposable QA accounts, collections and synthetic jobs removed.\n";
}
