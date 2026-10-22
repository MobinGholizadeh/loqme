"use client";
import { RippleButton } from "@/components/magicui/ripple-button";


import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  FileText,
  Eye,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Clock,
  User,
  Database,
} from "lucide-react";
import { getAuditActionLabel, getRoleLabel } from "@/lib/utils/persian-labels";
import { toPersianDigits } from "@/lib/utils/persian";

interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string;
  detailsJson: any;
  createdAt: string;
  actor: {
    mobile: string;
    role: string;
    fullName?: string | null;
  } | null;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/audit")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setLogs(res.items || res.data || []);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleCopyJson = () => {
    if (!selectedLog) return;
    const text =
      typeof selectedLog.detailsJson === "object"
        ? JSON.stringify(selectedLog.detailsJson, null, 2)
        : String(selectedLog.detailsJson || "");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderActionBadge = (action: string) => {
    const info = getAuditActionLabel(action);
    return (
      <Badge variant={info.variant} size="sm">
        {info.labelFa}
      </Badge>
    );
  };

  const getActorDisplay = (log: AuditLog) => {
    if (log.actor?.mobile) {
      const roleFa = getRoleLabel(log.actorRole || log.actor.role);
      return `${toPersianDigits(log.actor.mobile)} (${roleFa})`;
    }
    if (log.actorRole) {
      return `سیستم (${getRoleLabel(log.actorRole)})`;
    }
    return "سیستم خودکار";
  };

  if (error) {
    return (
      <ErrorState
        title="دریافت گزارش انجام نشد"
        message="دوباره تلاش کنید"
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-loqme-neutral-900 flex items-center gap-2">
          <FileText className="text-loqme-primary-700 shrink-0" size={26} />
          لاگ امنیتی و رویدادهای بازرسی پلتفرم
        </h1>
        <p className="text-xs text-loqme-neutral-500 mt-1">
          ثبت تغییرناپذیر تغییرات سطح سیستم، مداخلات سلامت غذا، تعیین تکلیف
          شکایات و استردادها
        </p>
      </div>

      <div className="rounded-lg bg-white border border-loqme-neutral-200 overflow-hidden shadow-card">
        {loading ? (
          <div className="loading-state flex justify-center items-center">
            <Spinner size="lg" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-loqme-neutral-500 text-sm">
            هیچ رویدادی در سامانه ثبت نشده است
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-loqme-neutral-50 text-loqme-neutral-600 border-b border-loqme-neutral-200">
                  <tr>
                    <th className="p-4">کاربر اقدام‌کننده</th>
                    <th className="p-4">عملیات</th>
                    <th className="p-4">موجودیت و شناسه</th>
                    <th className="p-4">جزییات و مستندات</th>
                    <th className="p-4">زمان ثبت</th>
                    <th className="p-4 text-left">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-loqme-neutral-200 text-loqme-neutral-700">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-loqme-primary-50/40 cursor-pointer transition-colors"
                    >
                      <td className="p-4 font-mono text-loqme-neutral-800">
                        {getActorDisplay(log)}
                      </td>
                      <td className="p-4">{renderActionBadge(log.action)}</td>
                      <td className="p-4 font-mono text-xs text-loqme-primary-700">
                        <span className="bg-loqme-neutral-100 px-2 py-0.5 rounded text-loqme-neutral-700 ml-1">
                          {log.entityType}
                        </span>
                        {log.entityId.slice(0, 10)}...
                      </td>
                      <td className="p-4 text-loqme-neutral-600 max-w-xs truncate">
                        {typeof log.detailsJson === "object"
                          ? JSON.stringify(log.detailsJson)
                          : String(log.detailsJson || "-")}
                      </td>
                      <td className="p-4 text-loqme-neutral-500 font-mono text-[11px] whitespace-nowrap">
                        {toPersianDigits(
                          new Date(log.createdAt).toLocaleString("fa-IR"),
                        )}
                      </td>
                      <td className="p-4 text-left">
                        <RippleButton
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-loqme-primary-700 bg-loqme-primary-50 hover:bg-loqme-primary-100 rounded-md transition-colors inline-flex items-center gap-1"
                        >
                          <Eye size={13} />
                          جزئیات
                        </RippleButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-loqme-neutral-200">
              {logs.map((log) => (
                <div key={log.id} className="p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <div>{renderActionBadge(log.action)}</div>
                    <span className="text-[11px] font-mono text-loqme-neutral-400">
                      {toPersianDigits(
                        new Date(log.createdAt).toLocaleTimeString("fa-IR"),
                      )}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-loqme-neutral-700">
                      <User
                        size={14}
                        className="text-loqme-neutral-400 shrink-0"
                      />
                      <span className="font-mono">{getActorDisplay(log)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-loqme-neutral-600">
                      <Database
                        size={14}
                        className="text-loqme-neutral-400 shrink-0"
                      />
                      <span>{log.entityType}: </span>
                      <span className="font-mono text-loqme-primary-700">
                        {log.entityId.slice(0, 12)}...
                      </span>
                    </div>
                  </div>

                  <div className="bg-loqme-neutral-50 p-2.5 rounded text-[11px] font-mono text-loqme-neutral-600 truncate border border-loqme-neutral-150">
                    {typeof log.detailsJson === "object"
                      ? JSON.stringify(log.detailsJson)
                      : String(log.detailsJson || "-")}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center text-xs"
                    onClick={() => setSelectedLog(log)}
                    leftIcon={<Eye size={14} />}
                  >
                    مشاهده جزئیات کامل و اسناد
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Log Detail Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="جزئیات و مستندات رویداد بازرسی"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyJson}
              leftIcon={copied ? <Check size={15} /> : <Copy size={15} />}
            >
              {copied ? "کپی شد" : "کپی داده‌های JSON"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setSelectedLog(null)}
            >
              بستن
            </Button>
          </div>
        }
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-loqme-neutral-50 p-3.5 rounded-lg border border-loqme-neutral-200">
              <div>
                <span className="text-loqme-neutral-500 block mb-1">
                  نوع عملیات:
                </span>
                <div>{renderActionBadge(selectedLog.action)}</div>
                <span className="font-mono text-[10px] text-loqme-neutral-400 mt-1 block">
                  {selectedLog.action}
                </span>
              </div>

              <div>
                <span className="text-loqme-neutral-500 block mb-1">
                  کاربر اقدام‌کننده:
                </span>
                <strong className="text-loqme-neutral-800 font-mono block">
                  {getActorDisplay(selectedLog)}
                </strong>
              </div>

              <div>
                <span className="text-loqme-neutral-500 block mb-1">
                  موجودیت و شناسه:
                </span>
                <span className="bg-loqme-neutral-200 px-2 py-0.5 rounded text-[11px] font-bold ml-1">
                  {selectedLog.entityType}
                </span>
                <code className="font-mono text-[11px] text-loqme-primary-800 break-all block mt-1">
                  {selectedLog.entityId}
                </code>
              </div>

              <div>
                <span className="text-loqme-neutral-500 block mb-1">
                  زمان ثبت رویداد:
                </span>
                <strong className="text-loqme-neutral-800 font-mono block">
                  {toPersianDigits(
                    new Date(selectedLog.createdAt).toLocaleString("fa-IR"),
                  )}
                </strong>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-loqme-neutral-800">
                  مستندات و پارامترهای جزئی (JSON Payload):
                </span>
              </div>
              <pre
                dir="ltr"
                className="bg-slate-50 text-slate-800 p-4 rounded-lg font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-200 text-left leading-relaxed select-all"
              >
                {typeof selectedLog.detailsJson === "object"
                  ? JSON.stringify(selectedLog.detailsJson, null, 2)
                  : String(selectedLog.detailsJson || "{}")}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
