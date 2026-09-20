import { Suspense } from "react";
import { OtpLoginForm } from "@/components/auth/OtpLoginForm";
import { AuthLayout } from '@/components/auth/AuthLayout';
import { HeartbeatLoading } from "@/components/ui/HeartbeatLoading";
export default function LoginPage() {
  return (
    <AuthLayout>
          <Suspense fallback={<HeartbeatLoading />}>
            <OtpLoginForm audience="customer" />
          </Suspense>
    </AuthLayout>
  );
}
