'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

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
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAuditLogs() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/audit?limit=100');
        const data = await res.json();
        if (data.success && data.items && data.items.length > 0) {
          setLogs(data.items);
        } else {
          // Default seed logs if empty
          setLogs([
            {
              id: 'init-1',
              action: 'PLATFORM_BOOTSTRAP',
              entityType: 'System',
              entityId: 'SYSTEM',
              actorRole: 'ADMIN',
              detailsJson: { note: 'سیستم ثبت لاگ امنیتی و نظارتی فعال شد' },
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      } catch (err) {
        console.error('Error fetching audit logs:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAuditLogs();
  }, []);

  const getActionBadge = (action: string) => {
    if (action.includes('SAFETY') || action.includes('LOCKOUT')) {
      return <Badge variant="danger" size="sm">🚨 {action}</Badge>;
    }
    if (action.includes('REFUND') || action.includes('RESOLVED')) {
      return <Badge variant="success" size="sm">✓ {action}</Badge>;
    }
    if (action.includes('WARNING')) {
      return <Badge variant="warning" size="sm">⚠️ {action}</Badge>;
    }
    return <Badge variant="neutral" size="sm">{action}</Badge>;
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>📜</span>
          لاگ امنیتی و رویدادهای بازرسی پلتفرم
        </h1>
        <p className="text-xs text-loqme-neutral-400 mt-1">
          ثبت تغییرناپذیر تغییرات سطح سیستم، مداخلات سلامت غذا، تعیین تکلیف شکایات و استردادها
        </p>
      </div>

      <div className="rounded-2xl bg-loqme-neutral-800 border border-loqme-neutral-700 overflow-hidden shadow-lg">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <table className="w-full text-right text-xs">
            <thead className="bg-loqme-neutral-900 text-loqme-neutral-400 border-b border-loqme-neutral-700">
              <tr>
                <th className="p-4">کاربر اقدام‌کننده</th>
                <th className="p-4">عملیات (Action)</th>
                <th className="p-4">موجودیت و شناسه</th>
                <th className="p-4">جزییات و مستندات</th>
                <th className="p-4">زمان ثبت (UTC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-loqme-neutral-700 text-loqme-neutral-200">
              {logs.map((log) => {
                const actorDisplay = log.actor?.mobile
                  ? `${log.actor.mobile} (${log.actorRole || log.actor.role})`
                  : log.actorRole
                  ? `سیستم (${log.actorRole})`
                  : 'سیستم خودکار';

                return (
                  <tr key={log.id} className="hover:bg-loqme-neutral-750 transition">
                    <td className="p-4 font-mono text-loqme-neutral-300">{actorDisplay}</td>
                    <td className="p-4">{getActionBadge(log.action)}</td>
                    <td className="p-4 font-mono text-xs text-loqme-primary-300">
                      {log.entityType} : {log.entityId.slice(0, 12)}...
                    </td>
                    <td className="p-4 text-loqme-neutral-400 max-w-xs truncate">
                      {typeof log.detailsJson === 'object'
                        ? JSON.stringify(log.detailsJson)
                        : String(log.detailsJson || '-')}
                    </td>
                    <td className="p-4 text-loqme-neutral-400 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString('fa-IR')}
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
