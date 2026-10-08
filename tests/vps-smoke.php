<?php
declare(strict_types=1);
if(($argv[1]??'')!=='--live')exit("Use --live for read-only HTTPS deployment checks.\n");
$base=rtrim((string)(getenv('VREMIX_TEST_BASE_URL')?:'https://v-remix.vietnamsir.com'),'/');
if(!str_starts_with($base,'https://'))throw new RuntimeException('Smoke checks require verified HTTPS.');
function smokeCheck(bool $ok,string $label): void {if(!$ok)throw new RuntimeException($label);}
function smokeRequest(string $route,array $headers=[]): array {
    global $base;
    $h=curl_init($base.$route);$received=[];
    curl_setopt_array($h,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>30,CURLOPT_HTTPHEADER=>$headers,
        CURLOPT_HEADERFUNCTION=>static function($handle,string $line) use(&$received): int {$received[]=$line;return strlen($line);}]);
    $body=curl_exec($h);$status=(int)curl_getinfo($h,CURLINFO_RESPONSE_CODE);curl_close($h);
    smokeCheck($body!==false,'HTTPS request failed for '.$route);
    return ['status'=>$status,'body'=>$body,'headers'=>implode('',$received)];
}
foreach(['/','/studio.php','/auth.php','/admin.php','/assets/css/studio-workspace.css','/assets/js/studio-collection-store.js','/assets/media/studio-atelier-poster.png'] as $route) {
    $r=smokeRequest($route);smokeCheck($r['status']===200,$route.' HTTP '.$r['status']);
    if($route==='/studio.php') {
        preg_match('/window.VREMIX_STUDIO = (\{.*?\});/s',$r['body'],$m);$c=json_decode($m[1]??'',true);
        smokeCheck(($c['generationEndpoint']??'')==='generation-edge.php','Public Studio selected a local-only provider');
        smokeCheck(($c['collectionEndpoint']??'')==='studio-collections-api.php','Collection endpoint missing');
        preg_match('/^set-cookie:[^\r\n]*/mi',$r['headers'],$cookie);
        foreach(['; secure','; HttpOnly','; SameSite=Lax'] as $flag)smokeCheck(stripos($cookie[0]??'',$flag)!==false,'Session cookie missing '.$flag);
    }
}
foreach(['/.env','/.git/config','/src/Support/Env.php','/config/database.php','/tests/studio-collections-live.php','/deploy/vps/compose.yml','/supabase/config.toml'] as $route) {
    $r=smokeRequest($route);smokeCheck($r['status']===404,'Private route not hidden: '.$route);
}
smokeCheck(smokeRequest('/local-generate.php')['status']===403,'Mac-only generation endpoint is public');
smokeCheck(smokeRequest('/studio-collections-api.php')['status']===401,'Guest accessed private collections');
$media=smokeRequest('/assets/media/studio-atelier-loop.mp4',['Range: bytes=0-1023']);
smokeCheck($media['status']===206 && strlen($media['body'])===1024,'Video range support failed');
echo "VPS smoke: verified HTTPS, pages/assets, Edge routing, Secure/HttpOnly/SameSite cookies, private route denial, collection auth and video ranges passed. No AI calls.\n";
