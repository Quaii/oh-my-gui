import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import {desktopApplicationEnvironment} from '../server/src/desktop-installer.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=process.argv[2]?path.resolve(process.argv[2]):path.join(root,'src-tauri/resources/runtime');
const token=randomBytes(32).toString('hex');
const child=spawn(path.join(runtime,process.platform==='win32'?'node.exe':'node'),[path.join(runtime,'server/src/index.mjs')],{
  cwd:root,windowsHide:true,env:{...desktopApplicationEnvironment({...process.env,OMP_INSTALLER_PAYLOAD:'inert-old-installer',OMP_INSTALL_PROGRESS:'inert-old-log'}),HOST:'127.0.0.1',PORT:'0',OMP_DESKTOP_TOKEN:token},stdio:['pipe','pipe','pipe']
});
let nativeLines='';
child.stdout.on('data',chunk=>{
  nativeLines+=chunk.toString();
  let end;
  while((end=nativeLines.indexOf('\n'))>=0){
    const line=nativeLines.slice(0,end);nativeLines=nativeLines.slice(end+1);
    if(line.startsWith('OMP_DESKTOP_FOLDER ')){
      const {id}=JSON.parse(line.slice('OMP_DESKTOP_FOLDER '.length));
      child.stdin.write('folder '+JSON.stringify({id,path:root})+'\n');
    }
  }
});
const exited=once(child,'exit');
let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk;});
try{
  const port=await new Promise((resolve,reject)=>{
    let output='';const timer=setTimeout(()=>reject(Error('Desktop readiness timed out')),15000);
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('exit',()=>{clearTimeout(timer);reject(Error('Desktop exited before readiness: '+stderr));});
    child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/OMP_DESKTOP_READY (\{[^\n]+\})/);if(match){clearTimeout(timer);resolve(JSON.parse(match[1]).port);}});
  });
  const base=`http://127.0.0.1:${port}`;
  assert.equal((await fetch(base+'/api/health')).status,403);
  assert.equal((await fetch(base+'/api/sessions/running')).status,403);
  assert.equal((await fetch(base+'/api/desktop/setup/install',{method:'POST'})).status,403);
  assert.equal((await fetch(base+'/api/desktop/installer',{method:'POST'})).status,403);
  const boot=await fetch(base+'/desktop/bootstrap?token='+token,{redirect:'manual'});
  assert.equal(boot.status,303);
  const headers={Cookie:boot.headers.get('set-cookie').split(';')[0]};
  assert.equal((await fetch(base+'/api/health',{headers})).status,200);
  const running=await fetch(base+'/api/sessions/running',{headers});
  assert.equal(running.status,200);
  assert.deepEqual(await running.json(),{paths:[]});
  assert.equal((await fetch(base+'/api/desktop/tray')).status,403);
  assert.equal((await fetch(base+'/api/desktop/updates')).status,403);
  assert.equal((await fetch(base+'/api/desktop/folder',{method:'POST'})).status,403);
  assert.equal((await fetch(base+'/api/desktop/tray-action',{method:'POST'})).status,403);
  assert.equal((await fetch(base+'/api/desktop/tray-action',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action:'chat',path:'not-a-real-chat'})})).status,400);
  const release=await (await fetch(base+'/api/app-release',{headers})).json();
  assert.match(release.version,/^\d+\.\d+\.\d+/);
  assert.ok(release.releases.length>0);
  const updates=await (await fetch(base+'/api/desktop/updates',{headers})).json();
  assert.equal(updates.configured,false);
  assert.equal(updates.phase,'disabled');
  const tray=await (await fetch(base+'/api/desktop/tray',{headers})).json();
  const requestHeaders={...headers,'Content-Type':'application/json'};
  const folder=await fetch(base+'/api/desktop/folder',{method:'POST',headers:requestHeaders,body:JSON.stringify({directory:root}),signal:AbortSignal.timeout(5000)});
  assert.equal(folder.status,200,'The folder route remains available after installer handoff');
  assert.equal((await folder.json()).path,root);
  assert.equal((await fetch(base+'/api/desktop/tray-action',{method:'POST',headers:requestHeaders,body:JSON.stringify({action:'dismiss'})})).status,200);
  assert.ok(Array.isArray(tray.recent)&&tray.recent.length<=3);
  assert.ok(Array.isArray(tray.running));
  const html=await (await fetch(base+'/',{headers})).text();
  assert.match(html,/<title>Oh My GUI<\/title>/);
  const asset=html.match(/src="(\/assets\/[^\"]+\.js)"/);
  assert.ok(asset,'Built application entry is present');
  assert.equal((await fetch(base+asset[1],{headers})).status,200);
  assert.equal((await fetch(base+'/api/desktop/appearance',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({accent:'#aabbcc'})})).status,204);
  assert.equal((await fetch(base+'/api/desktop/appearance',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({accent:'invalid'})})).status,400);
  assert.equal((await fetch(base+'/api/desktop/window',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action:'sync-state'})})).status,204);
  assert.equal((await fetch(base+'/api/desktop/window',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action:'ready',mode:'installer'})})).status,204);
  assert.equal((await fetch(base+'/api/desktop/window',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action:'ready',mode:'arbitrary'})})).status,400);
  assert.equal((await fetch(base+'/api/desktop/window',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action:'arbitrary-command'})})).status,400);
  assert.equal((await fetch(base+'/api/desktop/window',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'close'})})).status,403);
  child.stdin.end('shutdown\n');
  const [code]=await Promise.race([exited,new Promise((_,reject)=>setTimeout(()=>reject(Error('Desktop did not stop')),6500))]);
  assert.equal(code,0);
  await assert.rejects(fetch(base+'/api/health'));
  console.log('Desktop bundle: readiness, private session, health, UI assets and clean shutdown passed. No model requests or file writes.');
}finally{if(child.exitCode===null)child.kill();}
