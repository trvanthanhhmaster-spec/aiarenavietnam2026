<?php
// Stub the namespaced transport: no network, credentials or database mutations.
declare(strict_types=1);
namespace App\Infrastructure {
    $responses=[];$calls=0;$closed=0;
    function curl_init(string $url): object {return (object)['method'=>'GET','current'=>null];}
    function curl_setopt_array(object $handle,array $options): bool {$handle->method=$options[CURLOPT_CUSTOMREQUEST];return true;}
    function curl_setopt(object $handle,int $option,mixed $value): bool {return true;}
    function curl_exec(object $handle): string|false {global $responses,$calls;$calls++;$handle->current=array_shift($responses);return $handle->current['body'];}
    function curl_getinfo(object $handle,int $option): int {return $handle->current['status'];}
    function curl_error(object $handle): string {return $handle->current['error']??'';}
    function curl_errno(object $handle): int {return $handle->current['errno']??(empty($handle->current['error'])?0:28);}
    function curl_close(object $handle): void {global $closed;$closed++;}
}
namespace {
    require __DIR__.'/../src/Infrastructure/SupabaseAdminClient.php';
    function check(bool $condition,string $message): void {if(!$condition)throw new RuntimeException($message);}
    function rejects(callable $operation): void {
        $failed=false;
        try {$operation();}catch(RuntimeException){$failed=true;}
        check($failed,'Transport/authorization failure was hidden');
    }
    $client=new App\Infrastructure\SupabaseAdminClient('https://example.invalid','test-only-key');
    $success=['status'=>200,'body'=>'[{"id":"fixture"}]'];
    foreach([
        ['status'=>0,'body'=>false,'error'=>'name lookup timed out'],
        ['status'=>503,'body'=>'{}'],
    ] as $failure) {
        $responses=[$failure,$success];$calls=0;$closed=0;
        check($client->select('fixture',[])===[['id'=>'fixture']] && $calls===2 && $closed===1,'GET did not recover once and close its handle');
    }
    $responses=[['status'=>503,'body'=>'{}'],['status'=>503,'body'=>'{}']];$calls=0;$closed=0;
    rejects(fn()=>$client->select('fixture',[]));
    check($calls===2 && $closed===1,'GET retries were not bounded');
    $responses=[['status'=>403,'body'=>'{}'],$success];$calls=0;
    rejects(fn()=>$client->select('fixture',[]));
    check($calls===1,'Authorization failure retried');
    foreach(['rpc','insert','update','delete'] as $action) {
        $write=function() use($action,$client): void {
            if($action==='rpc')$client->rpc('fixture',[]);
            elseif($action==='insert')$client->insert('fixture',[]);
            elseif($action==='update')$client->update('fixture',[],[]);
            else $client->delete('fixture',[]);
        };
        foreach([
            ['status'=>0,'body'=>false,'error'=>'timed out'],
            ['status'=>503,'body'=>'{}'],
        ] as $failure) {
            $responses=[$failure,$success];$calls=0;$closed=0;
            rejects($write);
            check($calls===1 && $closed===1,'Ambiguous write was retried');
        }
        $responses=[['status'=>0,'body'=>false,'error'=>'Could not resolve host','errno'=>6],$success];$calls=0;$closed=0;
        $write();
        check($calls===2 && $closed===1,'Pre-connection DNS failure did not reconnect once');
    }
    echo "Supabase client: bounded read/DNS recovery, no replay of ambiguous writes or authorization errors, and handle cleanup passed offline.\n";
}
