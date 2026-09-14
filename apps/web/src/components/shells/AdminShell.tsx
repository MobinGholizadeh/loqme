import { PortalShell } from "./PortalShell";
export function AdminShell({ children }: { children: React.ReactNode }) {
  return <PortalShell role="admin">{children}</PortalShell>;
}
