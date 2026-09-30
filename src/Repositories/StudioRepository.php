<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Infrastructure\SupabaseClient;
use RuntimeException;
use Throwable;

final class StudioRepository
{
    public function __construct(private SupabaseClient $client)
    {
    }

    /**
     * @return array{events: array<int, array<string, mixed>>, garments: array<int, array<string, mixed>>, accessories: array<int, array<string, mixed>>, colors: array<int, array<string, mixed>>, styles: array<int, array<string, mixed>>, generation: array<string, mixed>}|null
     */
    public function getCatalog(): ?array
    {
        try {
            $events = $this->client->select('studio_events', [
                'select' => 'slug,label,description,cultural_context',
                'is_active' => 'eq.true',
                'order' => 'sort_order.asc',
            ]);
            $garments = $this->client->select('studio_garments', [
                'select' => 'slug,name,category,description,origin_note,significance_note,image_url',
                'is_active' => 'eq.true',
                'order' => 'sort_order.asc',
            ]);
            $accessories = $this->client->select('studio_accessories', [
                'select' => 'slug,name,category,description,image_url',
                'is_active' => 'eq.true',
                'order' => 'sort_order.asc',
            ]);
            $options = $this->client->select('studio_options', [
                'select' => 'option_type,slug,label,value,prompt_hint',
                'is_active' => 'eq.true',
                'order' => 'sort_order.asc',
            ]);
            $generationRows = $this->client->select('studio_generation_settings', [
                'select' => 'canvas_aspect_ratio,target_resolution,default_generation_mode,base_prompt,frame_plan',
                'id' => 'eq.1',
                'limit' => '1',
            ]);

            $catalog = [
                'events' => $events,
                'garments' => $garments,
                'accessories' => $accessories,
                'colors' => [],
                'styles' => [],
                'generation' => $generationRows[0] ?? [
                    'canvas_aspect_ratio' => '16:9',
                    'target_resolution' => '1080',
                    'default_generation_mode' => 'text-to-image',
                    'base_prompt' => '',
                    'frame_plan' => [],
                ],
            ];
            foreach ($options as $option) {
                $type = (string) ($option['option_type'] ?? '');
                if ($type === 'color') {
                    $catalog['colors'][] = $option;
                } elseif ($type === 'style') {
                    $catalog['styles'][] = $option;
                }
            }

            if ($catalog['events'] === [] || $catalog['garments'] === []) {
                throw new RuntimeException('Studio catalog is incomplete.');
            }

            return $catalog;
        } catch (Throwable $error) {
            error_log('[V-Remix] Studio catalog: ' . $error->getMessage());
            return null;
        }
    }
}
