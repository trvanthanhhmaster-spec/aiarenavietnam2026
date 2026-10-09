<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/Infrastructure/WikimediaCatalog.php';
require dirname(__DIR__) . '/src/Infrastructure/CatalogResearch.php';
use App\Infrastructure\WikimediaCatalog;
use App\Infrastructure\CatalogResearch;
function check(bool $value, string $message): void { if (!$value) throw new RuntimeException($message); }
$calls = 0;
$provider = new WikimediaCatalog(static function ($url) use (&$calls) {
    $calls++; check(str_starts_with($url, 'https://commons.wikimedia.org/w/api.php?'), 'only authoritative endpoint');
    return json_encode(['query' => ['pages' => [['pageid' => 42, 'title' => 'File:Áo tấc.jpg', 'imageinfo' => [['mime' => 'image/jpeg', 'url' => 'https://upload.wikimedia.org/a.jpg', 'thumburl' => 'https://upload.wikimedia.org/thumb/a.jpg', 'extmetadata' => ['ImageDescription' => ['value' => '<b>Áo tấc</b>'], 'LicenseShortName' => ['value' => 'CC BY-SA']]]]], ['pageid' => 43, 'imageinfo' => [['mime' => 'image/jpeg', 'url' => 'https://attacker.invalid/image.jpg']]]]]], JSON_THROW_ON_ERROR);
});
$rows = $provider->search('Áo tấc');
check(count($rows) === 1 && $rows[0]['description'] === 'Áo tấc', 'ignore untrusted hosts, normalize metadata');
check($provider->file('42') === $rows[0], 'import reads authoritative metadata');
try { $provider->file('../secret'); throw new LogicException('accepted invalid ID'); } catch (RuntimeException $e) {}
check($calls === 2, 'invalid ID never reaches transport');
$aiCalls = 0;
$ai = new CatalogResearch('https://owned-bridge.invalid', str_repeat('x', 64), static function ($payload) use (&$aiCalls) {
    $aiCalls++; check($payload['operation'] === 'review' && !isset($payload['sourceImage']), 'text only, no image generation or personal uploads');
    check(str_contains($payload['prompt'], 'UNTRUSTED'), 'source metadata is data');
    return ['text' => json_encode(['matches' => [['id' => 'unknown', 'reason' => 'invented'], ['id' => '42', 'reason' => '<b>Cần đối chiếu phom áo</b>'], ['id' => '42', 'reason' => 'duplicate']]])];
});
$ranked = $ai->rank('Áo tấc', $rows);
check(count($ranked) === 1 && $ranked[0]['image_url'] === $rows[0]['image_url'], 'AI cannot invent or replace asset URLs');
check($ranked[0]['research_note'] === 'Cần đối chiếu phom áo', 'bounded plain-text advisory');
check($ai->rank('Áo tấc', []) === [] && $aiCalls === 1, 'no empty calls');
$off = new CatalogResearch('', '', static function () { throw new LogicException('called disabled provider'); });
try { $off->rank('Áo tấc', $rows); throw new LogicException('unconfigured accepted'); } catch (RuntimeException $e) {}
$page = file_get_contents(dirname(__DIR__) . '/catalog-search.php');
check(str_contains($page, '$sources->file($externalId)'), 'import does not trust candidate form');
check(str_contains($page, "'review_status' => 'draft'") && str_contains($page, "'is_active' => false"), 'imports remain draft');
check(str_contains($page, '$researchRequested') && str_contains($page, '$auth->verifyCsrf'), 'explicit admin POST and CSRF');
check(str_contains($page, 'time() - 3600') && str_contains($page, 'time() - 60'), 'reuse and rate limit');
echo "Catalog research: server-sourced files, safe hosts, ID-only AI ranking, text-only calls, disabled readiness, draft imports, CSRF, rate limit and cache contracts passed offline. No provider called.\n";
