import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://loqme.shop';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/explore', '/listings/', '/merchants/'],
      disallow: [
        '/admin/',
        '/merchant/',
        '/api/',
        '/checkout/',
        '/orders/',
        '/profile/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
