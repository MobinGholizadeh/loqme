<?php
declare(strict_types=1);
define('VOIDFRAME_API', true);
require __DIR__ . '/_lib/bootstrap.php';

try {
    $action = $_GET['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'GET' || $method === 'HEAD') {
        $store = readStore();
        if ($action === 'studio') {
            jsonResponse(['admin' => isAdmin(), 'setup' => !configured(), 'signedIn' => isAdmin()]);
        }
        if ($action === 'orders') {
            requireAdmin();
            $orders = array_values(array_filter($store['orders'], static fn($o) => !empty($o['tx'])));
            usort($orders, static fn($a, $b) => $b['created'] <=> $a['created']);
            foreach ($orders as &$order) {
                unset($order['token']);
            }
            unset($order);
            jsonResponse($orders);
        }
        if ($action === 'order') {
            foreach ($store['orders'] as $order) {
                if ($order['id'] === ($_GET['id'] ?? '') && tokenMatches($order, $_GET['token'] ?? '')) {
                    jsonResponse($order);
                }
            }
            throw new ApiError('Order not found.', 404);
        }
        if ($action === 'media' || $action === 'download') {
            $product = findProduct($store, $_GET['id'] ?? '');
            if (!$product) {
                throw new ApiError('Product not found.', 404);
            }
            if ($action === 'download' && $product['price'] > 0 && !isAdmin()) {
                $approved = false;
                foreach ($store['orders'] as $order) {
                    if ($order['product_id'] === $product['id'] && $order['status'] === 'approved' && tokenMatches($order, $_GET['token'] ?? '')) {
                        $approved = true;
                        break;
                    }
                }
                if (!$approved) {
                    throw new ApiError('Payment must be reviewed before downloading.', 403);
                }
            }
            if ($action === 'media') {
                streamFile(storagePath('preview', $product['preview']), $product['preview_content_type'] ?? ($product['media_type'] === 'video' ? 'video/mp4' : 'image/webp'));
            }
            streamFile(storagePath('download', $product['file']), 'application/octet-stream', $product['filename']);
        }
        if ($action !== '') {
            throw new ApiError('Unknown action.');
        }
        $products = array_values(array_filter($store['products'], static fn($p) => !$p['archived']));
        usort($products, static fn($a, $b) => $b['created'] <=> $a['created']);
        foreach ($products as &$product) {
            unset($product['file']);
            $product['preview'] = '/api/store.php?action=media&id=' . rawurlencode($product['id']);
        }
        unset($product);
        jsonResponse(['products' => $products, 'wallet' => $store['settings']['wallet']]);
    }
    if ($method !== 'POST') {
        header('Allow: GET, HEAD, POST');
        throw new ApiError('Method not allowed.', 405);
    }
    checkOrigin();
    if (in_array($action, ['upload', 'save', 'archive', 'wallet', 'review'], true)) {
        requireAdmin();
    }
    if ($action === 'upload') {
        $file = $_FILES['file'] ?? null;
        $kind = $_POST['kind'] ?? '';
        if (!$file || !is_int($file['error']) || $file['error'] !== UPLOAD_ERR_OK || $file['size'] < 1 || $file['size'] > 50 * 1024 * 1024) {
            throw new ApiError('Choose a file smaller than 50 MB and within your host’s upload limit.', 413);
        }
        if (!in_array($kind, ['preview', 'download'], true)) {
            throw new ApiError('Invalid upload type.');
        }
        $type = $kind === 'preview' ? previewType($file['tmp_name']) : 'application/octet-stream';
        $key = uuid();
        $path = storagePath($kind, $key);
        if (!is_dir(dirname($path)) && !mkdir(dirname($path), 0700, true) && !is_dir(dirname($path))) {
            throw new RuntimeException('Cannot create upload directory.');
        }
        if (!move_uploaded_file($file['tmp_name'], $path)) {
            throw new RuntimeException('Cannot store upload.');
        }
        chmod($path, 0600);
        jsonResponse(['key' => $key, 'name' => substr(basename($file['name']), 0, 250), 'type' => $type]);
    }
    $body = jsonBody();
    if ($action === 'login') {
        if (!configured()) {
            throw new ApiError('The creator must finish the private hosting configuration.', 503);
        }
        $password = $body['password'] ?? '';
        if (!is_string($password) || strlen($password) > 72 || !password_verify($password, config()['admin_password_hash'])) {
            throw new ApiError('Incorrect owner password.', 401);
        }
        adminCookie();
        jsonResponse(['ok' => true]);
    }
    if ($action === 'logout') {
        adminCookie(true);
        jsonResponse(['ok' => true]);
    }
    if ($action === 'save') {
        if (!is_string($body['title'] ?? null) || trim($body['title']) === '' || strlen($body['title']) > 400
            || !is_string($body['description'] ?? null) || strlen($body['description']) > 20000
            || !in_array($body['category'] ?? '', ['Websites', 'Motion', '3D & Visuals', 'Templates'], true)
            || !is_int($body['price'] ?? null) || $body['price'] < 0 || $body['price'] > 100000000) {
            throw new ApiError('Check the title, description, category and price.');
        }
        if (!validKey($body['preview'] ?? null) || !validKey($body['file'] ?? null)
            || !is_file(storagePath('preview', $body['preview'])) || !is_file(storagePath('download', $body['file']))) {
            throw new ApiError('Upload both preview and download files.');
        }
        $id = $body['id'] ?? uuid();
        if (!validKey($id)) {
            throw new ApiError('Invalid product ID.');
        }
        $type = previewType(storagePath('preview', $body['preview']));
        $value = ['id' => $id, 'title' => trim($body['title']), 'description' => $body['description'], 'category' => $body['category'],
            'price' => $body['price'], 'preview' => $body['preview'], 'preview_content_type' => $type,
            'media_type' => str_starts_with($type, 'video/') ? 'video' : 'image', 'file' => $body['file'],
            'filename' => substr(is_string($body['filename'] ?? null) ? $body['filename'] : 'download', 0, 250), 'created' => nowMs(), 'archived' => 0];
        withStore(static function (array &$store) use ($id, $value): void {
            foreach ($store['products'] as &$product) {
                if ($product['id'] === $id) {
                    $product = array_merge($product, $value);
                    return;
                }
            }
            unset($product);
            $store['products'][] = $value;
        }, true);
        jsonResponse(['ok' => true, 'id' => $id]);
    }
    if ($action === 'archive') {
        withStore(static function (array &$store) use ($body): void {
            foreach ($store['products'] as &$product) {
                if ($product['id'] === ($body['id'] ?? '')) {
                    $product['archived'] = 1;
                }
            }
        }, true);
        jsonResponse(['ok' => true]);
    }
    if ($action === 'wallet') {
        $wallet = $body['wallet'] ?? null;
        if (!is_string($wallet) || ($wallet !== '' && (!preg_match('/^0x[a-fA-F0-9]{40}$/D', $wallet) || preg_match('/^0x0{40}$/iD', $wallet)))) {
            throw new ApiError('Enter a valid nonzero Arbitrum wallet address.');
        }
        withStore(static function (array &$store) use ($wallet): void { $store['settings']['wallet'] = $wallet; }, true);
        jsonResponse(['ok' => true]);
    }
    if ($action === 'checkout') {
        $order = withStore(static function (array &$store) use ($body): array {
            $product = findProduct($store, $body['id'] ?? '');
            if (!$product || $product['archived'] || $product['price'] <= 0) {
                throw new ApiError('This product is not available for checkout.');
            }
            if (!$store['settings']['wallet']) {
                throw new ApiError('Payments open once the creator adds a wallet.', 409);
            }
            $order = ['id' => uuid(), 'product_id' => $product['id'], 'title' => $product['title'], 'price' => $product['price'],
                'wallet' => $store['settings']['wallet'], 'status' => 'awaiting-payment', 'token' => uuid() . uuid(), 'created' => nowMs()];
            $store['orders'][] = $order;
            return $order;
        }, true);
        jsonResponse($order);
    }
    if ($action === 'receipt') {
        $tx = $body['tx'] ?? '';
        if (!is_string($tx) || !preg_match('/^0x[a-fA-F0-9]{64}$/D', $tx)) {
            throw new ApiError('Enter the full transaction hash (0x and 64 characters).');
        }
        withStore(static function (array &$store) use ($body, $tx): void {
            foreach ($store['orders'] as $order) {
                if (($order['tx'] ?? '') === strtolower($tx)) {
                    throw new ApiError('This transaction has already been submitted.');
                }
            }
            foreach ($store['orders'] as &$order) {
                if ($order['id'] === ($body['id'] ?? '') && tokenMatches($order, $body['token'] ?? '') && $order['status'] === 'awaiting-payment') {
                    $order['tx'] = strtolower($tx);
                    $order['status'] = 'pending-review';
                    return;
                }
            }
            throw new ApiError('Order cannot be updated.', 409);
        }, true);
        jsonResponse(['ok' => true]);
    }
    if ($action === 'review') {
        if (!in_array($body['status'] ?? '', ['approved', 'rejected'], true)) {
            throw new ApiError('Invalid review.');
        }
        withStore(static function (array &$store) use ($body): void {
            foreach ($store['orders'] as &$order) {
                if ($order['id'] === ($body['id'] ?? '') && $order['status'] === 'pending-review') {
                    $order['status'] = $body['status'];
                    return;
                }
            }
            throw new ApiError('Order cannot be reviewed.', 409);
        }, true);
        jsonResponse(['ok' => true]);
    }
    throw new ApiError('Unknown action.');
} catch (Throwable $error) {
    handleError($error);
}
