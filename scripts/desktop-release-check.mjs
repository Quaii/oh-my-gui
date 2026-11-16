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
const folder=path.join(root,'src-tauri/target/release/bundle');
const extensions=process.platform==='win32'?['custom/.exe','nsis/.exe']:process.platform==='darwin'?['dmg/.dmg']:['deb/.deb','appimage/.AppImage'];
const artifacts=[];
for(const specification of extensions){
  const [directory,extension]=specification.split('/');
  const names=(await fs.readdir(path.join(folder,directory))).filter(name=>name.endsWith(extension)&&name.startsWith('omp_'+pkg.version+'_'));
  if(names.length!==1)throw Error(`Expected exactly one ${directory} package for ${pkg.version}`);
  const file=directory+'/'+names[0],hash=createHash('sha256');
  for await(const chunk of createReadStream(path.join(folder,file)))hash.update(chunk);
  artifacts.push({file,sha256:hash.digest('hex')});
}
await fs.writeFile(path.join(folder,'SHA256SUMS'),artifacts.map(item=>item.sha256+'  '+item.file).join('\n')+'\n');
console.log(JSON.stringify({version:pkg.version,artifacts,signing:'Not established by this check; verify platform signatures separately.'},null,2));
