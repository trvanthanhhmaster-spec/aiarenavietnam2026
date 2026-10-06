<?php
declare(strict_types=1);
require __DIR__ . '/../src/Support/StudioPlan.php';
use App\Support\StudioPlan;
function check(bool $value): void { if (!$value) throw new RuntimeException('Assertion failed'); }
$input = ['version' => 1, 'count' => 2, 'shared' => false, 'period' => ['kind' => 'unspecified'], 'people' => [
    ['id' => 1, 'outfit' => ['garment' => 'ao-tac', 'accessories' => ['tote']], 'faceImage' => 'secret-pixels'],
    ['id' => 2, 'outfit' => ['garment' => 'ao-tu-than']],
]];
$p = StudioPlan::normalize($input);
check(count($p['people']) === 2 && $p['people'][1]['outfit']['style'] === '');
check(!str_contains(json_encode($p), 'secret-pixels'));
$catalog = ['garments' => [['id' => 'g1', 'slug' => 'ao-tac', 'name' => 'Áo tấc'], ['id' => 'g2', 'slug' => 'ao-tu-than', 'name' => 'Áo tứ thân']], 'accessories' => [['id' => 'a1', 'slug' => 'tote', 'name' => 'Túi tote']]];
$prompt = StudioPlan::prompt($p, $catalog);
check(str_contains($prompt, 'exactly 2 people') && str_contains($prompt, 'Áo tấc') && str_contains($prompt, 'Áo tứ thân'));
foreach ([array_replace($input, ['count' => 13]), array_replace($input, ['count' => 1]), array_replace($input, ['period' => ['kind' => 'custom', 'start' => '2026-02-30', 'end' => '2026-03-01']])] as $bad) {
    $rejected = false; try { StudioPlan::normalize($bad); } catch (InvalidArgumentException) { $rejected = true; } check($rejected);
}
$p['people'][1]['outfit']['garmentVariant'] = 'unapproved';
$rejected = false; try { StudioPlan::prompt($p, $catalog); } catch (InvalidArgumentException) { $rejected = true; } check($rejected);
echo "PHP Studio plan: validation, approved per-person prompts and source-image metadata stripping passed.\n";
