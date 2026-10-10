<?php
declare(strict_types=1);
// Loopback-only QA server. Never exposes sessions or calls the network repository.
if (PHP_SAPI!=='cli-server'||!in_array($_SERVER['REMOTE_ADDR']??'',['127.0.0.1','::1'],true)) { http_response_code(404); exit; }
$path=parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH);
if (preg_match('#^/(empty|error|directory|detail|merchant|review)\.html$#D',(string)$path)) {
    $dir=(string)getenv('VREMIX_NETWORK_QA_DIR');
    if (!str_starts_with(realpath($dir)?:'','/private/tmp/')) { http_response_code(404); exit; }
    header('Content-Type: text/html; charset=utf-8'); readfile($dir.$path); return true;
}
if (str_starts_with((string)$path,'/assets/')) return false;
http_response_code(404); return true;
