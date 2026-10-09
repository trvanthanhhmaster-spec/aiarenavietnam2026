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
verifyDraft($result['draft']['planning']['people'][0]['gender'] === '', 'legacy default lost');
$blank['people'][0]['gender'] = 'female';
$result = StudioDraft::normalize(['draft'=>['planning'=>$blank]]);
verifyDraft($result['draft']['planning']['people'][0]['gender'] === 'female', 'gender lost from draft');
$result = StudioDraft::normalize(['selection'=>['planning'=>$blank]]);
verifyDraft($result['selection']['planning']['people'][0]['gender'] === 'female', 'gender lost from result selection');
foreach (['invalid', 1, ['female']] as $gender) {
    $invalid = $blank; $invalid['people'][0]['gender'] = $gender;
    $rejected=false; try { StudioDraft::normalize(['draft'=>['planning'=>$invalid]]); } catch (InvalidArgumentException) { $rejected=true; }
    verifyDraft($rejected, 'invalid gender accepted');
}
$collectionId = '12345678-1234-1234-1234-123456789abc';
$archive = StudioDraft::normalize(['collectionId'=>$collectionId, 'collections'=>[['id'=>$collectionId, 'name'=>'Đi biển', 'record'=>['draft'=>['planning'=>$blank], 'output'=>['secret'=>'discard']]]]]);
verifyDraft(count($archive['collections']) === 1, 'collection lost');
verifyDraft(!isset($archive['collections'][0]['record']['output']), 'archived provider output persisted');
verifyDraft($archive['collections'][0]['record']['draft']['planning']['people'][0]['faceSupplied'] === false, 'archived face flag persisted');
verifyDraft($archive['collections'][0]['record']['draft']['planning']['people'][0]['gender'] === 'female', 'archived gender lost');
foreach ([['collectionId'=>str_repeat('-',36)], ['collections'=>[['id'=>$collectionId,'record'=>[]],['id'=>$collectionId,'record'=>[]]]]] as $invalid) {
    $rejected=false; try { StudioDraft::normalize($invalid); } catch (InvalidArgumentException) { $rejected=true; }
    verifyDraft($rejected, 'invalid collection accepted');
}
foreach ([['jobId'=>'invalid'], ['draft'=>['planning'=>['version'=>1,'count'=>99,'people'=>[]]]], ['draft'=>['garment'=>'data:image/png;base64,pixels']]] as $invalid) {
    $rejected=false; try { StudioDraft::normalize($invalid); } catch (InvalidArgumentException) { $rejected=true; }
    verifyDraft($rejected, 'invalid draft accepted');
}
echo "PHP draft: partial plans, per-person fields, whitelisting, no face pixels and input validation passed.\n";
