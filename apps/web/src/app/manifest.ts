import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'لقمه | عرضه هوشمند مازاد روزانه غذا',
    short_name: 'لقمه',
    description:
      'سامانه کشف و خرید بسته‌های شگفت‌انگیز و مازاد تازه خوراکی‌ها با ۵۰٪ تا ۷۰٪ تخفیف و تضمین سلامت در شهر ارومیه.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF7F5',
    theme_color: '#135E66',
    orientation: 'portrait',
    dir: 'rtl',
    lang: 'fa-IR',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
