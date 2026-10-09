<?php
declare(strict_types=1);
namespace App\Support;

/** Curated, claim-scoped facts. No model-generated history or silent selection changes. */
final class StudioIntelligence
{
    public static function knowledge(): array
    {
        static $data;
        return $data ??= json_decode((string) file_get_contents(dirname(__DIR__, 2) . '/supabase/functions/_shared/studio-knowledge.json'), true, 64, JSON_THROW_ON_ERROR);
    }

    public static function publicData(array $catalog): array
    {
        $data = self::knowledge();
        $data['lookbooks'] = array_values(array_filter($data['lookbooks'], static fn ($row) => self::find($catalog['garments'] ?? [], $row['garment']) !== null));
        foreach ($data['lookbooks'] as &$row) {
            $garment = self::find($catalog['garments'], $row['garment']);
            $outfit = ['garment' => $row['garment'], 'garmentVariant' => '', 'color' => '', 'pattern' => '', 'style' => '', 'scene' => '', 'accessories' => [], 'accessoryVariants' => []];
            $variant = self::find($catalog['garmentVariants'] ?? [], $row['outfit']['garmentVariant'] ?? '');
            if ($variant && $variant['garment_id'] === $garment['id']) $outfit['garmentVariant'] = $variant['slug'];
            foreach (['color' => 'colors', 'style' => 'styles'] as $key => $collection) {
                if (self::find($catalog[$collection] ?? [], $row['outfit'][$key] ?? '')) $outfit[$key] = $row['outfit'][$key];
            }
            $row['outfit'] = $outfit;
            $row['heritage'] = $data['heritage'][$row['garment']] ?? null;
        }
        unset($row);
        return $data;
    }

    public static function enrichCatalog(array $catalog): array
    {
        foreach ($catalog['garments'] ?? [] as $index => $garment) {
            $profile = self::knowledge()['heritage'][$garment['slug']] ?? null;
            if ($profile) {
                $catalog['garments'][$index]['origin_note'] = $profile['origin'];
                $catalog['garments'][$index]['significance_note'] = $profile['meaning'];
            }
        }
        return $catalog;
    }

    public static function find(array $rows, string $slug): ?array
    {
        foreach ($rows as $row) if (($row['slug'] ?? '') === $slug) return $row;
        return null;
    }

    public static function festivals(string $city, string $start, string $end): array
    {
        return array_values(array_filter(self::knowledge()['festivals'], static fn ($row) => ($row['city'] === 'all' || $row['city'] === $city) && $row['start'] <= $end && $row['end'] >= $start));
    }

    /** A rule warning is not a universal cultural verdict; remix is a legitimate intent. */
    public static function guards(array $selection, string $intent = 'remix'): array
    {
        $findings = [];
        $heritage = self::knowledge()['heritage'];
        foreach ($selection['planning']['people'] ?? [] as $person) {
            $outfit = $person['outfit']; $slug = $outfit['garment'];
            if (!isset($heritage[$slug])) continue;
            $modern = array_values(array_intersect($outfit['accessories'], ['sneaker-trang', 'tui-tote', 'dong-ho-thong-minh', 'kinh-ram']));
            if (in_array($outfit['style'], ['streetwear', 'street-soft', 'school-polished'], true)) $modern[] = $outfit['style'];
            if ($modern) $findings[] = ['personId' => $person['id'], 'code' => 'modern-remix', 'severity' => $intent === 'historical' ? 'warning' : 'info',
                'message' => $intent === 'historical' ? 'Phụ kiện/phong cách hiện đại không phù hợp với tuyên bố phục dựng lịch sử. Hãy đổi mục đích sang Remix hoặc đối chiếu và bỏ chi tiết hiện đại.' : 'Đây là bản phối hiện đại có yếu tố Việt phục, không phải phục dựng lịch sử. Không tự động coi sneaker/tote là sai văn hóa.',
                'sources' => $heritage[$slug]['sources']];
            if ($slug === 'ao-nhat-binh') $findings[] = ['personId' => $person['id'], 'code' => 'rank-not-verified', 'severity' => 'info',
                'message' => 'Không gán phẩm cấp cung đình từ màu áo của bản phối hiện đại; muốn phục dựng cần thêm tư liệu về phẩm cấp và thời kỳ.', 'sources' => $heritage[$slug]['sources']];
            $findings[] = ['personId' => $person['id'], 'code' => 'preserve-construction', 'severity' => 'info',
                'message' => $heritage[$slug]['structure'] . ' Kiểm tra lựa chọn không thay thế đối chiếu ảnh tạo ra.', 'sources' => $heritage[$slug]['sources']];
        }
        return $findings;
    }

    /** Identity/body/face data never leave this endpoint for advice. */
    public static function safeSelection(array $selection): array
    {
        $plan = $selection['planning'] ?? [];
        return ['event' => $selection['event'], 'count' => $plan['count'] ?? null, 'shared' => $plan['shared'] ?? true,
            'period' => $plan['period'] ?? null, 'people' => array_map(static fn ($p) => ['personId' => $p['id'], 'outfit' => $p['outfit']], $plan['people'] ?? [])];
    }

    public static function trustedContext(array $input, array $session): ?array
    {
        $saved = $session['studio_advice_context'] ?? [];
        if (empty($saved['id']) || ($saved['id'] ?? '') !== ($input['adviceContextId'] ?? '') || ($saved['expires'] ?? 0) <= time()
            || ($saved['context']['period'] ?? null) !== ($input['planning']['period'] ?? null)) return null;
        return $saved['context']; // No raw coordinates, names, face references or arbitrary client text.
    }

    public static function recommend(array $selection, array $catalog, ?array $context, string $intent): array
    {
        $books = self::publicData($catalog)['lookbooks'];
        $people = $selection['planning']['people'] ?? [];
        $active = $selection['planning']['activePerson'] ?? 1;
        $garment = $people[$active - 1]['outfit']['garment'] ?? '';
        foreach ($books as &$book) {
            $book['reasons'] = []; $book['score'] = 0;
            if ($book['event'] === $selection['event']) { $book['score'] += 4; $book['reasons'][] = 'Phù hợp dịp bạn đã chọn.'; }
            if ($book['garment'] === $garment) { $book['score'] += 3; $book['reasons'][] = 'Giữ dáng áo của người đang chỉnh.'; }
            if (($context['forecast']['temperatureMax'] ?? 0) >= 30 && $book['garment'] === 'ao-ngu-than-tay-chen') { $book['score']++; $book['reasons'][] = 'Trời nóng: ưu tiên phom gọn; hỏi chất liệu thoáng ở nơi mua/thuê.'; }
            if (count($people) > 1) $book['reasons'][] = 'Có thể dùng làm gợi ý đồng điệu; không tự thay trang phục của cả nhóm.';
            if (!$book['reasons']) $book['reasons'][] = 'Một hướng phối khác từ thư viện biên tập.';
        }
        unset($book);
        usort($books, static fn ($a, $b) => $b['score'] <=> $a['score']);
        $tips = [];
        if ($context['forecast']['rainProbability'] ?? 0) $tips[] = ($context['forecast']['rainProbability'] >= 60) ? 'Có khả năng mưa: cân nhắc không gian có mái che và bảo vệ vạt áo. Không tự thêm ô vào ảnh.' : 'Có khả năng mưa; kiểm tra lại dự báo gần ngày mặc.';
        return ['source' => 'curated-rules', 'recommendations' => array_slice($books, 0, 3), 'tips' => $tips,
            'guards' => self::guards($selection, $intent), 'context' => $context];
    }
}
