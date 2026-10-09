<?php
declare(strict_types=1);
// Regression: changing occasion/scene releases the old background, unchanged choices preserve it.
namespace App\Infrastructure {
    class SupabaseAdminClient {
        public function __construct(private array $job) {}
        public function select(string $table, array $query): array { return [$this->job]; }
    }
    class StudioStorage { public function imageData(array $image): array { return ['mimeType'=>'image/png','data'=>'offline-fixture']; } }
}
namespace {
    require dirname(__DIR__) . '/src/Support/StudioHistory.php';
    $plan = ['version'=>1,'count'=>1,'people'=>[['id'=>1,'outfit'=>['garment'=>'ao-tac','scene'=>'']]],'customOccasion'=>''];
    $old = ['id'=>'00000000-0000-4000-8000-000000000001','user_id'=>'fixture-user','status'=>'completed',
        'input'=>['eventSlug'=>'school','planning'=>$plan], 'output'=>['lookbook'=>['items'=>[['url'=>'/fixture']]]]];
    $input = ['referenceJobId'=>$old['id'],'eventSlug'=>'ceremony','planning'=>$plan];
    $history = new App\Support\StudioHistory(new App\Infrastructure\SupabaseAdminClient($old),new App\Infrastructure\StudioStorage(),'fixture-user','fixture-owner');
    $history->reference($input);
    $instruction = $input['editInstruction'];
    if (!str_contains($instruction,'Do NOT preserve a conflicting old background') || !str_contains($instruction,'school') || !str_contains($instruction,'ceremony')) throw new RuntimeException('Event edit regression.');
    $input['eventSlug'] = 'school'; $history->reference($input);
    if (!str_contains($input['editInstruction'],'Preserve the background because')) throw new RuntimeException('Unchanged scene regression.');
    $input['planning']['people'][0]['outfit']['scene'] = 'temple'; $history->reference($input);
    if (!str_contains($input['editInstruction'],'Do NOT preserve a conflicting old background')) throw new RuntimeException('Scene edit regression.');
    $safe = App\Support\StudioHistory::output(['story'=>'original','copyWarning'=>'private error','imagePrompt'=>'private prompt','culturalScore'=>0,'inputImage'=>['data'=>'secret']], '/fresh.png', 'owned.png');
    if (isset($safe['copyWarning']) || isset($safe['imagePrompt']) || isset($safe['inputImage']) || $safe['story'] !== 'original' || $safe['culturalScore'] !== 0.0) throw new RuntimeException('History output allowlist regression.');
    echo "History edits: event/scene changes release background, unchanged scope preserved and public output allowlist passed offline.\n";
}
