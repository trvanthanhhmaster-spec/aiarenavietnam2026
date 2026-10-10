<?php
declare(strict_types=1);
require __DIR__.'/fashion-network-preview.php';
foreach (['empty','error','directory','detail','merchant','review'] as $state) {
    $html=networkPreview($state);
    if (!str_contains($html,'fashion-network.css')||!str_contains($html,'name="robots" content="noindex,follow"')) throw new RuntimeException('Metadata / styling missing');
    if (str_contains($html,'<script>bad()</script>')) throw new RuntimeException('Unescaped merchant text');
    if ($state==='detail'&&!str_contains($html,'Liên hệ để hỏi giá')) throw new RuntimeException('Unknown price');
    if ($state==='merchant'&&(!str_contains($html,'name="csrf"')||!str_contains($html,'name="revision"')||str_contains($html,'name="ai_consent" value="yes" checked'))) throw new RuntimeException('Consent/CSRF/revision');
}
echo "Network view states, escaping, private metadata and explicit consent passed.\n";
