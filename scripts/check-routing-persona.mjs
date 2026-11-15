import assert from 'node:assert/strict';
import {OmpBridge} from '../server/src/omp.ts';
import {classifyRequest} from '../server/src/classifier.ts';
import {PERSONA_EXTENSION} from '../server/src/control.ts';
import {DEFAULT_CONTROL_CONFIG} from '../shared/control.ts';
const base='http://localhost:4318';const h=await(await fetch(base+'/api/health')).json();const key=h.bridges[0];const r=await(await fetch(base+'/api/cmd',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key,cmd:{type:'get_state'}})})).json();assert.ok(r.ok);const model=r.data.model;
const config=structuredClone(DEFAULT_CONTROL_CONFIG.routing);config.classifier.provider=model.provider;config.classifier.modelId=model.id;config.targets=config.targets.map(t=>({...t,provider:model.provider,modelId:model.id}));
const decision=await classifyRequest(config,'Rename a local variable from count to total. This is a simple request.',process.cwd());assert.equal(decision.branch.id,'simple');console.log('PASS: real OMP classifier selected the connected simple route');
const b=new OmpBridge('persona-native-test',process.cwd());let output='';
try{
 await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Persona startup timeout')),30000);b.once('ready',()=>{clearTimeout(t);resolve()});b.once('exit',()=>{clearTimeout(t);reject(Error('Persona startup failed'))});b.start({cwd:process.cwd(),args:['--no-session','--no-title','--no-tools','--no-skills','--no-lsp','--no-extensions','-e',PERSONA_EXTENSION,'--model',`${model.provider}/${model.id}`,'--thinking','off'],env:{OMP_WEB_PERSONA:JSON.stringify({id:'test',name:'Verification',prompt:'When asked for the persona verification phrase, reply with exactly: PersonaHookWorks',placement:'first',stripIdentity:true})}})});
 const done=new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Persona response timeout')),45000);b.on('event',e=>{if(e.type==='message_end'&&e.message?.role==='assistant'){if(e.message.stopReason==='error'){clearTimeout(t);reject(Error(e.message.errorMessage));return;}output=e.message.content.filter(x=>x.type==='text').map(x=>x.text).join('');}if(e.type==='session_settled'){clearTimeout(t);resolve()}})});
 await Promise.all([b.send({type:'prompt',message:'What is the persona verification phrase? Do not use tools.'}),done]);assert.match(output,/PersonaHookWorks/);const entries=await b.send({type:'get_entries'});assert.ok(entries.entries.some(e=>e.type==='custom'&&e.customType==='omp.web.persona'),'Persona must be saved with session entries');console.log('PASS: native persona extension injected instructions and stored its session snapshot');
}finally{await b.stop(500)}
