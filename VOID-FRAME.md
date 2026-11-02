# Void Frame operations

Void Frame uses a static React frontend and PHP API. See [README.md](README.md) for development and [the hosting guide](deploy/SHARED-HOSTING.md) for deploying on inexpensive shared hosting.

## Creator studio

1. Open **Creator studio** and enter your owner password.
2. In **Products**, upload an image/video preview and downloadable file, set details, then choose a USDC price or mark it free. Each file can be up to 50 MB, subject to your host's limit.
3. In **Settings**, enter your public Arbitrum receiving address. Paid checkout stays disabled until a wallet is set. Never enter a seed phrase or private key.
4. In **Payments**, compare each submitted transaction with the expected wallet, native USDC token and amount on Arbiscan. Approval unlocks the customer's download. Payment review is manual.

Private order URLs grant access to that order. A paid download requires the owner session or a token from an approved order. Archiving removes a listing while keeping existing purchases available. Free files are publicly downloadable.

## Existing server

The optional Docker deployment runs Apache/PHP behind Nginx, as uid 1001, with a read-only root and a private `voidframe_data` volume. The app remains at `127.0.0.1:3100`, with `/api/health` and `/api/health.php` available. Production code no longer requires Node.js.

Pushes to `voidframe-source` run CI/CD and also produce a shared-hosting download. Set the target and transfer credentials when moving to a shared host; see the hosting guide. The domain and hosting subscription are separate from this code migration.

## Design and provenance

The MotionSites recording informed the gallery and product previews. The Mosa recording informed the dark surfaces, mist-gray imagery, typography and controls. The supplied V logo was rebuilt as silver/gray SVG for the header and favicon. The source image was not modified. `public/hero.png` is the generated mountain/portal image.

Native USDC on Arbitrum One uses contract `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`. The app does not initiate transactions or automatically verify the chain.
