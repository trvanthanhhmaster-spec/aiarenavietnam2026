<?php
declare(strict_types=1);
// Existing shared links open garment information in the Studio workspace.
header('Cache-Control: no-store');
header('Location: studio.php#workspaceInsights', true, 302);
exit;
