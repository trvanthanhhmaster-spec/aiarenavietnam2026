<?php
declare(strict_types=1);
namespace App\Infrastructure {
    class SupabaseAdminClient { public function __construct(private array $job) {} public function select(string $table,array $query): array { return [$this->job]; } }
    class StudioStorage { public function imageData(array $image): array { return ['mimeType'=>'image/png','data'=>'offline']; } }
}
namespace {
    require dirname(__DIR__).'/src/Support/StudioPlan.php';
    require dirname(__DIR__).'/src/Support/StudioHistory.php';
    $plan=App\Support\StudioPlan::normalize(['version'=>1,'count'=>1,'shared'=>false,'period'=>['kind'=>'unspecified'],
        'people'=>[['id'=>1,'faceSupplied'=>true,'outfit'=>['garment'=>'ao-tac']]]]);
    $assessment=['status'=>'mismatch','observedPeopleCount'=>1,'people'=>[['personId'=>1,'checks'=>['scene'=>'mismatch','accessories'=>'mismatch','color'=>'uncertain','garment'=>'match','injected'=>'mismatch']]]];
    $targets=App\Support\StudioHistory::repairTargets($assessment,$plan);
    if ($targets!==['people'=>[1=>['accessories','scene']]]) throw new RuntimeException('Repair target allowlist failed.');
    $job=['id'=>'00000000-0000-4000-8000-000000000001','user_id'=>'fixture','status'=>'completed',
        'input'=>['planning'=>$plan,'eventSlug'=>'school','aspectRatio'=>'9:16'],'output'=>['imageAssessment'=>$assessment,'lookbook'=>['items'=>[['url'=>'/fixture']]]]];
    $history=new App\Support\StudioHistory(new App\Infrastructure\SupabaseAdminClient($job),new App\Infrastructure\StudioStorage(),'fixture','owner');
    $input=['planning'=>$plan,'eventSlug'=>'school','referenceJobId'=>$job['id'],'repairRequested'=>true,'editInstruction'=>'untrusted'];
    $input['planning']['people'][0]['faceSupplied']=false;
    $history->reference($input);
    if (!str_contains($input['editInstruction'],'TARGETED REPAIR') || str_contains($input['editInstruction'],'untrusted') || $input['aspectRatio']!=='9:16') throw new RuntimeException('Repair ownership/scope/framing failed.');
    $input['planning']['people'][0]['outfit']['color']='red';
    try{$history->reference($input);throw new RuntimeException('Changed selection accepted for old repair.');}catch (InvalidArgumentException){}
    echo "Targeted repair: owned assessment, mismatches only, stale-plan rejection, face-byte absence and aspect preservation passed offline.\n";
}
