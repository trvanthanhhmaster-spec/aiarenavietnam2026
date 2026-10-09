<?php
declare(strict_types=1);
// Explicit quota authorization: ONE text advice + ONE image and its review. No POST retries.
if (PHP_SAPI !== 'cli' || !in_array('--live', $argv, true) || !in_array('--allow-one-advice-and-image', $argv, true)) exit("Requires --live --allow-one-advice-and-image.\n");
$base = 'https://v-remix.vietnamsir.com';
$h = curl_init(); curl_setopt_array($h,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>8,CURLOPT_TIMEOUT=>115,CURLOPT_COOKIEFILE=>'']);
function aiOnceRequest($handle, string $path, ?array $body=null, string $csrf=''): array {
    global $base;
    curl_setopt_array($handle,[CURLOPT_URL=>$base.$path,CURLOPT_CUSTOMREQUEST=>$body===null?'GET':'POST',CURLOPT_POSTFIELDS=>$body===null?null:json_encode($body,JSON_THROW_ON_ERROR),
        CURLOPT_HTTPHEADER=>$csrf===''?[]:['Content-Type: application/json','X-VRemix-CSRF: '.$csrf]]);
    $raw=curl_exec($handle);$status=(int)curl_getinfo($handle,CURLINFO_RESPONSE_CODE);
    return [$status,is_string($raw)?$raw:''];
}
function aiOnceUuid(): string {
    $hex=bin2hex(random_bytes(16));return substr($hex,0,8).'-'.substr($hex,8,4).'-4'.substr($hex,13,3).'-8'.substr($hex,17,3).'-'.substr($hex,20);
}
function aiOnceCheck(bool $value, string $label): void { if (!$value) throw new RuntimeException($label); }
$evidence=['adviceRequests'=>0,'imageRequests'=>0,'facesUploaded'=>0,'collectionChanges'=>0];
$destination=dirname(__DIR__).'/artifacts/studio-intelligence-qa';
if (!is_dir($destination)) mkdir($destination,0700,true);
try {
    [$status,$html]=aiOnceRequest($h,'/studio.php');
    preg_match('/window.VREMIX_STUDIO = (\{.*?\});/s',$html,$match);$config=json_decode($match[1]??'',true,512,JSON_THROW_ON_ERROR);
    aiOnceCheck($status===200&&!$config['auth']['authenticated'],'Anonymous bootstrap failed.');
    $garment=array_values(array_filter($config['garments'],fn($g)=>$g['slug']==='ao-tac'))[0]??null;
    $variant=array_values(array_filter($config['garmentVariants'],fn($v)=>$v['garment_id']===($garment['id']??'')))[0]??null;
    aiOnceCheck($garment!==null&&$variant!==null,'Published áo tấc sample missing.');
    $today=(new DateTimeImmutable('now',new DateTimeZone('Asia/Ho_Chi_Minh')))->format('Y-m-d');
    $plan=['version'=>1,'count'=>1,'shared'=>false,'activePerson'=>1,'period'=>['kind'=>'custom','start'=>$today,'end'=>$today],
        'customOccasion'=>'','occasionNote'=>'One fictional adult. Technical QA only. No real person likeness.',
        'people'=>[['id'=>1,'name'=>'','gender'=>'','heightCm'=>null,'weightKg'=>null,'faceSupplied'=>false,'outfit'=>['garment'=>'ao-tac','garmentVariant'=>$variant['slug'],'color'=>'','pattern'=>'','style'=>'minimal','scene'=>'studio','accessories'=>[],'accessoryVariants'=>[]]]]];
    $selection=['event'=>'ceremony','planning'=>$plan];
    [$status,$raw]=aiOnceRequest($h,'/studio-advisor.php',['action'=>'context','city'=>'hue','selection'=>$selection],$config['lookCsrf']);
    $context=json_decode($raw,true);aiOnceCheck($status===200&&!empty($context['contextId']),'Weather context unavailable before AI; no quota consumed.');
    $evidence['weatherProvider']=$context['context']['provider'];$evidence['forecastScope']=$context['context']['forecast']['coverage']??'unavailable';
    echo "Submitting exactly ONE authorized text advice. No face/name/body data.\n";
    $evidence['adviceRequests']=1;
    [$status,$raw]=aiOnceRequest($h,'/studio-advisor.php',['action'=>'stylist','selection'=>$selection,'contextId'=>$context['contextId'],'intent'=>'remix',
        'preference'=>'Tối giản, dễ đi lại; không thêm phụ kiện. Giữ tay rộng của áo tấc.','aiConsent'=>true,'requestId'=>aiOnceUuid()],$config['lookCsrf']);
    $advice=json_decode($raw,true)?:[];
    $evidence['adviceHttp']=$status;$evidence['adviceStatus']=$status===200&&!empty($advice['ai']['summary'])?'completed':'unavailable';
    if ($evidence['adviceStatus']==='completed') $evidence['advice']=$advice['ai'];
    else echo "Text advice did not complete; NOT retrying. Proceeding with separately authorized image.\n";
    $id=aiOnceUuid();$evidence['imageRequestId']=$id;
    $payload=['clientRequestId'=>$id,'eventSlug'=>'ceremony','generationType'=>'image','planning'=>$plan,'adviceContextId'=>$context['contextId']];
    echo "Submitting exactly ONE authorized image with áo tấc sample and dated context.\n";
    $evidence['imageRequests']=1;
    [$status,$raw]=aiOnceRequest($h,'/generation-edge.php',$payload,$config['lookCsrf']);$job=json_decode($raw,true)?:[];
    for ($i=0;$i<12&&!in_array($job['status']??'', ['completed','failed'],true);$i++) {
        [$status,$raw]=aiOnceRequest($h,'/generation-edge.php?requestId='.$id,null,$config['lookCsrf']);$job=json_decode($raw,true)?:[];
        if (!in_array($job['status']??'', ['completed','failed'],true)) { echo "Waiting on SAME request, GET only.\n"; sleep(5); }
    }
    $evidence['imageStatus']=$job['status']??'unknown';$evidence['jobId']=$job['jobId']??null;
    aiOnceCheck($evidence['imageStatus']==='completed','Authorized image did not complete. No resubmission.');
    $output=$job['output']??[];$items=$output['lookbook']['items']??[];
    aiOnceCheck(($output['imageSource']??'')==='gemini'&&count($items)===1,'Not one real generated image.');
    $url=$items[0]['url'];aiOnceCheck(str_starts_with($url,'https://')&&str_ends_with((string)parse_url($url,PHP_URL_HOST),'.supabase.co'),'Unexpected image origin.');
    $asset=curl_init($url);curl_setopt_array($asset,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>25]);$bytes=curl_exec($asset);$http=(int)curl_getinfo($asset,CURLINFO_RESPONSE_CODE);curl_close($asset);
    $size=is_string($bytes)?@getimagesizefromstring($bytes):false;aiOnceCheck($http===200&&$size!==false,'Generated image unavailable.');
    $evidence+=['storageHttp'=>$http,'width'=>$size[0],'height'=>$size[1],'referenceStatus'=>$output['garmentReferences']['status']??'unavailable',
        'reviewStatus'=>$output['reviewStatus']??'unavailable','assessment'=>$output['imageAssessment']??null,'culturalScore'=>$output['culturalScore']??null,'copyPolicy'=>$output['copyPolicy']??'unknown'];
    $extension=($size['mime']??'')==='image/jpeg'?'jpg':'png';
    file_put_contents($destination.'/generated-image.'.$extension,$bytes);$evidence['imageFile']='generated-image.'.$extension;
    echo json_encode($evidence,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)."\n";
} catch (Throwable $error) {
    $evidence['failure']=$error instanceof RuntimeException?$error->getMessage():'Test failed; private transport body not printed.';
    fwrite(STDERR,$evidence['failure']."\n");
} finally {
    file_put_contents($destination.'/live-evidence.json',json_encode($evidence,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));curl_close($h);
}
exit(isset($evidence['failure'])?1:0);
