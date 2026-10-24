import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { SupportAttachmentType } from '@loqme/types';

export const SUPPORT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES: Record<string, SupportAttachmentType> = {
  'image/jpeg': 'IMAGE',
  'image/png': 'IMAGE',
  'image/webp': 'IMAGE',
  'application/pdf': 'DOCUMENT',
  'text/plain': 'DOCUMENT',
};

function getStorageDirectory(): string {
  const customDir = process.env.SUPPORT_ATTACHMENT_DIR;
  const dir = customDir || path.join(process.cwd(), '.data', 'support-attachments');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function sanitizeFileName(rawName: string): string {
  const base = path.basename(rawName).trim();
  // Remove any dangerous or control characters
  return base.replace(/[^\w\s.-]/gi, '_').slice(0, 150) || 'attachment';
}

export async function saveSupportAttachmentFile(
  fileBuffer: Buffer,
  originalFileName: string,
  mimeType: string
): Promise<{
  storageId: string;
  sanitizedName: string;
  fileSize: number;
  mimeType: string;
  attachmentType: SupportAttachmentType;
  diskPath: string;
}> {
  if (fileBuffer.byteLength > SUPPORT_MAX_FILE_SIZE) {
    throw new Error('حجم فایل نمی‌تواند بیشتر از ۱۰ مگابایت باشد');
  }

  const normalizedMime = mimeType.toLowerCase();
  const attachmentType = ALLOWED_MIME_TYPES[normalizedMime];
  if (!attachmentType) {
    throw new Error('فرمت فایل مجاز نیست؛ فرمت‌های مجاز: عکس (JPG, PNG, WebP) و اسناد (PDF, TXT)');
  }

  const sanitizedName = sanitizeFileName(originalFileName);
  const ext = path.extname(sanitizedName) || (normalizedMime === 'application/pdf' ? '.pdf' : '.bin');
  const storageId = `${crypto.randomUUID()}${ext}`;

  const dir = getStorageDirectory();
  const diskPath = path.join(dir, storageId);

  await fs.promises.writeFile(diskPath, fileBuffer);

  return {
    storageId,
    sanitizedName,
    fileSize: fileBuffer.byteLength,
    mimeType: normalizedMime,
    attachmentType,
    diskPath,
  };
}

export function getSupportAttachmentDiskPath(storageIdOrUrl: string): string | null {
  const fileName = path.basename(storageIdOrUrl);
  const dir = getStorageDirectory();
  const fullPath = path.join(dir, fileName);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  return fullPath;
}
