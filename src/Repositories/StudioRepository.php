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
     * @return array<string, mixed>|null
     */
    public function getCatalog(): ?array
    {
        try {
            $events = $this->client->select('studio_events', [
                'select' => 'slug,label,description,cultural_context,preset',
                'is_active' => 'eq.true',
                'order' => 'sort_order.asc',
            ]);
            $garments = $this->client->select('studio_garments', [
                'select' => 'id,slug,name,category,description,origin_note,significance_note,image_url,thumbnail_url,prompt_descriptor,negative_descriptor,allowed_contexts,default_colors,source_id',
                'is_active' => 'eq.true',
                'order' => 'sort_order.asc',
            ]);
            $accessories = $this->client->select('studio_accessories', [
                'select' => 'id,slug,name,category,description,image_url,thumbnail_url,prompt_descriptor,compatibility',
                'is_active' => 'eq.true',
                'order' => 'sort_order.asc',
            ]);
            try {
                $garmentVariants = $this->client->select('studio_garment_variants', [
                    'select' => 'id,garment_id,slug,name,description,silhouette,material,pattern_notes,color_palette,image_url,thumbnail_url,prompt_descriptor,negative_descriptor,source_id,source_url,source_provider,sort_order',
                    'review_status' => 'eq.published',
                    'is_active' => 'eq.true',
                    'order' => 'sort_order.asc',
                ]);
                $accessoryVariants = $this->client->select('studio_accessory_variants', [
                    'select' => 'id,accessory_id,slug,name,description,material,color_palette,image_url,thumbnail_url,prompt_descriptor,source_id,source_url,source_provider,sort_order',
                    'review_status' => 'eq.published',
                    'is_active' => 'eq.true',
                    'order' => 'sort_order.asc',
                ]);
            } catch (Throwable) {
                // Keep Studio available while an older database is awaiting the
                // catalog-variant migration.
                $garmentVariants = [];
                $accessoryVariants = [];
            }
            $options = $this->client->select('studio_options', [
                'select' => 'option_type,slug,label,value,prompt_hint,description,thumbnail_url,source_url',
                'is_active' => 'eq.true',
                'order' => 'sort_order.asc',
            ]);
            try {
                $generationRows = $this->client->select('studio_generation_settings', [
                    'select' => 'canvas_aspect_ratio,target_resolution,default_generation_mode,default_output_type,base_prompt,frame_plan',
                    'id' => 'eq.1',
                    'limit' => '1',
                ]);
            } catch (Throwable) {
                $generationRows = $this->client->select('studio_generation_settings', [
                    'select' => 'canvas_aspect_ratio,target_resolution,default_generation_mode,base_prompt,frame_plan',
                    'id' => 'eq.1',
                    'limit' => '1',
                ]);
                if (isset($generationRows[0])) {
                    $generationRows[0]['default_output_type'] = 'image';
                }
            }
            $sources = $this->client->select('cultural_sources', [
                'select' => 'id,title,source_url,license,curator_note,review_status',
                'review_status' => 'eq.published',
                'order' => 'updated_at.desc',
            ]);
            $rules = $this->client->select('cultural_rules', [
                'select' => 'id,garment_id,rule_text,severity,context',
                'is_active' => 'eq.true',
                'review_status' => 'eq.approved',
                'order' => 'created_at.asc',
            ]);
            // These tables are optional while older Supabase projects are being
            // migrated. A missing recommendation table must not take Studio down.
            try {
                $listings = $this->client->select('studio_marketplace_listings', [
                    'select' => 'id,item_type,garment_id,accessory_id,provider_name,listing_type,title,address,province,price_from_vnd,price_to_vnd,external_url,source_url,verified_at',
                    'is_active' => 'eq.true',
                    'order' => 'sort_order.asc',
                ]);
            } catch (Throwable) {
                $listings = [];
            }
            try {
                $locations = $this->client->select('studio_locations', [
                    'select' => 'id,slug,name,address,province,latitude,longitude,map_url,booking_url,description,image_url,suitable_contexts,source_url',
                    'is_active' => 'eq.true',
                    'order' => 'sort_order.asc',
                ]);
            } catch (Throwable) {
                $locations = [];
            }

            $catalog = [
                'events' => $events,
                'garments' => $garments,
                'garmentVariants' => $garmentVariants,
                'accessories' => $accessories,
                'accessoryVariants' => $accessoryVariants,
                'colors' => [],
                'styles' => [],
                'patterns' => [],
                'scenes' => [],
                'sources' => $sources,
                'rules' => $rules,
                'listings' => $listings,
                'locations' => $locations,
                'generation' => $generationRows[0] ?? [
                    'canvas_aspect_ratio' => '16:9',
                    'target_resolution' => '1080',
                    'default_generation_mode' => 'text-to-image',
                    'default_output_type' => 'image',
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
                } elseif ($type === 'pattern') {
                    $catalog['patterns'][] = $option;
                } elseif ($type === 'scene') {
                    $catalog['scenes'][] = $option;
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
