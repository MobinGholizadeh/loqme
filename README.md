# Void Frame

A React storefront with a small PHP API for inexpensive shared hosting. Node.js is a **build-time tool only**; the uploaded site runs on Apache/LiteSpeed with PHP 8.2+ and writable private storage. No Node server, Composer packages, MySQL, or paid backend service is required.

The dark storefront, motion, logo/favicon, creator studio, image/video previews, free downloads, USDC checkout on Arbitrum, manual payment review, and private order links are preserved.

## Build and upload

```sh
npm ci
npm run build
```

Upload the **contents of `dist/`**, including `.htaccess` and `.user.ini`, into the domain's `public_html`. Configure the owner credentials and a private data directory outside the document root. Follow [the shared hosting guide](deploy/SHARED-HOSTING.md) for exact layout, setup, migration, and automatic deployment instructions. Do not upload the repository, `node_modules`, `.deploy`, or secrets.

## Project layout

- `src/`: React storefront, order page, static CSS, and browser entry point.
- `components/`, `hooks/`, `lib/`: shared browser components and sample listings.
- `php/api/`: PHP endpoints and store/auth/file handling.
- `php/voidframe-config.example.php`: private configuration template.
- `scripts/package-php.mjs`: copies PHP and static order page into the build.
- `dist/`: generated files ready for the hosting control panel.
- `deploy/`: shared hosting guide and optional existing-server configurations.

The API uses locked, atomic JSON writes. The existing `store.json`, `preview/`, and `download/` data structure is compatible with the previous app. Files stream in chunks; video previews support byte ranges. Payment approval remains manual and no blockchain transactions are initiated by the app.

## Local development

Use Node 22.13+ and PHP 8.2+ with Fileinfo enabled. Create the private configuration as described in the hosting guide; set `secure_cookies` to `false` only for local HTTP development.

```sh
npm ci
npm run build
npm run dev:api
# In a second terminal:
npm run dev
```

Vite proxies `/api` to the local PHP server at `127.0.0.1:3101`. After PHP changes, run `node scripts/package-php.mjs` to refresh the API copy. The PHP built-in server is for local development only. Production shared hosting runs PHP through Apache/LiteSpeed.

## Validation

```sh
npm run lint
npm run build
npm run test:php
```

`test:php` requires Docker and builds the real Apache/PHP image. It uses an isolated temporary data volume and tests admin sessions, cross-origin rejection, uploads, MIME checks, private paid downloads, manual approvals/rejections, duplicate transactions, concurrent orders, free files, range requests, archive behavior, and direct order URLs. It cannot target production. No local PHP installation is needed for this test.

## Continuous delivery

The existing `voidframe-source` push workflow validates the React and PHP app, then provides a `void-frame-php-hosting` download from GitHub Actions. The existing-server path uses a PHP/Apache container with the same volume, port, and automatic rollback.

The initial PHP migration needs `VOIDFRAME_PHP_ADMIN_PASSWORD_HASH` set to a bcrypt hash of the owner password. The previous Next.js scrypt secret remains untouched so old-image rollback is possible. `VOIDFRAME_ADMIN_SESSION_SECRET` and existing product/order data are retained.

For cheap shared hosting, configure the FTPS deployment secrets described in [SHARED-HOSTING.md](deploy/SHARED-HOSTING.md), then set `VOIDFRAME_DEPLOY_TARGET=shared-hosting`. Builds happen in GitHub; only the compiled site is sent to the host. Keep the current hosting until the new domain and checkout have been verified.
