import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { OMP_BINARY, selectOmpBinary } from './omp.ts';

const versionPattern = /\bv?(\d+\.\d+\.\d+(?:-[\w.-]+)?)(?:\+[\w.-]+)?\b/;

export function needsStableOmp(installed: string, stable: string) {
  const current = installed.match(versionPattern)?.[1];
  if (!current) throw new Error('Could not determine the installed OMP version.');
  const [currentCore, currentPre] = current.split('-', 2);
  const [stableCore, stablePre] = stable.split('-', 2);
  const currentParts = currentCore.split('.').map(Number);
  const stableParts = stableCore.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (currentParts[i] !== stableParts[i]) return currentParts[i] < stableParts[i];
  }
  return !!currentPre && !stablePre;
}

export function ompTarget(platform: string, arch: string): string {
  const os = ({ win32: 'windows', darwin: 'macos', linux: 'linux' } as Record<string, string>)[platform];
  const cpu = ({ x64: 'x86_64', arm64: 'arm64' } as Record<string, string>)[arch];
  if (!os || !cpu) throw new Error('Automatic OMP installation is unavailable on this platform.');
  return `${os}-${cpu}`;
}

export function validateOmpBuild(value: any) {
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(value?.build?.version ?? '') ||
      !/^[a-f0-9]{64}$/i.test(value?.file?.sha256 ?? '')) throw new Error('Invalid OMP build metadata.');
  const url = new URL(value.download);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid OMP download URL.');
  return { version: value.build.version as string, sha256: value.file.sha256.toLowerCase() as string, url: url.href };
}

const run = promisify(execFile);

async function runtimeTarget() {
  let arch = process.arch;
  if (process.platform === 'darwin' && arch === 'x64') {
    const { stdout } = await run('/usr/sbin/sysctl', ['-in', 'hw.optional.arm64'], { timeout: 2000 })
      .catch(() => ({ stdout: '' }));
    if (stdout.trim() === '1') arch = 'arm64';
  }
  return ompTarget(process.platform, arch);
}

