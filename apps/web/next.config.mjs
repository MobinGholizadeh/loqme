const inventoryImageOrigin = process.env.NEXT_PUBLIC_INVENTORY_IMAGE_ORIGIN;
const inventoryImageUrl = inventoryImageOrigin
  ? new URL(inventoryImageOrigin)
  : null;
if (inventoryImageUrl && inventoryImageUrl.protocol !== "https:")
  throw new Error("Inventory image origin must use HTTPS");

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.LOQME_BUILD_DIR || ".next",
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: [
    "@loqme/types",
    "@loqme/validation",
    "@loqme/design-tokens",
    "@loqme/api",
  ],
  images: {
    remotePatterns: inventoryImageUrl
      ? [
          {
            protocol: "https",
            hostname: inventoryImageUrl.hostname,
            port: inventoryImageUrl.port,
            pathname: "/**",
          },
        ]
      : [],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(self)",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://unpkg.com https://*.basemaps.cartocdn.com" +
                (inventoryImageUrl ? " " + inventoryImageUrl.origin : ""),
              "connect-src 'self' https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
