<?php
declare(strict_types=1);

return [
    'url' => rtrim((string) getenv('SUPABASE_URL'), '/'),
    'anon_key' => (string) getenv('SUPABASE_ANON_KEY'),
    'cache_ttl' => max(0, (int) (getenv('SUPABASE_CACHE_TTL') ?: 300)),
    'cache_file' => __DIR__ . '/../storage/cache/site-content.json',
];
