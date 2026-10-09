<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/Support/StudioIntelligence.php';
require dirname(__DIR__) . '/src/Infrastructure/StudioWeather.php';
require dirname(__DIR__) . '/src/Support/StudioAdviceBudget.php';
require dirname(__DIR__) . '/src/Support/StudioDraft.php';
use App\Support\{StudioIntelligence as Intelligence, StudioAdviceBudget as Budget, StudioDraft};
use App\Infrastructure\StudioWeather as Weather;
function check(bool $value, string $label): void { if (!$value) throw new RuntimeException($label); }
$outfit = ['garment'=>'ao-nhat-binh','style'=>'streetwear','accessories'=>['sneaker-trang']];
$raw = ['event'=>'portrait','planning'=>['version'=>1,'count'=>1,'shared'=>false,'activePerson'=>1,'period'=>['kind'=>'unspecified'],'people'=>[['id'=>1,'name'=>'Private name','gender'=>'female','heightCm'=>165,'weightKg'=>50,'outfit'=>$outfit]]]];
$selection = StudioDraft::normalize(['draft'=>$raw])['draft'];
$negative = Intelligence::guards($selection,'historical');
check($negative[0]['severity']==='warning' && $negative[0]['code']==='modern-remix','historical misuse detected');
check(Intelligence::guards($selection,'remix')[0]['severity']==='info','modern remix is not inherently forbidden');
check(count(array_filter($negative, fn($r)=>$r['code']==='rank-not-verified'))===1,'no inferred court rank');
$safe = json_encode(Intelligence::safeSelection($selection));
check(!str_contains($safe,'Private name') && !str_contains($safe,'gender') && !str_contains($safe,'heightCm') && !str_contains($safe,'face'),'advice excludes identity and body');
check(count(Intelligence::festivals('hue','2026-10-10','2026-10-11'))===1,'dated Hue festival season');
check(Intelligence::festivals('ha-noi','2026-10-10','2026-10-11')===[],'no invented locality festivals');
check(Intelligence::festivals('hue','2027-10-10','2027-10-11')===[],'no extrapolated calendar');
$body = ['current'=>['temperature_2m'=>30,'weather_code'=>3,'time'=>'2026-10-10T12:00'],'daily'=>['time'=>['2026-10-10','2026-10-11'],'temperature_2m_max'=>[30,31],'precipitation_probability_max'=>[20,80]]];
$weather = Weather::normalize($body,['kind'=>'custom','start'=>'2026-10-10','end'=>'2026-10-12'],'2026-10-10');
check($weather['forecast']['coverage']==='partial' && $weather['forecast']['rainProbability']===80.0,'partial forecast not whole period');
check(Weather::normalize($body,['start'=>'2027-01-01','end'=>'2027-01-02'],'2026-10-10')['forecast']===null,'future is not current weather');
check(Weather::normalize($body,null,'2026-10-10')['forecast']===null,'unspecified dates have current only');
$geo = Weather::location(['locationConsent'=>true,'latitude'=>16.4567,'longitude'=>107.5678]);
check($geo['latitude']===16.5 && $geo['longitude']===107.6 && $geo['id']==='hue','approximate locality only');
foreach ([['latitude'=>16,'longitude'=>107],['city'=>'invalid'],['locationConsent'=>true,'latitude'=>50,'longitude'=>107]] as $invalid) {
    $failed=false; try { Weather::location($invalid); } catch (InvalidArgumentException) { $failed=true; } check($failed,'invalid/unconsented location rejected');
}
$catalog = ['garments'=>[['id'=>'nhat','slug'=>'ao-nhat-binh']], 'garmentVariants'=>[], 'colors'=>[], 'styles'=>[]];
$advice = Intelligence::recommend($selection,$catalog,null,'historical');
check(count($advice['recommendations'])===1 && $advice['recommendations'][0]['garment']==='ao-nhat-binh','only published garments');
check($advice['recommendations'][0]['outfit']['garmentVariant']==='','unpublished variants excluded');
$input = ['planning'=>$selection['planning'],'adviceContextId'=>'trusted'];
$session = ['studio_advice_context'=>['id'=>'trusted','expires'=>time()+60,'context'=>['period'=>$selection['planning']['period'],'label'=>'Huế']]];
check(Intelligence::trustedContext($input,$session)['label']==='Huế','trusted session context bound to period');
$input['planning']['period']=['kind'=>'custom','start'=>'2027-01-01','end'=>'2027-01-01'];
check(Intelligence::trustedContext($input,$session)===null,'changed date invalidates context');
$dir=sys_get_temp_dir().'/vremix-budget-test-'.bin2hex(random_bytes(5)); mkdir($dir,0700);
try { for ($i=0;$i<5;$i++) Budget::reserve('ai','test-owner',$dir); $failed=false; try { Budget::reserve('ai','test-owner',$dir); } catch (RuntimeException) { $failed=true; } check($failed,'AI rate cap reserved before transport'); }
finally { unlink($dir.'/vremix-advice-budget.json'); rmdir($dir); }
echo "Studio intelligence: sources, negative guardrail, remix, privacy, calendar, forecast scope, catalog and budget passed.\n";
