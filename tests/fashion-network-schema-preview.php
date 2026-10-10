<?php
declare(strict_types=1);
// Generate a disposable SQL test artifact, not a production migration.
if (PHP_SAPI!=='cli') { http_response_code(404); exit; }
$dir=$argv[1]??'';
if (!is_dir($dir)||!str_starts_with(realpath($dir)?:'','/private/tmp/')) throw new RuntimeException('Use an existing private temporary directory');
$root=dirname(__DIR__);
$sql="begin;\n".file_get_contents($root.'/supabase/migrations/20261010150000_fashion_network.sql')."\n".preg_replace('/^begin;$/m','',(string)file_get_contents(__DIR__.'/fashion-network-transaction.sql'));
file_put_contents($dir.'/schema-transaction.sql',$sql);
echo "Migration trial assembled with rollback.\n";
