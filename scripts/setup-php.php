<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
// Writes a private config outside the public document root. Never include it in a ZIP.
$target = $argv[1] ?? __DIR__ . '/../voidframe-config.php';
if (file_exists($target)) {
    fwrite(STDERR, "Config already exists; refusing to replace it.\n");
    exit(1);
}
$password = rtrim(stream_get_contents(STDIN), "\r\n");
if (strlen($password) < 12 || strlen($password) > 72) {
    fwrite(STDERR, "Provide a password of 12–72 bytes on standard input.\n");
    exit(1);
}
$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
$secret = bin2hex(random_bytes(32));
$content = "<?php\nreturn [\n    'data_dir' => __DIR__ . '/voidframe-data',\n    'admin_password_hash' => "
    . var_export($hash, true) . ",\n    'session_secret' => " . var_export($secret, true)
    . ",\n    'secure_cookies' => true,\n];\n";
$file = fopen($target, 'x');
if (!$file) {
    throw new RuntimeException('Cannot write configuration file.');
}
chmod($target, 0600);
fwrite($file, $content);
fclose($file);
echo "Private config created. Place it next to public_html and keep it out of Git.\n";
