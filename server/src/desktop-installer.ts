import { promises as fs, createReadStream } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { connect } from 'node:net';

export function desktopInstallDirectory(localData = process.env.LOCALAPPDATA) {
  if (!localData || !path.isAbsolute(localData)) throw new Error('The user installation directory is unavailable.');
  return path.join(localData, 'Programs', 'omp');
}

function isRunning() {
  return new Promise<boolean>(resolve => {
    const socket = connect({ host: '127.0.0.1', port: 4319 });
    const finish = (value: boolean) => { socket.destroy(); resolve(value); };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(1000, () => finish(false));
  });
}

let installed = false;
let installing: Promise<void> | undefined;
export async function desktopInstallerStatus() {
  if (!process.env.OMP_INSTALLER_PAYLOAD || process.platform !== 'win32') throw new Error('Installer mode is unavailable.');
  return { destination: desktopInstallDirectory(), installed, installing: !!installing };
}

export function installDesktopApplication() {
  return installing ??= install().finally(() => { installing = undefined; });
}

async function install() {
  const { destination } = await desktopInstallerStatus();
  if (await isRunning()) throw new Error('Close the running omp. app, then try again. Your work will be kept.');
  const payload = process.env.OMP_INSTALLER_PAYLOAD!;
  const manifest = JSON.parse(await fs.readFile(path.join(path.dirname(payload), 'installer-manifest.json'), 'utf8'));
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(payload)) hash.update(chunk);
  if (!/^[a-f0-9]{64}$/.test(manifest.sha256) || hash.digest('hex') !== manifest.sha256) throw new Error('Installer integrity check failed. Download a fresh copy.');
  process.stdout.write('OMP_DESKTOP_INSTALLING true\n');
  try {
    await new Promise<void>((resolve, reject) => execFile(payload, ['/S', `/D=${destination}`],
      { timeout: 300000, windowsHide: true, windowsVerbatimArguments: true },
      error => error ? reject(new Error('Installation did not finish. Close omp., check disk space and try again.')) : resolve()));
  } finally { process.stdout.write('OMP_DESKTOP_INSTALLING false\n'); }
  await fs.access(path.join(destination, 'omp-desktop.exe'));
  installed = true;
}

export async function launchInstalledDesktop() {
  if (!installed) throw new Error('Finish installation before opening omp.');
  await new Promise<void>((resolve, reject) => {
    const child = spawn(path.join(desktopInstallDirectory(), 'omp-desktop.exe'), [], { detached: true, stdio: 'ignore', windowsHide: true });
    child.once('error', reject);
    child.once('spawn', () => { child.unref(); resolve(); });
  });
}
