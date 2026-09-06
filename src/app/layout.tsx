import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'لقمه | کشف هوشمند مازاد روزانه خوراکی‌ها',
  description:
    'سامانه لقمه (Loqme) — بازارچه محلی کشف و خرید بسته‌های شگفت‌انگیز و مازاد تازه خوراکی‌ها با تخفیف‌های جذاب و تضمین سلامت.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#F97316',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa-IR" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
