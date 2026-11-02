import { cp, copyFile } from 'node:fs/promises';

// Only public application files go in dist. Config and uploaded work stay outside it.
await cp('php/api', 'dist/api', { recursive: true });
await copyFile('php/public.htaccess', 'dist/.htaccess');
await copyFile('php/uploads.user.ini', 'dist/.user.ini');
await copyFile('dist/index.html', 'dist/order.html');
console.log('PHP hosting package ready in dist/ (no Node.js runtime or database required).');
