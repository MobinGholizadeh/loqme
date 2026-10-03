/**
 * Schema.org JSON-LD Structured Data Generators for Loqme
 */

/** Homepage identity: the Persian and Latin names describe the same brand. */
export function generateBrandSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://loqme.shop/#organization',
        name: 'لقمه',
        alternateName: 'Loqme',
        url: 'https://loqme.shop/',
        logo: 'https://loqme.shop/logo.png',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://loqme.shop/#website',
        name: 'لقمه',
        alternateName: ['Loqme', 'لقمه (Loqme)', 'loqme.shop'],
        url: 'https://loqme.shop/',
        inLanguage: 'fa-IR',
        publisher: { '@id': 'https://loqme.shop/#organization' },
      },
    ],
  };
}

export function generateLocalBusinessSchema(merchant: {
  id: string;
  businessNameFa: string;
  businessType?: string;
  ratingAverage?: number;
  ratingCount?: number;
  phone?: string | null;
  locations?: Array<{
    addressFa: string;
    latitude: number;
    longitude: number;
    city?: { nameFa: string } | null;
  }>;
}) {
  const primaryLocation = merchant.locations?.[0];
  const typeMap: Record<string, string> = {
    BAKERY: 'Bakery',
    PASTRY: 'Bakery',
    RESTAURANT: 'Restaurant',
    CAFE: 'CafeOrCoffeeShop',
    SUPERMARKET: 'GroceryStore',
  };

  const schemaType = typeMap[merchant.businessType || ''] || 'FoodEstablishment';

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    '@id': `https://loqme.shop/merchants/${merchant.id}`,
    name: merchant.businessNameFa,
    url: `https://loqme.shop/merchants/${merchant.id}`,
    priceRange: '$$',
    image: 'https://loqme.shop/logo.png',
  };

  if (merchant.phone) {
    schema.telephone = merchant.phone;
  }

  if (primaryLocation) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: primaryLocation.addressFa,
      addressLocality: primaryLocation.city?.nameFa || 'ارومیه',
      addressRegion: 'آذربایجان غربی',
      addressCountry: 'IR',
    };

    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: primaryLocation.latitude,
      longitude: primaryLocation.longitude,
    };
  }

  if (merchant.ratingAverage && merchant.ratingCount && merchant.ratingCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: merchant.ratingAverage.toFixed(1),
      reviewCount: merchant.ratingCount,
      bestRating: '5',
      worstRating: '1',
    };
  }

  return schema;
}

export function generateProductListingSchema(
  listing: {
    id: string;
    titleFa: string;
    descriptionFa?: string | null;
    originalPriceToman: number | bigint;
    discountedPriceToman: number | bigint;
    status: string;
    pickupEnd?: Date | string | null;
  },
  merchant?: {
    id: string;
    businessNameFa: string;
  } | null
) {
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `https://loqme.shop/listings/${listing.id}`,
    name: listing.titleFa,
    description:
      listing.descriptionFa ||
      `بسته شگفت‌انگیز مازاد ${listing.titleFa}${merchant ? ` از ${merchant.businessNameFa}` : ''}`,
    image: 'https://loqme.shop/logo.png',
    offers: {
      '@type': 'Offer',
      price: Number(listing.discountedPriceToman),
      priceCurrency: 'IRR', // International standard code; values represented in Toman
      availability:
        listing.status === 'PUBLISHED'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `https://loqme.shop/listings/${listing.id}`,
    },
  };

  if (merchant) {
    schema.offers.seller = {
      '@type': 'FoodEstablishment',
      name: merchant.businessNameFa,
      url: `https://loqme.shop/merchants/${merchant.id}`,
    };
  }

  if (listing.pickupEnd) {
    schema.offers.priceValidUntil = new Date(listing.pickupEnd).toISOString().split('T')[0];
  }

  return schema;
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
