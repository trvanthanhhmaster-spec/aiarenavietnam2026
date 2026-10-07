<?php
declare(strict_types=1);
namespace App\Support;

use InvalidArgumentException;

/** Allow partial selections, never arbitrary blobs, face pixels, credentials or provider output. */
final class StudioDraft
{
    public static function normalize(array $input): array
    {
        $result = [];
        foreach (['draft', 'selection'] as $key) {
            $value = $input[$key] ?? null;
            if ($value !== null && !is_array($value)) throw new InvalidArgumentException('Bản nháp không hợp lệ.');
            $result[$key] = $value === null ? null : self::selection($value);
        }
        foreach (['jobId', 'saveId', 'savedLookId'] as $key) {
            $value = $input[$key] ?? null;
            if ($value !== null && (!is_string($value) || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $value))) {
                throw new InvalidArgumentException('Tham chiếu bản phối không hợp lệ.');
            }
            $result[$key] = $value;
        }
        $step = $input['guideStep'] ?? 'event';
        if (!in_array($step, ['event', 'people', 'time', 'garment', 'review'], true)) throw new InvalidArgumentException('Bước bản nháp không hợp lệ.');
        $result['guideStep'] = $step;
        $result['saveAfterLogin'] = ($input['saveAfterLogin'] ?? false) === true;
        return $result;
    }

    private static function text(mixed $value, int $limit): string
    {
        if (!is_string($value) || mb_strlen($value) > $limit || str_contains($value, 'data:image/')) throw new InvalidArgumentException('Nội dung bản nháp quá dài hoặc không hợp lệ.');
        return trim($value);
    }

    private static function outfit(array $input): array
    {
        $result = [];
        $slug = static function (mixed $value): string {
            if (!is_string($value) || !preg_match('/^[a-z0-9_-]{0,100}$/', $value)) throw new InvalidArgumentException('Lựa chọn không hợp lệ.');
            return $value;
        };
        foreach (['garment', 'garmentVariant', 'color', 'pattern', 'style', 'scene'] as $key) $result[$key] = $slug($input[$key] ?? '');
        foreach (['accessories', 'accessoryVariants'] as $key) {
            $items = $input[$key] ?? [];
            if (!is_array($items) || count($items) > 10) throw new InvalidArgumentException('Danh sách phụ kiện không hợp lệ.');
            $result[$key] = array_values(array_unique(array_map($slug, $items)));
        }
        return $result;
    }

    private static function selection(array $input): array
    {
        $result = self::outfit($input);
        $result['event'] = self::text($input['event'] ?? '', 100);
        foreach (['aspectRatio', 'resolution', 'mode', 'outputType', 'activeFrame'] as $key) {
            if (isset($input[$key])) $result[$key] = self::text($input[$key], 30);
        }
        $result['locks'] = [];
        foreach (['character', 'face', 'hair', 'garment', 'background', 'pose', 'camera', 'lighting'] as $key) {
            $result['locks'][$key] = ($input['locks'][$key] ?? true) === true;
        }
        $plan = $input['planning'] ?? null;
        if ($plan === null) return $result;
        if (!is_array($plan) || ($plan['version'] ?? null) !== 1 || !is_array($plan['people'] ?? null)) throw new InvalidArgumentException('Danh sách người không hợp lệ.');
        $count = $plan['count'] ?? null;
        if (($count !== null && (!is_int($count) || $count < 1 || $count > 12)) || count($plan['people']) !== ($count ?? 0)) throw new InvalidArgumentException('Số người trong bản nháp không hợp lệ.');
        $people = [];
        foreach (array_values($plan['people']) as $index => $person) {
            if (!is_array($person) || !is_array($person['outfit'] ?? null)) throw new InvalidArgumentException('Trang phục trong bản nháp không hợp lệ.');
            foreach (['heightCm' => [50, 250], 'weightKg' => [10, 300]] as $key => $range) {
                $value = $person[$key] ?? null;
                if ($value !== null && ((!is_int($value) && !is_float($value)) || !is_finite((float) $value) || $value < $range[0] || $value > $range[1])) throw new InvalidArgumentException('Số đo không hợp lệ.');
            }
            $people[] = ['id' => $index + 1, 'name' => self::text($person['name'] ?? '', 60),
                'heightCm' => $person['heightCm'] ?? null, 'weightKg' => $person['weightKg'] ?? null,
                'faceSupplied' => false, 'customized' => ($person['customized'] ?? false) === true,
                'outfit' => self::outfit($person['outfit'])];
        }
        $period = $plan['period'] ?? null;
        if ($period !== null) {
            if (!is_array($period) || !in_array($period['kind'] ?? '', ['this-week', 'next-week', 'next-month', 'custom', 'unspecified'], true)) throw new InvalidArgumentException('Thời gian không hợp lệ.');
            $dates = [];
            foreach (['start', 'end'] as $key) {
                $date = $period[$key] ?? '';
                if ($period['kind'] === 'unspecified') $date = '';
                elseif (!is_string($date) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !checkdate((int) substr($date, 5, 2), (int) substr($date, 8, 2), (int) substr($date, 0, 4))) throw new InvalidArgumentException('Ngày không hợp lệ.');
                $dates[$key] = $date;
            }
            if ($dates['end'] < $dates['start']) throw new InvalidArgumentException('Khoảng ngày không hợp lệ.');
            $period = ['kind' => $period['kind']] + $dates;
        }
        $result['planning'] = ['version' => 1, 'count' => $count, 'shared' => ($plan['shared'] ?? true) === true,
            'activePerson' => max(1, min($count ?? 1, (int) ($plan['activePerson'] ?? 1))), 'period' => $period,
            'customOccasion' => self::text($plan['customOccasion'] ?? '', 120),
            'occasionNote' => self::text($plan['occasionNote'] ?? '', 400), 'people' => $people];
        return $result;
    }
}
