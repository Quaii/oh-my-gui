import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function isDmgMountFailure(output) {
  return /bundle_dmg\.sh/.test(output) && /hdiutil: couldn't eject/.test(output) && /Resource busy/.test(output);
}

export async function createDevelopmentDmg(root, { styled = false } = {}) {
  const version = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')).version;
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) throw new Error('Invalid DMG package version.');
  const app = path.join(root, 'src-tauri/target/release/bundle/macos/Oh My GUI.app');
  await fs.access(path.join(app, 'Contents/MacOS/omp-desktop'));
  const folder = path.join(root, 'src-tauri/target/release/bundle/dmg');
  const destination = path.join(folder, `Oh My GUI_${version}_${process.arch === 'arm64' ? 'aarch64' : 'x64'}.dmg`);
  await fs.mkdir(folder, { recursive: true });
  if (styled) {
    // Write Finder metadata directly. Hosted runners have no interactive Finder.
    execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit', timeout: 60000 });
    execFileSync('dmgbuild', ['-s', path.join(root, 'scripts/desktop-dmg-settings.py'),
      '-D', `app=${app}`, '-D', `tauri=${path.join(root, 'src-tauri')}`, 'Oh My GUI', destination],
      { stdio: 'inherit', timeout: 240000 });
    execFileSync('hdiutil', ['verify', destination], { stdio: 'inherit', timeout: 60000 });
    return;
  }

  // Recover a preview if Tauri could not detach its temporary disk image.
  const temporaryRoot = path.join(root, '.tmp');
  await fs.mkdir(temporaryRoot, { recursive: true });
  const staging = await fs.mkdtemp(path.join(temporaryRoot, 'dmg-'));
  try {
    await fs.cp(app, path.join(staging, path.basename(app)), { recursive: true, verbatimSymlinks: true });
    await fs.symlink('/Applications', path.join(staging, 'Applications'));
    execFileSync('hdiutil', ['create', '-ov', '-volname', 'Oh My GUI', '-srcfolder', staging, '-format', 'UDZO', destination], { stdio: 'inherit', timeout: 180000 });
    execFileSync('hdiutil', ['verify', destination], { stdio: 'inherit', timeout: 60000 });
    console.log('Created and verified development DMG without mounting: ' + destination);
  } finally {
    if (path.dirname(staging) !== temporaryRoot) throw new Error('DMG staging directory escaped its scratch root.');
    await fs.rm(staging, { recursive: true, force: true });
  }
}
