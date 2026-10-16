import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { VerificationStatus, ListingStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://loqme.shop';

  // 1. Core Static Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/discover`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.5 },
    {
      url: baseUrl,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/explore`,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
  ];

  try {
    // 2. Verified Active Merchants
    const merchants = await prisma.merchant.findMany({
      where: { verificationStatus: VerificationStatus.APPROVED },
      select: { id: true, updatedAt: true },
      take: 200,
    });

    const merchantRoutes: MetadataRoute.Sitemap = merchants.map((m) => ({
      url: `${baseUrl}/merchants/${m.id}`,
      lastModified: m.updatedAt,
      changeFrequency: 'daily',
      priority: 0.8,
    }));

    // 3. Active Published Listings
    const listings = await prisma.listing.findMany({
      where: { status: ListingStatus.PUBLISHED },
      select: { id: true, updatedAt: true },
      take: 500,
    });

    const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
      url: `${baseUrl}/listings/${l.id}`,
      lastModified: l.updatedAt,
      changeFrequency: 'hourly',
      priority: 0.8,
    }));

    return [...staticRoutes, ...merchantRoutes, ...listingRoutes];
  } catch (error) {
    console.error('Error generating dynamic sitemap from database:', error);
    // Graceful fallback to static routes if database is temporarily unavailable
    return staticRoutes;
  }
}
