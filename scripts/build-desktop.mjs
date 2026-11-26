import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDmgMountFailure, createDevelopmentDmg } from './desktop-dmg.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let diagnostics = '';
const args = [path.join(root, 'node_modules/@tauri-apps/cli/tauri.js'), 'build'];
const mac = process.platform === 'darwin';
const linux = process.platform === 'linux';
const flags = process.argv.slice(2);
let linuxBundles = [];
if (flags.length > 0) {
  if (!linux || flags[0] !== '--bundles' || flags.length < 2) {
    throw new Error('Usage on Linux: npm run desktop:build -- --bundles deb [appimage]');
  }
  linuxBundles = [...new Set(flags.slice(1).flatMap(value => value.split(',')))];
  if (linuxBundles.some(bundle => !['deb', 'appimage'].includes(bundle))) {
    throw new Error('Can only select deb or appimage Linux bundles.');
  }
}
const signedRelease = process.env.OMP_SIGNED_RELEASE === 'true';
const appleIdentity = process.env.APPLE_SIGNING_IDENTITY || process.env.APPLE_CERTIFICATE;
const styledPreview = mac && !signedRelease && !appleIdentity && process.env.OMP_STYLED_MAC_PREVIEW === 'true';
const bundle = {};
if (signedRelease) {
  if (!process.env.OMP_UPDATE_PUBLIC_KEY?.trim() || !process.env.TAURI_SIGNING_PRIVATE_KEY || !process.env.OMP_UPDATE_ENDPOINT?.startsWith('https://')) throw Error('Signed releases require a public key, signing key and HTTPS update endpoint.');
  bundle.createUpdaterArtifacts = true;
}
if (mac && !signedRelease && !appleIdentity) bundle.macOS = { signingIdentity: '-' };
if (Object.keys(bundle).length) args.push('--config', JSON.stringify({ bundle }));
if (styledPreview) args.push('--bundles', 'app');
if (linuxBundles.length) args.push('--bundles', ...linuxBundles);
if (linux) args.push('--', '--locked');
const child = spawn(process.execPath, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
const forward = (stream, output) => stream.on('data', chunk => {
  output.write(chunk);
  diagnostics = (diagnostics + chunk.toString()).slice(-128 * 1024);
});
forward(child.stdout, process.stdout);
forward(child.stderr, process.stderr);
const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
if (code !== 0) {
  if (mac && !signedRelease && !styledPreview && process.env.CI && !appleIdentity && isDmgMountFailure(diagnostics)) {
    await createDevelopmentDmg(root);
  } else throw new Error('Native packaging failed; see compiler/bundler diagnostics above.');
}
if (styledPreview) await createDevelopmentDmg(root, { styled: true });
if (process.platform === 'win32') await import('./build-desktop-installer.mjs');
