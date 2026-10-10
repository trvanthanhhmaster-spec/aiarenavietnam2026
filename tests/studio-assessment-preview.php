<?php
declare(strict_types=1);
// CLI-only isolated real Studio template. No AI and no external writes.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/studio-catalog-preview.php';
$proof = json_decode(file_get_contents($root . '/assets/data/audition-proof.json'), true, 64, JSON_THROW_ON_ERROR);
$proof['selection']['planning']['version'] = 1;
$proof['selection']['planning']['shared'] = false;
$proof['selection']['planning']['period'] = ['kind'=>'unspecified'];
$proof['selection']['planning']['people'][0]['outfit']['garmentVariant'] = 'tac-red';
$proof['image'] = $assetOrigin . $proof['image'];
$script = '<script>const assessmentFixture=' . json_encode($proof, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR) . ';</script>';
$script .= <<<'HTML'
<div style="position:fixed;bottom:12px;right:12px;z-index:99;background:#fff;padding:12px;border:1px solid #ccc;font:12px system-ui">
QA cách ly · không gọi AI
<button id="qaMatched">Ca production đã ghi nhận</button><button id="qaMismatch">Tay áo sai (mô phỏng)</button><button id="qaUncertain">Tay bị che (mô phỏng)</button></div>
<script>
window.addEventListener('DOMContentLoaded',function(){
  function open(status){
    const proof=JSON.parse(JSON.stringify(assessmentFixture));
    if(status!=='matched'){
      proof.assessment.status=status;
      proof.assessment.people[0].checks.garment=status==='mismatch'?'mismatch':'uncertain';
      proof.assessment.constructionChecks[0]={personId:1,status:status==='mismatch'?'mismatch':'uncertain',reason:status==='mismatch'?'Tay áo đang hẹp thay vì tay rộng của áo tấc.':'Tay áo bị che nên không xác định được độ rộng.'};
    }
    document.getElementById('studioExperience').resultsApi.open({jobId:'qa-fixture',saved:false,image_url:proof.image,selection:proof.selection,
      output:{copyPolicy:'selected-catalog-only',reviewStatus:'completed',imageAssessment:proof.assessment,garmentReferences:{status:'attached'},story:'Bản QA dùng dữ liệu kiểm thử được ghi nhãn.',lookbook:{items:[{url:proof.image}]} }},false);
    const details=document.getElementById('outputDetails');details.hidden=false;details.open=true;
  }
  document.getElementById('qaMatched').onclick=function(){open('matched')};
  document.getElementById('qaMismatch').onclick=function(){open('mismatch')};
  document.getElementById('qaUncertain').onclick=function(){open('uncertain')};
});
</script>
HTML;
$html = str_replace('</body>', $script . '</body>', $html);
file_put_contents($destination . '/index.html', $html);
echo "Assessment fixtures added: recorded production response and labelled synthetic mismatch/occlusion.\n";
