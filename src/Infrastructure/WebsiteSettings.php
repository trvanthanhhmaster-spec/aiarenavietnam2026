<?php
declare(strict_types=1);
namespace App\Infrastructure;

use App\Support\WebsiteMetadata;
use RuntimeException;

/** Stores public settings in existing pages.ui JSON, preserving all unrelated UI copy. */
final class WebsiteSettings
{
    public function __construct(private SupabaseAdminClient $client, private string $slug, private string $cacheFile) {}
    private function row(): array
    {
        $rows = $this->client->select('pages', ['slug' => 'eq.' . $this->slug, 'select' => 'id,ui,updated_at,title,description', 'limit' => '1']);
        if (!$rows) throw new RuntimeException('Không tìm thấy cấu hình trang chủ.', 503);
        return $rows[0];
    }
    public function read(): array
    {
        $row = $this->row();
        return ['settings' => WebsiteMetadata::normalize($row['ui']['website'] ?? []), 'revision' => $row['updated_at'],
            'home' => ['title' => $row['title'], 'description' => $row['description']]];
    }
    public function save(string $section, mixed $input, string $revision): array
    {
        $value = WebsiteMetadata::validateSection($section, $input);
        $row = $this->row();
        if ($revision === '' || $revision !== $row['updated_at']) throw new RuntimeException('Cấu hình đã thay đổi ở nơi khác. Làm mới trước khi lưu.', 409);
        $ui = is_array($row['ui']) ? $row['ui'] : [];
        $settings = WebsiteMetadata::normalize($ui['website'] ?? []);
        $settings[$section] = $value;
        $ui['website'] = $settings;
        $saved = $this->client->update('pages', ['id' => 'eq.' . $row['id'], 'updated_at' => 'eq.' . $revision], ['ui' => $ui, 'updated_at' => (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.uP')]);
        if (!$saved) throw new RuntimeException('Có thay đổi đồng thời. Làm mới để giữ dữ liệu mới nhất.', 409);
        self::invalidate($this->cacheFile);
        return $this->read();
    }
    public static function invalidate(string $cacheFile): void
    {
        // Known server-owned caches only; user cannot supply these paths.
        foreach ([$cacheFile, $cacheFile . '.website'] as $file) if (is_file($file)) @unlink($file);
    }
}
