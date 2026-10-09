<?php
declare(strict_types=1);
namespace App\Support;
use App\Infrastructure\SupabaseAdminClient;
use App\Infrastructure\StudioStorage;
use InvalidArgumentException;

final class StudioHistory
{
    public function __construct(private SupabaseAdminClient $client, private StudioStorage $storage, private ?string $userId, private string $owner) {}
    public static function uuid(mixed $id): bool { return is_string($id) && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id) === 1; }
    public function job(string $id): array
    {
        if (!self::uuid($id)) throw new InvalidArgumentException('Phiên bản không hợp lệ.');
        $job = $this->client->select('generation_jobs', ['id'=>'eq.'.$id,'select'=>'*','limit'=>'1'])[0] ?? null;
        if (!$job || !empty($job['deleted_at']) || $job['status'] !== 'completed' || !($job['user_id'] === $this->userId && $this->userId !== null
            || $job['user_id'] === null && !empty($job['owner_session_hash']) && hash_equals($job['owner_session_hash'], $this->owner))) {
            throw new InvalidArgumentException('Không tìm thấy phiên bản của bạn.');
        }
        return $job;
    }
    public function look(string $id): array
    {
        if (!$this->userId || !self::uuid($id)) throw new InvalidArgumentException('Bản phối không hợp lệ.');
        $look = $this->client->select('looks', ['id'=>'eq.'.$id,'user_id'=>'eq.'.$this->userId,'deleted_at'=>'is.null','select'=>'*','limit'=>'1'])[0] ?? null;
        if (!$look) throw new InvalidArgumentException('Không tìm thấy bản phối của bạn.');
        return $look;
    }
    /** Backend resolves an owned image; no client-provided URLs or history IDs are trusted. */
    public function reference(array &$input): ?array
    {
        unset($input['history'], $input['editInstruction']);
        foreach (['referenceJobId','referenceLookId'] as $field) {
            if (!empty($input[$field]) && !self::uuid($input[$field])) throw new InvalidArgumentException('Phiên bản tham chiếu không hợp lệ.');
        }
        if (empty($input['referenceJobId']) && empty($input['referenceLookId'])) return null;
        if (!empty($input['referenceJobId'])) {
            $job = $this->job($input['referenceJobId']);
            $old = $job['input']; $image = $job['output']['lookbook']['items'][0] ?? [];
            $input['history'] = ['rootJobId'=>isset($old['history']) ? ($old['history']['rootJobId'] ?? null) : $job['id'],
                'rootLookId'=>$old['history']['rootLookId'] ?? null,'parentJobId'=>$job['id']];
        } else {
            $look = $this->look($input['referenceLookId']);
            if (!empty($look['generation_job_id'])) {
                // A guest result bookmarked before login may belong to a different device.
                // The owned look grants access to that image, not the entire guest job history.
                try { $this->job($look['generation_job_id']); $ownedJob = true; }
                catch (InvalidArgumentException) { $ownedJob = false; }
                if ($ownedJob) {
                    $input['referenceJobId'] = $look['generation_job_id'];
                    $imageData = $this->reference($input);
                    $input['history']['rootLookId'] = $input['history']['rootLookId'] ?? $look['id'];
                    return $imageData;
                }
            }
            unset($input['referenceJobId']);
            $old = ['planning'=>$look['selection']['planning'] ?? null, 'eventSlug'=>$look['selection']['event'] ?? '', 'aspectRatio'=>$look['selection']['aspectRatio'] ?? '16:9'];
            $image = ['url'=>$look['image_url'],'path'=>$look['storage_path'] ?? null];
            $input['history'] = ['rootJobId'=>null,'rootLookId'=>$look['id'],'parentJobId'=>null];
        }
        $repair = ($input['repairRequested'] ?? false) === true;
        if ($repair) {
            if (!isset($job)) throw new InvalidArgumentException('Phiên bản này chưa có đánh giá để sửa chi tiết.');
            $targets = self::repairTargets($job['output']['imageAssessment'] ?? [], $old['planning'] ?? []);
            if (!$targets) throw new InvalidArgumentException('Chưa có chi tiết sai lệch đã được AI đối chiếu.');
            $oldPlan = StudioPlan::normalize($old['planning'] ?? null); $newPlan = StudioPlan::normalize($input['planning'] ?? null);
            // The old photo retains its faces; private upload bytes are not restored with drafts.
            foreach ($oldPlan['people'] as &$person) $person['faceSupplied'] = false; unset($person);
            foreach ($newPlan['people'] as &$person) $person['faceSupplied'] = false; unset($person);
            if (($old['eventSlug'] ?? '') !== ($input['eventSlug'] ?? '') || $oldPlan !== $newPlan) {
                throw new InvalidArgumentException('Lựa chọn đã đổi. Hãy tạo phiên bản mới thay vì sửa theo đánh giá cũ.');
            }
            $input['aspectRatio'] = $old['aspectRatio'] ?? '16:9';
        }
        $before = $old['planning'] ?? null; $after = $input['planning'] ?? null;
        $eventChanged = ($old['eventSlug'] ?? '') !== ($input['eventSlug'] ?? '')
            || ($before['customOccasion'] ?? '') !== ($after['customOccasion'] ?? '')
            || ($before['occasionNote'] ?? '') !== ($after['occasionNote'] ?? '');
        $sceneChanged = array_column(array_column($before['people'] ?? [], 'outfit'), 'scene')
            !== array_column(array_column($after['people'] ?? [], 'outfit'), 'scene');
        $background = $eventChanged || $sceneChanged
            ? 'Update the background to the requested event and explicit scene choices. Do NOT preserve a conflicting old background.'
            : 'Preserve the background because the event and scene choices are unchanged.';
        $input['editInstruction'] = "Edit the supplied previous version, NOT a fresh random composition. Preserve unchanged identities, faces, hair and garment/accessory details. Apply every changed choice, including removal of accessories and explicit color/pattern overrides. Keep pose and camera where possible without conflicting with the requested scene or people count. {$background} A person-count change may add/remove people while preserving the existing people where possible. Do not reproduce text, panels or reference-sheet labels.\n"
            . json_encode(['previousEvent'=>$old['eventSlug'] ?? '', 'requestedEvent'=>$input['eventSlug'] ?? '', 'previousPlan'=>$before,'requestedPlan'=>$after], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        if ($repair) $input['editInstruction'] .= "\nTARGETED REPAIR: correct ONLY the listed mismatches to the requested plan and attached garment samples. Preserve matched and uncertain fields; do not guess at uncertain details. A scene mismatch overrides the earlier background-preservation instruction. No extra styling accessories. Targets: " . json_encode($targets, JSON_THROW_ON_ERROR);
        if (($input['aspectRatio'] ?? '') !== ($old['aspectRatio'] ?? '16:9')) $input['editInstruction'] .= "\nReframe to the requested aspect ratio with all main subjects fully visible. Extend the background where needed, not a horizontal image pasted into a vertical card. Do not preserve conflicting old framing.";
        return $this->storage->imageData($image);
    }
    public static function repairTargets(array $assessment, array $plan): array
    {
        if (($assessment['status'] ?? '') !== 'mismatch') return [];
        $targets = [];
        if (is_int($assessment['observedPeopleCount'] ?? null) && $assessment['observedPeopleCount'] !== ($plan['count'] ?? null)) $targets['peopleCount'] = $plan['count'];
        foreach ($assessment['people'] ?? [] as $person) {
            $id = $person['personId'] ?? null;
            if (!is_int($id) || $id < 1 || $id > ($plan['count'] ?? 0)) continue;
            foreach (['garment','variant','color','pattern','style','accessories','scene'] as $field) {
                if (($person['checks'][$field] ?? '') === 'mismatch') $targets['people'][$id][] = $field;
            }
        }
        return $targets;
    }
    public static function selection(array $input): array
    {
        $result = ['planning'=>$input['planning'] ?? null,'locks'=>$input['locks'] ?? [],'aspectRatio'=>$input['aspectRatio'] ?? '16:9'];
        foreach (['event'=>'eventSlug','garment'=>'garmentSlug','garmentVariant'=>'garmentVariantSlug','color'=>'colorSlug','pattern'=>'patternSlug','style'=>'styleSlug','scene'=>'sceneSlug'] as $key=>$source) $result[$key] = $input[$source] ?? '';
        $result['accessories'] = $input['accessorySlugs'] ?? []; $result['accessoryVariants'] = $input['accessoryVariantSlugs'] ?? [];
        return $result;
    }
    /** Public result metadata only; never expose internal prompts, provider errors or face bytes. */
    public static function output(array $output, ?string $url, ?string $path): array
    {
        $safe = [];
        foreach (['story','guardrail','genZTip'] as $key) if (is_string($output[$key] ?? null)) $safe[$key] = mb_substr($output[$key], 0, 12000);
        foreach (['copySource','culturalScoreSource','imageSource'] as $key) if (is_string($output[$key] ?? null)) $safe[$key] = mb_substr($output[$key], 0, 80);
        if (($output['copyPolicy'] ?? '') === 'selected-catalog-only') $safe['copyPolicy'] = 'selected-catalog-only';
        if (in_array($output['reviewStatus'] ?? '', ['completed','provider-forbidden','provider-session-expired','unavailable','not-requested'], true)) $safe['reviewStatus'] = $output['reviewStatus'];
        if (in_array($output['garmentReferences']['status'] ?? '', ['attached','unavailable'], true)) {
            $safe['garmentReferences'] = ['status'=>$output['garmentReferences']['status'], 'count'=>min(12,max(0,(int)($output['garmentReferences']['count'] ?? count($output['garmentReferences']['items'] ?? []))))];
        }
        $score = $output['culturalScore'] ?? null;
        if (is_numeric($score) && (float)$score >= 0 && (float)$score <= 100) $safe['culturalScore'] = (float)$score;
        if (is_array($output['imageAssessment'] ?? null)) {
            $assessment = $output['imageAssessment'];
            $safe['imageAssessment'] = ['status'=>in_array($assessment['status'] ?? '', ['matched','mismatch','uncertain','not-assessed'], true) ? $assessment['status'] : 'not-assessed'];
            if (is_int($assessment['observedPeopleCount'] ?? null) && $assessment['observedPeopleCount'] >= 0 && $assessment['observedPeopleCount'] <= 30) $safe['imageAssessment']['observedPeopleCount'] = $assessment['observedPeopleCount'];
            foreach (array_slice(is_array($assessment['people'] ?? null) ? $assessment['people'] : [], 0, 12) as $person) {
                if (!is_array($person) || !is_int($person['personId'] ?? null) || $person['personId'] < 1 || $person['personId'] > 12) continue;
                $checks = [];
                foreach (['garment','variant','color','pattern','style','accessories','scene'] as $field) if (in_array($person['checks'][$field] ?? '', ['match','mismatch','uncertain','not-requested'], true)) $checks[$field] = $person['checks'][$field];
                $safe['imageAssessment']['people'][] = ['personId'=>$person['personId'], 'checks'=>$checks];
            }
            foreach (array_slice(is_array($assessment['constructionChecks'] ?? null) ? $assessment['constructionChecks'] : [], 0, 12) as $check) {
                if (is_int($check['personId'] ?? null) && $check['personId'] >= 1 && $check['personId'] <= 12 && in_array($check['status'] ?? '', ['match','mismatch','uncertain'], true) && is_string($check['reason'] ?? null)) {
                    $safe['imageAssessment']['constructionChecks'][] = ['personId' => $check['personId'], 'status' => $check['status'], 'reason' => mb_substr($check['reason'], 0, 400)];
                }
            }
        }
        $item = ['url'=>$url,'path'=>$path];
        foreach (['width','height'] as $key) if (is_int($output['lookbook']['items'][0][$key] ?? null)) $item[$key] = $output['lookbook']['items'][0][$key];
        $safe['lookbook'] = ['aspectRatio'=>$output['lookbook']['aspectRatio'] ?? '16:9', 'items'=>$url ? [$item] : []];
        return $safe;
    }
}
