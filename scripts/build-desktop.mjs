import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
execFileSync(process.execPath, [path.join(root, 'node_modules/@tauri-apps/cli/tauri.js'), 'build'], { cwd: root, stdio: 'inherit' });
if (process.platform === 'win32') await import('./build-desktop-installer.mjs');
