import { UserRole } from '@/lib/auth/rbac';

export interface UserRecord {
  id: string;
  mobile: string;
  role: UserRole;
  isActive: boolean;
  fullName?: string | null;
  createdAt: Date;
}
