import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDmgMountFailure, createDevelopmentDmg } from './desktop-dmg.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let diagnostics = '';
const child = spawn(process.execPath, [path.join(root, 'node_modules/@tauri-apps/cli/tauri.js'), 'build'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
const forward = (stream, output) => stream.on('data', chunk => {
  output.write(chunk);
  diagnostics = (diagnostics + chunk.toString()).slice(-128 * 1024);
});
forward(child.stdout, process.stdout);
forward(child.stderr, process.stderr);
const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
if (code !== 0) {
  if (process.platform === 'darwin' && process.env.CI && !process.env.APPLE_SIGNING_IDENTITY && !process.env.APPLE_CERTIFICATE && !process.env.APPLE_ID && isDmgMountFailure(diagnostics)) {
    await createDevelopmentDmg(root);
  } else throw new Error('Native packaging failed; see compiler/bundler diagnostics above.');
}
if (process.platform === 'win32') await import('./build-desktop-installer.mjs');
