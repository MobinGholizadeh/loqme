import { Suspense } from "react";
import { DiscoveryView } from "@/components/discovery/DiscoveryView";
import { HeartbeatLoading } from "@/components/ui/HeartbeatLoading";
import type { Metadata } from "next";
import { generateBrandSchema } from "@/lib/seo/structured-data";
import { DiscoveryHero } from "@/components/discovery/DiscoveryHero";

export const metadata: Metadata = {
  title: { absolute: "لقمه (Loqme) | کشف خوراکی‌های تازه با قیمت کمتر" },
  alternates: { canonical: "/discover" },
};

export default function DiscoverPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateBrandSchema()).replace(/</g, "\\u003c") }}
      />
      <DiscoveryHero />
      <div id="discover-listings" />
      <Suspense fallback={<HeartbeatLoading />}>
        <DiscoveryView home />
      </Suspense>
    </>
  );
}
