import webpush from 'web-push';

const DEV_PUBLIC_KEY =
  'BGwcwi8hg-BkaCJIooAnJh9BRTJiCCWEOlnJn1lT0PrIeC1R8Fr2oFOdnOQJq0gfpm2dV4T1BuPpOJTk6X4iFuQ';
const DEV_PRIVATE_KEY = 'P59A30hh2DM6ZoKyFRYjOLGvs-qPwDa9uXo0zCnYJlI';

export function getVapidKeys(): {
  publicKey: string;
  privateKey: string;
  subject: string;
} {
  const publicKey =
    process.env.VAPID_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    DEV_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY || DEV_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@loqme.shop';

  return { publicKey, privateKey, subject };
}

let isVapidConfigured = false;

export function configureWebPush(): boolean {
  if (isVapidConfigured) return true;
  const { publicKey, privateKey, subject } = getVapidKeys();
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    isVapidConfigured = true;
    return true;
  } catch (error) {
    console.error('[WebPush] Error configuring VAPID details:', error);
    return false;
  }
}

export { webpush };
