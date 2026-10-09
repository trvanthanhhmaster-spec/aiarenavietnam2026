<?php
declare(strict_types=1);
// Anonymous, invalid planning only: no jobs, uploads, account edits or AI calls.
if (($argv[1] ?? '') !== '--live') exit("Use --live for the production PHP-to-Edge gateway smoke check.\n");
$base = rtrim((string) (getenv('VREMIX_TEST_BASE_URL') ?: 'https://v-remix.vietnamsir.com'), '/');
if (!str_starts_with($base, 'https://')) throw new RuntimeException('Verified HTTPS is required.');
$h = curl_init();
curl_setopt_array($h, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30, CURLOPT_COOKIEFILE => '']);
curl_setopt($h, CURLOPT_URL, $base . '/studio.php');
$html = curl_exec($h);
preg_match('/window.VREMIX_STUDIO = (\{.*?\});/s', (string) $html, $match);
$config = json_decode($match[1] ?? '', true);
if (curl_getinfo($h, CURLINFO_RESPONSE_CODE) !== 200 || empty($config['lookCsrf'])) throw new RuntimeException('Studio CSRF bootstrap failed.');
curl_setopt_array($h, [CURLOPT_URL => $base . '/generation-edge.php', CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => '{"planning":{"invalidOfflineFixture":true}}',
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'X-VRemix-CSRF: ' . $config['lookCsrf']]]);
$raw = curl_exec($h); $code = (int) curl_getinfo($h, CURLINFO_RESPONSE_CODE);
$response = json_decode((string) $raw, true);
if ($code !== 400 || empty($response['error'])) throw new RuntimeException('Invalid planning did not reach Edge validation; HTTP ' . $code . '.');
curl_setopt($h, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_exec($h); $code = (int) curl_getinfo($h, CURLINFO_RESPONSE_CODE); curl_close($h);
if ($code !== 403) throw new RuntimeException('Missing CSRF was not rejected.');
echo "Production gateway: anonymous session/CSRF bootstrap, PHP-to-Edge signed invalid-plan rejection and missing-CSRF denial passed. No job or AI call.\n";
