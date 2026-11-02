<?php
declare(strict_types=1);
define('VOIDFRAME_API', true);
require __DIR__ . '/_lib/bootstrap.php';

try {
    readStore();
    jsonResponse(['status' => 'ok', 'service' => 'void-frame', 'runtime' => 'php']);
} catch (Throwable $error) {
    handleError($error);
}
