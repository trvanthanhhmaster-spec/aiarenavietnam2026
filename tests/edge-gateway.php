<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/Support/EdgeGateway.php';
use App\Support\EdgeGateway;
$headers = EdgeGateway::headers(str_repeat('fixture-', 8), 'POST', '', 'owner-fixture', 'user-fixture', '{"planning":true}', 1800000000);
if ($headers !== ['x-vremix-timestamp: 1800000000', 'x-vremix-signature: 04a00e512820c0f157c6ebf7a2c3459bc9b985d0a15663ecb8b9db0ddb671c83']) throw new RuntimeException('Cross-language signature fixture mismatch.');
foreach ([['GET', '', null], ['POST', '?jobId=fixture', '{"planning":true}']] as [$method, $query, $body]) {
    if (EdgeGateway::headers(str_repeat('fixture-', 8), $method, $query, 'owner-fixture', 'user-fixture', $body, 1800000000) === $headers) throw new RuntimeException('Request fields must be signed.');
}
try { EdgeGateway::headers('', 'GET', '', 'owner', null, null); throw new LogicException('Missing secret accepted.'); }
catch (RuntimeException) {}
echo "Edge gateway: fixed signature, request binding and missing-key rejection passed offline.\n";
