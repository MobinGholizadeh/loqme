"use client";
import { ErrorState } from "@/components/ui/ErrorState";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  actorRole?: string | null;
  detailsJson?: any;
  createdAt: string;
  actor?: {
    id: string;
    mobile: string;
    role: string;
  } | null;
}

export default function AdminAuditPage() {
  const [error, setError] = useState(false);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAuditLogs() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/audit?limit=100");
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error("Audit unavailable");
        setLogs(data.items || []);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchAuditLogs();
  }, []);

  const getActionBadge = (action: string) => {
    if (action.includes("SAFETY") || action.includes("LOCKOUT")) {
      return (
        <Badge variant="danger" size="sm">
          🚨 {action}
        </Badge>
      );
    }
    if (action.includes("REFUND") || action.includes("RESOLVED")) {
      return (
        <Badge variant="success" size="sm">
          ✓ {action}
        </Badge>
      );
    }
    if (action.includes("WARNING")) {
      return (
        <Badge variant="warning" size="sm">
          ⚠️ {action}
        </Badge>
      );
    }
    return (
      <Badge variant="neutral" size="sm">
        {action}
      </Badge>
    );
  };

  if (error)
    return (
      <ErrorState
        title="دریافت گزارش انجام نشد"
        message="دوباره تلاش کنید."
        onRetry={() => window.location.reload()}
      />
    );

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-loqme-neutral-900 flex items-center gap-2">
          <span>📜</span>
          لاگ امنیتی و رویدادهای بازرسی پلتفرم
        </h1>
        <p className="text-xs text-loqme-neutral-500 mt-1">
          ثبت تغییرناپذیر تغییرات سطح سیستم، مداخلات سلامت غذا، تعیین تکلیف
          شکایات و استردادها
        </p>
      </div>

      <div className="rounded-lg bg-white border border-loqme-neutral-200 overflow-hidden shadow-lg">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <table className="w-full text-right text-xs">
            <thead className="bg-white text-loqme-neutral-500 border-b border-loqme-neutral-200">
              <tr>
                <th className="p-4">کاربر اقدام‌کننده</th>
                <th className="p-4">عملیات (Action)</th>
                <th className="p-4">موجودیت و شناسه</th>
                <th className="p-4">جزییات و مستندات</th>
                <th className="p-4">زمان ثبت (UTC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-loqme-neutral-700 text-loqme-neutral-700">
              {logs.map((log) => {
                const actorDisplay = log.actor?.mobile
                  ? `${log.actor.mobile} (${log.actorRole || log.actor.role})`
                  : log.actorRole
                    ? `سیستم (${log.actorRole})`
                    : "سیستم خودکار";

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-loqme-neutral-50 transition"
                  >
                    <td className="p-4 font-mono text-loqme-neutral-700">
                      {actorDisplay}
                    </td>
                    <td className="p-4">{getActionBadge(log.action)}</td>
                    <td className="p-4 font-mono text-xs text-loqme-primary-700">
                      {log.entityType} : {log.entityId.slice(0, 12)}...
                    </td>
                    <td className="p-4 text-loqme-neutral-500 max-w-xs truncate">
                      {typeof log.detailsJson === "object"
                        ? JSON.stringify(log.detailsJson)
                        : String(log.detailsJson || "-")}
                    </td>
                    <td className="p-4 text-loqme-neutral-500 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString("fa-IR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
