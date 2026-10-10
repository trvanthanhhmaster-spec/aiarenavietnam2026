<?php
declare(strict_types=1);
namespace App\Support;

use InvalidArgumentException;

/** One validated commerce contract. It is not historical knowledge or an AI prompt. */
final class FashionNetwork
{
    public static function uuid(string $value): string
    {
        if (!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iD', $value)) throw new InvalidArgumentException('Mã bản ghi không hợp lệ.');
        return strtolower($value);
    }
    public static function newId(): string
    {
        $hex = bin2hex(random_bytes(16));
        return substr($hex,0,8).'-'.substr($hex,8,4).'-4'.substr($hex,13,3).'-8'.substr($hex,17,3).'-'.substr($hex,20);
    }
    public static function text(array $data, string $key, int $max, int $min = 0): string
    {
        if (!is_string($data[$key] ?? '')) throw new InvalidArgumentException('Thông tin '.$key.' không hợp lệ.');
        $value = trim($data[$key] ?? '');
        if (mb_strlen($value) < $min || mb_strlen($value) > $max || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/', $value)) throw new InvalidArgumentException('Kiểm tra độ dài thông tin '.$key.'.');
        return $value;
    }
    public static function url(string $value, bool $optional = false): string
    {
        if ($optional && $value === '') return '';
        $parts = parse_url($value);
        $host = strtolower((string) ($parts['host'] ?? ''));
        if (strlen($value)>2048 || !filter_var($value,FILTER_VALIDATE_URL) || ($parts['scheme'] ?? '') !== 'https' || isset($parts['user']) || isset($parts['pass']) || (isset($parts['port']) && $parts['port']!==443) || filter_var($host,FILTER_VALIDATE_IP) || !str_contains($host,'.') || preg_match('/\.(local|localhost|internal|test)$/D',$host)) throw new InvalidArgumentException('Cần liên kết HTTPS công khai, không chứa tài khoản hay địa chỉ nội bộ.');
        return $value;
    }
    public static function shop(array $data): array
    {
        return [
            'name'=>self::text($data,'name',120,2), 'description'=>self::text($data,'description',2000),
            'province'=>self::text($data,'province',120,2), 'address'=>self::text($data,'address',300),
            'contact_url'=>self::url(self::text($data,'contact_url',2048,1)),
            'website_url'=>self::url(self::text($data,'website_url',2048),true),
        ];
    }
    private static function money(array $data, string $key): ?int
    {
        $value = self::text($data,$key,12);
        if ($value==='') return null;
        if (!ctype_digit($value) || (int)$value>100000000000) throw new InvalidArgumentException('Giá/tiền cọc cần là số VND không âm, không có dấu phân cách.');
        return (int)$value;
    }
    public static function product(array $data): array
    {
        if (($data['display_consent'] ?? '') !== 'yes') throw new InvalidArgumentException('Cần xác nhận quyền công bố ảnh trước khi gửi mẫu.');
        $result = ['garment_id'=>self::uuid(self::text($data,'garment_id',36,36))];
        foreach (['name'=>160,'description'=>3000,'variant_name'=>120,'color'=>120,'material'=>200,'pattern'=>500,'sizes'=>200,'included_accessories'=>500,'permission_evidence'=>1500] as $field=>$max) $result[$field] = self::text($data,$field,$max,in_array($field,['name','variant_name'],true)?2:($field==='permission_evidence'?5:0));
        $result['image_url'] = self::url(self::text($data,'image_url',2048,1));
        $result['source_url'] = self::url(self::text($data,'source_url',2048,1));
        $result['ai_permission'] = ($data['ai_consent'] ?? '') === 'yes' ? 'requested' : 'not_granted';
        $result['offers'] = [];
        foreach (['buy','rent','made_to_order'] as $kind) {
            if (($data[$kind.'_enabled'] ?? '') !== 'yes') continue;
            $result['offers'][] = ['kind'=>$kind,'price_vnd'=>self::money($data,$kind.'_price'),
                'deposit_vnd'=>$kind==='rent'?self::money($data,'rent_deposit'):null,
                'unit'=>self::text($data,$kind.'_unit',80,1),'terms'=>self::text($data,$kind.'_terms',1500)];
        }
        if (!$result['offers']) throw new InvalidArgumentException('Chọn ít nhất một dịch vụ mua, thuê hoặc đặt may. Có thể để trống giá nếu cần liên hệ.');
        return $result;
    }
    public static function price(?array $offer): string
    {
        if (!$offer || $offer['price_vnd'] === null) return 'Liên hệ để hỏi giá';
        return number_format((float)$offer['price_vnd'],0,',','.').' đ / '.$offer['unit'];
    }
    public static function revision(mixed $value): int
    {
        if (!is_scalar($value) || !preg_match('/^\d{1,12}$/D',(string)$value)) throw new InvalidArgumentException('Phiên bản không hợp lệ.');
        return (int)$value;
    }
}
