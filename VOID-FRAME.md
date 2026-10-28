# Void Frame

Void Frame is a self-hosted storefront for downloadable visual work. The production image runs as a non-root Next.js container behind Nginx. Product metadata, orders, previews, and downloads live in the `voidframe_data` Docker volume.

## Creator studio

1. Open **Creator studio** and enter the owner password created during deployment.
2. In **Products**, upload an image or video preview, attach the downloadable work, add its details, and set a USDC price or mark it free. Each file can be up to 50 MB. Preview formats are JPEG, PNG, WebP, GIF, MP4, and WebM.
3. In **Settings**, add the public Arbitrum receiving address. Paid checkout stays disabled while this field is empty. Never enter a seed phrase or private key.
4. In **Payments**, compare each submitted transaction with the expected wallet, native USDC token, and amount on Arbiscan. Approval unlocks the customer download. Payment review is manual; the app does not initiate wallet transactions or automatically verify the chain.

Order URLs contain private access tokens. A paid file is available only to the owner or to an approved order token. Free files can be downloaded directly. Archiving removes a product from the gallery while preserving its files and existing orders.

## Local production validation

Create a scrypt password hash and a random session secret, then set:

```text
ADMIN_PASSWORD_HASH=scrypt$<salt>$<hex digest>
ADMIN_SESSION_SECRET=<at least 32 random characters>
DATA_DIR=<writable data directory>
```

Run:

```powershell
npm run build:selfhost
npx tsc --noEmit
npm run test:selfhost
```

`test:selfhost` expects the local production server at `http://127.0.0.1:3101` and reads the ignored `.deploy/admin-password` fixture. It creates and archives test products and resets the test wallet. Never point it at production.

## Server layout

- Container: `voidframe-app`
- Loopback port: `127.0.0.1:3100`
- Persistent volume: `voidframe_data`
- Application directory: `/opt/voidframe`
- Nginx names: `voidframe.space` and `www.voidframe.space`
- Health endpoint: `/api/health`

`Dockerfile.selfhost`, `docker-compose.server.yml`, and `deploy/nginx-voidframe.conf` define the deployment. The app uses a read-only root filesystem, drops Linux capabilities, and stores mutable data only in its named volume.

## Production CI/CD

The `Void Frame Production CI/CD` GitHub Actions workflow runs on every push to the `voidframe-source` branch. It type-checks and builds the exact commit, starts the standalone production server in CI, exercises the complete upload and payment-review test flow, publishes a digest-pinned container image, deploys through the existing server SSH connection, and verifies the live health endpoint. Failed application health checks restore the previous image. The workflow also installs the canonical Nginx configuration and provisions or reuses the Let's Encrypt certificate when both public DNS names point to the server.

## Design and asset provenance

The MotionSites recording informed the filterable gallery and product preview structure. The Mosa recording informed the black and charcoal surfaces, mist-gray imagery, minimal white typography, monospaced labels, fine borders, and square controls. The supplied layered V logo was rebuilt as a silver and gray SVG for the header and favicon (`public/logo.svg`, `public/favicon.svg`). The source screenshot was not modified.

`public/hero.png` was generated for the storefront as a dark mountain and luminous portal scene. Native USDC on Arbitrum One uses contract `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`.
