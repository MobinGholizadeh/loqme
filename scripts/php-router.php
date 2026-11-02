<?php
// Development only. Shared hosting uses Apache/LiteSpeed directly.
declare(strict_types=1);
$root = realpath(__DIR__ . '/../dist');
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if (str_contains($path, '/.') || str_contains($path, '/_lib/') || str_contains($path, '..')) {
    http_response_code(404);
    exit;
}
$routes = ['/api/store' => 'api/store.php', '/api/health' => 'api/health.php'];
if (isset($routes[$path])) {
    require $root . '/' . $routes[$path];
    exit;
}
if ($path === '/order' || $path === '/order/') {
    header('Content-Type: text/html; charset=utf-8');
    readfile($root . '/order.html');
    exit;
}
return false;
