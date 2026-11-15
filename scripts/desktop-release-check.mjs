import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
const config=JSON.parse(await fs.readFile(path.join(root,'src-tauri/tauri.conf.json'),'utf8'));
const cargo=await fs.readFile(path.join(root,'src-tauri/Cargo.toml'),'utf8');
if(config.version!==pkg.version||cargo.match(/^version = "([^"]+)"/m)?.[1]!==pkg.version)throw Error('Desktop, Cargo and package versions must match.');
const folder=path.join(root,'src-tauri/target/release/bundle/nsis');
const installers=(await fs.readdir(folder)).filter(name=>name.endsWith('-setup.exe')&&name.includes('_'+pkg.version+'_'));
if(installers.length!==1)throw Error('Expected exactly one Windows installer for '+pkg.version);
const hash=createHash('sha256');for await(const chunk of createReadStream(path.join(folder,installers[0])))hash.update(chunk);
const checksum=hash.digest('hex');
await fs.writeFile(path.join(folder,'SHA256SUMS'),checksum+'  '+installers[0]+'\n');
console.log(JSON.stringify({version:pkg.version,installer:installers[0],sha256:checksum,signing:'Not established by this check; verify the installer signature separately.'},null,2));
