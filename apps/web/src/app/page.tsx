import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/shells/CustomerShell";
import { HomeLanding } from "@/components/home/HomeLanding";
import { generateBrandSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: { absolute: "لقمه (Loqme) | کشف خوشمزه، خرید هوشمندانه" },
  description: "خوراکی‌های خوب فروشگاه‌های محله را با قیمت بهتر کشف کن. رزرو آنلاین و دریافت حضوری؛ شروع از ارومیه.",
  alternates: { canonical: "/" },
};

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  // Keep saved discovery links working after introducing the editorial homepage.
  const discoveryKeys = ["cat", "category", "q", "view", "neighborhood", "radius", "business", "maxPrice", "lat", "lng"];
  if (discoveryKeys.some(key => params[key] !== undefined)) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) value.forEach(item => query.append(key, item));
      else if (value !== undefined) query.set(key, value);
    }
    redirect(`/discover?${query}`);
  }
  return <CustomerShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateBrandSchema()).replace(/</g, "\\u003c") }} />
    <HomeLanding />
  </CustomerShell>;
}
