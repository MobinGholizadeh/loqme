import { toPersianDigits } from '@loqme/validation';

export function formatPersianTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  try {
    const formatted = new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
    return toPersianDigits(formatted);
  } catch {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return toPersianDigits(`${h}:${m}`);
  }
}

export function formatPersianDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  try {
    const formatted = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
    return toPersianDigits(formatted);
  } catch {
    return date.toLocaleDateString('fa-IR');
  }
}

export function formatRelativeTimeFa(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 45) return 'همین الان';
  if (diffSec < 3600) {
    const minutes = Math.floor(diffSec / 60);
    return `${toPersianDigits(minutes)} دقیقه پیش`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${toPersianDigits(hours)} ساعت پیش`;
  }
  if (diffSec < 172800) {
    return 'دیروز';
  }
  const days = Math.floor(diffSec / 86400);
  if (days < 30) {
    return `${toPersianDigits(days)} روز پیش`;
  }

  return formatPersianDate(date);
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '۰ بایت';
  if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
  if (bytes < 1024 * 1024) {
    const kb = (bytes / 1024).toFixed(1);
    return `${toPersianDigits(kb)} کیلوبایت`;
  }
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return `${toPersianDigits(mb)} مگابایت`;
}
