import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';
import {OmpBridge} from '../server/src/omp.ts';
const root=await fs.mkdtemp(path.join(process.cwd(),'.local-provider-test-'));const server=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({object:'list',data:[{id:'omp-ui-local-test',object:'model',owned_by:'local'}]}))});await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
const bridge=new OmpBridge('local-provider-test',root);
try{
 await fs.writeFile(path.join(root,'models.yml'),`providers:\n  ui-local:\n    baseUrl: http://127.0.0.1:${port}/v1\n    api: openai-completions\n    auth: none\n    models:\n      - id: omp-ui-local-test\n        name: UI local test\n        reasoning: false\n        input: [text]\n        contextWindow: 8192\n        maxTokens: 2048\n`);
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Startup timeout')),30000);bridge.once('ready',()=>{clearTimeout(timer);resolve()});bridge.once('exit',()=>{clearTimeout(timer);reject(Error('OMP startup failed '+bridge.stderrTail))});bridge.start({cwd:root,args:['--no-session','--no-extensions','--no-skills','--no-lsp'],env:{PI_CODING_AGENT_DIR:root}})});
 const models=await bridge.send({type:'get_available_models'});assert.ok(models.models.some(m=>m.provider==='ui-local'&&m.id==='omp-ui-local-test'),'Keyless local provider must appear in native OMP catalog');console.log('PASS: OMP loaded the UI-generated keyless local provider and model from models.yml');
}finally{await bridge.stop(500);await new Promise(r=>server.close(r));assert.ok(path.resolve(root).startsWith(path.resolve(process.cwd())+path.sep));await fs.rm(root,{recursive:true,force:true});}
