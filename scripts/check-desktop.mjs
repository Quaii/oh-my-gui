import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=process.argv[2]?path.resolve(process.argv[2]):path.join(root,'src-tauri/resources/runtime');
const token=randomBytes(32).toString('hex');
const child=spawn(path.join(runtime,process.platform==='win32'?'node.exe':'node'),[path.join(runtime,'server/src/index.mjs')],{
  cwd:root,windowsHide:true,env:{...process.env,HOST:'127.0.0.1',PORT:'0',OMP_DESKTOP_TOKEN:token},stdio:['pipe','pipe','pipe']
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
  const boot=await fetch(base+'/desktop/bootstrap?token='+token,{redirect:'manual'});
  assert.equal(boot.status,303);
  const headers={Cookie:boot.headers.get('set-cookie').split(';')[0]};
  assert.equal((await fetch(base+'/api/health',{headers})).status,200);
  const html=await (await fetch(base+'/',{headers})).text();
  assert.match(html,/<title>omp\.<\/title>/);
  const asset=html.match(/src="(\/assets\/[^\"]+\.js)"/);
  assert.ok(asset,'Built application entry is present');
  assert.equal((await fetch(base+asset[1],{headers})).status,200);
  assert.equal((await fetch(base+'/api/desktop/appearance',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({accent:'#aabbcc'})})).status,204);
  assert.equal((await fetch(base+'/api/desktop/appearance',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({accent:'invalid'})})).status,400);
  assert.equal((await fetch(base+'/api/desktop/window',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action:'sync-state'})})).status,204);
  assert.equal((await fetch(base+'/api/desktop/window',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action:'arbitrary-command'})})).status,400);
  assert.equal((await fetch(base+'/api/desktop/window',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'close'})})).status,403);
  child.stdin.end('shutdown\n');
  const [code]=await Promise.race([exited,new Promise((_,reject)=>setTimeout(()=>reject(Error('Desktop did not stop')),6500))]);
  assert.equal(code,0);
  await assert.rejects(fetch(base+'/api/health'));
  console.log('Desktop bundle: readiness, private session, health, UI assets and clean shutdown passed. No model requests or file writes.');
}finally{if(child.exitCode===null)child.kill();}
