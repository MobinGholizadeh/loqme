import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/AuthLayout';
export const metadata: Metadata = { title: 'ثبت‌نام و ورود کسب‌وکار', robots: { index: false, follow: false } };
export default function BusinessLayout({ children }: { children: React.ReactNode }) { return <AuthLayout business>{children}</AuthLayout>; }
