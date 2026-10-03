import { Suspense } from "react";
import { DiscoveryView } from "@/components/discovery/DiscoveryView";
import { HeartbeatLoading } from "@/components/ui/HeartbeatLoading";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "کشف خوراکی‌های محله",
  description: "پیشنهادهای نانوایی‌ها، کافه‌ها و فروشگاه‌های محله را در لقمه پیدا کنید؛ با قیمت و زمان دریافت حضوری مشخص.",
  alternates: { canonical: "/explore" },
};
export default function ExplorePage() {
  return (
    <Suspense fallback={<HeartbeatLoading />}>
      <DiscoveryView />
    </Suspense>
  );
}
