<?php
declare(strict_types=1);

namespace App\Infrastructure;

use RuntimeException;

final class SupabaseClient
{
    public function __construct(
        private string $url,
        private string $anonKey,
        private int $timeoutSeconds = 8
    ) {
        if ($this->url === '' || $this->anonKey === '') {
            throw new RuntimeException('Supabase URL and anon key are required.');
        }
    }

    /**
     * @param array<string, string> $query
     * @return array<int, array<string, mixed>>
     */
    public function select(string $table, array $query): array
    {
        $endpoint = $this->url . '/rest/v1/' . rawurlencode($table) . '?' . http_build_query($query);
        $handle = curl_init($endpoint);

        if ($handle === false) {
            throw new RuntimeException('Unable to initialize the Supabase request.');
        }

        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'apikey: ' . $this->anonKey,
                'Authorization: Bearer ' . $this->anonKey,
                'Accept: application/json',
            ],
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
        ]);

        $body = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $error = curl_error($handle);
        curl_close($handle);

        if ($body === false || $error !== '') {
            throw new RuntimeException('Supabase request failed: ' . $error);
        }

        if ($status < 200 || $status >= 300) {
            throw new RuntimeException('Supabase returned HTTP ' . $status . '.');
        }

        $decoded = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($decoded)) {
            throw new RuntimeException('Supabase returned an invalid response.');
        }

        return $decoded;
    }
}
