<?php
// Isolated server-draft integration test. No provider calls or real user records changed.
declare(strict_types=1);
if (($argv[1] ?? '') !== '--live') exit("Use --live to create and clean up isolated draft accounts.\n");
require __DIR__ . '/../src/Support/Env.php';
App\Support\Env::load(__DIR__ . '/../.env');
$url = rtrim((string) getenv('SUPABASE_URL'), '/');
$serviceKey = (string) getenv('SUPABASE_SERVICE_ROLE_KEY');
$anonKey = (string) getenv('SUPABASE_ANON_KEY');
$users = []; $jars = []; $accounts = [];
function checkDraftLive(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }
function remoteDraft(string $method, string $route, ?array $body = null, ?string $token = null, bool $publicKey = false): array {
    global $url, $serviceKey, $anonKey;
    $key = $publicKey ? $anonKey : $serviceKey;
    $handle = curl_init($url . $route);
    curl_setopt_array($handle, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_TIMEOUT=>20,
        CURLOPT_HTTPHEADER=>['apikey: '.$key,'Authorization: Bearer '.($token ?? $key),'Content-Type: application/json']]);
    if ($body !== null) curl_setopt($handle,CURLOPT_POSTFIELDS,json_encode($body));
    $raw = curl_exec($handle); $status = (int) curl_getinfo($handle,CURLINFO_RESPONSE_CODE); curl_close($handle);
    return ['status'=>$status,'body'=>json_decode((string) $raw,true)];
}
function draftHttp(string $jar, string $route, ?array $body = null, ?string $csrf = null, bool $form = false, ?string $accountOverride = null): array {
    global $accounts;
    $handle = curl_init('http://localhost/aiarenavietnam2026/'.$route);
    curl_setopt_array($handle,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>true,CURLOPT_TIMEOUT=>30,
        CURLOPT_COOKIEFILE=>$jar,CURLOPT_COOKIEJAR=>$jar,
        CURLOPT_HTTPHEADER=>array_filter([$form ? 'Content-Type: application/x-www-form-urlencoded' : 'Content-Type: application/json', $csrf ? 'X-VRemix-CSRF: '.$csrf : null,
            ($accountOverride ?? $accounts[$jar] ?? null) ? 'X-VRemix-Account: '.($accountOverride ?? $accounts[$jar]) : null])]);
    if ($body !== null) curl_setopt_array($handle,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$form ? http_build_query($body) : json_encode($body)]);
    $raw = curl_exec($handle); $status = (int) curl_getinfo($handle,CURLINFO_RESPONSE_CODE); curl_close($handle);
    return ['status'=>$status,'body'=>json_decode((string) $raw,true),'raw'=>$raw];
}
function draftLogin(string $jar, string $email, string $password): array {
    global $accounts;
    $page = draftHttp($jar,'auth.php?next=studio.php');
    preg_match('/name="csrf" value="([^"]+)"/', (string) $page['raw'], $match);
    checkDraftLive(!empty($match[1]),'Login CSRF missing');
    $logged = draftHttp($jar,'auth.php',['action'=>'login','email'=>$email,'password'=>$password,'csrf'=>$match[1],'next'=>'studio.php'],null,true);
    preg_match('/window.VREMIX_STUDIO = (\{.*?\});/s',(string)$logged['raw'],$config);
    $value = json_decode($config[1] ?? '',true);
    checkDraftLive(!empty($value['auth']['authenticated']) && !empty($value['draftEndpoint']), 'Login did not reach server-draft Studio');
    $accounts[$jar]=$value['auth']['userId'];
    return $value;
}
try {
    for ($i=0;$i<3;$i++) $jars[] = tempnam(sys_get_temp_dir(),'vremix-draft-qa-');
    $guest = draftHttp($jars[0],'studio-draft.php'); checkDraftLive($guest['status']===401,'Guest accessed server draft');
    for ($i=0;$i<2;$i++) {
        $email = 'vremix-draft-qa-'.bin2hex(random_bytes(7)).'@example.invalid'; $password = bin2hex(random_bytes(24));
        $created = remoteDraft('POST','/auth/v1/admin/users',['email'=>$email,'password'=>$password,'email_confirm'=>true]);
        checkDraftLive($created['status']===200 && !empty($created['body']['id']),'Test account creation failed');
        $users[] = ['id'=>$created['body']['id'],'email'=>$email,'password'=>$password];
    }
    $configA = draftLogin($jars[0],$users[0]['email'],$users[0]['password']);
    $configB = draftLogin($jars[1],$users[0]['email'],$users[0]['password']);
    $configOther = draftLogin($jars[2],$users[1]['email'],$users[1]['password']);
    $csrfA=$configA['lookCsrf']; $csrfB=$configB['lookCsrf']; $csrfOther=$configOther['lookCsrf'];
    $initial = draftHttp($jars[0],'studio-draft.php',null,$csrfA);
    checkDraftLive($initial['status']===200 && $initial['body']['revision']===0,'New account draft not empty');
    checkDraftLive(draftHttp($jars[0],'studio-draft.php',['action'=>'clear','revision'=>0])['status']===403,'Missing CSRF accepted');
    checkDraftLive(draftHttp($jars[0],'studio-draft.php',null,$csrfA,false,$users[1]['id'])['status']===403,'Stale account tab accepted');
    $record=['draft'=>['event'=>'custom','planning'=>['version'=>1,'count'=>1,'shared'=>true,'period'=>null,'customOccasion'=>'Đi biển','people'=>[
        ['name'=>'Người thử','outfit'=>['garment'=>''],'faceSupplied'=>true,'faceData'=>'not-stored']]]], 'guideStep'=>'time','output'=>['imageUrl'=>'not-stored']];
    $save = draftHttp($jars[0],'studio-draft.php',['action'=>'save','revision'=>0,'record'=>$record,'user_id'=>$users[1]['id']],$csrfA);
    checkDraftLive($save['status']===200 && $save['body']['revision']===1,'Server save failed');
    $otherDevice = draftHttp($jars[1],'studio-draft.php',null,$csrfB);
    checkDraftLive($otherDevice['status']===200 && $otherDevice['body']['record']['draft']['planning']['customOccasion']==='Đi biển','Other device failed to restore draft');
    $person=$otherDevice['body']['record']['draft']['planning']['people'][0];
    checkDraftLive($person['faceSupplied']===false && !isset($person['faceData']) && !isset($otherDevice['body']['record']['output']),'Face pixels/output persisted');
    $otherAccount = draftHttp($jars[2],'studio-draft.php',null,$csrfOther);
    checkDraftLive($otherAccount['body']['record']===null,'Other account saw private draft');
    $badReference=$record; $badReference['jobId']='00000000-0000-4000-8000-000000000001';
    checkDraftLive(draftHttp($jars[2],'studio-draft.php',['action'=>'save','revision'=>0,'record'=>$badReference],$csrfOther)['status']===403,'Unowned output reference accepted');
    $record['draft']['planning']['customOccasion']='Đi biển tuần sau';
    checkDraftLive(draftHttp($jars[1],'studio-draft.php',['action'=>'save','revision'=>1,'record'=>$record],$csrfB)['status']===200,'Second-device save failed');
    checkDraftLive(draftHttp($jars[0],'studio-draft.php',['action'=>'save','revision'=>1,'record'=>$record],$csrfA)['status']===409,'Stale overwrite accepted');
    $token = remoteDraft('POST','/auth/v1/token?grant_type=password',['email'=>$users[1]['email'],'password'=>$users[1]['password']],null,true);
    $foreign = remoteDraft('GET','/rest/v1/studio_drafts?user_id=eq.'.$users[0]['id'].'&select=*',null,$token['body']['access_token'],true);
    checkDraftLive($foreign['status']===200 && $foreign['body']===[], 'RLS exposed foreign draft');
    $rpc = remoteDraft('POST','/rest/v1/rpc/write_studio_draft',['p_user'=>$users[0]['id'],'p_payload'=>null,'p_revision'=>2],$token['body']['access_token'],true);
    checkDraftLive(in_array($rpc['status'],[401,403],true),'User can call service-only draft writer');
    checkDraftLive(draftHttp($jars[1],'studio-draft.php',['action'=>'clear','revision'=>2],$csrfB)['status']===200,'Clear server draft failed');
    $cleared = draftHttp($jars[0],'studio-draft.php',null,$csrfA);
    checkDraftLive($cleared['body']['record']===null && $cleared['body']['revision']===3,'Draft not cleared across devices');
    checkDraftLive(draftHttp($jars[0],'studio-draft.php',['action'=>'save','revision'=>2,'record'=>$record],$csrfA)['status']===409,'Old tab revived deleted draft');
    echo "Live server drafts: two-device save/restore, guest/CSRF/ownership rejection, RLS, conflict and clear passed. No AI calls.\n";
} finally {
    foreach ($users as $user) {
        $deleted = remoteDraft('DELETE','/auth/v1/admin/users/'.$user['id']);
        checkDraftLive($deleted['status']>=200 && $deleted['status']<300,'Test account cleanup failed');
    }
    foreach ($jars as $jar) if (is_file($jar)) unlink($jar);
    echo "Only disposable test accounts and their draft records removed.\n";
}
