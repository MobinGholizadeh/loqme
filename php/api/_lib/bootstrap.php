<?php
declare(strict_types=1);

// This library is included only by the public API entry points.
if (!defined('VOIDFRAME_API')) {
    http_response_code(404);
    exit;
}

ini_set('display_errors', '0');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Referrer-Policy: same-origin');

final class ApiError extends RuntimeException
{
    public function __construct(string $message, public readonly int $status = 400)
    {
        parent::__construct($message);
    }
}

function config(): array
{
    static $config;
    if ($config !== null) {
        return $config;
    }
    $webRoot = realpath(dirname(__DIR__, 2));
    $configFile = getenv('VOIDFRAME_CONFIG') ?: dirname($webRoot) . '/voidframe-config.php';
    $saved = is_file($configFile) ? require $configFile : [];
    if (!is_array($saved)) {
        throw new RuntimeException('Invalid private configuration.');
    }
    $config = [
        'data_dir' => getenv('DATA_DIR') ?: ($saved['data_dir'] ?? dirname($webRoot) . '/voidframe-data'),
        'admin_password_hash' => getenv('ADMIN_PASSWORD_HASH') ?: ($saved['admin_password_hash'] ?? ''),
        'session_secret' => getenv('ADMIN_SESSION_SECRET') ?: ($saved['session_secret'] ?? ''),
        'secure_cookies' => getenv('ALLOW_INSECURE_COOKIES') !== '1' && ($saved['secure_cookies'] ?? true),
    ];
    // Never place paid downloads or private order tokens in a publicly served directory.
    $path = $config['data_dir'];
    if (!is_dir($path) && !mkdir($path, 0700, true) && !is_dir($path)) {
        throw new RuntimeException('Cannot create the private storage directory.');
    }
    $real = realpath($path);
    if ($real === false || $real === $webRoot || str_starts_with($real, $webRoot . DIRECTORY_SEPARATOR)) {
        throw new RuntimeException('DATA_DIR must be outside the public document root.');
    }
    $config['data_dir'] = $real;
    return $config;
}

function jsonResponse(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
    exit;
}

function uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
}

function nowMs(): int
{
    return (int) floor(microtime(true) * 1000);
}

function validKey(mixed $value): bool
{
    return is_string($value) && preg_match('/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/D', $value) === 1;
}

function storagePath(string $kind, string $key): string
{
    if (!in_array($kind, ['preview', 'download'], true) || !validKey($key)) {
        throw new ApiError('Invalid file.');
    }
    return config()['data_dir'] . '/' . $kind . '/' . $key;
}