export async function probeExecutable(executable: string): Promise<string | null> {
  try {
    const { stdout } = await run(executable, ['--version'], { timeout: 10000, maxBuffer: 65536, windowsHide: true });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export function setupRuntimeCandidates(platform: NodeJS.Platform, home: string, selected: string, override?: string) {
  if (override) return [override];
  if (platform !== 'darwin' && platform !== 'linux') return [selected];
  const brew = platform === 'darwin' ? ['/opt/homebrew/bin/omp'] : [
    '/home/linuxbrew/.linuxbrew/bin/omp', path.posix.join(home, '.linuxbrew/bin/omp'),
  ];
  return [...new Set([
    selected, ...brew, '/usr/local/bin/omp',
    path.posix.join(home, '.local/bin/omp'), path.posix.join(home, '.bun/bin/omp'), 'omp',
  ])];
}

async function findRuntime() {
  const candidates = setupRuntimeCandidates(process.platform, os.homedir(), OMP_BINARY, process.env.OMP_BIN);
  for (const executable of candidates) {
    const version = await probeExecutable(executable);
    if (version) {
      selectOmpBinary(executable);
      return version;
    }
  }
  return null;
}

// This location comes only from the native host, never from a request body.
function dataDirectory() {
  if (!process.env.OMP_DESKTOP_DATA) throw new Error('Desktop setup is unavailable outside the native host.');
  return process.env.OMP_DESKTOP_DATA;
}

export async function desktopSetupStatus() {
  let completed = false;
  try { completed = JSON.parse(await fs.readFile(path.join(dataDirectory(), 'setup.json'), 'utf8')).version === 1; }
  catch (error: any) { if (error.code !== 'ENOENT') throw error; }
  const version = await findRuntime();
  return { completed, available: !!version, version, executable: OMP_BINARY, platform: process.platform,
    installSupported: ['x64', 'arm64'].includes(process.arch) && ['win32', 'darwin', 'linux'].includes(process.platform) };
}

export async function completeDesktopSetup() {
  if (!await findRuntime()) throw new Error('Connect or install OMP before continuing.');
  const directory = dataDirectory();
  await fs.mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `setup-${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporary, JSON.stringify({ version: 1 }), { mode: 0o600, flag: 'wx' });
    await fs.rename(temporary, path.join(directory, 'setup.json'));
  } finally { await fs.rm(temporary, { force: true }); }
}

type OmpInstallOptions = { checkUpdates?: boolean; report?: (detail: string) => void };

let installation: Promise<Awaited<ReturnType<typeof desktopSetupStatus>>> | undefined;
export function installDesktopOmp(options: OmpInstallOptions = {}) {
  // Repeated clicks share one installation; a failure can be retried.
  return installation ??= install(options).finally(() => { installation = undefined; });
}

type SetupInstallState = {
  running: boolean;
  detail?: string;
  error?: string;
  status?: Awaited<ReturnType<typeof desktopSetupStatus>>;
};
let setupInstallState: SetupInstallState = { running: false };

export function desktopSetupInstallStatus() { return setupInstallState; }

export function startDesktopSetupInstall() {
  if (setupInstallState.running) return setupInstallState;
  setupInstallState = { running: true, detail: 'Checking your runtime…' };
  void installDesktopOmp({ report: detail => { setupInstallState = { running: true, detail }; } })
    .then(
      status => { setupInstallState = { running: false, status }; },
      (error: Error) => {
        const detail = setupInstallState.detail ?? 'Installing OMP…';
        const message = error.name === 'TimeoutError' ? 'The request timed out. Try again or install OMP manually.' : error.message;
        setupInstallState = { running: false, error: `${detail.replace(/…$/, '')}: ${message}` };
      },
    );
  return setupInstallState;
}

async function install({ checkUpdates = false, report }: OmpInstallOptions) {
  const current = await findRuntime();
  const directory = path.join(dataDirectory(), 'runtime');
  const destination = path.join(directory, process.platform === 'win32' ? 'omp.exe' : 'omp');
  if (current && !checkUpdates) return desktopSetupStatus();
  if (process.env.OMP_BIN && path.resolve(OMP_BINARY) !== destination) {
    if (!current) throw new Error('The configured OMP_BIN cannot start. Correct it before installing another runtime.');
    report?.(`Using the runtime selected by OMP_BIN (${current}).`);
    return desktopSetupStatus();
  }
  report?.('Checking the latest stable OMP release…');
  const target = await runtimeTarget();
  const response = await fetch(`https://build.stencil.so/api/products/omp/latest/${target}?channel=stable`,
    { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`OMP build lookup failed (${response.status}).`);
  const build = validateOmpBuild(await response.json());
  if (current && !needsStableOmp(current, build.version)) {
    report?.(`Using installed OMP ${current.match(versionPattern)?.[1]}.`);
    return desktopSetupStatus();
  }
  report?.(`${current ? 'Updating to' : 'Downloading'} OMP ${build.version}…`);
  const download = await fetch(build.url, { signal: AbortSignal.timeout(300000) });
  if (!download.ok || !download.body) throw new Error(`OMP download failed (${download.status}).`);
  await fs.mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.omp-${randomUUID()}${process.platform === 'win32' ? '.exe' : ''}`);
  const file = await fs.open(temporary, 'wx', 0o700);
  const hash = createHash('sha256');
  const reader = download.body.getReader();
  try {
    let size = 0;
    let lastReportedMiB = -1;
    const total = Number(download.headers.get('content-length'));
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      size += chunk.length;
      if (size > 512 * 1024 * 1024) throw new Error('OMP download exceeds the supported size.');
      hash.update(chunk);
      await file.writeFile(chunk);
      const mebibytes = Math.floor(size / 1048576);
      if (mebibytes !== lastReportedMiB) {
        lastReportedMiB = mebibytes;
        report?.(`Downloading OMP ${build.version} · ${mebibytes} MiB${total > 0 ? ` of ${Math.ceil(total / 1048576)} MiB` : ''}…`);
      }
    }
    await file.close();
    report?.(`Verifying OMP ${build.version}…`);
    if (hash.digest('hex') !== build.sha256) throw new Error('OMP checksum verification failed. Nothing was installed.');
    let downloaded: string;
    try {
      ({ stdout: downloaded } = await run(temporary, ['--version'], { timeout: 30000, maxBuffer: 65536, windowsHide: true }));
    } catch (error: any) {
      throw new Error(`The verified OMP binary for ${target} could not start (${error.signal || error.code || 'unknown error'}). Use the installation guide for a manual install.`);
    }
    if (downloaded.match(versionPattern)?.[1] !== build.version)
      throw new Error(`The downloaded runtime for ${target} did not report the expected OMP version.`);
    await fs.rename(temporary, destination);
    selectOmpBinary(destination);
    return desktopSetupStatus();
  } finally {
    await reader.cancel().catch(() => {});
    await file.close().catch(() => {});
    await fs.rm(temporary, { force: true });
  }
}
