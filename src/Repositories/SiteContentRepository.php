<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Infrastructure\SupabaseClient;
use RuntimeException;
use Throwable;

final class SiteContentRepository
{
    public function __construct(
        private SupabaseClient $client,
        private string $cacheFile,
        private int $cacheTtl
    ) {
    }

    /**
     * @return array{site: array<string, mixed>, branches: array<string, array<string, mixed>>, media_url: string}|null
     */
    public function getHomePage(): ?array
    {
        $cached = $this->readCache();
        if ($cached !== null) {
            return $cached;
        }

        try {
            $pages = $this->client->select('pages', [
                'slug' => 'eq.home',
                'select' => 'name,title,description,preview_note,hero_line_one,hero_line_two,hero_description_one,hero_description_two,controller_label,cta_label,ui,media_url',
                'limit' => '1',
            ]);
            $branchRows = $this->client->select('experience_branches', [
                'page_slug' => 'eq.home',
                'is_active' => 'eq.true',
                'select' => 'branch_key,label,forward_guard,reverse_guard',
                'order' => 'sort_order.asc',
            ]);

            if ($pages === [] || $branchRows === []) {
                throw new RuntimeException('Supabase content is incomplete.');
            }

            $page = $pages[0];
            $branches = [];
            foreach ($branchRows as $row) {
                $key = (string) ($row['branch_key'] ?? '');
                if ($key === '') {
                    continue;
                }
                $branches[$key] = [
                    'label' => (string) ($row['label'] ?? $key),
                    'fwdGuard' => (float) ($row['forward_guard'] ?? 0.08),
                    'revGuard' => (float) ($row['reverse_guard'] ?? 0.08),
                ];
            }

            if ($branches === []) {
                throw new RuntimeException('Supabase has no active experience branches.');
            }

            $content = [
                'site' => array_diff_key($page, ['media_url' => true]),
                'branches' => $branches,
                'media_url' => (string) ($page['media_url'] ?? ''),
            ];
            $this->writeCache($content);

            return $content;
        } catch (Throwable $error) {
            error_log('[V-Remix] Supabase fallback: ' . $error->getMessage());
            return $this->readCache(ignoreExpiry: true);
        }
    }

    /**
     * @return array{site: array<string, mixed>, branches: array<string, array<string, mixed>>, media_url: string}|null
     */
    private function readCache(bool $ignoreExpiry = false): ?array
    {
        if (!is_file($this->cacheFile)) {
            return null;
        }

        if (!$ignoreExpiry && $this->cacheTtl > 0 && filemtime($this->cacheFile) < time() - $this->cacheTtl) {
            return null;
        }

        $contents = file_get_contents($this->cacheFile);
        if ($contents === false) {
            return null;
        }

        $decoded = json_decode($contents, true);
        if (
            !is_array($decoded)
            || !isset($decoded['site']['ui'])
            || !is_array($decoded['site']['ui'])
        ) {
            return null;
        }

        return $decoded;
    }

    /**
     * @param array<string, mixed> $content
     */
    private function writeCache(array $content): void
    {
        $directory = dirname($this->cacheFile);
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
            return;
        }

        $json = json_encode($content, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json !== false) {
            file_put_contents($this->cacheFile, $json, LOCK_EX);
        }
    }
}
