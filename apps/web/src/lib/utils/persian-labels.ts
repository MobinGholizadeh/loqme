/**
 * Centralized Persian translations and badge styles for statuses and system enums
 */

export const LISTING_STATUS_MAP: Record<string, { labelFa: string; badgeVariant: "success" | "warning" | "danger" | "neutral" | "brand"; className: string }> = {
  PUBLISHED: { labelFa: "فعال در بازار", badgeVariant: "success", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SOLD_OUT: { labelFa: "تکمیل ظرفیت", badgeVariant: "warning", className: "bg-amber-50 text-amber-700 border-amber-200" },
  PAUSED: { labelFa: "متوقف شده", badgeVariant: "neutral", className: "bg-slate-50 text-slate-700 border-slate-200" },
  EXPIRED: { labelFa: "منقضی شده", badgeVariant: "danger", className: "bg-rose-50 text-rose-700 border-rose-200" },
  DRAFT: { labelFa: "پیش‌نویس", badgeVariant: "neutral", className: "bg-slate-50 text-slate-700 border-slate-200" },
  ARCHIVED: { labelFa: "بایگانی شده", badgeVariant: "neutral", className: "bg-slate-50 text-slate-700 border-slate-200" },
};

export function getListingStatusLabel(status: string) {
  return LISTING_STATUS_MAP[status] || { labelFa: status, badgeVariant: "neutral", className: "bg-slate-50 text-slate-700 border-slate-200" };
}

export const SAFETY_STATUS_MAP: Record<string, { labelFa: string; badgeVariant: "success" | "warning" | "danger" | "neutral" | "brand"; className: string }> = {
  APPROVED: { labelFa: "تأیید ایمنی شده", badgeVariant: "success", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING: { labelFa: "در انتظار بررسی", badgeVariant: "warning", className: "bg-amber-50 text-amber-700 border-amber-200" },
  REJECTED: { labelFa: "رد شده", badgeVariant: "danger", className: "bg-rose-50 text-rose-700 border-rose-200" },
  UNKNOWN: { labelFa: "بررسی نشده", badgeVariant: "neutral", className: "bg-slate-50 text-slate-700 border-slate-200" },
};

export function getSafetyStatusLabel(status: string) {
  return SAFETY_STATUS_MAP[status] || { labelFa: status, badgeVariant: "neutral", className: "bg-slate-50 text-slate-700 border-slate-200" };
}

export const VERIFICATION_STATUS_MAP: Record<string, { labelFa: string; badgeVariant: "success" | "warning" | "danger" | "neutral"; className: string }> = {
  APPROVED: { labelFa: "تأیید شده", badgeVariant: "success", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING: { labelFa: "در انتظار بررسی", badgeVariant: "warning", className: "bg-amber-50 text-amber-700 border-amber-200" },
  REJECTED: { labelFa: "رد شده", badgeVariant: "danger", className: "bg-rose-50 text-rose-700 border-rose-200" },
  SUSPENDED: { labelFa: "معلق شده", badgeVariant: "danger", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function getVerificationStatusLabel(status: string) {
  return VERIFICATION_STATUS_MAP[status] || { labelFa: status, badgeVariant: "neutral", className: "bg-slate-50 text-slate-700 border-slate-200" };
}

export const BUSINESS_TYPE_MAP: Record<string, string> = {
  BAKERY: "نان و شیرینی",
  CAFE: "کافه و دسر",
  RESTAURANT: "غذا و رستوران",
  SUPERMARKET: "سوپرمارکت و خواربار",
  PRODUCE: "میوه و سبزیجات",
  DELI: "پروتئین و دلی",
};

export function getBusinessTypeLabel(type: string) {
  return BUSINESS_TYPE_MAP[type] || type;
}

export const AUDIT_ACTION_MAP: Record<string, { labelFa: string; variant: "success" | "warning" | "danger" | "neutral" | "brand" }> = {
  ADMIN_UPDATE_CUSTOMER_STATUS: { labelFa: "تغییر وضعیت کاربر", variant: "brand" },
  ADMIN_APPROVE_MERCHANT: { labelFa: "تأیید فروشگاه", variant: "success" },
  ADMIN_REJECT_MERCHANT: { labelFa: "رد فروشگاه", variant: "danger" },
  ADMIN_SUSPEND_MERCHANT: { labelFa: "تعلیق فروشگاه", variant: "danger" },
  ADMIN_UPDATE_COMMISSION: { labelFa: "تغییر نرخ کارمزد", variant: "warning" },
  ADMIN_UPDATE_CATEGORY: { labelFa: "ویرایش دسته‌بندی", variant: "neutral" },
  ADMIN_RESOLVE_COMPLAINT: { labelFa: "رسیدگی به شکایت", variant: "brand" },
  ADMIN_TRIGGER_NO_SHOW_SWEEP: { labelFa: "بررسی سفارشات عدم مراجعه", variant: "neutral" },
  ADMIN_UPDATE_SETTINGS: { labelFa: "بروزرسانی تنظیمات سیستم", variant: "warning" },
  MERCHANT_CREATE_LISTING: { labelFa: "ثبت بسته جدید", variant: "brand" },
  MERCHANT_UPDATE_LISTING: { labelFa: "ویرایش بسته", variant: "neutral" },
  MERCHANT_VERIFY_PICKUP: { labelFa: "تأیید تحویل حضوری", variant: "success" },
};

export function getAuditActionLabel(action: string) {
  return AUDIT_ACTION_MAP[action] || { labelFa: action.replace(/_/g, " "), variant: "neutral" };
}

export const ROLE_MAP: Record<string, string> = {
  CUSTOMER: "مشتری",
  MERCHANT_STAFF: "کارمند فروشگاه",
  MERCHANT_OWNER: "مالک فروشگاه",
  ADMIN: "مدیر سامانه",
};

export function getRoleLabel(role: string) {
  return ROLE_MAP[role] || role;
}
