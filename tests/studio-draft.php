<?php
declare(strict_types=1);
require __DIR__ . '/../src/Support/StudioDraft.php';
use App\Support\StudioDraft;
function verifyDraft(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }
$blank = ['version'=>1,'count'=>null,'people'=>[],'period'=>null];
$result = StudioDraft::normalize(['draft'=>['planning'=>$blank],'guideStep'=>'event','output'=>['secret'=>'not retained'],'apiKey'=>'not retained']);
verifyDraft($result['draft']['planning']['count'] === null, 'unfinished draft rejected');
verifyDraft(!isset($result['output'], $result['apiKey']), 'unknown data retained');
$blank['count']=1;
$blank['people']=[['outfit'=>['garment'=>''],'faceSupplied'=>true,'faceData'=>'secret pixels','name'=>'Người 1','customized'=>true]];
$result = StudioDraft::normalize(['draft'=>['planning'=>$blank,'event'=>'custom'],'guideStep'=>'garment']);
verifyDraft($result['draft']['planning']['people'][0]['faceSupplied'] === false, 'face persisted');
verifyDraft(!isset($result['draft']['planning']['people'][0]['faceData']), 'face pixels persisted');
verifyDraft($result['draft']['planning']['people'][0]['customized'], 'group edit flag lost');
foreach ([['jobId'=>'invalid'], ['draft'=>['planning'=>['version'=>1,'count'=>99,'people'=>[]]]], ['draft'=>['garment'=>'data:image/png;base64,pixels']]] as $invalid) {
    $rejected=false; try { StudioDraft::normalize($invalid); } catch (InvalidArgumentException) { $rejected=true; }
    verifyDraft($rejected, 'invalid draft accepted');
}
echo "PHP draft: partial plans, per-person fields, whitelisting, no face pixels and input validation passed.\n";
