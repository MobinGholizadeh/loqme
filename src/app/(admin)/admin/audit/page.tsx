'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';

export default function AdminAuditPage() {
  const mockLogs = [
    {
      id: '1',
      actor: '09123333333 (ADMIN)',
      action: 'LOGIN_SUCCESS',
      resource: 'Admin Console',
      timestamp: 'چند لحظه پیش',
      status: 'SUCCESS',
    },
    {
      id: '2',
      actor: '09122222222 (MERCHANT)',
      action: 'PICKUP_VERIFIED',
      resource: 'Order LQ-10492',
      timestamp: '۱۰ دقیقه پیش',
      status: 'SUCCESS',
    },
    {
      id: '3',
      actor: '09121111111 (CUSTOMER)',
      action: 'OTP_REQUEST',
      resource: 'Auth Service',
      timestamp: '۲۵ دقیقه پیش',
      status: 'SUCCESS',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">لاگ امنیتی و رویدادهای بازرسی</h1>
        <p className="text-xs text-loqme-neutral-400 mt-1">
          ردگیری تغییرات سطح سامانه، دسترسی‌ها و تراکنش‌های حساس
        </p>
      </div>

      <div className="rounded-2xl bg-loqme-neutral-800 border border-loqme-neutral-700 overflow-hidden">
        <table className="w-full text-right text-xs">
          <thead className="bg-loqme-neutral-900 text-loqme-neutral-400 border-b border-loqme-neutral-700">
            <tr>
              <th className="p-4">کاربر / نقش</th>
              <th className="p-4">عنوان رویداد</th>
              <th className="p-4">منبع</th>
              <th className="p-4">زمان ثبت</th>
              <th className="p-4">وضعیت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-loqme-neutral-700 text-loqme-neutral-200">
            {mockLogs.map((log) => (
              <tr key={log.id}>
                <td className="p-4 font-mono dir-ltr text-right">{log.actor}</td>
                <td className="p-4 font-bold text-loqme-primary-400">{log.action}</td>
                <td className="p-4">{log.resource}</td>
                <td className="p-4 text-loqme-neutral-400">{log.timestamp}</td>
                <td className="p-4">
                  <Badge variant="success" size="sm">
                    {log.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
