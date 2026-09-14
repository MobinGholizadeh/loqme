import { Suspense } from "react";
import { DiscoveryView } from "@/components/discovery/DiscoveryView";
import { HeartbeatLoading } from "@/components/ui/HeartbeatLoading";
export default function ExplorePage() {
  return (
    <Suspense fallback={<HeartbeatLoading />}>
      <DiscoveryView />
    </Suspense>
  );
}
