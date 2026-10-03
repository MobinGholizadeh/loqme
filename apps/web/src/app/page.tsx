import { Suspense } from "react";
import { CustomerShell } from "@/components/shells/CustomerShell";
import { DiscoveryView } from "@/components/discovery/DiscoveryView";
import { HeartbeatLoading } from "@/components/ui/HeartbeatLoading";
import type { Metadata } from "next";
import { generateBrandSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: { absolute: "لقمه (Loqme) | کشف خوراکی‌های تازه با قیمت کمتر" },
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <CustomerShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateBrandSchema()).replace(/</g, "\\u003c") }}
      />
      <div className="discovery-heading">
        <div>
          <h1>لقمه؛ خوراکی‌های تازه، نزدیک شما</h1>
          <p>لقمه (Loqme)، بازارچه خوراکی‌های تازه نانوایی‌ها، کافه‌ها و فروشگاه‌های محله است؛ با قیمت کمتر و دریافت حضوری. شروع از ارومیه.</p>
        </div>
      </div>
      <Suspense fallback={<HeartbeatLoading />}>
        <DiscoveryView home />
      </Suspense>
    </CustomerShell>
  );
}
