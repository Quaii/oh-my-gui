import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=path.join(root,'src-tauri/resources/runtime');
if(Number(process.versions.node.split('.')[0])<24)throw Error('Desktop packaging requires Node 24 or later (node:sqlite).');
execFileSync(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build','--config','web/vite.config.ts'],{cwd:root,stdio:'inherit'});
await fs.mkdir(path.join(runtime,'server/src'),{recursive:true});
await build({entryPoints:[path.join(root,'server/src/index.ts')],outfile:path.join(runtime,'server/src/index.mjs'),bundle:true,platform:'node',format:'esm',target:'node24',packages:'bundle',banner:{js:'import {createRequire} from "node:module"; const require = createRequire(import.meta.url);'}});
await fs.cp(path.join(root,'server/data'),path.join(runtime,'server/data'),{recursive:true});
await fs.copyFile(path.join(root,'server/src/persona-extension.mjs'),path.join(runtime,'server/src/persona-extension.mjs'));
const generatedWeb=path.resolve(runtime,'web/dist');
if(path.dirname(path.dirname(generatedWeb))!==runtime)throw Error('Generated web resource path escaped its runtime directory.');
await fs.rm(generatedWeb,{recursive:true,force:true});
await fs.cp(path.join(root,'web/dist'),generatedWeb,{recursive:true});
const runtimeNode=path.join(runtime,process.platform==='win32'?'node.exe':'node');
const digest=async file=>{const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');};
let sameRuntime=false;
try{sameRuntime=await digest(process.execPath)===await digest(runtimeNode);}catch(error){if(error.code!=='ENOENT')throw error;}
if(!sameRuntime)await fs.copyFile(process.execPath,runtimeNode);
await fs.mkdir(path.join(runtime,'licenses'),{recursive:true});
await fs.copyFile(path.join(root,'node_modules/yaml/LICENSE'),path.join(runtime,'licenses/yaml.txt'));
const licenseFile=path.join(runtime,'licenses/node-'+process.versions.node+'.txt');
try{await fs.access(licenseFile);}catch{
  const response=await fetch(`https://raw.githubusercontent.com/nodejs/node/v${process.versions.node}/LICENSE`,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('Unable to retrieve the matching Node runtime license: '+response.status);
  await fs.writeFile(licenseFile,await response.text());
}
await fs.writeFile(path.join(runtime,'runtime.json'),JSON.stringify({node:process.versions.node,platform:process.platform,arch:process.arch},null,2));
console.log('Prepared desktop runtime, shared backend and web assets. OMP remains an installed prerequisite.');
