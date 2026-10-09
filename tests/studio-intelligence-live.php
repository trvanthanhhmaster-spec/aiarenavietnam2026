<?php
declare(strict_types=1);
if (($argv[1] ?? '') !== '--live') exit("Use --live: anonymous weather/advice only, NEVER calls AI.\n");
$base = rtrim(getenv('VREMIX_TEST_BASE_URL') ?: 'https://v-remix.vietnamsir.com', '/');
if ($base !== 'https://v-remix.vietnamsir.com') throw new RuntimeException('Fixed production origin only.');
$cookie = tempnam(sys_get_temp_dir(), 'vremix-advice-smoke-');
function check(bool $ok, string $label): void { if (!$ok) throw new RuntimeException($label); }
function request(string $path, ?array $body = null, string $csrf = ''): array {
    global $base,$cookie;
    $h=curl_init($base.$path); curl_setopt_array($h,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>30,CURLOPT_COOKIEJAR=>$cookie,CURLOPT_COOKIEFILE=>$cookie]);
    if ($body !== null) curl_setopt_array($h,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode($body),CURLOPT_HTTPHEADER=>['Content-Type: application/json','X-VRemix-CSRF: '.$csrf]]);
    $text=curl_exec($h);$status=(int)curl_getinfo($h,CURLINFO_RESPONSE_CODE);curl_close($h);
    check(is_string($text),'HTTPS transport failed');return ['status'=>$status,'body'=>$text];
}
try {
    $page=request('/studio.php');check($page['status']===200,'Studio unavailable');
    preg_match('/window.VREMIX_STUDIO = (\{.*?\});/s',$page['body'],$match);$catalog=json_decode($match[1]??'',true);
    check(count($catalog['intelligence']['lookbooks']??[])===4,'Four lookbooks missing');
    check(count($catalog['intelligence']['heritage']??[])===4,'Four cultural profiles missing');
    $csrf=$catalog['lookCsrf'];
    check(request('/studio-advisor.php')['status']===405,'Advisor GET not bounded');
    check(request('/studio-advisor.php',['action'=>'context'])['status']===403,'Missing CSRF accepted');
    $selection=['event'=>'portrait','planning'=>['version'=>1,'count'=>1,'shared'=>false,'activePerson'=>1,'period'=>['kind'=>'custom','start'=>'2030-01-01','end'=>'2030-01-02'],'people'=>[['id'=>1,'outfit'=>['garment'=>'ao-nhat-binh','style'=>'streetwear','accessories'=>['sneaker-trang']]]]]];
    $input=['action'=>'context','city'=>'hue','selection'=>$selection];
    $weather=request('/studio-advisor.php',$input,$csrf);check($weather['status']===200,'Live weather unavailable');$data=json_decode($weather['body'],true);
    check(is_numeric($data['context']['current']['temperature']??null),'Missing live current temperature');
    check($data['context']['forecast']===null,'Future weather was fabricated');
    check(!isset($data['context']['latitude'])&&!isset($data['context']['longitude']),'Coordinates leaked in saved context');
    $advice=request('/studio-advisor.php',['action'=>'recommend','selection'=>$selection,'intent'=>'historical','contextId'=>$data['contextId']],$csrf);
    check($advice['status']===200,'Rule recommendation failed');$result=json_decode($advice['body'],true);
    check($result['guards'][0]['code']==='modern-remix'&&$result['guards'][0]['severity']==='warning','Negative guardrail did not fire');
    check(!isset($result['ai']),'Rule recommendation called AI');
    check(request('/studio-advisor.php',['action'=>'stylist','selection'=>$selection,'aiConsent'=>false],$csrf)['status']===422,'AI missing-consent request accepted');
    check(request('/studio-advisor.php',['action'=>'context','selection'=>$selection,'latitude'=>16,'longitude'=>107],$csrf)['status']===422,'Geolocation without consent accepted');
    echo "Production intelligence: four lookbooks/profiles, CSRF, real Open-Meteo current weather, no false future forecast, sourced negative guardrail and missing consent rejection passed. NO AI calls, NO user draft writes.\n";
} finally { if (is_file($cookie)) unlink($cookie); }
