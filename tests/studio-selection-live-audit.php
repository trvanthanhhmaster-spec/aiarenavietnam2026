<?php
declare(strict_types=1);
// Read-only audit of the current visible result and our authorized anonymous QA job.
// No generation, mutations, account IDs, face pixels, cookies or signed URLs printed.
if (PHP_SAPI !== 'cli' || ($argv[1] ?? '') !== '--live') exit("CLI --live required; read-only.\n");
$root = $argv[2] ?? dirname(__DIR__);
require $root . '/src/Support/Env.php';
require $root . '/src/Infrastructure/SupabaseAdminClient.php';
App\Support\Env::load($root . '/.env');
try {
    $client = new App\Infrastructure\SupabaseAdminClient((string) getenv('SUPABASE_URL'), (string) getenv('SUPABASE_SERVICE_ROLE_KEY'));
    $ids = array_values(array_filter(array_slice($argv, 3), static fn (string $id): bool => preg_match('/^[0-9a-f-]{36}$/i', $id) === 1));
    if (!$ids) throw new InvalidArgumentException('Pass explicitly scoped job IDs after the source root.');
    foreach ($ids as $label => $id) {
        $job = $client->select('generation_jobs', ['id' => 'eq.' . $id, 'select' => 'status,input,output', 'limit' => '1'])[0] ?? null;
        if (!$job) { echo $label . ": unavailable\n"; continue; }
        $input = $job['input'] ?? []; $output = $job['output'] ?? []; $plan = $input['planning'] ?? [];
        $people = [];
        foreach ($plan['people'] ?? [] as $person) $people[] = ['id' => $person['id'], 'outfit' => $person['outfit'] ?? [], 'faceSupplied' => $person['faceSupplied'] ?? false];
        $warning = (string) ($output['copyWarning'] ?? '');
        $code = null; preg_match('/HTTP\s+(\d{3})/', $warning, $matches); $code = $matches[1] ?? null;
        // Only known error categories; never print raw provider details or credentials.
        $category = null;
        foreach (['API_KEY_INVALID','API_KEY_SERVICE_BLOCKED','API_KEY_HTTP_REFERRER_BLOCKED','API_KEY_IP_ADDRESS_BLOCKED','SERVICE_DISABLED','BILLING_DISABLED','PERMISSION_DENIED','RESOURCE_EXHAUSTED'] as $known) {
            if (str_contains($warning, $known)) { $category = $known; break; }
        }
        if ($category === null && str_contains($warning, 'unregistered callers')) $category = 'UNREGISTERED_CALLER';
        echo json_encode(['sample' => 'sample-' . ($label + 1), 'status' => $job['status'], 'event' => $input['eventSlug'] ?? null,
            'count' => $plan['count'] ?? null, 'shared' => $plan['shared'] ?? null, 'period' => $plan['period'] ?? null,
            'people' => $people, 'outputPlanMatchesInput' => ($output['planning'] ?? null) === ($input['planning'] ?? null),
            'copySource' => $output['copySource'] ?? null, 'copyProviderHttp' => $code, 'copyProviderCategory' => $category, 'imageSource' => $output['imageSource'] ?? null,
            'story' => $output['story'] ?? null, 'guardrail' => $output['guardrail'] ?? null, 'genZTip' => $output['genZTip'] ?? null,
            'culturalScore' => $output['culturalScore'] ?? null, 'culturalScoreSource' => $output['culturalScoreSource'] ?? null,
            'imageCount' => count($output['lookbook']['items'] ?? []), 'hasPreviousImage' => !empty($input['referenceJobId']) || !empty($input['referenceLookId']),
            'requestedCanvas' => $input['aspectRatio'] ?? null, 'requestedResolution' => $input['targetResolution'] ?? null,
            'hasImageValidation' => isset($output['validation']) || isset($output['imageAssessment'])], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . "\n";
    }
    $sources = $client->select('cultural_sources', ['review_status'=>'eq.published','select'=>'id,title,source_url,curator_note']);
    $garments = $client->select('studio_garments', ['is_active'=>'eq.true','select'=>'slug,name,origin_note,significance_note,source_id','order'=>'sort_order.asc']);
    foreach ($garments as &$garment) {
        $garment['source'] = null;
        foreach ($sources as $source) if ($source['id'] === $garment['source_id']) $garment['source'] = ['title'=>$source['title'],'url'=>$source['source_url']];
        unset($garment['source_id']);
    }
    unset($garment);
    $rules = $client->select('cultural_rules', ['is_active'=>'eq.true','review_status'=>'eq.approved','select'=>'rule_text,severity,context']);
    echo json_encode(['catalog'=>'published-cultural-content','garments'=>$garments,'approvedRules'=>$rules],JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . "\n";
} catch (Throwable) { fwrite(STDERR, "Read-only audit failed; no private response printed.\n"); exit(1); }
