<?php
declare(strict_types=1);

namespace App\Infrastructure;

use RuntimeException;

final class SupabaseAdminClient
{
    public function __construct(
        private string $url,
        private string $serviceRoleKey,
        private int $timeoutSeconds = 12
    ) {
        if ($this->url === '' || $this->serviceRoleKey === '') {
            throw new RuntimeException('Supabase admin configuration is incomplete.');
        }
    }

    /**
     * @param array<string, string> $query
     * @return array<int, array<string, mixed>>
     */
    public function select(string $table, array $query): array
    {
        return $this->request('GET', $table, $query);
    }

    /**
     * @param array<string, mixed> $record
     * @return array<int, array<string, mixed>>
     */
    public function insert(string $table, array $record): array
    {
        return $this->request('POST', $table, [], $record, 'return=representation');
    }

    /**
     * @param array<string, string> $filters
     * @param array<string, mixed> $record
     * @return array<int, array<string, mixed>>
     */
    public function update(string $table, array $filters, array $record): array
    {
        return $this->request('PATCH', $table, $filters, $record, 'return=representation');
    }

    /**
     * @param array<string, string> $filters
     */
    public function delete(string $table, array $filters): void
    {
        $this->request('DELETE', $table, $filters, null, 'return=minimal');
    }

    /**
     * @param array<string, string> $query
     * @param array<string, mixed>|null $body
     * @return array<int, array<string, mixed>>
     */
    private function request(
        string $method,
        string $table,
        array $query,
        ?array $body = null,
        string $prefer = ''
    ): array {
        $endpoint = $this->url . '/rest/v1/' . rawurlencode($table);
        if ($query !== []) {
            $endpoint .= '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
        }

        $handle = curl_init($endpoint);
        if ($handle === false) {
            throw new RuntimeException('Unable to initialize the Supabase admin request.');
        }

        $headers = [
            'apikey: ' . $this->serviceRoleKey,
            'Authorization: Bearer ' . $this->serviceRoleKey,
            'Accept: application/json',
            'Content-Type: application/json',
        ];
        if ($prefer !== '') {
            $headers[] = 'Prefer: ' . $prefer;
        }

        curl_setopt_array($handle, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
        ]);
        if ($body !== null) {
            curl_setopt($handle, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
        }

        $responseBody = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $error = curl_error($handle);

        if ($responseBody === false || $error !== '') {
            throw new RuntimeException('Supabase admin request failed: ' . $error);
        }
        if ($status < 200 || $status >= 300) {
            $message = 'Supabase returned HTTP ' . $status . '.';
            try {
                $decodedError = json_decode($responseBody, true, 512, JSON_THROW_ON_ERROR);
                if (is_array($decodedError) && !empty($decodedError['message'])) {
                    $message .= ' ' . (string) $decodedError['message'];
                }
            } catch (\Throwable) {
                // Keep the status-only error when PostgREST does not return JSON.
            }
            throw new RuntimeException($message);
        }
        if ($responseBody === '' || $status === 204) {
            return [];
        }

        $decoded = json_decode($responseBody, true, 512, JSON_THROW_ON_ERROR);
        return is_array($decoded) ? $decoded : [];
    }
}
