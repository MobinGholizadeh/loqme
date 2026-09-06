/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@loqme/types',
    '@loqme/validation',
    '@loqme/design-tokens',
    '@loqme/api',
  ],
};

export default nextConfig;