/** Lock a separate inode so atomic renames cannot bypass the read/modify/write lock. */
function withStore(callable $callback, bool $write = false): mixed
{
    $dir = config()['data_dir'];
    $lock = fopen($dir . '/store.lock', 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        throw new RuntimeException('Cannot lock store.');
    }
    try {
        $file = $dir . '/store.json';
        $exists = is_file($file);
        $store = $exists ? json_decode((string) file_get_contents($file), true, 512, JSON_THROW_ON_ERROR)
            : ['settings' => ['wallet' => ''], 'products' => [], 'orders' => []];
        if (!is_array($store) || !isset($store['settings'], $store['products'], $store['orders'])) {
            throw new RuntimeException('Invalid store; restore a backup instead of overwriting it.');
        }
        $result = $callback($store);
        if ($write || !$exists) {
            $tmp = $dir . '/store.' . bin2hex(random_bytes(8)) . '.tmp';
            $bytes = json_encode($store, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            try {
                if (file_put_contents($tmp, $bytes, LOCK_EX) !== strlen($bytes)) {
                    throw new RuntimeException('Cannot write store.');
                }
                chmod($tmp, 0600);
                if (!rename($tmp, $file)) {
                    throw new RuntimeException('Cannot replace store.');
                }
            } finally {
                if (is_file($tmp)) {
                    unlink($tmp);
                }
            }
        }
        return $result;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function readStore(): array
{
    return withStore(static fn(array $store): array => $store);
}

function configured(): bool
{
    $c = config();
    return strlen($c['session_secret']) >= 32 && (password_get_info($c['admin_password_hash'])['algoName'] ?? 'unknown') !== 'unknown';
}

function signature(string $value): string
{
    $secret = config()['session_secret'];
    if (strlen($secret) < 32) {
        throw new ApiError('The creator must finish the private hosting configuration.', 503);
    }
    return rtrim(strtr(base64_encode(hash_hmac('sha256', $value, $secret, true)), '+/', '-_'), '=');
}

function isAdmin(): bool
{
    $value = $_COOKIE['vf_admin'] ?? '';
    if (!is_string($value) || !preg_match('/^(\d{13})\.([A-Za-z0-9_-]{43})$/D', $value, $parts)) {
        return false;
    }
    return configured() && (int) $parts[1] > nowMs() && hash_equals(signature($parts[1]), $parts[2]);
}

function adminCookie(bool $clear = false): void
{
    $expires = time() + 60 * 60 * 24 * 14;
    $value = (string) ($expires * 1000);
    setcookie('vf_admin', $clear ? '' : $value . '.' . signature($value), [
        'expires' => $clear ? 1 : $expires,
        'path' => '/',
        'secure' => config()['secure_cookies'],
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

function requireAdmin(): void
{
    if (!isAdmin()) {
        throw new ApiError('Owner access required.', 403);
    }
}

function checkOrigin(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return; // Non-browser clients still need the owner cookie or an order token.
    }
    $parts = parse_url($origin);
    $host = is_array($parts) ? ($parts['host'] ?? '') . (isset($parts['port']) ? ':' . $parts['port'] : '') : '';
    if (!in_array($parts['scheme'] ?? '', ['https', 'http'], true)
        || strtolower($host) !== strtolower($_SERVER['HTTP_HOST'] ?? '')) {
        throw new ApiError('Invalid request origin.', 403);
    }
}

function jsonBody(): array
{
    if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
        throw new ApiError('Send JSON for this action.', 415);
    }
    $raw = file_get_contents('php://input', false, null, 0, 1024 * 1024 + 1);
    if ($raw === false || strlen($raw) > 1024 * 1024) {
        throw new ApiError('Request is too large.', 413);
    }
    try {
        $body = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new ApiError('Invalid JSON.');
    }
    if (!is_array($body)) {
        throw new ApiError('Invalid request body.');
    }
    return $body;
}

function findProduct(array $store, mixed $id): ?array
{
    foreach ($store['products'] as $product) {
        if ($product['id'] === $id) {
            return $product;
        }
    }
    return null;
}

function tokenMatches(array $order, mixed $token): bool
{
    return is_string($token) && $token !== '' && hash_equals($order['token'], $token);
}

function previewType(string $path): string
{
    $type = (new finfo(FILEINFO_MIME_TYPE))->file($path);
    if (!in_array($type, ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'], true)) {
        throw new ApiError('Use JPG, PNG, WebP, GIF, MP4 or WebM previews.');
    }
    return $type;
}

/** Stream large files in bounded memory; single byte ranges support video seeking. */
function streamFile(string $path, string $type, ?string $filename = null): never
{
    if (!is_file($path)) {
        throw new ApiError('File not found.', 404);
    }
    $size = filesize($path);
    $start = 0;
    $end = $size - 1;
    header('Content-Type: ' . $type);
    header('Accept-Ranges: bytes');
    header('Cache-Control: ' . ($filename === null ? 'public, max-age=3600' : 'private, no-store'));
    if ($filename !== null) {
        header("Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode($filename));
    }
    if (isset($_SERVER['HTTP_RANGE'])) {
        $range = $_SERVER['HTTP_RANGE'];
        if (!preg_match('/^bytes=(\d*)-(\d*)$/D', $range, $m) || ($m[1] === '' && $m[2] === '')) {
            header("Content-Range: bytes */$size");
            http_response_code(416);
            exit;
        }
        if ($m[1] === '') {
            $start = max(0, $size - (int) $m[2]);
        } else {
            $start = (int) $m[1];
            $end = $m[2] === '' ? $end : min($end, (int) $m[2]);
        }
        if ($start > $end || $start >= $size) {
            header("Content-Range: bytes */$size");
            http_response_code(416);
            exit;
        }
        http_response_code(206);
        header("Content-Range: bytes $start-$end/$size");
    }
    header('Content-Length: ' . max(0, $end - $start + 1));
    if ($_SERVER['REQUEST_METHOD'] === 'HEAD') {
        exit;
    }
    $file = fopen($path, 'rb');
    if ($file === false) {
        throw new RuntimeException('Cannot open file.');
    }
    fseek($file, $start);
    $remaining = $end - $start + 1;
    while ($remaining > 0 && !feof($file) && !connection_aborted()) {
        $chunk = fread($file, min(65536, $remaining));
        if ($chunk === false || $chunk === '') {
            break;
        }
        echo $chunk;
        $remaining -= strlen($chunk);
    }
    fclose($file);
    exit;
}

function handleError(Throwable $error): never
{
    if ($error instanceof ApiError) {
        jsonResponse(['error' => $error->getMessage()], $error->status);
    }
    error_log('Void Frame API: ' . $error->getMessage());
    jsonResponse(['error' => 'Unable to access the store. Check the private hosting configuration or try again.'], 500);
}
