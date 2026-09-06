import { MerchantShell } from '@/components/shells/MerchantShell';

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MerchantShell>{children}</MerchantShell>;
}
