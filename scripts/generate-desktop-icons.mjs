import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const icons = path.join(root, 'src-tauri/icons');
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'omp-icons-'));
try {
  execFileSync(process.execPath, [
    path.join(root, 'node_modules/@tauri-apps/cli/tauri.js'), 'icon',
    path.join(icons, 'brand.svg'), '--output', output,
  ], { stdio: 'inherit' });
  for (const name of ['32x32.png', '128x128.png', 'icon.ico', 'icon.icns']) {
    await fs.copyFile(path.join(output, name), path.join(icons, name));
  }
} finally {
  await fs.rm(output, { recursive: true, force: true });
}
