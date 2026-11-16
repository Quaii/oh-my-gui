import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ompTarget, validateOmpBuild, desktopSetupStatus, completeDesktopSetup } from '../src/desktop-setup.ts';
import { desktopInstallDirectory } from '../src/desktop-installer.ts';
import { OMP_BINARY, selectOmpBinary } from '../src/omp.ts';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('desktop OMP installation selects the host binary and rejects unsupported targets', () => {
  assert.equal(ompTarget('win32', 'x64'), 'windows-x86_64');
  assert.equal(ompTarget('darwin', 'arm64'), 'macos-arm64');
  assert.equal(ompTarget('linux', 'x64'), 'linux-x86_64');
  assert.throws(() => ompTarget('linux', 'ia32'));
  assert.throws(() => ompTarget('freebsd', 'x64'));
});

test('OMP build metadata requires a release version, checksum and credential-free HTTPS download', () => {
  const good = { build: { version: '1.2.3' }, file: { sha256: 'a'.repeat(64) }, download: 'https://example.com/omp' };
  assert.equal(validateOmpBuild(good).sha256, good.file.sha256);
  for (const patch of [{ build: { version: '../escape' } }, { file: { sha256: 'bad' } }, { download: 'http://example.com/omp' }, { download: 'https://user:secret@example.com/omp' }]) {
    assert.throws(() => validateOmpBuild({ ...good, ...patch }));
  }
});

test('the installer destination is derived from an absolute user directory, never request input', () => {
  assert.throws(() => desktopInstallDirectory('relative/path'));
  assert.ok(desktopInstallDirectory(process.cwd()).endsWith('omp'));
});

test('setup completion persists in native app data and cannot complete with an unavailable runtime', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'omp-setup-test-'));
  const previousDirectory = process.env.OMP_DESKTOP_DATA;
  const previousBinary = OMP_BINARY;
  process.env.OMP_DESKTOP_DATA = directory;
  try {
    // Node is a harmless executable fixture for the --version probe, not an OMP bridge.
    selectOmpBinary(process.execPath);
    assert.equal((await desktopSetupStatus()).completed, false);
    await completeDesktopSetup();
    assert.equal((await desktopSetupStatus()).completed, true);
    const saved = await fs.readFile(path.join(directory, 'setup.json'), 'utf8');
    selectOmpBinary(path.join(directory, 'missing-runtime'));
    assert.equal((await desktopSetupStatus()).available, false);
    await assert.rejects(completeDesktopSetup(), /Connect or install OMP/);
    assert.equal(await fs.readFile(path.join(directory, 'setup.json'), 'utf8'), saved);
  } finally {
    selectOmpBinary(previousBinary);
    if (previousDirectory === undefined) delete process.env.OMP_DESKTOP_DATA;
    else process.env.OMP_DESKTOP_DATA = previousDirectory;
    await fs.rm(directory, { recursive: true, force: true });
  }
});
