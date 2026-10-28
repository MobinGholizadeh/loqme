# Void Frame

Private storefront built with Vinext/React, Cloudflare D1 for products and orders, and R2 for uploaded files. Source lives in this directory. No payment wallet is configured.

## Using your studio

1. Open the deployed site and select **Creator studio**. Sign in and activate the studio while the site is owner-private. This permanently binds administration to your site-specific ChatGPT user ID.
2. **Products → Add product**: upload an image/video preview, attach the downloadable work, enter the description and usage terms, and choose a USDC price or Free. Each file can be up to 50 MB. Preview formats: JPEG, PNG, WebP, GIF, MP4, WebM. Downloads can be any file type and are served as attachments.
3. **Settings**: save your public Arbitrum receiving address when ready. An empty wallet disables paid checkout. Never provide a seed phrase or private key.
4. **Payments**: review submitted transaction hashes using Arbiscan. Verify success, the native USDC token, recipient, and amount against the order. Approval unlocks delivery. This is a manual payment-review workflow; it does not automatically verify on-chain transfers or initiate wallet transactions.
5. Sample listings are illustrative and cannot be purchased. The free Field Notes sample includes an actual text download. Real uploads appear first. Archive removes a listing from the gallery without deleting files or existing purchase access.

The deployed site remains private until its audience is explicitly changed. Activate the studio before making the site public; first-owner setup relies on the initial private access boundary. Production writes subsequently require the stored owner identity and a matching Origin header. Public operation should also add rate limiting to order creation and receipt submission.

Private order links act as access tokens. Customers should keep them private. Order status is also remembered in the purchasing browser. No email notifications or automatic refunds are implemented. Uploaded download files are served only for free products, the owner, or approved order tokens. Product previews are visible to storefront visitors.

## Development and validation

`npm run dev -- --hostname 127.0.0.1`

`npx tsc --noEmit`

`node scripts/test-store.mjs` tests local authentication, uploads, free downloads, payment gates, order-token privacy, transaction reuse, review and archive. It creates and archives local fixtures and clears the local wallet; never point it at production.

Database schema: `db/schema.ts`. Generated migration: `drizzle/0000_fluffy_black_crow.sql`. Do not replay applied migrations. Local state in `.wrangler` is separate from production.

## Design and asset provenance

MotionSites recording: filterable gallery and product previews. Mosa recording: black/charcoal surfaces, mist-gray imagery, minimal white typography, monospaced labels, fine borders and square controls. The supplied layered V logo was rebuilt as an SVG in silver/gray for the header and favicon (`public/logo.svg`, `public/favicon.svg`). The original screenshot was not modified.

Hero image: `public/hero.png`, created with the built-in image generation tool. Prompt: “Use case: stylized-concept. Asset type: ultra-wide website hero background. Create a cinematic photorealistic dark mountain landscape, black volcanic rocks surrounding still water, layers of jagged mountains disappearing into silver gray mist, a thin luminous silver rectangular portal standing on a rocky island right of center and its reflection. Restrained near-black, charcoal and desaturated gray-green palette, bright overcast mist at upper right. Wide 3:1 composition, left third deep shadow with empty space for white webpage text. Sophisticated atmospheric film grain, natural detail, no text, no logo, no watermark.”

Native USDC on Arbitrum One: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`. Reference: https://www.circle.com/blog/usdc-on-arbitrum-now-available and https://developer.arbitrum.io/arbitrum-bridge/usdc-arbitrum-one .
