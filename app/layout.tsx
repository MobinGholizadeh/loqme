import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Void Frame — Work beyond the ordinary",
  description: "An independent collection of digital experiences, motion and design. Discover the next frame.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
