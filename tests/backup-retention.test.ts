import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDatabaseBackup, generateChecksum, pruneOldBackups, verifyBackupIntegrity } from '../scripts/backup-db';

describe('Backup archive integrity and retention', () => {
  let directory: string;
  beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), 'loqme-backup-test-')); });
  afterEach(() => {
    vi.restoreAllMocks();
    // Only this test's freshly allocated temporary directory may be removed.
    const resolved = path.resolve(directory);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('loqme-backup-test-')) throw new Error('Unsafe cleanup');
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  it('round-trips Unicode SQL and checks its exact checksum', async () => {
    const sql = 'SELECT \'لقمه\';';
    const backup = await createDatabaseBackup(sql, { backupDir: path.join(directory, 'nested') });
    expect(verifyBackupIntegrity(backup.filepath)).toEqual({ valid: true, decompressedBytes: Buffer.byteLength(sql) });
    expect(fs.readFileSync(`${backup.filepath}.sha256`, 'utf8')).toContain(generateChecksum(fs.readFileSync(backup.filepath)));
  });
  it('fails closed for missing archives, checksum mismatch and broken gzip', async () => {
    expect(verifyBackupIntegrity(path.join(directory, 'missing')).valid).toBe(false);
    const backup = await createDatabaseBackup('SELECT 1;', { backupDir: directory });
    fs.writeFileSync(`${backup.filepath}.sha256`, 'incorrect');
    expect(verifyBackupIntegrity(backup.filepath).error).toContain('Checksum mismatch');
    fs.writeFileSync(backup.filepath, 'not gzip');
    fs.writeFileSync(`${backup.filepath}.sha256`, generateChecksum(Buffer.from('not gzip')));
    expect(verifyBackupIntegrity(backup.filepath).valid).toBe(false);
  });
  it('does not certify an archive when the checksum file is missing', async () => {
    const backup = await createDatabaseBackup('SELECT 1;', { backupDir: directory });
    fs.unlinkSync(`${backup.filepath}.sha256`);
    expect(verifyBackupIntegrity(backup.filepath)).toMatchObject({ valid: false, error: expect.stringContaining('Checksum') });
  });
  it('retains recent archives and unrelated files while pruning old archive/checksum pairs', async () => {
    expect(pruneOldBackups(path.join(directory, 'missing'))).toBe(0);
    const backup = await createDatabaseBackup('SELECT 1;', { backupDir: directory });
    const old = new Date(Date.now() - 31 * 86400000);
    for (const file of [backup.filepath, `${backup.filepath}.sha256`]) fs.utimesSync(file, old, old);
    const unrelated = path.join(directory, 'keep.txt'); fs.writeFileSync(unrelated, 'keep'); fs.utimesSync(unrelated, old, old);
    const recent = path.join(directory, 'loqme_db_recent.sql.gz'); fs.writeFileSync(recent, 'recent');
    expect(pruneOldBackups(directory)).toBe(2);
    expect(fs.existsSync(unrelated)).toBe(true); expect(fs.existsSync(recent)).toBe(true);
    expect(pruneOldBackups(directory, 90)).toBe(0);
  });
  it('uses the default backups folder relative to the working directory', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue(directory);
    const result = await createDatabaseBackup('SELECT 1;');
    expect(path.dirname(result.filepath)).toBe(path.join(directory, 'backups'));
    expect(verifyBackupIntegrity(result.filepath).valid).toBe(true);
  });
});
