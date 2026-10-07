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
        if (!$job || $job['status'] !== 'completed' || !($job['user_id'] === $this->userId && $this->userId !== null
            || $job['user_id'] === null && !empty($job['owner_session_hash']) && hash_equals($job['owner_session_hash'], $this->owner))) {
            throw new InvalidArgumentException('Không tìm thấy phiên bản của bạn.');
        }
        return $job;
    }
    public function look(string $id): array
    {
        if (!$this->userId || !self::uuid($id)) throw new InvalidArgumentException('Bản phối không hợp lệ.');
        $look = $this->client->select('looks', ['id'=>'eq.'.$id,'user_id'=>'eq.'.$this->userId,'select'=>'*','limit'=>'1'])[0] ?? null;
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
            $old = ['planning'=>$look['selection']['planning'] ?? null];
            $image = ['url'=>$look['image_url'],'path'=>$look['storage_path'] ?? null];
            $input['history'] = ['rootJobId'=>null,'rootLookId'=>$look['id'],'parentJobId'=>null];
        }
        $before = $old['planning'] ?? null; $after = $input['planning'] ?? null;
        $input['editInstruction'] = "Edit the supplied previous version, NOT a fresh random composition. Preserve identities, faces, hair, pose, camera, background and all garment/accessory details not changed in the requested plan. A person-count change may add/remove people while preserving the existing people where possible. Do not reproduce text, panels or reference-sheet labels.\n"
            . json_encode(['previousPlan'=>$before,'requestedPlan'=>$after], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        return $this->storage->imageData($image);
    }
    public static function selection(array $input): array
    {
        $result = ['planning'=>$input['planning'] ?? null,'locks'=>$input['locks'] ?? [],'aspectRatio'=>$input['aspectRatio'] ?? '16:9'];
        foreach (['event'=>'eventSlug','garment'=>'garmentSlug','garmentVariant'=>'garmentVariantSlug','color'=>'colorSlug','pattern'=>'patternSlug','style'=>'styleSlug','scene'=>'sceneSlug'] as $key=>$source) $result[$key] = $input[$source] ?? '';
        $result['accessories'] = $input['accessorySlugs'] ?? []; $result['accessoryVariants'] = $input['accessoryVariantSlugs'] ?? [];
        return $result;
    }
}
