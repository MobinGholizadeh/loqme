import { PortalShell } from "./PortalShell";
export function MerchantShell({ children }: { children: React.ReactNode }) {
  return <PortalShell role="merchant">{children}</PortalShell>;
}
