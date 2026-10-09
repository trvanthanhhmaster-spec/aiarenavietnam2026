<?php
declare(strict_types=1);
namespace App\Support;

/** Bound anonymous weather/text-provider spend across sessions. No user payload is logged. */
final class StudioAdviceBudget
{
    public static function reserve(string $kind, string $owner, ?string $directory = null): void
    {
        $directory ??= is_dir('/var/lib/vremix') ? '/var/lib/vremix' : sys_get_temp_dir();
        $file = $directory . '/vremix-advice-budget.json';
        $handle = fopen($file, 'c+');
        if (!$handle || !flock($handle, LOCK_EX)) throw new \RuntimeException('Bộ giới hạn dịch vụ chưa sẵn sàng.');
        try {
            chmod($file, 0600);
            $raw = stream_get_contents($handle); $data = $raw ? json_decode($raw, true) : [];
            if (!is_array($data)) throw new \RuntimeException('Bộ giới hạn dịch vụ chưa sẵn sàng.');
            $bucket = $kind === 'ai' ? gmdate('Y-m-d') : gmdate('Y-m-d-H');
            $data[$kind] = ($data[$kind]['bucket'] ?? '') === $bucket ? $data[$kind] : ['bucket' => $bucket, 'total' => 0, 'owners' => []];
            $row = &$data[$kind];
            $limit = $kind === 'ai' ? 100 : 300;
            $perOwner = $kind === 'ai' ? 5 : 20;
            if ($row['total'] >= $limit || ($row['owners'][$owner] ?? 0) >= $perOwner) throw new \RuntimeException('Đã đạt giới hạn tư vấn. Hãy dùng gợi ý biên tập hoặc quay lại sau.');
            $row['total']++; $row['owners'][$owner] = ($row['owners'][$owner] ?? 0) + 1;
            rewind($handle); ftruncate($handle, 0); fwrite($handle, json_encode($data, JSON_THROW_ON_ERROR)); fflush($handle);
        } finally { flock($handle, LOCK_UN); fclose($handle); }
    }
}
