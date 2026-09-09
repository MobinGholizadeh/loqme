import type { Metadata, Viewport } from 'next';
import { Vazirmatn } from 'next/font/google';
import './globals.css';

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-vazirmatn',
});

export const metadata: Metadata = {
  title: 'لقمه | کشف هوشمند مازاد روزانه خوراکی‌ها',
  description:
    'سامانه لقمه (Loqme) — بازارچه محلی کشف و خرید بسته‌های شگفت‌انگیز و مازاد تازه خوراکی‌ها با ۵۰٪ تا ۷۰٪ تخفیف و تضمین سلامت.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: '/logo.png',
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
      <body className="font-sans antialiased bg-[#FAF7F5] text-stone-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
