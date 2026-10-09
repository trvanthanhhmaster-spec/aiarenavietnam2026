<?php
declare(strict_types=1);
namespace App\Support;

final class EdgeGateway
{
    /** Bind method, query, caller identity and exact body to a short-lived signature. */
    public static function headers(string $secret, string $method, string $query, string $owner, ?string $user, ?string $body, ?int $timestamp = null, string $function = 'generate-look'): array
    {
        if (strlen($secret) < 32) throw new \RuntimeException('Edge gateway chưa được kết nối.');
        $stamp = (string) ($timestamp ?? time());
        if (!in_array($function, ['generate-look', 'studio-advisor'], true)) throw new \InvalidArgumentException('Unknown function.');
        $canonical = implode("\n", ['v1', $stamp, $method, '/' . $function . $query, $owner, $user ?? '', hash('sha256', $body ?? '')]);
        return [
            'x-vremix-timestamp: ' . $stamp,
            'x-vremix-signature: ' . hash_hmac('sha256', $canonical, $secret),
        ];
    }
}
