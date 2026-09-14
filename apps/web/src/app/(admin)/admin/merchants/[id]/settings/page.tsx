"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Save,
  UserRound,
  ShoppingBag,
  Users,
  RefreshCw,
  Link2,
} from "lucide-react";
import type { AdminMerchantAccountDto } from "@loqme/types";
import {
  AdminMerchantAccountSchema,
  type AdminMerchantAccountInput,
} from "@loqme/validation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ErrorState } from "@/components/ui/ErrorState";
import { HeartbeatLoading } from "@/components/ui/HeartbeatLoading";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";

const statuses: Record<string, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  READY_FOR_PICKUP: "آماده تحویل",
  COMPLETED: "تحویل‌شده",
  CANCELLED: "لغوشده",
  NO_SHOW: "عدم مراجعه",
  REFUNDED: "بازپرداخت‌شده",
};
export default function MerchantAdminSettings() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AdminMerchantAccountDto | null>(null);
  const [tab, setTab] = useState("account");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [fullName, setFullName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [mobile, setMobile] = useState("");
  const [reason, setReason] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [pending, setPending] = useState<AdminMerchantAccountInput | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/merchants/${id}/account?page=${page}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setData(result.data);
      setFullName(result.data.owner.fullName);
      setIsActive(result.data.owner.isActive);
    } catch (e) {
      setError(e instanceof Error ? e.message : "دریافت اطلاعات انجام نشد");
    } finally {
      setLoading(false);
    }
  }, [id, page]);
  useEffect(() => {
    void load();
  }, [load]);
  function prepare(e: React.FormEvent) {
    e.preventDefault();
    setFeedback("");
    const result = AdminMerchantAccountSchema.safeParse({
      action: assigning ? "ASSIGN_OWNER" : "UPDATE_ACCOUNT",
      expectedOwnerId: data?.owner.id,
      fullName,
      isActive,
      mobile,
      reasonFa: reason,
    });
    if (!result.success) {
      setFeedback(result.error.issues.map((issue) => issue.message).join("؛ "));
      return;
    }
    setPending(result.data);
  }
  async function save() {
    if (!pending) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/merchants/${id}/account`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setAssigning(false);
      setReason("");
      setMobile("");
      await load();
      setFeedback("تغییرات حساب ثبت شد");
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "ذخیره انجام نشد");
    } finally {
      setSaving(false);
      setPending(null);
    }
  }
  if (loading && (!data || data.id !== id)) return <HeartbeatLoading />;
  if (error || !data)
    return (
      <ErrorState
        title="دریافت اطلاعات فروشگاه انجام نشد"
        message={error}
        onRetry={load}
      />
    );
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <Link
            href="/admin/merchants"
            className="inline-flex items-center gap-2 text-sm text-teal-700 mb-3"
          >
            <ArrowRight size={16} />
            فروشگاه‌ها
          </Link>
          <h1 className="text-xl font-bold">تنظیمات {data.businessNameFa}</h1>
        </div>
        <Button
          variant="secondary"
          onClick={load}
          rightIcon={<RefreshCw size={18} />}
        >
          به‌روزرسانی
        </Button>
      </div>
      <div
        className="segmented w-fit max-w-full flex-wrap"
        role="group"
        aria-label="بخش تنظیمات فروشگاه"
      >
        {[
          { id: "account", label: "حساب فروشنده", icon: UserRound },
          { id: "orders", label: "سفارش‌ها", icon: ShoppingBag },
          { id: "staff", label: "همکاران", icon: Users },
        ].map((item) => (
          <button
            key={item.id}
            aria-pressed={tab === item.id}
            onClick={() => {
              setTab(item.id);
              setFeedback("");
            }}
          >
            <item.icon size={17} />
            {item.label}
          </button>
        ))}
      </div>
      {feedback && (
        <p
          role="status"
          className="border-r-4 border-teal-700 p-3 bg-teal-50 text-sm"
        >
          {feedback}
        </p>
      )}
      {tab === "account" && (
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8">
          <dl className="space-y-5 text-sm">
            <div>
              <dt className="text-loqme-neutral-500 mb-1">
                شماره ورود / نام کاربری
              </dt>
              <dd dir="ltr" className="text-right font-bold text-lg">
                {toPersianDigits(data.owner.mobile)}
              </dd>
            </div>
            <div>
              <dt className="text-loqme-neutral-500 mb-1">روش ورود</dt>
              <dd>رمز یک‌بارمصرف پیامکی؛ بدون پسورد ثابت</dd>
            </div>
            <div>
              <dt className="text-loqme-neutral-500 mb-1">شناسه حساب</dt>
              <dd dir="ltr" className="text-right break-all text-xs">
                {data.owner.id}
              </dd>
            </div>
            <div>
              <dt className="text-loqme-neutral-500 mb-1">وضعیت حساب</dt>
              <dd>{data.owner.isActive ? "فعال" : "غیرفعال"}</dd>
            </div>
            <div>
              <dt className="text-loqme-neutral-500 mb-1">
                فروشگاه‌های متصل به مالک
              </dt>
              <dd>{toPersianDigits(data.owner.ownedStoreCount)}</dd>
            </div>
            {data.owner.ownedStoreCount > 1 && (
              <p className="text-amber-800">
                این حساب مشترک است؛ تغییر اطلاعات آن بر چند فروشگاه اثر دارد.
                حساب مستقل لازم است.
              </p>
            )}
          </dl>
          <form onSubmit={prepare} className="space-y-5">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <h2 className="text-base font-bold">
                {assigning ? "اتصال حساب مستقل" : "مشخصات صاحب حساب"}
              </h2>
              <Button
                type="button"
                variant="ghost"
                rightIcon={<Link2 size={16} />}
                onClick={() => {
                  setAssigning(!assigning);
                  setFullName(assigning ? data.owner.fullName : "");
                  setFeedback("");
                }}
              >
                {assigning ? "انصراف از تغییر حساب" : "تغییر حساب متصل"}
              </Button>
            </div>
            {assigning && (
              <Input
                label="شماره موبایل حساب فروشنده"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                inputMode="tel"
                required
              />
            )}
            <Input
              label="نام و نام خانوادگی"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              maxLength={100}
            />
            {!assigning && (
              <label className="flex gap-3 items-center text-sm">
                <input
                  type="checkbox"
                  className="accent-teal-700 h-4 w-4"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                حساب فروشنده فعال باشد
              </label>
            )}
            <Input
              label="علت تغییر برای گزارش حسابرسی"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={5}
              maxLength={500}
            />
            <Button
              type="submit"
              disabled={
                saving ||
                (!assigning &&
                  (data.owner.ownedStoreCount > 1 ||
                    data.owner.role !== "MERCHANT_OWNER"))
              }
              rightIcon={<Save size={18} />}
            >
              ثبت تغییرات
            </Button>
          </form>
        </div>
      )}
      {tab === "orders" && (
        <section className="space-y-4">
          <h2 className="font-bold">
            سفارش‌های {data.businessNameFa} ·{" "}
            {toPersianDigits(data.totalOrders)}
          </h2>
          {data.orders.length === 0 ? (
            <p className="py-10 text-loqme-neutral-500">
              سفارشی برای این فروشگاه ثبت نشده است.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="border-b">
                    <th className="p-3">شماره و تاریخ</th>
                    <th className="p-3">مشتری و بسته</th>
                    <th className="p-3">مبلغ</th>
                    <th className="p-3">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="p-3">
                        <span dir="ltr" className="block">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs text-loqme-neutral-500">
                          {new Intl.DateTimeFormat("fa-IR", {
                            dateStyle: "medium",
                            timeZone: "Asia/Tehran",
                          }).format(new Date(order.createdAt))}
                        </span>
                      </td>
                      <td className="p-3">
                        <p>{order.customerName}</p>
                        {order.items.map((item, i) => (
                          <p key={i} className="text-xs text-loqme-neutral-500">
                            {toPersianDigits(item.quantity)} × {item.titleFa}
                          </p>
                        ))}
                      </td>
                      <td className="p-3">
                        {formatToman(order.totalAmountToman)}
                      </td>
                      <td className="p-3">
                        {statuses[order.status] || order.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex gap-3 items-center">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              قبلی
            </Button>
            <span className="text-sm">صفحه {toPersianDigits(page)}</span>
            <Button
              variant="secondary"
              disabled={page * data.pageSize >= data.totalOrders}
              onClick={() => setPage(page + 1)}
            >
              بعدی
            </Button>
          </div>
        </section>
      )}
      {tab === "staff" && (
        <section className="space-y-3">
          <h2 className="font-bold">حساب‌های همکار این فروشگاه</h2>
          {data.staff.length === 0 ? (
            <p>همکاری ثبت نشده است.</p>
          ) : (
            data.staff.map((staff) => (
              <div
                key={staff.id}
                className="flex flex-wrap justify-between gap-3 border-b py-4 text-sm"
              >
                <span>{staff.fullName || "همکار فروشگاه"}</span>
                <span dir="ltr">{toPersianDigits(staff.mobile)}</span>
                <span>
                  {(
                    {
                      OWNER: "مالک",
                      MANAGER: "مدیر",
                      CASHIER: "صندوقدار",
                    } as Record<string, string>
                  )[staff.role] || staff.role}
                </span>
                <span>{staff.isActive ? "فعال" : "غیرفعال"}</span>
              </div>
            ))
          )}
        </section>
      )}
      <Modal
        isOpen={Boolean(pending)}
        onClose={() => {
          if (!saving) setPending(null);
        }}
        title="تأیید تغییر حساب فروشگاه"
        footer={
          <>
            <Button
              variant="ghost"
              disabled={saving}
              onClick={() => setPending(null)}
            >
              انصراف
            </Button>
            <Button disabled={saving} onClick={save}>
              {saving ? "در حال ثبت..." : "تأیید و ذخیره"}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-7">
          {pending?.action === "ASSIGN_OWNER"
            ? `حساب ${toPersianDigits(pending.mobile)} مالک ${data.businessNameFa} می‌شود و دسترسی حساب مالک قبلی به این فروشگاه حذف می‌شود.`
            : pending?.isActive
              ? "اطلاعات حساب فروشنده به‌روزرسانی می‌شود."
              : "ورود و دسترسی فروشنده به پنل فروشگاه غیرفعال می‌شود."}
        </p>
      </Modal>
    </div>
  );
}
