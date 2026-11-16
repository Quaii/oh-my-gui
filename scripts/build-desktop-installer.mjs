import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') throw new Error('The custom Windows installer must be built on Windows.');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')).version;
const release = path.join(root, 'src-tauri/target/release');
const payload = path.join(release, `bundle/nsis/omp_${version}_x64-setup.exe`);
const hash = createHash('sha256');
for await (const chunk of createReadStream(payload)) hash.update(chunk);
const staging = path.join(root, '.tmp/custom-installer');
await fs.mkdir(staging, { recursive: true });
const manifest = path.join(staging, 'installer-manifest.json');
await fs.writeFile(manifest, JSON.stringify({ version, sha256: hash.digest('hex') }));
const output = path.join(release, `bundle/custom/omp_${version}_x64.exe`);
await fs.mkdir(path.dirname(output), { recursive: true });
// NSIS is only the silent self-extraction envelope and installation engine.
// The visible window is the same React/Tauri application in installer mode.
const quote = value => value.replaceAll('$', '$$').replaceAll('"', '$\\"');
const script = `Unicode true
ManifestDPIAware true
RequestExecutionLevel user
SilentInstall silent
SetCompressor /SOLID lzma
Name "omp."
Icon "${quote(path.join(root, 'src-tauri/icons/icon.ico'))}"
OutFile "${quote(output)}"
Section
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File "${quote(path.join(release, 'omp-desktop.exe'))}"
  File /oname=install-payload.exe "${quote(payload)}"
  File "${quote(manifest)}"
  SetOutPath "$PLUGINSDIR\\runtime"
  File /r "${quote(path.join(root, 'src-tauri/resources/runtime'))}\\*"
  ExecWait '"$PLUGINSDIR\\omp-desktop.exe" --installer' $0
  SetErrorLevel $0
SectionEnd
`;
const source = path.join(staging, 'bootstrap.nsi');
await fs.writeFile(source, script);
const compiler = process.env.MAKENSIS || path.join(process.env.LOCALAPPDATA, 'tauri/NSIS/makensis.exe');
execFileSync(compiler, ['/V2', source], { stdio: 'inherit' });
console.log('Custom React installer: ' + output);
