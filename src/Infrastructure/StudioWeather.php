<?php
declare(strict_types=1);
namespace App\Infrastructure;
use App\Support\StudioIntelligence;
use InvalidArgumentException;

final class StudioWeather
{
    public static function location(array $input): array
    {
        $cities = StudioIntelligence::knowledge()['cities'];
        if (isset($input['city'])) {
            foreach ($cities as $city) if ($city['id'] === $input['city']) return $city;
            throw new InvalidArgumentException('Chọn khu vực trong danh sách.');
        }
        if (($input['locationConsent'] ?? false) !== true || !is_numeric($input['latitude'] ?? null) || !is_numeric($input['longitude'] ?? null)) throw new InvalidArgumentException('Cần đồng ý trước khi nhận diện khu vực.');
        $lat = round((float) $input['latitude'], 1); $lon = round((float) $input['longitude'], 1);
        if (!is_finite($lat) || !is_finite($lon) || $lat < 8 || $lat > 24 || $lon < 102 || $lon > 110) throw new InvalidArgumentException('Hiện hỗ trợ khu vực Việt Nam.');
        $best = null; $distance = INF;
        foreach ($cities as $city) { $d = hypot($lat - $city['latitude'], ($lon - $city['longitude']) * cos(deg2rad($lat))); if ($d < $distance) { $distance = $d; $best = $city; } }
        // Do not attribute a remote district to a city/festival it is not near.
        return ['id' => $distance <= 0.35 ? $best['id'] : 'approximate', 'name' => $distance <= 0.35 ? 'Gần ' . $best['name'] : 'Khu vực gần bạn', 'latitude' => $lat, 'longitude' => $lon];
    }

    public static function normalize(array $body, ?array $period, ?string $today = null): array
    {
        $today ??= (new \DateTimeImmutable('now', new \DateTimeZone('Asia/Ho_Chi_Minh')))->format('Y-m-d');
        $start = $period['start'] ?? ''; $end = ($period['end'] ?? '') ?: $start;
        $days = $body['daily'] ?? []; $dates = $days['time'] ?? [];
        $matched = []; $temperatures = []; $rain = [];
        foreach ($dates as $i => $date) if ($start !== '' && $date >= $start && $date <= $end && $date >= $today) {
            if (!is_numeric($days['temperature_2m_max'][$i] ?? null) || !is_numeric($days['precipitation_probability_max'][$i] ?? null)) continue;
            $matched[] = $date; $temperatures[] = (float) $days['temperature_2m_max'][$i]; $rain[] = (float) $days['precipitation_probability_max'][$i];
        }
        $current = $body['current'] ?? [];
        return ['current' => is_numeric($current['temperature_2m'] ?? null) ? ['temperature' => (float) $current['temperature_2m'], 'code' => (int) ($current['weather_code'] ?? 0), 'time' => (string) ($current['time'] ?? '')] : null,
            'forecast' => $matched ? ['start' => $matched[0], 'end' => end($matched), 'temperatureMax' => max($temperatures), 'rainProbability' => max($rain), 'coverage' => $matched[0] === $start && end($matched) === $end ? 'full' : 'partial'] : null,
            'scopeNote' => !$start ? 'Chưa chọn ngày mặc: chỉ hiển thị thời tiết hiện tại.' : ($matched ? 'Dự báo chỉ áp dụng cho khoảng ngày hiển thị, không phải cam kết thời tiết.' : 'Ngày mặc chưa có trong dự báo; không dùng thời tiết hôm nay làm dự báo cho ngày đó.'),
            'period' => $period, 'provider' => 'Open-Meteo', 'source' => 'https://open-meteo.com/', 'fetchedAt' => gmdate(DATE_ATOM)];
    }

    public static function fetch(array $location, ?array $period, ?array $cached = null): array
    {
        $key = $location['latitude'] . ',' . $location['longitude'];
        if ($cached && $cached['key'] === $key && $cached['expires'] > time()) $body = $cached['body'];
        else {
            $query = http_build_query(['latitude' => $location['latitude'], 'longitude' => $location['longitude'], 'current' => 'temperature_2m,weather_code', 'daily' => 'temperature_2m_max,precipitation_probability_max', 'timezone' => 'Asia/Ho_Chi_Minh', 'forecast_days' => 16]);
            $handle = curl_init('https://api.open-meteo.com/v1/forecast?' . $query);
            curl_setopt_array($handle, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_TIMEOUT => 8, CURLOPT_FOLLOWLOCATION => false]);
            $raw = curl_exec($handle); $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE); curl_close($handle);
            if ($status !== 200 || !is_string($raw) || strlen($raw) > 100000) throw new \RuntimeException('Chưa lấy được thời tiết. Các bước phối đồ vẫn hoạt động; bạn có thể thử lại.');
            $body = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
            if (!is_array($body['daily']['time'] ?? null) || !is_numeric($body['current']['temperature_2m'] ?? null)) throw new \RuntimeException('Dữ liệu thời tiết chưa đầy đủ.');
            $cached = ['key' => $key, 'body' => $body, 'expires' => time() + 300, 'fetchedAt' => gmdate(DATE_ATOM)];
        }
        $context = self::normalize($body, $period);
        $context['fetchedAt'] = $cached['fetchedAt'] ?? $context['fetchedAt'];
        $context['city'] = $location['id']; $context['label'] = $location['name'];
        $start = ($period['start'] ?? '') ?: (new \DateTimeImmutable('now', new \DateTimeZone('Asia/Ho_Chi_Minh')))->format('Y-m-d');
        $end = ($period['end'] ?? '') ?: $start;
        $context['festivals'] = StudioIntelligence::festivals($location['id'], $start, $end);
        $context['festivalCoverage'] = 'Lịch biên tập hiện gồm Tết và Festival Huế 2026. Chưa có mục không có nghĩa là địa phương không có lễ hội. Mùa Festival không đồng nghĩa có sự kiện diễn ra mỗi ngày.';
        return ['context' => $context, 'cache' => $cached];
    }
}
