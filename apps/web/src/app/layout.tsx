import type { Metadata, Viewport } from "next";
import { generateCssVariables } from "@loqme/design-tokens";
import localFont from "next/font/local";
import "./globals.css";
import './about/about.css';
import '@/components/business/business.css';
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
import { SessionProvider } from "@/components/auth/SessionProvider";

const vazirmatn = localFont({
  src: "../../public/fonts/Vazirmatn-Variable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-vazirmatn",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://loqme.shop"),
  title: {
    default: "لقمه | کشف خوراکی‌های تازه محله",
    template: "%s | لقمه",
  },
  description:
    "لقمه (Loqme)، بازارچه محلی بسته‌های تازه نانوایی‌ها، کافه‌ها و فروشگاه‌های ارومیه. پیشنهادهای نزدیک را با قیمت و زمان دریافت مشخص کشف و رزرو کنید.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "https://loqme.shop",
    siteName: "لقمه",
    title: "لقمه | کشف خوراکی‌های تازه محله",
    description:
      "بسته‌های تازه فروشگاه‌های ارومیه را با قیمت کمتر و زمان دریافت حضوری مشخص کشف کنید.",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "نشان تجاری پلتفرم لقمه",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "لقمه | کشف خوراکی‌های تازه محله",
    description:
      "کشف و رزرو بسته‌های تازه فروشگاه‌های محله، با قیمت کمتر و دریافت حضوری در ارومیه.",
    images: ["/logo.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "لقمه",
  },
  verification: {
    google: [
      "OPtOX-MOcdHG5CKvWN05TAEcGc9fWUUvmGcxwQEBGwc",
      "536WDaAPakTIWC5tj63s_zorv8MX7uuyRbDIwMa9QcM",
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#135E66",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fa-IR"
      dir="rtl"
      className={vazirmatn.variable}
      style={generateCssVariables() as React.CSSProperties}
    >
      <body className="font-sans antialiased min-h-screen">
        <SessionProvider>
          {children}
          <PwaInstallPrompt />
        </SessionProvider>
      </body>
    </html>
  );
}
