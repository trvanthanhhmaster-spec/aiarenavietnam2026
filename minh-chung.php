<?php
declare(strict_types=1);
// Existing shared links open the example inside Studio.
header('Cache-Control: no-store');
header('Location: studio.php#studioExample', true, 302);
exit;
