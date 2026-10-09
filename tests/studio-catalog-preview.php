<?php
declare(strict_types=1);
// CLI-only synthetic real-template preview, never touches user drafts or AI.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$destination = $argv[1] ?? '';
if (!is_dir($destination) || !str_starts_with(realpath($destination) ?: '', '/private/tmp/')) exit("Pass an existing temporary output directory.\n");
$root = dirname(__DIR__);
$source = file_get_contents($root . '/studio.php');
$template = substr($source, strpos($source, '<!doctype html>'));
$template = str_replace('__DIR__', var_export($root, true), $template);
$escape = static fn ($value) => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
$authUser = null; $accountName = ''; $accountInitial = 'V'; $brandAccessibleName = 'V-Remix';
$site = ['title' => 'Bản QA giao diện · không lưu dữ liệu']; $basePoster = 'assets/media/studio-atelier-poster.png'; $baseMedia = '';
$catalog = ['generation' => ['default_output_type' => 'image'], 'events' => [['slug'=>'ceremony','label'=>'Dự lễ','description'=>'','preset'=>[]]],
    'garments' => [['id'=>'tac','slug'=>'ao-tac','name'=>'Áo tấc','default_colors'=>['vermilion','ivory'],'image_url'=>'assets/media/catalog/garment-ao-tac.webp'], ['id'=>'tu','slug'=>'ao-tu-than','name'=>'Áo tứ thân','default_colors'=>['moss'],'image_url'=>'assets/media/catalog/garment-ao-tu-than.webp']],
    'garmentVariants' => [['garment_id'=>'tac','slug'=>'tac-red','name'=>'Áo tấc đỏ son','pattern_notes'=>'Trơn, tập trung vào phom','color_palette'=>['vermilion','ivory'],'image_url'=>'assets/media/catalog/garment-ao-tac.webp','source_url'=>'https://commons.wikimedia.org/wiki/File:Rio_m%C3%A3_ch%C3%A2u_%C3%A1o_t%E1%BA%A5c.jpg'],['garment_id'=>'tu','slug'=>'tu-green','name'=>'Tứ thân xanh rêu','pattern_notes'=>'Trơn hoặc họa tiết nhỏ','color_palette'=>['moss'],'image_url'=>'assets/media/catalog/garment-ao-tu-than.webp']],
    'colors'=>[['slug'=>'vermilion','label'=>'Đỏ son','value'=>'#a53f38'],['slug'=>'ivory','label'=>'Ngà ấm','value'=>'#e8dbc6'],['slug'=>'moss','label'=>'Xanh rêu','value'=>'#56654f']],
    'patterns'=>[['slug'=>'cloud','label'=>'Vân mây']], 'scenes'=>[['slug'=>'campus','label'=>'Trường học'],['slug'=>'old-quarter','label'=>'Phố cổ'],['slug'=>'temple','label'=>'Văn Miếu'],['slug'=>'citadel','label'=>'Hoàng thành'],['slug'=>'studio','label'=>'Studio']],
    'styles'=>[], 'accessories'=>[], 'accessoryVariants'=>[], 'sources'=>[], 'rules'=>[], 'locations'=>[], 'listings'=>[]];
$studioData = $catalog + ['sessionScope'=>'catalog-qa-only', 'auth'=>['authenticated'=>false,'isAdmin'=>true,'loginUrl'=>'#qa-login-disabled'], 'generationProvider'=>'qa-no-provider', 'basePoster'=>$basePoster, 'baseMedia'=>'', 'lookCsrf'=>'qa', 'generationEndpoint'=>'disabled', 'historyEndpoint'=>'disabled', 'draftEndpoint'=>'disabled', 'collectionEndpoint'=>'disabled', 'lookEndpoint'=>'disabled'];
array_walk_recursive($studioData, static function (&$value) { if (is_string($value) && str_starts_with($value, 'assets/')) $value = 'http://localhost/aiarenavietnam2026/' . $value; });
foreach ($studioData['scenes'] as &$scene) $scene['thumbnail_url'] = 'http://localhost/aiarenavietnam2026/assets/media/catalog/' . ['campus'=>'scene-campus.webp','old-quarter'=>'scene-old-quarter.webp','temple'=>'scene-van-mieu.webp','citadel'=>'scene-citadel.webp','studio'=>'scene-studio.webp'][$scene['slug']];
unset($scene);
require $root . '/includes/components/studio-icon.php';
ob_start(); eval('?>' . $template); $html = (string) ob_get_clean();
$fixture = <<<'JS'
<script>
window.fetch = async function(){return {ok:true,status:200,json:async function(){return {items:[],collections:[],draft:null,history:[]};}};};
</script>
JS;
$html = str_replace('</head>', $fixture . '</head>', $html);
$html = str_replace(['href="assets/', 'src="assets/'], ['href="http://localhost/aiarenavietnam2026/assets/', 'src="http://localhost/aiarenavietnam2026/assets/'], $html);
file_put_contents($destination . '/index.html', $html);
echo "Synthetic Studio preview rendered; provider and external writes disabled.\n";
