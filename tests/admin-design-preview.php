<?php
declare(strict_types=1);
// CLI-only, synthetic UI preview. No Supabase client, session or credentials.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$destination = $argv[1] ?? '';
if (!is_dir($destination) || !str_starts_with(realpath($destination) ?: '', '/private/tmp/')) {
    fwrite(STDERR, "Pass an existing temporary output directory.\n"); exit(1);
}
$root = dirname(__DIR__);
$source = file_get_contents($root . '/admin.php');
$head = substr($source, strpos($source, '<!doctype html>'), strpos($source, '<body class="admin-page">') - strpos($source, '<!doctype html>'));
$start = strpos($source, '    <main class="admin-shell"');
$end = strpos($source, '<?php endif; ?>', $start);
$template = $head . '<body class="admin-page">' . substr($source, $start, $end - $start) . '</body></html>';
$template = str_replace('__DIR__', var_export($root, true), $template);
$auth = new class { public function csrfToken(): string { return 'offline-preview'; } };
require_once $root . '/src/Support/WebsiteMetadata.php';
$websiteSettings = App\Support\WebsiteMetadata::defaults();
$websiteHome = ['title' => 'V-Remix — Việt phục, theo cách bạn.', 'description' => 'Phối Việt phục cho dịp của bạn.'];
$websiteCanonicalHost = false;
$escape = static fn (mixed $value): string => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
ob_start();
eval('?>' . $template);
$html = (string) ob_get_clean();
if (($argv[2] ?? '') !== 'website') $html = str_replace(['href="assets/', 'src="assets/'], ['href="http://localhost/aiarenavietnam2026/assets/', 'src="http://localhost/aiarenavietnam2026/assets/'], $html);
$fixture = <<<'JS'
<script>
window.fetch = async function(url, options) {
  if (options && options.method && options.method !== 'GET') throw new Error('Bản QA chỉ đọc, không lưu dữ liệu.');
  var resource = new URL(url, location.href).searchParams.get('resource');
  var data = resource === 'google-auth' ? {management_ready:false, enabled:false, notice:'Bản QA: không kết nối cấu hình Google thật.'} : {
    items: resource === 'ai-settings' ? [{id:'qa-only', generation_enabled:true, image_provider:'env', image_model:'Model minh họa', video_provider:'env', video_model:'Model minh họa', image_unit_cost_vnd:0, video_unit_cost_vnd:0}] : [],
    usage: resource === 'ai-settings' ? {today_cost_vnd:0, month_cost_vnd:0, month_images:0, month_videos:0} : null
  };
  return {ok:true, status:200, json:async function(){return data;}};
};
</script>
JS;
$html = str_replace('</head>', $fixture . '</head>', $html);
if (($argv[2] ?? '') === 'website') {
    $settingsJson = json_encode(['settings' => $websiteSettings, 'home' => $websiteHome, 'revision' => 'qa-revision'], JSON_HEX_TAG | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $websiteFixture = '<script>const qaWebsite = ' . $settingsJson . '; const qaFetch = window.fetch; window.fetch = async function(url, options) { const resource = new URL(url, location.href).searchParams.get("resource"); if (!["brand", "seo"].includes(resource)) return qaFetch(url, options); if (options && options.method === "POST") { if (options.body instanceof FormData) return {ok:true,json:async()=>({asset:{url:"assets/media/brand/share-default.png",width:1200,height:630}})}; const input = JSON.parse(options.body); qaWebsite.settings[resource] = input.values; qaWebsite.revision = "qa-updated"; } return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(qaWebsite))}; }; </script>';
    $html = str_replace('</head>', $websiteFixture . '</head>', $html);
}
$html = str_replace('Nội dung, sáng tạo và vận hành — trong một nơi.', 'Bản QA giao diện · dữ liệu minh họa · không lưu thay đổi.', $html);
file_put_contents($destination . '/index.html', $html);
echo "Synthetic admin preview rendered; writes disabled.\n";
