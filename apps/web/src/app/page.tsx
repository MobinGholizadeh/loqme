import { Suspense } from "react";
import { CustomerShell } from "@/components/shells/CustomerShell";
import { DiscoveryView } from "@/components/discovery/DiscoveryView";
import { HeartbeatLoading } from "@/components/ui/HeartbeatLoading";
export default function HomePage() {
  return (
    <CustomerShell>
      <Suspense fallback={<HeartbeatLoading />}>
        <DiscoveryView home />
      </Suspense>
    </CustomerShell>
  );
}
