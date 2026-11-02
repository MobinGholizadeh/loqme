<?php
// Place a completed copy named voidframe-config.php NEXT TO public_html, not inside it.
// Generate the values with: npm run setup:php (requires PHP locally), or use your host's terminal.
return [
    'data_dir' => __DIR__ . '/voidframe-data',
    'admin_password_hash' => 'REPLACE_WITH_BCRYPT_HASH',
    'session_secret' => 'REPLACE_WITH_RANDOM_SECRET_AT_LEAST_32_CHARACTERS',
    'secure_cookies' => true,
];
