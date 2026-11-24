import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ompTarget, validateOmpBuild, desktopSetupStatus, completeDesktopSetup, installDesktopOmp, needsStableOmp } from '../src/desktop-setup.ts';
import { desktopInstallDirectory, installerManifest, desktopApplicationEnvironment, installerMode, prepareInstalledApp } from '../src/desktop-installer.ts';
import { desktopBuildHash } from '../src/desktop-build.ts';
import { OMP_BINARY, selectOmpBinary } from '../src/omp.ts';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('installer-to-app handoff removes installer mode and stale native session state',()=>{
  const source={PATH:'fixture-path',OMP_BIN:'user-selected-runtime',OMP_INSTALLER_PAYLOAD:'old-installer.exe',OMP_INSTALL_PROGRESS:'old.log',OMP_DESKTOP_TOKEN:'old-session',OMP_DESKTOP_DATA:'old-data',OMP_UPDATES_CONFIGURED:'false',OMP_APP_VERSION:'old-version'};
  const clean=desktopApplicationEnvironment(source);
  assert.deepEqual(clean,{PATH:'fixture-path',OMP_BIN:'user-selected-runtime'});
  assert.equal(source.OMP_INSTALLER_PAYLOAD,'old-installer.exe');
});

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

test('installer upgrades to stable by numeric version without downgrading a newer runtime', () => {
  assert.equal(needsStableOmp('omp 9.9.9', '10.0.0'), true);
  assert.equal(needsStableOmp('omp 10.0.0-preview.1', '10.0.0'), true);
  assert.equal(needsStableOmp('omp 10.0.0+build.2', '10.0.0'), false);
  assert.equal(needsStableOmp('omp 10.1.0', '10.0.0'), false);
});

test('installer checks a working runtime against stable and leaves it available after a bad download', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'omp-runtime-update-'));
  const previousDirectory = process.env.OMP_DESKTOP_DATA;
  const previousOverride = process.env.OMP_BIN;
  const previousBinary = OMP_BINARY;
  const metadata = {
    build: { version: process.versions.node },
    file: { sha256: 'a'.repeat(64) },
    download: 'https://example.com/omp',
  };
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url: string) => {
    if (url === metadata.download) return new Response('corrupted executable');
    assert.match(url, /\/latest\/[^?]+\?channel=stable$/);
    return Response.json(metadata);
  });
  process.env.OMP_DESKTOP_DATA = directory;
  delete process.env.OMP_BIN;
  selectOmpBinary(process.execPath);
  try {
    assert.equal((await installDesktopOmp({ checkUpdates: true })).available, true);
    assert.equal(fetchMock.mock.callCount(), 1);
    metadata.build.version = `${Number(process.versions.node.split('.')[0]) + 1}.0.0`;
    await assert.rejects(installDesktopOmp({ checkUpdates: true }), /checksum verification failed/);
    assert.equal(fetchMock.mock.callCount(), 3);
    assert.equal(OMP_BINARY, process.execPath);
    assert.equal((await desktopSetupStatus()).available, true);
    assert.deepEqual(await fs.readdir(path.join(directory, 'runtime')), []);
  } finally {
    selectOmpBinary(previousBinary);
    if (previousOverride === undefined) delete process.env.OMP_BIN;
    else process.env.OMP_BIN = previousOverride;
    if (previousDirectory === undefined) delete process.env.OMP_DESKTOP_DATA;
    else process.env.OMP_DESKTOP_DATA = previousDirectory;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('the installer destination is derived from an absolute user directory, never request input', () => {
  assert.throws(() => desktopInstallDirectory('relative/path'));
  assert.ok(desktopInstallDirectory(process.cwd()).endsWith('omp'));
});

test('installer mode distinguishes fresh, newer and same-version packages', () => {
  assert.equal(installerMode(false, undefined, '0.1.2'), 'install');
  assert.equal(installerMode(true, '0.1.9', '0.1.10'), 'update');
  assert.equal(installerMode(true, '0.1.2', '0.1.2', true), 'reinstall');
  assert.equal(installerMode(true, '0.1.2', '0.1.2', false), 'update');
  assert.equal(installerMode(true, '0.1.2', '0.1.2'), 'replace');
  assert.equal(installerMode(true, '0.2.0', '0.1.9'), 'replace');
  assert.equal(installerMode(true, undefined, '0.1.2'), 'replace');
});

test("the installer fingerprint changes when only the frontend build changes", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "omp-build-fingerprint-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const runtime = path.join(root, "runtime");
  const executable = path.join(root, "omp-desktop.exe");
  const index = path.join(runtime, "web/dist/index.html");
  await Promise.all([fs.mkdir(path.dirname(index), { recursive: true }), fs.mkdir(path.join(runtime, "server/src"), { recursive: true })]);
  await Promise.all([
    fs.writeFile(executable, "same binary"),
    fs.writeFile(path.join(runtime, "server/src/index.mjs"), "same backend"),
    fs.writeFile(path.join(runtime, "runtime.json"), "{}"),
    fs.writeFile(index, "app-first.js"),
  ]);
  const first = await desktopBuildHash(executable, runtime);
  assert.equal(await desktopBuildHash(executable, runtime), first);
  await fs.writeFile(index, "app-second.js");
  assert.notEqual(await desktopBuildHash(executable, runtime), first);
});

test('installer asks before closing a running app and resumes when the backend releases its files', async () => {
  const checks: boolean[] = [];
  assert.equal(await prepareInstalledApp(false, async close => {
    checks.push(close);
    return "running";
  }), false);
  assert.deepEqual(checks, [false]);

  const states = ["running", "draining", "draining", "closed"] as const;
  let count = 0;
  assert.equal(await prepareInstalledApp(true, async close => {
    assert.equal(close, count === 1);
    return states[count++];
  }, async () => {}), true);
  assert.equal(count, 4);
});

test('installer can retry after manual close and reports a backend that is still shutting down', async () => {
  const states = ["draining", "closed"] as const;
  let count = 0;
  assert.equal(await prepareInstalledApp(false, async close => {
    assert.equal(close, false);
    return states[count++];
  }, async () => {}), true);
  await assert.rejects(prepareInstalledApp(false, async () => "draining", async () => {}), /still shutting down/);
});

test('installer preflight rejects missing or damaged payloads before offering installation', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'omp-installer-test-'));
  const payload = path.join(directory, 'install-payload.exe');
  try {
    await assert.rejects(installerManifest(payload), /run the packaged Oh My GUI installer/);
    await fs.writeFile(payload, 'inert test fixture');
    await fs.writeFile(path.join(directory, 'installer-manifest.json'), '{"sha256":"wrong"}');
    await assert.rejects(installerManifest(payload), /missing or damaged/);
    const manifest = { version: '0.1.0', sha256: 'a'.repeat(64) };
    await fs.writeFile(path.join(directory, 'installer-manifest.json'), JSON.stringify(manifest));
    assert.deepEqual(await installerManifest(payload), manifest);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
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
    const invalid = path.join(directory, 'damaged-runtime.exe');
    await fs.writeFile(invalid, 'This is an inert test fixture.');
    selectOmpBinary(invalid);
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
