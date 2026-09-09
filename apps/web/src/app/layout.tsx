import type { Metadata, Viewport } from 'next';
import { Vazirmatn } from 'next/font/google';
import './globals.css';
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt';

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-vazirmatn',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://loqme.shop'),
  title: {
    default: 'لقمه | کشف هوشمند و نجات مازاد روزانه خوراکی‌ها',
    template: '%s | لقمه',
  },
  description:
    'سامانه لقمه (Loqme) — بازارچه محلی کشف و خرید بسته‌های شگفت‌انگیز و مازاد تازه نانوایی‌ها، قنادی‌ها و رستوران‌ها با ۵۰٪ تا ۷۰٪ تخفیف و تضمین سلامت در شهر ارومیه.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    url: 'https://loqme.shop',
    siteName: 'لقمه | Loqme',
    title: 'لقمه | عرضه هوشمند مازاد تازه خوراکی‌ها با تخفیف شگفت‌انگیز',
    description:
      'کشف بسته‌های تازه روزانه نانوایی‌ها، کافه‌ها و رستوران‌ها با تخفیف ۵۰٪ تا ۷۰٪ و ضمانت بهداشت و سلامت در ارومیه.',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'نشان تجاری پلتفرم لقمه',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'لقمه | عرضه هوشمند مازاد خوراکی‌ها',
    description: 'کشف بسته‌های شگفت‌انگیز خوراکی تازه با تخفیف‌های استثنایی و حفظ محیط زیست.',
    images: ['/logo.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'لقمه',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#135E66',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa-IR" dir="rtl" className={vazirmatn.variable}>
      <body className="font-sans antialiased bg-[#FAF7F5] text-stone-900 min-h-screen selection:bg-teal-100 selection:text-[#135E66]">
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
