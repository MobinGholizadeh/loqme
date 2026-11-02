import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

// Always use a new, disposable container/data directory. Never run write tests on production.
const id = `voidframe-php-test-${randomBytes(5).toString('hex')}`;
const temp = resolve('.deploy', id);
const docker = (args, options = {}) => execFileSync('docker', args, { encoding: 'utf8', ...options });
const password = 'isolated-php-test-password';
let started = false;
try {
  await mkdir(temp, { recursive: true });
  docker(['build', '-f', 'Dockerfile.selfhost', '-t', 'voidframe-php:test', '.'], { stdio: 'inherit' });
  const hash = docker(['run', '--rm', '-i', 'voidframe-php:test', 'php', '-r',
    'echo password_hash(stream_get_contents(STDIN), PASSWORD_BCRYPT);'], { input: password }).trim();
  const envFile = resolve(temp, 'test.env');
  await writeFile(envFile, `ADMIN_PASSWORD_HASH=${hash}\nADMIN_SESSION_SECRET=${randomBytes(32).toString('hex')}\nALLOW_INSECURE_COOKIES=1\n`);
  docker(['run', '-d', '--name', id, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--tmpfs', '/tmp:size=64m,mode=1777',
    '--tmpfs', '/data:uid=1001,gid=1001,mode=0700', '--env-file', envFile,
    '-p', '127.0.0.1::3000', 'voidframe-php:test']);
  started = true;
  const address = docker(['port', id, '3000/tcp']).trim();
  const base = `http://${address}`;
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { if ((await fetch(`${base}/api/health.php`)).ok) { ready = true; break; } } catch { /* booting */ }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error('PHP server did not become healthy.');
  const result = spawnSync(process.execPath, ['scripts/test-store-selfhost.mjs'], {
    stdio: 'inherit', env: { ...process.env, TEST_BASE_URL: base, TEST_ADMIN_PASSWORD: password, TEST_ALLOW_WRITES: '1' },
  });
  if (result.status !== 0) throw new Error('PHP store integration tests failed.');
  assert.throws(() => docker(['exec', id, 'node', '--version'], { stdio: 'pipe' }), 'Production must not require Node');
  const files = docker(['exec', id, 'sh', '-c', "find /var/www/html/api -name '*.php' -exec php -l {} \\;"]);
  process.stdout.write(files);

  // A second container exercises the actual shared-host config file and old JSON data,
  // without any credential environment variables or new product creation.
  docker(['rm', '-f', id]);
  started = false;
  const configFile = resolve(temp, 'voidframe-config.php');
  const legacySecret = randomBytes(32).toString('hex');
  await writeFile(configFile, `<?php return ['data_dir'=>'/data', 'admin_password_hash'=>'${hash}', 'session_secret'=>'${legacySecret}', 'secure_cookies'=>false];`);
  docker(['run', '-d', '--name', id, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--tmpfs', '/tmp:size=64m,mode=1777',
    '--tmpfs', '/data:uid=1001,gid=1001,mode=0700',
    '--mount', `type=bind,source=${configFile},target=/var/www/voidframe-config.php,readonly`,
    '-p', '127.0.0.1::3000', 'voidframe-php:test']);
  started = true;
  const migratedBase = `http://${docker(['port', id, '3000/tcp']).trim()}`;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { if ((await fetch(`${migratedBase}/api/health.php`)).ok) break; } catch { /* booting */ }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  const oldProduct = { id: 'f5aa1f90-81f7-4422-8d82-fbc1f587a100', title: 'Existing purchase', description: 'Previous Next app data', category: 'Templates', price: 1900,
    preview: 'f5aa1f90-81f7-4422-8d82-fbc1f587a101', file: 'f5aa1f90-81f7-4422-8d82-fbc1f587a102', preview_content_type: 'image/png', media_type: 'image', filename: 'existing.zip', created: 1790000000000, archived: 1 };
  const oldOrder = { id: 'f5aa1f90-81f7-4422-8d82-fbc1f587a103', product_id: oldProduct.id, title: oldProduct.title, price: oldProduct.price,
    wallet: '0x1111111111111111111111111111111111111111', status: 'approved', token: 'old-private-order-token', created: 1790000000000 };
  const legacyStore = { settings: { wallet: oldOrder.wallet }, products: [oldProduct], orders: [oldOrder] };
  docker(['exec', '-i', id, 'php', '-r',
    'file_put_contents("/data/store.json",stream_get_contents(STDIN)); mkdir("/data/download"); file_put_contents("/data/download/f5aa1f90-81f7-4422-8d82-fbc1f587a102","legacy-download");'],
  { input: JSON.stringify(legacyStore) });
  const oldLink = await fetch(`${migratedBase}/api/store?action=download&id=${oldProduct.id}&token=${oldOrder.token}`);
  assert.equal(oldLink.status, 200);
  assert.equal(await oldLink.text(), 'legacy-download');
  const restoredOrder = await fetch(`${migratedBase}/api/store.php?action=order&id=${oldOrder.id}&token=${oldOrder.token}`);
  assert.deepEqual(await restoredOrder.json(), oldOrder);
  const login = await fetch(`${migratedBase}/api/store.php?action=login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: migratedBase }, body: JSON.stringify({ password }) });
  assert.equal(login.status, 200, 'Private config file must work without credential environment variables');
  const beforeInvalidWrite = docker(['exec', id, 'cat', '/data/store.json']);
  await fetch(`${migratedBase}/api/store.php?action=wallet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' });
  assert.equal(docker(['exec', id, 'cat', '/data/store.json']), beforeInvalidWrite);
  docker(['exec', id, 'php', '-r', 'file_put_contents("/data/store.json","corrupted");']);
  assert.equal((await fetch(`${migratedBase}/api/store.php`)).status, 500);
  assert.equal(docker(['exec', id, 'cat', '/data/store.json']), 'corrupted', 'Never overwrite corrupted storage with an empty store');
  console.log('Existing JSON, archived purchases, private order tokens, private config and corrupt-store preservation passed.');
  console.log('Apache/PHP runtime, private storage, static pages and complete store flow passed.');
} catch (error) {
  if (started) process.stderr.write(docker(['logs', '--tail', '40', id]));
  throw error;
} finally {
  if (started) docker(['rm', '-f', id]);
  if (!temp.startsWith(resolve('.deploy') + (process.platform === 'win32' ? '\\' : '/'))) {
    throw new Error('Refusing to clean a test path outside .deploy.');
  }
  await rm(temp, { recursive: true, force: true });
}
