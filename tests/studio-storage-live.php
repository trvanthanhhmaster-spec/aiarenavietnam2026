<?php
// Explicit live integration fixture; never invokes an AI provider.
declare(strict_types=1);
if (($argv[1] ?? '') !== '--live') exit("Use --live to create and clean up an isolated Supabase fixture.\n");
require __DIR__ . '/../src/Support/Env.php';
require __DIR__ . '/../src/Infrastructure/SupabaseAdminClient.php';
require __DIR__ . '/../src/Infrastructure/StudioStorage.php';
App\Support\Env::load(__DIR__ . '/../.env');
$url = rtrim((string) getenv('SUPABASE_URL'), '/'); $key = (string) getenv('SUPABASE_SERVICE_ROLE_KEY');
function callFixture(string $method, string $endpoint, ?array $body = null, ?string $token = null): array {
    global $url, $key;
    $h = curl_init($url . $endpoint);
    curl_setopt_array($h, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => ['apikey: ' . $key, 'Authorization: Bearer ' . ($token ?? $key), 'Content-Type: application/json']]);
    if ($body !== null) curl_setopt($h, CURLOPT_POSTFIELDS, json_encode($body));
    $raw = curl_exec($h); $code = curl_getinfo($h, CURLINFO_RESPONSE_CODE);
    if (!is_string($raw) || $code < 200 || $code >= 300) throw new RuntimeException('Fixture request failed: HTTP ' . $code);
    return json_decode($raw, true) ?: [];
}
function fixtureUuid(): string { $h = bin2hex(random_bytes(16)); return substr($h,0,8).'-'.substr($h,8,4).'-'.substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20); }
function verifyFixture(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
$client = new App\Infrastructure\SupabaseAdminClient($url, $key);
$storage = new App\Infrastructure\StudioStorage($url, $key);
$user = null; $job = null; $look = null; $path = null;
$cookieJar = tempnam(sys_get_temp_dir(), 'vremix-qa-cookie-');
function callLocal(string $route, ?array $payload = null, ?string $csrf = null, bool $form = false): array {
    global $cookieJar;
    $h = curl_init('http://localhost/aiarenavietnam2026/' . $route);
    curl_setopt_array($h, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>true,CURLOPT_TIMEOUT=>30,
        CURLOPT_COOKIEFILE=>$cookieJar,CURLOPT_COOKIEJAR=>$cookieJar]);
    if ($payload !== null) curl_setopt_array($h,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$form?http_build_query($payload):json_encode($payload)]);
    curl_setopt($h,CURLOPT_HTTPHEADER,array_filter([$form?'Content-Type: application/x-www-form-urlencoded':'Content-Type: application/json',$csrf?'X-VRemix-CSRF: '.$csrf:null]));
    $raw=curl_exec($h); $status=(int)curl_getinfo($h,CURLINFO_RESPONSE_CODE); curl_close($h);
    return ['status'=>$status,'raw'=>$raw,'body'=>json_decode((string)$raw,true)];
}
try {
    $email = 'vremix-qa-' . bin2hex(random_bytes(6)) . '@example.invalid'; $password = bin2hex(random_bytes(24));
    $user = callFixture('POST', '/auth/v1/admin/users', ['email' => $email, 'password' => $password, 'email_confirm' => true]);
    $id = $user['id']; $requestId = fixtureUuid(); $owner = hash('sha256', random_bytes(32));
    $plan = ['version'=>1,'count'=>1,'shared'=>true,'activePerson'=>1,'period'=>['kind'=>'unspecified','start'=>'','end'=>''],
        'occasionNote'=>'','customOccasion'=>'','people'=>[['id'=>1,'name'=>'','heightCm'=>null,'weightKg'=>null,'faceSupplied'=>false,'customized'=>false,
        'outfit'=>['garment'=>'ao-tac','garmentVariant'=>'','color'=>'','pattern'=>'','style'=>'','scene'=>'','accessories'=>[],'accessoryVariants'=>[]]]]];
    $args = ['p_request'=>$requestId,'p_user'=>$id,'p_owner'=>$owner,'p_input'=>['planning'=>$plan]];
    $job = $client->rpc('reserve_local_generation', $args)[0];
    $duplicate = $client->rpc('reserve_local_generation', $args)[0];
    verifyFixture($job['id'] === $duplicate['id'], 'duplicate request created a second job');
    $spoof = $args; $spoof['p_owner'] = hash('sha256', random_bytes(32)); $spoof['p_user'] = null;
    $denied = false; try { $client->rpc('reserve_local_generation', $spoof); } catch (Throwable) { $denied = true; }
    verifyFixture($denied, 'another session read the reserved request');
    $path = $id . '/qa/' . $requestId . '.png';
    $signed = $storage->uploadData($path, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC9sAAAAASUVORK5CYII=');
    verifyFixture($storage->trustedUrl($signed), 'Storage did not return a trusted signed URL');
    $client->update('generation_jobs', ['id'=>'eq.'.$job['id']], ['status'=>'completed','image_count'=>1,'output'=>['lookbook'=>['items'=>[['url'=>$signed,'path'=>$path]]]]]);
    $record = ['name'=>'QA lifecycle fixture','occasion_slug'=>'ceremony','garment_slug'=>'ao-tac','selection'=>['event'=>'ceremony','garment'=>'ao-tac','planning'=>$plan],
        'locks'=>[],'image_url'=>$signed,'storage_path'=>$path,'generation_job_id'=>$job['id']];
    $saveId = fixtureUuid(); $saveArgs=['p_user'=>$id,'p_save'=>$saveId,'p_record'=>$record,'p_images'=>[['url'=>$signed,'path'=>$path]]];
    $guest=callLocal('look-api.php'); verifyFixture($guest['status']===401,'guest unexpectedly accessed library');
    $authPage=callLocal('auth.php?next=studio.php'); preg_match('/name="csrf" value="([^"]+)"/',(string)$authPage['raw'],$csrfMatch);
    verifyFixture(!empty($csrfMatch[1]),'login form CSRF missing');
    $login=callLocal('auth.php',['action'=>'login','email'=>$email,'password'=>$password,'csrf'=>$csrfMatch[1],'next'=>'studio.php'],null,true);
    preg_match('/window.VREMIX_STUDIO = (\{.*?\});/s',(string)$login['raw'],$configMatch);
    $config=json_decode($configMatch[1]??'',true); verifyFixture(!empty($config['auth']['authenticated']),'real login did not reach authenticated Studio');
    $deniedCsrf=callLocal('look-api.php',['action'=>'save']); verifyFixture($deniedCsrf['status']===403,'write without CSRF accepted');
    $payload=['action'=>'save','saveId'=>$saveId,'jobId'=>$job['id'],'name'=>$record['name'],'selection'=>$record['selection'],'images'=>[$signed]];
    $savedHttp=callLocal('look-api.php',$payload,$config['lookCsrf']); verifyFixture($savedHttp['status']===201 && !empty($savedHttp['body']['lookId']),'HTTP save failed');
    $look=$client->select('looks',['id'=>'eq.'.$savedHttp['body']['lookId'],'select'=>'*'])[0];
    $again = $client->rpc('save_studio_look',$saveArgs)[0];
    verifyFixture($look['id'] === $again['id'], 'duplicate save created another look');
    verifyFixture(count($client->select('look_variants',['look_id'=>'eq.'.$look['id'],'select'=>'id'])) === 1, 'save is not consistent with its image');
    $listed=callLocal('look-api.php',null,$config['lookCsrf']); verifyFixture($listed['status']===200 && count($listed['body']['items'])===1,'library did not return own fixture');
    $renamed=callLocal('look-api.php',['action'=>'rename','id'=>$look['id'],'name'=>'QA renamed'],$config['lookCsrf']); verifyFixture($renamed['status']===200,'HTTP rename failed');
    $signedAgain = $storage->sign($path); verifyFixture($signedAgain !== '', 'cannot renew private media');
    $deleted=callLocal('look-api.php',['action'=>'delete','id'=>$look['id']],$config['lookCsrf']); verifyFixture($deleted['status']===200,'HTTP delete failed');
    echo "Live Supabase/HTTP: real login, guest/CSRF rejection, private upload/signing, atomic save/list/rename/delete and duplicate admission passed. No AI call.\n";
} finally {
    if ($look) $client->delete('looks', ['id'=>'eq.'.$look['id'],'user_id'=>'eq.'.$user['id']]);
    if ($job) $client->delete('generation_jobs',['id'=>'eq.'.$job['id'],'client_request_id'=>'eq.'.$job['client_request_id']]);
    if ($path) callFixture('DELETE','/storage/v1/object/generated-lookbooks',['prefixes'=>[$path]]);
    if ($user) callFixture('DELETE','/auth/v1/admin/users/'.$user['id']);
    if (is_file($cookieJar)) unlink($cookieJar);
    echo "Isolated fixture records, object and test account cleaned up.\n";
}
