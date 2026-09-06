import { UserRole } from '@/lib/auth/rbac';

export interface RequestOtpResult {
  success: boolean;
  message: string;
  expiresInSeconds: number;
  mobile: string;
  cooldownSeconds?: number;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    mobile: string;
    role: UserRole;
    fullName?: string | null;
  };
  token?: string;
}
